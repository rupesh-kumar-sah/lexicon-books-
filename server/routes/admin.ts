import { Router } from 'express';
import { query } from '../db';
import { requireAdmin } from '../auth';
import { getCache, setCache } from '../cache';

const router = Router();

const ALLOWED_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
type OrderStatus = (typeof ALLOWED_STATUSES)[number];

router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const cacheKey = 'admin:stats';
    const cached = await getCache<any>(cacheKey);
    if (cached) return res.json(cached);

    // SINGLE-PASS AGGREGATION & CROSS-TABLE JOIN
    // This query performs exactly ONE scan of the orders table to compute all metrics
    const sql = `
      WITH order_metrics AS (
        SELECT 
          COUNT(*)::int AS total_orders,
          COALESCE(SUM(total) FILTER (WHERE status <> 'cancelled'), 0) AS total_revenue,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
          COUNT(*) FILTER (WHERE status = 'processing')::int AS processing_count,
          COUNT(*) FILTER (WHERE status = 'shipped')::int AS shipped_count,
          COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered_count,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count
        FROM orders
      ),
      book_metrics AS (
        SELECT 
          COUNT(*)::int AS total_books,
          COUNT(*) FILTER (WHERE stock <= 5)::int AS low_stock_count
        FROM books
      ),
      user_metrics AS (
        SELECT COUNT(*)::int AS total_users FROM users
      ),
      top_genres AS (
        SELECT json_agg(t) FROM (
          SELECT genre, COUNT(*)::int as count 
          FROM books GROUP BY genre ORDER BY count DESC LIMIT 6
        ) t
      ),
      recent_orders AS (
        SELECT json_agg(o) FROM (
          SELECT id, customer_name, customer_email, total, status, created_at, items_json
          FROM orders ORDER BY created_at DESC LIMIT 5
        ) o
      ),
      daily_orders AS (
        SELECT json_agg(d) FROM (
          SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                 COUNT(*)::int AS count,
                 COALESCE(SUM(total), 0)::numeric AS revenue
          FROM orders
          WHERE created_at >= NOW() - INTERVAL '14 days'
          GROUP BY day
          ORDER BY day
        ) d
      )
      SELECT 
        m.*, b.*, u.*, 
        tg.json_agg as genres, 
        ro.json_agg as recent,
        do.json_agg as daily
      FROM order_metrics m
      CROSS JOIN book_metrics b
      CROSS JOIN user_metrics u
      CROSS JOIN top_genres tg
      CROSS JOIN recent_orders ro
      CROSS JOIN daily_orders do
    \`;

    const result = await query<any>(sql);
    const r = result.rows[0];

    const data = {
      totalBooks: r.total_books,
      totalUsers: r.total_users,
      totalOrders: r.total_orders,
      totalRevenue: Number(r.total_revenue),
      lowStockCount: r.low_stock_count,
      topGenres: r.genres || [],
      recentOrders: (r.recent || []).map((o: any) => ({
        id: o.id,
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        total: Number(o.total),
        status: o.status,
        itemCount: Array.isArray(o.items_json) ? o.items_json.length : 0,
        createdAt: new Date(o.created_at).getTime(),
      })),
      dailyOrders: (r.daily || []).map((d: any) => ({
        day: d.day,
        count: Number(d.count),
        revenue: Number(d.revenue),
      })),
      statusCounts: {
        pending: r.pending_count,
        processing: r.processing_count,
        shipped: r.shipped_count,
        delivered: r.delivered_count,
        cancelled: r.cancelled_count,
      },
    };

    await setCache(cacheKey, data, 300); // 5 min cache
    res.json(data);
  } catch (e: any) {
    console.error('admin stats error', e);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const { status, search, limit } = req.query;
    const where: string[] = [];
    const params: any[] = [];

    if (typeof status === 'string' && ALLOWED_STATUSES.includes(status as OrderStatus)) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      where.push(
        `(LOWER(customer_email) LIKE $${params.length} OR LOWER(customer_name) LIKE $${params.length} OR LOWER(id) LIKE $${params.length})`
      );
    }

    let sql = `SELECT id, user_id, customer_email, customer_name, customer_phone, shipping_address, location_coords,
                      items_json, subtotal, shipping, total, status, created_at
               FROM orders`;
    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    const lim = Math.min(500, Math.max(1, Number(limit) || 100));
    sql += ` LIMIT ${lim}`;

    const result = await query<any>(sql, params);
    res.json({
      orders: result.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        customerEmail: r.customer_email,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        shippingAddress: r.shipping_address,
        locationCoords: r.location_coords,
        items: r.items_json,
        subtotal: Number(r.subtotal),
        shipping: Number(r.shipping),
        total: Number(r.total),
        status: r.status,
        createdAt: new Date(r.created_at).getTime(),
      })),
    });
  } catch (e: any) {
    console.error('admin orders error', e);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.patch('/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = await query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ ok: true, order: result.rows[0] });
  } catch (e: any) {
    console.error('admin update order status error', e);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

router.delete('/orders/:id', requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM orders WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ ok: true });
  } catch (e: any) {
    console.error('admin delete order error', e);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// ---------------------------------------------------------------- USERS
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const params: any[] = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE LOWER(u.email) LIKE $1 OR LOWER(u.display_name) LIKE $1`;
    }
    const sql = `
      SELECT u.id, u.email, u.display_name, u.role, u.created_at,
             COALESCE(o.cnt, 0)::int  AS order_count,
             COALESCE(o.spent, 0)     AS total_spent
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS cnt, SUM(total) AS spent
        FROM orders
        WHERE status <> 'cancelled' AND user_id IS NOT NULL
        GROUP BY user_id
      ) o ON o.user_id = u.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT 500
    `;
    const result = await query<any>(sql, params);
    res.json({
      users: result.rows.map((r) => ({
        id: r.id,
        email: r.email,
        displayName: r.display_name,
        role: r.role,
        createdAt: new Date(r.created_at).getTime(),
        orderCount: Number(r.order_count),
        totalSpent: Number(r.total_spent),
      })),
    });
  } catch (e: any) {
    console.error('admin list users error', e);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.patch('/users/:id', requireAdmin, async (req: any, res) => {
  try {
    const { role } = req.body || {};
    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'Role must be "user" or "admin"' });
    }
    if (req.params.id === req.user?.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot demote yourself' });
    }
    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role',
      [role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, user: result.rows[0] });
  } catch (e: any) {
    console.error('admin update user role error', e);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', requireAdmin, async (req: any, res) => {
  try {
    if (req.params.id === req.user?.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true });
  } catch (e: any) {
    console.error('admin delete user error', e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ----------------------------------------------------- SITE SETTINGS / THEME
// GET is intentionally public so the storefront can read brand/theme.
router.get('/settings', async (_req, res) => {
  try {
    const result = await query<any>(`SELECT * FROM site_settings WHERE id = 'default'`);
    const r = result.rows[0];
    if (!r) return res.json({ settings: null });
    res.json({
      settings: {
        siteName: r.site_name,
        tagline: r.tagline,
        primaryColor: r.primary_color,
        accentColor: r.accent_color,
        heroImage: r.hero_image,
        shippingKtm: Number(r.shipping_ktm || 100),
        shippingOutside: Number(r.shipping_outside || 150),
        freeShippingThreshold: Number(r.free_shipping_threshold || 5000),
        footerText1: r.footer_text_1 || 'Secure SSL Checkout',
        footerText2: r.footer_text_2 || '30-Day Easy Returns',
        footerText3: r.footer_text_3 || 'Global Shipping Available',
        footerLink1: r.footer_link_1 || 'Privacy',
        footerLink2: r.footer_link_2 || 'Terms',
        footerCompany: r.footer_company || 'BOOKSELLNP MEDIA GROUP',
        privacyContent: r.privacy_content || '# Privacy Policy\n\nYour privacy is important to us...',
        termsContent: r.terms_content || '# Terms of Service\n\nBy using our service, you agree...',
        adminPin: r.admin_pin || '2063',
        updatedAt: new Date(r.updated_at).getTime(),
      },
    });
  } catch (e: any) {
    console.error('admin get settings error', e);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const { siteName, tagline, primaryColor, accentColor, heroImage, shippingKtm, shippingOutside, freeShippingThreshold, footerText1, footerText2, footerText3, footerLink1, footerLink2, footerCompany, privacyContent, termsContent, adminPin } = req.body || {};
    const isHex = (s: any) => typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s);
    if (!siteName || !tagline) return res.status(400).json({ error: 'Site name and tagline are required' });
    if (!isHex(primaryColor) || !isHex(accentColor)) {
      return res.status(400).json({ error: 'Colors must be hex like #2563eb' });
    }
    await query(
      `UPDATE site_settings
       SET site_name = $1, tagline = $2, primary_color = $3, accent_color = $4,
           hero_image = $5, shipping_ktm = $6, shipping_outside = $7, free_shipping_threshold = $8, footer_text_1 = $9, footer_text_2 = $10, footer_text_3 = $11, footer_link_1 = $12, footer_link_2 = $13, footer_company = $14, privacy_content = $15, terms_content = $16, admin_pin = $17, updated_at = NOW()
       WHERE id = 'default'`,
      [siteName, tagline, primaryColor, accentColor, heroImage || '', Number(shippingKtm || 100), Number(shippingOutside || 150), Number(freeShippingThreshold || 5000), footerText1 || 'Secure SSL Checkout', footerText2 || '30-Day Easy Returns', footerText3 || 'Global Shipping Available', footerLink1 || 'Privacy', footerLink2 || 'Terms', footerCompany || 'BOOKSELLNP MEDIA GROUP', privacyContent || '', termsContent || '', adminPin || '2063']
    );
    res.json({ ok: true });
  } catch (e: any) {
    console.error('admin save settings error', e);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;

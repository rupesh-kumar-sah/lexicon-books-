import { Router } from 'express';
import { adminQuery, pool } from '../db';
import { requireAdmin } from '../auth';
import { getCache, setCache, clearCache } from '../cache';
import { queueFullAppSnapshot } from '../integrations/google';
import { notifyOpenWaOrderStatus } from '../integrations/openwa';

const router = Router();

// Public storefront settings are intentionally readable; every operational admin endpoint
// is protected by the authenticated admin session on its handler below. No admin secret is
// embedded in the public bundle or sent as a client-side header.
router.use((req, res, next) => {
  if (req.method === 'GET' && req.path === '/settings') return next();
  return requireAdmin(req, res, next);
});

const ALLOWED_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
type OrderStatus = (typeof ALLOWED_STATUSES)[number];

function systemAdminEmail() {
  return (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
}

function isSystemAdministratorEmail(email: unknown) {
  const configuredEmail = systemAdminEmail();
  return Boolean(configuredEmail && typeof email === 'string' && email.toLowerCase() === configuredEmail);
}

async function protectedSystemAdministrator(userId: string) {
  const result = await adminQuery<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) return { exists: false, protected: false };
  return { exists: true, protected: isSystemAdministratorEmail(result.rows[0].email) };
}

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
        dly.json_agg as daily
      FROM order_metrics m
      CROSS JOIN book_metrics b
      CROSS JOIN user_metrics u
      CROSS JOIN top_genres tg
      CROSS JOIN recent_orders ro
      CROSS JOIN daily_orders dly
    `;

    const result = await adminQuery<any>(sql);
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

    const result = await adminQuery<any>(sql, params);
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
  const { status } = req.body || {};
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<any>(
      `SELECT id, user_id, status, items_json, customer_email, customer_name, customer_phone,
              shipping_address, location_coords, subtotal, shipping, total, created_at
         FROM orders WHERE id = $1 FOR UPDATE`,
      [req.params.id],
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = existing.rows[0];
    if (order.status === status) {
      await client.query('COMMIT');
      return res.json({ ok: true, order: { id: order.id, status } });
    }
    if (order.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cancelled orders cannot be reopened. Create a new order if fulfilment is required.' });
    }
    if (status === 'cancelled') {
      if (!['pending', 'processing'].includes(order.status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Only pending or processing orders can be cancelled.' });
      }
      for (const item of order.items_json || []) {
        const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0));
        await client.query('UPDATE books SET stock = stock + $1 WHERE id = $2', [quantity, item.id]);
      }
    }

    const result = await client.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status', [status, req.params.id]);
    await client.query('COMMIT');
    void notifyOpenWaOrderStatus({
      id: order.id,
      userId: order.user_id,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      shippingAddress: order.shipping_address,
      locationCoords: order.location_coords,
      items: order.items_json || [],
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      total: Number(order.total),
      status,
      createdAt: order.created_at,
    }, status);
    await clearCache('admin:stats');
    await clearCache('books:');
    await clearCache('genres');
    queueFullAppSnapshot();
    return res.json({ ok: true, order: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('admin update order status error', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  } finally {
    client.release();
  }
});

router.delete('/orders/:id', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<{ id: string; status: string }>('SELECT id, status FROM orders WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    if (existing.rows[0].status !== 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cancel an active order before deleting it so stock is restored safely.' });
    }
    await client.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    await clearCache('admin:stats');
    queueFullAppSnapshot();
    return res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('admin delete order error', error);
    return res.status(500).json({ error: 'Failed to delete order' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------- USERS
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const params: any[] = [];
    const filters: string[] = [];
    const configuredEmail = systemAdminEmail();
    if (configuredEmail) {
      params.push(configuredEmail);
      filters.push(`LOWER(u.email) <> $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      filters.push(`(LOWER(u.email) LIKE $${params.length} OR LOWER(u.display_name) LIKE $${params.length})`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
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
    const result = await adminQuery<any>(sql, params);
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
    const target = await protectedSystemAdministrator(req.params.id);
    if (!target.exists) return res.status(404).json({ error: 'User not found' });
    if (target.protected) return res.status(403).json({ error: 'The system administrator account cannot be modified here' });
    if (req.params.id === req.user?.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot demote yourself' });
    }
    const result = await adminQuery(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role',
      [role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    await clearCache('admin:stats');
    queueFullAppSnapshot();
    res.json({ ok: true, user: result.rows[0] });
  } catch (e: any) {
    console.error('admin update user role error', e);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', requireAdmin, async (req: any, res) => {
  try {
    const target = await protectedSystemAdministrator(req.params.id);
    if (!target.exists) return res.status(404).json({ error: 'User not found' });
    if (target.protected) return res.status(403).json({ error: 'The system administrator account cannot be deleted' });
    if (req.params.id === req.user?.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const result = await adminQuery('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    await clearCache('admin:stats');
    queueFullAppSnapshot();
    res.json({ ok: true });
  } catch (e: any) {
    console.error('admin delete user error', e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ----------------------------------------------------- CONTACT MESSAGES
router.get('/messages', requireAdmin, async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const params: any[] = [];
    const filters: string[] = [];
    if (status !== 'all' && ['unread', 'read', 'archived'].includes(status)) {
      params.push(status);
      filters.push(`status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      filters.push(`(LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(subject) LIKE $${params.length} OR LOWER(message) LIKE $${params.length})`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await adminQuery<any>(
      `SELECT id, name, email, subject, message, status, created_at, updated_at
         FROM contact_messages ${where} ORDER BY created_at DESC LIMIT 500`,
      params,
    );
    res.json({ messages: result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      subject: r.subject,
      message: r.message,
      status: r.status,
      createdAt: new Date(r.created_at).getTime(),
      updatedAt: new Date(r.updated_at).getTime(),
    })) });
  } catch (error) {
    console.error('admin list messages error', error);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

router.patch('/messages/:id', requireAdmin, async (req, res) => {
  const status = req.body?.status;
  if (!['unread', 'read', 'archived'].includes(status)) return res.status(400).json({ error: 'Invalid message status' });
  try {
    const result = await adminQuery('UPDATE contact_messages SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status', [status, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    queueFullAppSnapshot();
    res.json({ ok: true, message: result.rows[0] });
  } catch (error) {
    console.error('admin update message error', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

router.delete('/messages/:id', requireAdmin, async (req, res) => {
  try {
    const result = await adminQuery('DELETE FROM contact_messages WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    queueFullAppSnapshot();
    res.json({ ok: true });
  } catch (error) {
    console.error('admin delete message error', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ----------------------------------------------------- SITE SETTINGS / THEME
// GET is intentionally public so the storefront can read brand/theme.
router.get('/settings', async (_req, res) => {
  try {
    const result = await adminQuery<any>(`SELECT * FROM site_settings WHERE id = 'default'`);
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
    await adminQuery(
      `UPDATE site_settings
       SET site_name = $1, tagline = $2, primary_color = $3, accent_color = $4,
           hero_image = $5, shipping_ktm = $6, shipping_outside = $7, free_shipping_threshold = $8, footer_text_1 = $9, footer_text_2 = $10, footer_text_3 = $11, footer_link_1 = $12, footer_link_2 = $13, footer_company = $14, privacy_content = $15, terms_content = $16, admin_pin = $17, updated_at = NOW()
       WHERE id = 'default'`,
      [siteName, tagline, primaryColor, accentColor, heroImage || '', Number(shippingKtm || 100), Number(shippingOutside || 150), Number(freeShippingThreshold || 5000), footerText1 || 'Secure SSL Checkout', footerText2 || '30-Day Easy Returns', footerText3 || 'Global Shipping Available', footerLink1 || 'Privacy', footerLink2 || 'Terms', footerCompany || 'BOOKSELLNP MEDIA GROUP', privacyContent || '', termsContent || '', adminPin || '2063']
    );
    queueFullAppSnapshot();
    res.json({ ok: true });
  } catch (e: any) {
    console.error('admin save settings error', e);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;

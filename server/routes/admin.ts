import { Router } from 'express';
import { query } from '../db';
import { requireAdmin } from '../auth';

const router = Router();

const ALLOWED_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
type OrderStatus = (typeof ALLOWED_STATUSES)[number];

router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const [books, users, orders, revenue, lowStock, topGenres, recentOrders, dailyOrders, statusCounts] =
      await Promise.all([
        query<{ count: string }>('SELECT COUNT(*)::text AS count FROM books'),
        query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
        query<{ count: string }>('SELECT COUNT(*)::text AS count FROM orders'),
        query<{ sum: string | null }>(
          `SELECT COALESCE(SUM(total), 0)::text AS sum FROM orders WHERE status <> 'cancelled'`
        ),
        query<{ count: string }>('SELECT COUNT(*)::text AS count FROM books WHERE stock <= 5'),
        query<{ genre: string; count: string }>(
          `SELECT genre, COUNT(*)::text AS count FROM books GROUP BY genre ORDER BY COUNT(*) DESC LIMIT 6`
        ),
        query<any>(
          `SELECT id, customer_name, customer_email, total, status, created_at, items_json
           FROM orders ORDER BY created_at DESC LIMIT 5`
        ),
        query<{ day: string; count: string; revenue: string }>(
          `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                  COUNT(*)::text AS count,
                  COALESCE(SUM(total), 0)::text AS revenue
           FROM orders
           WHERE created_at >= NOW() - INTERVAL '14 days'
           GROUP BY day
           ORDER BY day`
        ),
        query<{ status: string; count: string }>(
          `SELECT status, COUNT(*)::text AS count FROM orders GROUP BY status`
        ),
      ]);

    res.json({
      totalBooks: Number(books.rows[0].count),
      totalUsers: Number(users.rows[0].count),
      totalOrders: Number(orders.rows[0].count),
      totalRevenue: Number(revenue.rows[0].sum || 0),
      lowStockCount: Number(lowStock.rows[0].count),
      topGenres: topGenres.rows.map((r) => ({ genre: r.genre, count: Number(r.count) })),
      recentOrders: recentOrders.rows.map((r) => ({
        id: r.id,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        total: Number(r.total),
        status: r.status,
        itemCount: Array.isArray(r.items_json) ? r.items_json.length : 0,
        createdAt: new Date(r.created_at).getTime(),
      })),
      dailyOrders: dailyOrders.rows.map((r) => ({
        day: r.day,
        count: Number(r.count),
        revenue: Number(r.revenue),
      })),
      statusCounts: statusCounts.rows.reduce((acc, r) => {
        acc[r.status] = Number(r.count);
        return acc;
      }, {} as Record<string, number>),
    });
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

    let sql = `SELECT id, user_id, customer_email, customer_name, shipping_address,
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
        shippingAddress: r.shipping_address,
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
    const { siteName, tagline, primaryColor, accentColor, heroImage } = req.body || {};
    const isHex = (s: any) => typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s);
    if (!siteName || !tagline) return res.status(400).json({ error: 'Site name and tagline are required' });
    if (!isHex(primaryColor) || !isHex(accentColor)) {
      return res.status(400).json({ error: 'Colors must be hex like #2563eb' });
    }
    await query(
      `UPDATE site_settings
       SET site_name = $1, tagline = $2, primary_color = $3, accent_color = $4,
           hero_image = $5, updated_at = NOW()
       WHERE id = 'default'`,
      [siteName, tagline, primaryColor, accentColor, heroImage || '']
    );
    res.json({ ok: true });
  } catch (e: any) {
    console.error('admin save settings error', e);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;

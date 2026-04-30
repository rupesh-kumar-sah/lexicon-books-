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

export default router;

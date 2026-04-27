import { Router } from 'express';
import { query } from '../db';
import { newId, requireAuth } from '../auth';

const router = Router();

const SHIPPING_FEE = 4.99;
const FREE_SHIPPING_THRESHOLD = 50;

router.post('/', async (req, res) => {
  try {
    const { items, customer } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items in order' });
    }
    if (!customer?.email || !customer?.firstName || !customer?.address) {
      return res.status(400).json({ error: 'Missing customer information' });
    }

    const subtotal = items.reduce(
      (sum: number, i: any) => sum + Number(i.price) * Number(i.quantity),
      0
    );
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = subtotal + shipping;

    const id = newId();
    const customerName = `${customer.firstName} ${customer.lastName || ''}`.trim();
    const shippingAddress = `${customer.address}, ${customer.city || ''} ${customer.zip || ''}, ${customer.country || ''}`.trim();

    await query(
      `INSERT INTO orders (id, user_id, customer_email, customer_name, shipping_address, items_json, subtotal, shipping, total, status)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, 'pending')`,
      [
        id,
        req.user?.id || null,
        customer.email,
        customerName,
        shippingAddress,
        JSON.stringify(items),
        subtotal,
        shipping,
        total,
      ]
    );

    res.json({ orderId: id, subtotal, shipping, total });
  } catch (e: any) {
    console.error('create order error', e);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await query<any>(
      'SELECT id, items_json, subtotal, shipping, total, status, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json({
      orders: result.rows.map((r) => ({
        id: r.id,
        items: r.items_json,
        subtotal: Number(r.subtotal),
        shipping: Number(r.shipping),
        total: Number(r.total),
        status: r.status,
        createdAt: new Date(r.created_at).getTime(),
      })),
    });
  } catch (e) {
    console.error('list my orders', e);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

export default router;

import { Router } from 'express';
import { pool, query } from '../db';
import { newId, requireAuth } from '../auth';
import { notifyOrderCreated } from '../integrations/google';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  const { items, customer } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items in order' });
  }
  if (!customer || !customer?.firstName || !customer?.address || !customer?.phone) {
    return res.status(400).json({ error: 'Missing customer information (name, address, and phone are required)' });
  }

  const customerEmail = customer.email?.toLowerCase() || req.user!.email.toLowerCase();
  const customerFirstName = customer.firstName || req.user!.displayName.split(' ')[0] || '';
  const customerLastName = customer.lastName || req.user!.displayName.split(' ').slice(1).join(' ') || '';

  if (customer.email && customer.email.toLowerCase() !== req.user!.email.toLowerCase()) {
    return res.status(400).json({ error: 'Order email must match your authenticated account email' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch site settings for shipping calculation
    const settingsResult = await client.query('SELECT * FROM site_settings WHERE id = \'default\'');
    const settings = settingsResult.rows[0];
    
    const shippingKtm = Number(settings?.shipping_ktm || 100);
    const shippingOutside = Number(settings?.shipping_outside || 150);
    const freeShippingThreshold = Number(settings?.free_shipping_threshold || 5000);

    // Lock and check stock for each book
    for (const i of items) {
      const qty = Math.max(1, Math.floor(Number(i.quantity) || 0));
      const r = await client.query<{ stock: number; title: string }>(
        'SELECT stock, title FROM books WHERE id = $1 FOR UPDATE',
        [i.id]
      );
      if (r.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Book not found in catalog` });
      }
      if (r.rows[0].stock < qty) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Only ${r.rows[0].stock} copies of "${r.rows[0].title}" remain in stock`,
        });
      }
    }

    // Decrement stock
    for (const i of items) {
      const qty = Math.max(1, Math.floor(Number(i.quantity) || 0));
      await client.query('UPDATE books SET stock = stock - $1 WHERE id = $2', [qty, i.id]);
    }

    const subtotal = items.reduce(
      (sum: number, i: any) => sum + Number(i.price) * Number(i.quantity),
      0
    );
    
    // Determine shipping fee based on location and threshold
    const isOutside = customer.city?.toLowerCase().includes('kathmandu') === false && 
                      customer.address?.toLowerCase().includes('kathmandu') === false;
    
    let shipping = 0;
    if (subtotal < freeShippingThreshold) {
      shipping = isOutside ? shippingOutside : shippingKtm;
    }
    
    const total = subtotal + shipping;

    const id = newId();
    const customerName = `${customerFirstName} ${customerLastName || ''}`.trim();
    const shippingAddress = `${customer.address}, ${customer.city || ''} ${customer.zip || ''}, ${customer.country || ''}`.trim();

    await client.query(
      `INSERT INTO orders (id, user_id, customer_email, customer_name, customer_phone, shipping_address, location_coords, items_json, subtotal, shipping, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, 'pending')`,
      [
        id,
        req.user!.id,
        customerEmail,
        customerName,
        customer.phone,
        shippingAddress,
        customer.locationCoords ? JSON.stringify(customer.locationCoords) : null,
        JSON.stringify(items),
        subtotal,
        shipping,
        total,
      ]
    );

    await client.query('COMMIT');
    void notifyOrderCreated({
      id,
      customerEmail,
      customerName,
      customerPhone: customer.phone,
      shippingAddress,
      locationCoords: customer.locationCoords ? {
        lat: Number(customer.locationCoords.lat ?? customer.locationCoords.latitude),
        lng: Number(customer.locationCoords.lng ?? customer.locationCoords.longitude),
      } : null,
      items,
      subtotal,
      shipping,
      total,
      status: 'pending',
      createdAt: new Date(),
    });
    res.json({ orderId: id, subtotal, shipping, total });
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('create order error', e);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await query<any>(
      `SELECT id, items_json, subtotal, shipping, total, status, customer_name, customer_phone, shipping_address, location_coords, created_at
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
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
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        shippingAddress: r.shipping_address,
        locationCoords: r.location_coords,
        createdAt: new Date(r.created_at).getTime(),
      })),
    });
  } catch (e) {
    console.error('list my orders', e);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await query<any>(
      `SELECT id, user_id, items_json, subtotal, shipping, total, status,
              customer_name, customer_email, customer_phone, shipping_address, location_coords, created_at
       FROM orders WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const r = result.rows[0];
    if (r.user_id && r.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }
    res.json({
      order: {
        id: r.id,
        items: r.items_json,
        subtotal: Number(r.subtotal),
        shipping: Number(r.shipping),
        total: Number(r.total),
        status: r.status,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        customerPhone: r.customer_phone,
        shippingAddress: r.shipping_address,
        locationCoords: r.location_coords,
        createdAt: new Date(r.created_at).getTime(),
      },
    });
  } catch (e) {
    console.error('get order', e);
    res.status(500).json({ error: 'Failed to load order' });
  }
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query<any>(
      'SELECT user_id, status, items_json FROM orders WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (r.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = r.rows[0];
    if (order.user_id !== req.user!.id && req.user!.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (!['pending', 'processing'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot cancel an order that is ${order.status}` });
    }
    // Restock
    for (const i of order.items_json || []) {
      const qty = Math.max(1, Math.floor(Number(i.quantity) || 0));
      await client.query('UPDATE books SET stock = stock + $1 WHERE id = $2', [qty, i.id]);
    }
    await client.query(`UPDATE orders SET status = 'cancelled' WHERE id = $1`, [req.params.id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('cancel order error', e);
    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

export default router;

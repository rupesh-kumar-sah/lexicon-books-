import { Router } from 'express';
import { pool, query } from '../db';
import { newId, requireAuth } from '../auth';
import { notifyOrderCreated, queueFullAppSnapshot } from '../integrations/google';

const router = Router();

const MAX_ORDER_LINES = 25;
const MAX_ITEM_QUANTITY = 100;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const MAX_ADDRESS_LENGTH = 500;
const MAX_CITY_LENGTH = 120;
const MAX_NAME_LENGTH = 120;
const MAX_POSTAL_LENGTH = 32;
const MAX_COUNTRY_LENGTH = 80;

type DeliveryArea = 'ktm' | 'outside';
type Coordinates = { lat: number; lng: number };
type ValidatedCustomer = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  deliveryArea: DeliveryArea;
  locationCoords: Coordinates;
};

type RequestedLine = { id: string; quantity: number };

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function validCoordinates(value: unknown): Coordinates | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const lat = Number(input.lat ?? input.latitude);
  const lng = Number(input.lng ?? input.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function validateRequestedLines(value: unknown): { lines: RequestedLine[] } | { error: string } {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ORDER_LINES) {
    return { error: `An order must contain between 1 and ${MAX_ORDER_LINES} items.` };
  }

  const grouped = new Map<string, number>();
  for (const item of value) {
    const raw = item && typeof item === 'object' ? item as Record<string, unknown> : null;
    const id = typeof raw?.id === 'string' ? raw.id.trim() : '';
    const quantity = Number(raw?.quantity);
    if (!id || id.length > 128 || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      return { error: `Each item must have a valid identifier and quantity from 1 to ${MAX_ITEM_QUANTITY}.` };
    }
    const nextQuantity = (grouped.get(id) || 0) + quantity;
    if (nextQuantity > MAX_ITEM_QUANTITY) {
      return { error: `A single title cannot exceed ${MAX_ITEM_QUANTITY} copies in one order.` };
    }
    grouped.set(id, nextQuantity);
  }

  return { lines: [...grouped.entries()].map(([id, quantity]) => ({ id, quantity })) };
}

function validateCustomer(value: unknown, authenticatedEmail: string): ValidatedCustomer | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Shipping information is required.' };
  const customer = value as Record<string, unknown>;
  const requestedEmail = typeof customer.email === 'string' ? customer.email.trim().toLowerCase() : authenticatedEmail;
  if (requestedEmail !== authenticatedEmail.toLowerCase()) return { error: 'Order email must match your authenticated account email.' };

  const firstName = cleanText(customer.firstName, MAX_NAME_LENGTH);
  const lastName = typeof customer.lastName === 'string' ? customer.lastName.trim().slice(0, MAX_NAME_LENGTH) : '';
  const phone = typeof customer.phone === 'string' ? customer.phone.replace(/\s/g, '') : '';
  const address = cleanText(customer.address, MAX_ADDRESS_LENGTH);
  const city = cleanText(customer.city, MAX_CITY_LENGTH);
  const zip = cleanText(customer.zip, MAX_POSTAL_LENGTH);
  const country = cleanText(customer.country ?? 'Nepal', MAX_COUNTRY_LENGTH);
  const deliveryArea = customer.deliveryArea;
  const locationCoords = validCoordinates(customer.locationCoords);

  if (!firstName || !address || !city || !zip || !country) return { error: 'Complete your name, address, city, postal code, and country before ordering.' };
  if (!/^9\d{9}$/.test(phone)) return { error: 'Enter a valid 10-digit Nepali mobile number beginning with 9.' };
  if (deliveryArea !== 'ktm' && deliveryArea !== 'outside') return { error: 'Select a delivery area before ordering.' };
  if (!locationCoords) return { error: 'Provide a valid delivery location before ordering.' };

  return { email: authenticatedEmail.toLowerCase(), firstName, lastName, phone, address, city, zip, country, deliveryArea, locationCoords };
}

function isIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) && value.length >= 16 && value.length <= MAX_IDEMPOTENCY_KEY_LENGTH;
}

function toOrderResponse(row: any, repeated = false) {
  return {
    orderId: row.id,
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    total: Number(row.total),
    ...(repeated ? { repeated: true } : {}),
  };
}

router.post('/', requireAuth, async (req, res) => {
  const idempotencyKey = req.get('Idempotency-Key');
  if (!isIdempotencyKey(idempotencyKey)) {
    return res.status(400).json({ error: 'A valid checkout idempotency key is required. Refresh the checkout page and try again.' });
  }

  const requestedLines = validateRequestedLines(req.body?.items);
  if ('error' in requestedLines) return res.status(400).json({ error: requestedLines.error });
  const customer = validateCustomer(req.body?.customer, req.user!.email);
  if ('error' in customer) return res.status(400).json({ error: customer.error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const replay = await client.query<any>(
      'SELECT id, subtotal, shipping, total FROM orders WHERE user_id = $1 AND idempotency_key = $2',
      [req.user!.id, idempotencyKey],
    );
    if (replay.rows.length > 0) {
      await client.query('COMMIT');
      return res.json(toOrderResponse(replay.rows[0], true));
    }

    const settingsResult = await client.query('SELECT shipping_ktm, shipping_outside, free_shipping_threshold FROM site_settings WHERE id = $1', ['default']);
    const settings = settingsResult.rows[0];
    const shippingKtm = Number(settings?.shipping_ktm ?? 100);
    const shippingOutside = Number(settings?.shipping_outside ?? 150);
    const freeShippingThreshold = Number(settings?.free_shipping_threshold ?? 5000);

    const sortedIds = requestedLines.lines.map((line) => line.id).sort();
    const booksResult = await client.query<any>(
      `SELECT id, title, author, cover_image, price, stock
         FROM books
        WHERE id = ANY($1::text[])
        ORDER BY id
        FOR UPDATE`,
      [sortedIds],
    );
    const booksById = new Map(booksResult.rows.map((book) => [book.id, book]));
    const canonicalItems: Array<{ id: string; title: string; author: string; coverImage: string; price: number; quantity: number }> = [];

    for (const line of requestedLines.lines) {
      const book = booksById.get(line.id);
      if (!book) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'A requested book is no longer available in the catalog. Refresh your cart and try again.' });
      }
      if (Number(book.stock) < line.quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Only ${book.stock} copies of "${book.title}" remain in stock.` });
      }
      canonicalItems.push({
        id: book.id,
        title: book.title,
        author: book.author,
        coverImage: book.cover_image,
        price: Number(book.price),
        quantity: line.quantity,
      });
    }

    for (const item of canonicalItems) {
      const update = await client.query('UPDATE books SET stock = stock - $1 WHERE id = $2 AND stock >= $1', [item.quantity, item.id]);
      if (update.rowCount !== 1) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Stock changed while processing your order. Refresh your cart and try again.' });
      }
    }

    const subtotal = Number(canonicalItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
    const shipping = subtotal >= freeShippingThreshold ? 0 : Number((customer.deliveryArea === 'ktm' ? shippingKtm : shippingOutside).toFixed(2));
    const total = Number((subtotal + shipping).toFixed(2));
    const id = newId();
    const customerName = `${customer.firstName} ${customer.lastName}`.trim();
    const shippingAddress = `${customer.address}, ${customer.city} ${customer.zip}, ${customer.country}`.trim();

    await client.query(
      `INSERT INTO orders (id, user_id, idempotency_key, customer_email, customer_name, customer_phone, shipping_address, location_coords, items_json, subtotal, shipping, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, 'pending')`,
      [id, req.user!.id, idempotencyKey, customer.email, customerName, customer.phone, shippingAddress, JSON.stringify(customer.locationCoords), JSON.stringify(canonicalItems), subtotal, shipping, total],
    );

    await client.query('COMMIT');
    queueFullAppSnapshot();
    void notifyOrderCreated({
      id,
      customerEmail: customer.email,
      customerName,
      customerPhone: customer.phone,
      shippingAddress,
      locationCoords: customer.locationCoords,
      items: canonicalItems,
      subtotal,
      shipping,
      total,
      status: 'pending',
      createdAt: new Date(),
    });
    return res.status(201).json({ orderId: id, subtotal, shipping, total });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (error?.code === '23505') {
      try {
        const replay = await query<any>('SELECT id, subtotal, shipping, total FROM orders WHERE user_id = $1 AND idempotency_key = $2', [req.user!.id, idempotencyKey]);
        if (replay.rows.length > 0) return res.json(toOrderResponse(replay.rows[0], true));
      } catch (replayError) {
        console.error('checkout replay lookup error', replayError);
      }
    }
    console.error('create order error', error);
    return res.status(500).json({ error: 'Checkout could not be completed. Please try again.' });
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
  } catch (error) {
    console.error('list my orders', error);
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
    const order = result.rows[0];
    if (order.user_id && order.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }
    return res.json({
      order: {
        id: order.id,
        items: order.items_json,
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        total: Number(order.total),
        status: order.status,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        shippingAddress: order.shipping_address,
        locationCoords: order.location_coords,
        createdAt: new Date(order.created_at).getTime(),
      },
    });
  } catch (error) {
    console.error('get order', error);
    return res.status(500).json({ error: 'Failed to load order' });
  }
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<any>(
      'SELECT user_id, status, items_json FROM orders WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = result.rows[0];
    if (order.user_id !== req.user!.id && req.user!.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (!['pending', 'processing'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot cancel an order that is ${order.status}` });
    }
    for (const item of order.items_json || []) {
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0));
      await client.query('UPDATE books SET stock = stock + $1 WHERE id = $2', [quantity, item.id]);
    }
    await client.query(`UPDATE orders SET status = 'cancelled' WHERE id = $1`, [req.params.id]);
    await client.query('COMMIT');
    queueFullAppSnapshot();
    return res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('cancel order error', error);
    return res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

export default router;

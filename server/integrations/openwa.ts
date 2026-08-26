import { query } from '../db';
import { newId } from '../auth';
import type { IntegrationOrder } from './google';

export type WhatsAppOrder = IntegrationOrder & { userId?: string | null };

type NotificationKind =
  | 'admin_order_received'
  | 'customer_order_received'
  | 'customer_order_processing'
  | 'customer_order_shipped'
  | 'customer_order_delivered'
  | 'customer_order_cancelled';

type GatewayResponse = { messageId?: string; id?: string };

const OPENWA_TIMEOUT_MS = 10_000;

type QueryFunction = typeof query;
type FetchFunction = typeof fetch;
let queryImplementation: QueryFunction = query;
let fetchImplementation: FetchFunction = fetch;

/**
 * Test-only dependency override. It is not called by application routes and is
 * blocked in production so deployment code always uses the real database and gateway client.
 */
export function setOpenWaTestDependencies(dependencies: { query?: QueryFunction; fetch?: FetchFunction }): void {
  if (process.env.NODE_ENV === 'production') throw new Error('OpenWA test dependencies cannot be changed in production.');
  queryImplementation = dependencies.query || query;
  fetchImplementation = dependencies.fetch || fetch;
}

function config() {
  const baseUrl = (process.env.OPENWA_BASE_URL || '').trim().replace(/\/$/, '');
  const apiKey = (process.env.OPENWA_API_KEY || '').trim();
  const sessionId = (process.env.OPENWA_SESSION_ID || '').trim();
  const adminRecipient = (process.env.OPENWA_ADMIN_RECIPIENT || '').trim();
  const enabled = process.env.OPENWA_ENABLED === 'true';
  return { baseUrl, apiKey, sessionId, adminRecipient, enabled };
}

function normalizeNepalPhone(value: string | null | undefined): string | null {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^9\d{9}$/.test(digits)) return `977${digits}`;
  if (/^9779\d{9}$/.test(digits)) return digits;
  return null;
}

function chatId(phone: string | null | undefined): string | null {
  const normalized = normalizeNepalPhone(phone);
  return normalized ? `${normalized}@c.us` : null;
}

function configured() {
  const value = config();
  return Boolean(value.enabled && value.baseUrl && value.apiKey && value.sessionId);
}

function orderLines(order: WhatsAppOrder) {
  return order.items
    .map((item) => `• ${item.title || 'Book'} × ${Number(item.quantity || 0)}`)
    .join('\n');
}

function customerMessage(order: WhatsAppOrder, status: string): string | null {
  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const name = order.customerName || 'Customer';
  const messages: Record<string, string> = {
    pending: [
      `Hello ${name}, your Lexicon Books order #${orderNumber} has been received.`,
      '',
      orderLines(order),
      '',
      `Total: Rs.${Number(order.total).toFixed(2)} (Cash on delivery).`,
      'We will send another update when your order is being prepared.',
      'You can disable future WhatsApp order updates in Your Account.',
    ].join('\n'),
    processing: `Hello ${name}, your Lexicon Books order #${orderNumber} is now being prepared. We will notify you when it is dispatched.`,
    shipped: `Hello ${name}, your Lexicon Books order #${orderNumber} has been dispatched. Please keep your phone available for delivery coordination.`,
    delivered: `Hello ${name}, your Lexicon Books order #${orderNumber} is marked delivered. Thank you for reading with Lexicon Books.`,
    cancelled: `Hello ${name}, your Lexicon Books order #${orderNumber} has been cancelled. No delivery will be made for this order.`,
  };
  return messages[status] || null;
}

function notificationKindForStatus(status: string): NotificationKind | null {
  const map: Record<string, NotificationKind> = {
    pending: 'customer_order_received',
    processing: 'customer_order_processing',
    shipped: 'customer_order_shipped',
    delivered: 'customer_order_delivered',
    cancelled: 'customer_order_cancelled',
  };
  return map[status] || null;
}

async function sendText(recipientChatId: string, text: string): Promise<GatewayResponse> {
  const { baseUrl, apiKey, sessionId } = config();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENWA_TIMEOUT_MS);
  try {
    const response = await fetchImplementation(`${baseUrl}/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ chatId: recipientChatId, text }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`OpenWA responded with ${response.status}`);
    return body as GatewayResponse;
  } finally {
    clearTimeout(timeout);
  }
}

async function queueAndSend(orderId: string, kind: NotificationKind, recipientPhone: string, text: string): Promise<void> {
  if (!configured()) {
    console.info('[OpenWA] Notification skipped: gateway is not configured or disabled.');
    return;
  }

  const recipientChatId = chatId(recipientPhone);
  if (!recipientChatId) {
    console.warn(`[OpenWA] Notification skipped for ${orderId}: recipient phone is invalid.`);
    return;
  }

  const inserted = await queryImplementation<{ id: string }>(
    `INSERT INTO whatsapp_notifications (id, order_id, notification_kind, recipient_phone, status)
     VALUES ($1, $2, $3, $4, 'queued')
     ON CONFLICT (order_id, notification_kind, recipient_phone) DO NOTHING
     RETURNING id`,
    [newId(), orderId, kind, recipientPhone],
  );
  const notificationId = inserted.rows[0]?.id;
  if (!notificationId) return;

  try {
    const result = await sendText(recipientChatId, text);
    await queryImplementation(
      `UPDATE whatsapp_notifications
          SET status = 'sent', provider_message_id = $2, sent_at = NOW(), updated_at = NOW()
        WHERE id = $1`,
      [notificationId, result.messageId || result.id || null],
    );
    console.info(`[OpenWA] ${kind} notification sent for order ${orderId}.`);
  } catch (error) {
    await queryImplementation(
      `UPDATE whatsapp_notifications
          SET status = 'failed', error_message = $2, updated_at = NOW()
        WHERE id = $1`,
      [notificationId, error instanceof Error ? error.message.slice(0, 500) : 'Unknown gateway error'],
    ).catch(() => undefined);
    console.error(`[OpenWA] ${kind} notification failed for order ${orderId}:`, error instanceof Error ? error.message : error);
  }
}

async function customerHasTransactionalConsent(order: WhatsAppOrder): Promise<boolean> {
  if (!order.userId || !order.customerPhone) return false;
  const preference = await queryImplementation<{ transactional_opt_in: boolean }>(
    `SELECT transactional_opt_in
       FROM whatsapp_preferences
      WHERE user_id = $1 AND phone = $2`,
    [order.userId, order.customerPhone.replace(/\s/g, '')],
  );
  return preference.rows[0]?.transactional_opt_in === true;
}

export async function notifyOpenWaOrderCreated(order: WhatsAppOrder): Promise<void> {
  try {
    if (!configured()) return;
    const adminRecipient = config().adminRecipient;
    if (adminRecipient) {
      const orderNumber = order.id.slice(0, 8).toUpperCase();
      const adminText = [
        `New Lexicon Books order #${orderNumber}`,
        `Customer: ${order.customerName}`,
        `Phone: ${order.customerPhone || 'Not provided'}`,
        `Total: Rs.${Number(order.total).toFixed(2)}`,
        '',
        orderLines(order),
      ].join('\n');
      await queueAndSend(order.id, 'admin_order_received', adminRecipient, adminText);
    }

    if (!(await customerHasTransactionalConsent(order))) return;
    const text = customerMessage(order, 'pending');
    if (text && order.customerPhone) await queueAndSend(order.id, 'customer_order_received', order.customerPhone, text);
  } catch (error) {
    console.error(`[OpenWA] Order-created notification processing failed for ${order.id}:`, error instanceof Error ? error.message : error);
  }
}

export async function notifyOpenWaOrderStatus(order: WhatsAppOrder, status: string): Promise<void> {
  try {
    if (!configured()) return;
    const kind = notificationKindForStatus(status);
    if (!kind || !(await customerHasTransactionalConsent(order))) return;
    const text = customerMessage(order, status);
    if (text && order.customerPhone) await queueAndSend(order.id, kind, order.customerPhone, text);
  } catch (error) {
    console.error(`[OpenWA] Order-status notification processing failed for ${order.id}:`, error instanceof Error ? error.message : error);
  }
}

export function openWaIntegrationStatus() {
  const value = config();
  return {
    configured: configured(),
    enabled: value.enabled,
    mode: 'transactional-order-notifications',
    senderSessionConfigured: Boolean(value.sessionId),
    adminRecipientConfigured: Boolean(chatId(value.adminRecipient)),
  };
}

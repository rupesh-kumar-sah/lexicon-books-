type WhatsAppOrder = import('../server/integrations/openwa').WhatsAppOrder;

const openWaKeys = ['OPENWA_ENABLED', 'OPENWA_BASE_URL', 'OPENWA_API_KEY', 'OPENWA_SESSION_ID', 'OPENWA_ADMIN_RECIPIENT'] as const;
const originalEnvironment = Object.fromEntries(openWaKeys.map((key) => [key, process.env[key]]));
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalNodeEnv = process.env.NODE_ENV;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

try {
  process.env.NODE_ENV = 'test';
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';

  const {
    notifyOpenWaOrderCreated,
    notifyOpenWaOrderStatus,
    setOpenWaTestDependencies,
  } = await import('../server/integrations/openwa');

  let consent = true;
  let queryCalls = 0;
  const notificationKeys = new Set<string>();
  const sentRequests: Array<{ url: string; chatId: string; text: string; apiKey: string | null }> = [];

  const testQuery = async <T = Record<string, unknown>>(sql: string, values: unknown[] = []) => {
    queryCalls += 1;
    if (sql.includes('FROM whatsapp_preferences')) {
      return { rows: consent ? [{ transactional_opt_in: true }] as T[] : [] as T[] };
    }
    if (sql.includes('INSERT INTO whatsapp_notifications')) {
      const [id, orderId, kind, recipient] = values;
      const notificationKey = `${orderId}:${kind}:${recipient}`;
      if (notificationKeys.has(notificationKey)) return { rows: [] as T[] };
      notificationKeys.add(notificationKey);
      return { rows: [{ id }] as T[] };
    }
    if (sql.includes('UPDATE whatsapp_notifications')) return { rows: [] as T[] };
    throw new Error(`Unexpected test query: ${sql.slice(0, 80)}`);
  };

  const testFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const body = await request.json() as { chatId: string; text: string };
    sentRequests.push({
      url: request.url,
      chatId: body.chatId,
      text: body.text,
      apiKey: request.headers.get('X-API-Key'),
    });
    return new Response(JSON.stringify({ messageId: `mock-${sentRequests.length}` }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  setOpenWaTestDependencies({ query: testQuery as any, fetch: testFetch });

  const order: WhatsAppOrder = {
    id: 'order-transactional-test',
    userId: 'user-transactional-test',
    customerEmail: 'customer@example.test',
    customerName: 'Test Customer',
    customerPhone: '9812345678',
    shippingAddress: 'Test address',
    items: [{ title: 'Test Book', quantity: 2, price: 500 }],
    subtotal: 1000,
    shipping: 100,
    total: 1100,
    status: 'pending',
  };

  process.env.OPENWA_ENABLED = 'false';
  process.env.OPENWA_BASE_URL = 'https://gateway.example.test/api';
  process.env.OPENWA_API_KEY = 'test-openwa-key';
  process.env.OPENWA_SESSION_ID = 'session-test';
  process.env.OPENWA_ADMIN_RECIPIENT = '9800000000';
  await notifyOpenWaOrderCreated(order);
  const disabledSendCount = sentRequests.length;
  const disabledQueryCount = queryCalls;
  assert(disabledSendCount === 0 && disabledQueryCount === 0, 'Disabled OpenWA must not query preferences or send a message.');

  process.env.OPENWA_ENABLED = 'true';
  consent = false;
  await notifyOpenWaOrderCreated(order);
  const adminAlertCount = sentRequests.length;
  assert(adminAlertCount === 1, 'A configured admin recipient should receive the order alert.');
  assert(sentRequests[0].chatId === '9779800000000@c.us', 'Admin alert was not normalized to the expected chat ID.');
  assert(!sentRequests[0].text.includes('Reply STOP'), 'Admin alert must not use customer opt-out copy.');

  consent = true;
  await notifyOpenWaOrderCreated(order);
  const customerReceivedCount = sentRequests.length;
  assert(customerReceivedCount === 2, 'Explicit consent should enable the customer order-received notification.');
  assert(sentRequests[1].chatId === '9779812345678@c.us', 'Customer notification was not routed to the customer chat ID.');
  assert(sentRequests[1].text.includes('disable future WhatsApp order updates in Your Account'), 'Customer transactional message must include its account opt-out instruction.');
  assert(sentRequests.every((request) => request.url.endsWith('/api/sessions/session-test/messages/send-text')), 'OpenWA send endpoint is incorrect.');
  assert(sentRequests.every((request) => request.apiKey === 'test-openwa-key'), 'OpenWA API key header was not supplied.');

  await notifyOpenWaOrderStatus(order, 'processing');
  await notifyOpenWaOrderStatus(order, 'processing');
  const processingStatusCount = sentRequests.length;
  assert(processingStatusCount === 3, 'Duplicate processing-status notifications must be suppressed.');

  console.log('OPENWA ADAPTER BEHAVIOR TEST PASSED');

  setOpenWaTestDependencies({});
} finally {
  for (const key of openWaKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
}

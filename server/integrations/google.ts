import { google, sheets_v4 } from 'googleapis';
import { appendFile } from 'node:fs/promises';

export type IntegrationOrder = {
  id: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string | null;
  shippingAddress: string;
  locationCoords?: { lat: number; lng: number } | null;
  items: Array<{ title?: string; quantity?: number; price?: number }>;
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  createdAt?: Date | string | number;
};

function adminEmail() {
  return process.env.ORDER_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || '';
}

function sheetId() {
  return process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
}

function sheetOrderRange() {
  return process.env.GOOGLE_SHEETS_ORDER_RANGE || 'Orders!A:O';
}

function sheetBookRange() {
  return process.env.GOOGLE_SHEETS_BOOK_RANGE || 'Books!A:H';
}

function sheetUserRange() {
  return process.env.GOOGLE_SHEETS_USER_RANGE || 'Users!A:E';
}

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const credentials = JSON.parse(raw);
    if (credentials.private_key) credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    return credentials;
  } catch (error) {
    console.error('[Google] Invalid GOOGLE_SERVICE_ACCOUNT_JSON:', error instanceof Error ? error.message : error);
    return null;
  }
}

function createAuth(scopes: string[]) {
  const serviceAccount = parseServiceAccount();
  if (serviceAccount) {
    return new google.auth.GoogleAuth({ credentials: serviceAccount, scopes });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const oauth = new google.auth.OAuth2(clientId, clientSecret, process.env.GOOGLE_REDIRECT_URI);
  oauth.setCredentials({ refresh_token: refreshToken });
  return oauth;
}

function configuredForGmail() {
  return Boolean((process.env.GMAIL_SENDER || adminEmail()) && createAuth(['https://www.googleapis.com/auth/gmail.send']));
}

function configuredForEmail() {
  return Boolean(adminEmail() && configuredForGmail());
}

function configuredForSheets() {
  return Boolean(sheetId() && createAuth(['https://www.googleapis.com/auth/spreadsheets']));
}

function encodeMime(headers: Record<string, string>, body: string) {
  const message = Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join('\r\n') + `\r\n\r\n${body}`;
  return Buffer.from(message).toString('base64url');
}

function orderLines(order: IntegrationOrder) {
  return order.items.map((item) => `- ${item.title || 'Book'} × ${item.quantity || 0} @ Rs.${Number(item.price || 0).toFixed(2)}`).join('\n');
}

async function sendGmailMessage(to: string, subject: string, body: string): Promise<boolean> {
  const mockFile = process.env.MOCK_EMAIL_FILE;
  if (mockFile && process.env.NODE_ENV !== 'production') {
    await appendFile(mockFile, `${JSON.stringify({ to, subject, body })}\n`, 'utf8');
    console.info('[Google] Mock email captured.');
    return true;
  }
  if (!configuredForGmail()) {
    console.info('[Google] Email skipped: Gmail sender or credentials are not configured.');
    return false;
  }
  const auth = createAuth(['https://www.googleapis.com/auth/gmail.send']);
  if (!auth) return false;
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = encodeMime(
    {
      From: process.env.GMAIL_SENDER || adminEmail(),
      To: to,
      Subject: subject,
      'Content-Type': 'text/plain; charset=UTF-8',
    },
    body,
  );
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return true;
}

export async function sendPasswordResetCodeEmail(to: string, resetCode: string): Promise<void> {
  try {
    const sent = await sendGmailMessage(
      to,
      '[Lexicon Books] Your password reset code',
      [
        'We received a request to reset your Lexicon Books password.',
        '',
        `Your one-time reset code is: ${resetCode}`,
        `Enter this code within ${process.env.PASSWORD_RESET_TTL_MINUTES || '30'} minutes on the reset-password page.`,
        '',
        'If you did not request this, you can safely ignore this message.',
        'For your security, never share this code with anyone.',
      ].join('\n'),
    );
    if (sent) console.info('[Google] Password-reset code email sent.');
  } catch (error) {
    console.error('[Google] Password-reset code email failed:', error instanceof Error ? error.message : error);
  }
}

export async function notifyOrderCreated(order: IntegrationOrder): Promise<void> {
  if (!configuredForEmail()) {
    console.info('[Google] Order email skipped: configure ORDER_NOTIFICATION_EMAIL plus Gmail OAuth or service-account credentials.');
    return;
  }
  try {
    const auth = createAuth(['https://www.googleapis.com/auth/gmail.send']);
    if (!auth) return;
    const gmail = google.gmail({ version: 'v1', auth });
    const coords = order.locationCoords ? `${order.locationCoords.lat}, ${order.locationCoords.lng}` : 'Not captured';
    const body = [
      'New Lexicon Books order received',
      '',
      `Order: ${order.id}`,
      `Status: ${order.status}`,
      `Customer: ${order.customerName}`,
      `Email: ${order.customerEmail}`,
      `Phone: ${order.customerPhone || 'Not provided'}`,
      `Address: ${order.shippingAddress}`,
      `Location pin: ${coords}`,
      '',
      'Items:',
      orderLines(order),
      '',
      `Subtotal: Rs.${order.subtotal.toFixed(2)}`,
      `Shipping: Rs.${order.shipping.toFixed(2)}`,
      `Total: Rs.${order.total.toFixed(2)}`,
    ].join('\n');
    const raw = encodeMime(
      {
        From: process.env.GMAIL_SENDER || adminEmail(),
        To: adminEmail(),
        Subject: `[Lexicon Books] New order ${order.id.slice(0, 8).toUpperCase()}`,
        'Content-Type': 'text/plain; charset=UTF-8',
      },
      body,
    );
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    console.info(`[Google] Order notification sent for ${order.id}`);
  } catch (error) {
    console.error('[Google] Order notification failed:', error instanceof Error ? error.message : error);
  }
}

async function replaceSheetValues(sheets: sheets_v4.Sheets, range: string, values: unknown[][]) {
  const spreadsheetId = sheetId();
  if (!spreadsheetId) return;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

export async function syncFullAppSnapshot(): Promise<void> {
  if (!configuredForSheets()) {
    console.info('[Google] Sheets sync skipped: configure GOOGLE_SHEETS_SPREADSHEET_ID and Google credentials.');
    return;
  }
  try {
    const auth = createAuth(['https://www.googleapis.com/auth/spreadsheets']);
    const spreadsheetId = sheetId();
    if (!auth || !spreadsheetId) return;
    const { query } = await import('../db');
    const [books, users, orders] = await Promise.all([
      query<any>('SELECT id, title, author, price, stock, genre, year, featured FROM books ORDER BY created_at DESC'),
      query<any>('SELECT id, email, display_name, role, created_at FROM users ORDER BY created_at DESC'),
      query<any>(`SELECT id, customer_email, customer_name, customer_phone, shipping_address, location_coords, subtotal, shipping, total, status, created_at, items_json FROM orders ORDER BY created_at DESC`),
    ]);
    const orderRows = orders.rows.map((row) => {
      const coords = row.location_coords || {};
      return [row.id, row.customer_email, row.customer_name, row.customer_phone || '', row.shipping_address, coords.lat ?? coords.latitude ?? '', coords.lng ?? coords.longitude ?? '', row.subtotal, row.shipping, row.total, row.status, row.created_at, Array.isArray(row.items_json) ? row.items_json.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0) : 0];
    });
    const sheets = google.sheets({ version: 'v4', auth });
    await Promise.all([
      replaceSheetValues(sheets, sheetBookRange(), [['id', 'title', 'author', 'price', 'stock', 'genre', 'year', 'featured'], ...books.rows.map((row) => [row.id, row.title, row.author, row.price, row.stock, row.genre, row.year, row.featured])]),
      replaceSheetValues(sheets, sheetUserRange(), [['id', 'email', 'display_name', 'role', 'created_at'], ...users.rows.map((row) => [row.id, row.email, row.display_name, row.role, row.created_at])]),
      replaceSheetValues(sheets, sheetOrderRange(), [['id', 'customer_email', 'customer_name', 'customer_phone', 'shipping_address', 'latitude', 'longitude', 'subtotal', 'shipping', 'total', 'status', 'created_at', 'item_quantity'], ...orderRows]),
    ]);
    console.info('[Google] Full app snapshot synchronized to private Sheets tabs.');
  } catch (error) {
    console.error('[Google] Sheets sync failed:', error instanceof Error ? error.message : error);
  }
}

export function googleIntegrationStatus() {
  return {
    emailConfigured: configuredForEmail(),
    sheetsConfigured: configuredForSheets(),
    targetEmail: adminEmail(),
    sheetSyncIsServerOnly: true,
  };
}

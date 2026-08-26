import { query } from './db';

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    photo_url TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS users_email_idx ON users (email)`,

  `CREATE TABLE IF NOT EXISTS admin_passkeys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key BYTEA NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    transports TEXT[] NOT NULL DEFAULT '{}',
    device_type TEXT NOT NULL DEFAULT 'singleDevice',
    backed_up BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS admin_passkeys_user_id_idx ON admin_passkeys (user_id)`,
  `CREATE INDEX IF NOT EXISTS admin_passkeys_credential_id_idx ON admin_passkeys (credential_id)`,

  `CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    challenge TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS webauthn_challenges_lookup_idx ON webauthn_challenges (id, purpose, user_id)`,
  `CREATE INDEX IF NOT EXISTS webauthn_challenges_expires_at_idx ON webauthn_challenges (expires_at)`,

  `CREATE TABLE IF NOT EXISTS contact_messages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON contact_messages (status)`,
  `CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON contact_messages (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS contact_messages_email_idx ON contact_messages (email)`,

  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at)`,

  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS password_reset_tokens_hash_idx ON password_reset_tokens (token_hash)`,
  `CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens (user_id)`,
  `CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx ON password_reset_tokens (expires_at)`,

  `CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    parent_id TEXT REFERENCES auth_refresh_tokens(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS auth_refresh_tokens_hash_idx ON auth_refresh_tokens (token_hash)`,
  `CREATE INDEX IF NOT EXISTS auth_refresh_tokens_family_idx ON auth_refresh_tokens (family_id)`,
  `CREATE INDEX IF NOT EXISTS auth_refresh_tokens_user_id_idx ON auth_refresh_tokens (user_id)`,
  `CREATE INDEX IF NOT EXISTS auth_refresh_tokens_expires_at_idx ON auth_refresh_tokens (expires_at)`,

  `CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    cover_image TEXT NOT NULL DEFAULT '',
    isbn TEXT NOT NULL DEFAULT '',
    genre TEXT NOT NULL DEFAULT 'Fiction',
    stock INTEGER NOT NULL DEFAULT 0,
    rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    year INTEGER NOT NULL DEFAULT 0,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS books_featured_idx ON books (featured)`,
  `CREATE INDEX IF NOT EXISTS books_featured_created_at_idx ON books (featured, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS books_genre_idx ON books (genre)`,
  `CREATE INDEX IF NOT EXISTS books_created_at_idx ON books (created_at DESC)`,

  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS reviews_book_id_idx ON reviews (book_id)`,
  `CREATE INDEX IF NOT EXISTS reviews_book_created_at_idx ON reviews (book_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews (user_id)`,

  `CREATE TABLE IF NOT EXISTS wishlist_items (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, book_id)
  )`,
  `CREATE INDEX IF NOT EXISTS wishlist_items_user_id_idx ON wishlist_items (user_id)`,
  `CREATE INDEX IF NOT EXISTS wishlist_items_user_added_at_idx ON wishlist_items (user_id, added_at DESC)`,

  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    shipping_address TEXT NOT NULL,
    location_coords JSONB,
    items_json JSONB NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id)`,
  `CREATE INDEX IF NOT EXISTS orders_user_created_at_idx ON orders (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS orders_status_created_at_idx ON orders (status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC)`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS orders_user_idempotency_key_idx ON orders (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL`,

  `CREATE TABLE IF NOT EXISTS whatsapp_preferences (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    transactional_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    opted_in_at TIMESTAMPTZ,
    opted_out_at TIMESTAMPTZ,
    consent_version TEXT NOT NULL DEFAULT 'checkout-v1',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, phone)
  )`,
  `CREATE INDEX IF NOT EXISTS whatsapp_preferences_phone_idx ON whatsapp_preferences (phone)`,

  `CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    notification_kind TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    provider_message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, notification_kind, recipient_phone)
  )`,
  `CREATE INDEX IF NOT EXISTS whatsapp_notifications_order_idx ON whatsapp_notifications (order_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS whatsapp_notifications_status_idx ON whatsapp_notifications (status, created_at DESC)`,

  `CREATE INDEX IF NOT EXISTS books_price_idx ON books (price)`,
  `CREATE INDEX IF NOT EXISTS books_genre_trgm_idx ON books (genre)`,
  `CREATE INDEX IF NOT EXISTS books_genre_idx ON books (genre)`,
  `CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS contact_messages_status_created_at_idx ON contact_messages (status, created_at DESC)`,

  `CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY,
    site_name TEXT NOT NULL DEFAULT 'BookSellNP',
    tagline TEXT NOT NULL DEFAULT 'Curated Selections for the Modern Mind.',
    primary_color TEXT NOT NULL DEFAULT '#2563eb',
    accent_color TEXT NOT NULL DEFAULT '#0f172a',
    hero_image TEXT NOT NULL DEFAULT '',
    shipping_ktm NUMERIC(10,2) NOT NULL DEFAULT 100,
    shipping_outside NUMERIC(10,2) NOT NULL DEFAULT 150,
    free_shipping_threshold NUMERIC(10,2) NOT NULL DEFAULT 5000,
    footer_text_1 TEXT NOT NULL DEFAULT 'Secure SSL Checkout',
    footer_text_2 TEXT NOT NULL DEFAULT '30-Day Easy Returns',
    footer_text_3 TEXT NOT NULL DEFAULT 'Global Shipping Available',
    footer_link_1 TEXT NOT NULL DEFAULT 'Privacy',
    footer_link_2 TEXT NOT NULL DEFAULT 'Terms',
    footer_company TEXT NOT NULL DEFAULT 'BOOKSELLNP MEDIA GROUP',
    privacy_content TEXT NOT NULL DEFAULT '# Privacy Policy\n\nYour privacy is important to us...',
    terms_content TEXT NOT NULL DEFAULT '# Terms of Service\n\nBy using our service, you agree...',
    admin_pin TEXT NOT NULL DEFAULT '0000',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  // Migrate databases that already had a minimal site_settings table before the
  // configurable storefront fields were added. CREATE TABLE IF NOT EXISTS alone
  // does not add columns to an existing PostgreSQL table.
  `ALTER TABLE site_settings
     ADD COLUMN IF NOT EXISTS site_name TEXT NOT NULL DEFAULT 'BookSellNP',
     ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT 'Curated Selections for the Modern Mind.',
     ADD COLUMN IF NOT EXISTS primary_color TEXT NOT NULL DEFAULT '#2563eb',
     ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#0f172a',
     ADD COLUMN IF NOT EXISTS hero_image TEXT NOT NULL DEFAULT '',
     ADD COLUMN IF NOT EXISTS shipping_ktm NUMERIC(10,2) NOT NULL DEFAULT 100,
     ADD COLUMN IF NOT EXISTS shipping_outside NUMERIC(10,2) NOT NULL DEFAULT 150,
     ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC(10,2) NOT NULL DEFAULT 5000,
     ADD COLUMN IF NOT EXISTS footer_text_1 TEXT NOT NULL DEFAULT 'Secure SSL Checkout',
     ADD COLUMN IF NOT EXISTS footer_text_2 TEXT NOT NULL DEFAULT '30-Day Easy Returns',
     ADD COLUMN IF NOT EXISTS footer_text_3 TEXT NOT NULL DEFAULT 'Global Shipping Available',
     ADD COLUMN IF NOT EXISTS footer_link_1 TEXT NOT NULL DEFAULT 'Privacy',
     ADD COLUMN IF NOT EXISTS footer_link_2 TEXT NOT NULL DEFAULT 'Terms',
     ADD COLUMN IF NOT EXISTS footer_company TEXT NOT NULL DEFAULT 'BOOKSELLNP MEDIA GROUP',
     ADD COLUMN IF NOT EXISTS privacy_content TEXT NOT NULL DEFAULT '# Privacy Policy\n\nYour privacy is important to us...',
     ADD COLUMN IF NOT EXISTS terms_content TEXT NOT NULL DEFAULT '# Terms of Service\n\nBy using our service, you agree...',
     ADD COLUMN IF NOT EXISTS admin_pin TEXT NOT NULL DEFAULT '0000',
     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `INSERT INTO site_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING`,
  `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,
];

export async function ensureSchema(): Promise<void> {
  for (const sql of STATEMENTS) {
    await query(sql);
  }
}

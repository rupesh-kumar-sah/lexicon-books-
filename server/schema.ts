import { query } from './db';

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    photo_url TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS users_email_idx ON users (email)`,

  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at)`,

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
  `CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews (user_id)`,

  `CREATE TABLE IF NOT EXISTS wishlist_items (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, book_id)
  )`,
  `CREATE INDEX IF NOT EXISTS wishlist_items_user_id_idx ON wishlist_items (user_id)`,

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
  `CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC)`,

  `CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY,
    site_name TEXT NOT NULL DEFAULT 'Lexiconn Books',
    tagline TEXT NOT NULL DEFAULT 'Curated Selections for the Modern Mind.',
    primary_color TEXT NOT NULL DEFAULT '#2563eb',
    accent_color TEXT NOT NULL DEFAULT '#0f172a',
    hero_image TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `INSERT INTO site_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING`,
];

export async function ensureSchema(): Promise<void> {
  for (const sql of STATEMENTS) {
    await query(sql);
  }
}

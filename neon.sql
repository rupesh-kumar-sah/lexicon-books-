-- =====================================================================
--  Lexiconn Books — Neon (PostgreSQL) schema + seed data
--  Paste this whole file into Neon's SQL Editor and run.
--  Safe to run multiple times: every statement is idempotent.
-- =====================================================================

-- ---------- Extensions (optional, for gen_random_uuid / pgcrypto) ----
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
--  TABLES
-- =====================================================================

-- ---------- users -----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    photo_url       TEXT,
    role            TEXT NOT NULL DEFAULT 'user',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- ---------- sessions --------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx     ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx  ON sessions (expires_at);

-- ---------- books -----------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    author       TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    price        NUMERIC(10,2) NOT NULL DEFAULT 0,
    cover_image  TEXT NOT NULL DEFAULT '',
    isbn         TEXT NOT NULL DEFAULT '',
    genre        TEXT NOT NULL DEFAULT 'Fiction',
    stock        INTEGER NOT NULL DEFAULT 0,
    rating       NUMERIC(3,2) NOT NULL DEFAULT 0,
    year         INTEGER NOT NULL DEFAULT 0,
    featured     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS books_featured_idx    ON books (featured);
CREATE INDEX IF NOT EXISTS books_genre_idx       ON books (genre);
CREATE INDEX IF NOT EXISTS books_created_at_idx  ON books (created_at DESC);

-- ---------- reviews ---------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    id          TEXT PRIMARY KEY,
    book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name   TEXT NOT NULL,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reviews_book_id_idx  ON reviews (book_id);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx  ON reviews (user_id);

-- ---------- wishlist_items -------------------------------------------
CREATE TABLE IF NOT EXISTS wishlist_items (
    user_id   TEXT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    book_id   TEXT NOT NULL REFERENCES books(id)  ON DELETE CASCADE,
    added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, book_id)
);
CREATE INDEX IF NOT EXISTS wishlist_items_user_id_idx ON wishlist_items (user_id);

-- ---------- orders ----------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id                TEXT PRIMARY KEY,
    user_id           TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_email    TEXT NOT NULL,
    customer_name     TEXT NOT NULL,
    shipping_address  TEXT NOT NULL,
    items_json        JSONB NOT NULL,
    subtotal          NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping          NUMERIC(10,2) NOT NULL DEFAULT 0,
    total             NUMERIC(10,2) NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'pending',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_user_id_idx     ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx  ON orders (created_at DESC);

-- Optional safety: only allow known status values
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending','processing','shipped','delivered','cancelled'));

-- ---------- site_settings (single-row brand/theme config) ------------
CREATE TABLE IF NOT EXISTS site_settings (
    id              TEXT PRIMARY KEY,
    site_name       TEXT NOT NULL DEFAULT 'Lexiconn Books',
    tagline         TEXT NOT NULL DEFAULT 'Curated Selections for the Modern Mind.',
    primary_color   TEXT NOT NULL DEFAULT '#2563eb',
    accent_color    TEXT NOT NULL DEFAULT '#0f172a',
    hero_image      TEXT NOT NULL DEFAULT '',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO site_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- =====================================================================
--  SEED DATA — 12 starter books
--  Re-runnable thanks to ON CONFLICT (isbn) DO NOTHING.
--  Note: the app uses 24-char hex IDs at runtime; deterministic IDs
--  here keep the seed idempotent.
-- =====================================================================

INSERT INTO books
    (id, title, author, description, price, cover_image, isbn, genre, stock, rating, year, featured)
VALUES
    ('seed00000000000000000001','The Midnight Library','Matt Haig',
     'Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived.',
     22.00,'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800',
     '9781786892713','Fiction',25,4.80,2020,TRUE),

    ('seed00000000000000000002','Project Hail Mary','Andy Weir',
     'Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself will perish.',
     28.00,'https://images.unsplash.com/photo-1543005120-a1bb3ea79ff7?auto=format&fit=crop&q=80&w=800',
     '9780593135204','Science Fiction',15,4.90,2021,TRUE),

    ('seed00000000000000000003','Atomic Habits','James Clear',
     'No matter your goals, Atomic Habits offers a proven framework for improving—every day.',
     18.20,'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=800',
     '9780735211292','Self-Help',50,4.90,2018,TRUE),

    ('seed00000000000000000004','The Alchemist','Paulo Coelho',
     'Combining magic, mysticism, wisdom and wonder into an inspiring tale of self-discovery.',
     14.50,'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800',
     '9780062315007','Fiction',30,4.70,1988,TRUE),

    ('seed00000000000000000005','Sapiens','Yuval Noah Harari',
     'A Brief History of Humankind explores how we became who we are.',
     21.99,'https://images.unsplash.com/photo-1550399105-05c4a7641b02?auto=format&fit=crop&q=80&w=800',
     '9780062316097','History',20,4.80,2014,TRUE),

    ('seed00000000000000000006','Educated','Tara Westover',
     'A memoir about a young girl who, kept out of school, leaves her survivalist family and goes on to earn a PhD from Cambridge.',
     19.50,'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=800',
     '9780399590504','Biography',18,4.70,2018,TRUE),

    ('seed00000000000000000007','The Name of the Wind','Patrick Rothfuss',
     'My name is Kvothe. I have stolen princesses back from sleeping barrow kings. I burned down the town of Trebon. The story of an extraordinary musician, magician, and legend.',
     24.00,'https://images.unsplash.com/photo-1621944190310-e3cca1564bd7?auto=format&fit=crop&q=80&w=800',
     '9780756404741','Fantasy',22,4.80,2007,TRUE),

    ('seed00000000000000000008','Gone Girl','Gillian Flynn',
     'On a warm summer morning in North Carthage, Missouri, it is Nick and Amy Dunne''s fifth wedding anniversary. Then his wife disappears.',
     16.99,'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?auto=format&fit=crop&q=80&w=800',
     '9780307588371','Mystery',28,4.50,2012,FALSE),

    ('seed00000000000000000009','Meditations','Marcus Aurelius',
     'A series of personal writings by Marcus Aurelius, Roman Emperor, setting forth his ideas on Stoic philosophy.',
     12.50,'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800',
     '9780812968255','Philosophy',40,4.90,180,FALSE),

    ('seed00000000000000000010','Milk and Honey','Rupi Kaur',
     'A collection of poetry and prose about survival, the experience of violence, abuse, love, loss, and femininity.',
     15.00,'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?auto=format&fit=crop&q=80&w=800',
     '9781449474256','Poetry',35,4.40,2014,FALSE),

    ('seed00000000000000000011','Dune','Frank Herbert',
     'The epic story of Paul Atreides on the desert planet Arrakis, where the spice melange is the universe''s most precious substance.',
     23.99,'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=800',
     '9780441172719','Science Fiction',32,4.80,1965,FALSE),

    ('seed00000000000000000012','A Brief History of Time','Stephen Hawking',
     'A landmark volume in science writing, exploring the nature of time, the Big Bang, and the universe itself.',
     17.95,'https://images.unsplash.com/photo-1614849963640-9cc74b2a826f?auto=format&fit=crop&q=80&w=800',
     '9780553380163','Non-Fiction',26,4.60,1988,FALSE)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
--  DONE
--  Point your app at the Neon connection string via DATABASE_URL,
--  e.g.  postgres://USER:PASSWORD@HOST/neondb?sslmode=require
-- =====================================================================

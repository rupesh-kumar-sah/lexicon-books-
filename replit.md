# Lexiconn Books

A curated online bookstore built with Vite + React 19 (frontend) and Express (backend), backed by Replit's built-in PostgreSQL database. Browse a catalog, manage a wishlist, leave reviews, place orders, and a full admin console with analytics — all on a single port.

## Tech Stack

- **Frontend**: React 19, Vite 6, TypeScript, Tailwind CSS v4 (`@theme` design tokens), React Router v7, Motion (`motion/react`), Recharts, Lucide icons.
- **Backend**: Node.js + Express 4 (run via `tsx`), `pg` for PostgreSQL, `bcryptjs` for password hashing.
- **Database**: Replit's built-in PostgreSQL (`DATABASE_URL`).
- **Port**: Single port `5000` — Express serves the API and uses Vite middleware (dev) or `dist/` (prod) for the frontend.

## Architecture

### Server (`server.ts` + `server/`)
- `server.ts` — entry point. Mounts JSON parsing, attaches the current user (from `Authorization: Bearer <token>`), routes, then Vite middleware (dev) or static `dist/` (prod).
- `server/db.ts` — `pg` Pool wrapper exposing `query()`.
- `server/auth.ts` — bcrypt password hashing, bearer-token sessions (30-day expiry), `requireAuth`, `requireAdmin`, `attachUser`, `newId()` for random hex IDs.
- `server/seed.ts` — auto-seeds 12 sample books on startup if the `books` table is empty.
- `server/routes/`
  - `auth.ts` — `POST /api/auth/signup`, `/login`, `/logout`, `GET /api/auth/me`. The first registered user is automatically promoted to `admin`.
  - `books.ts` — `GET /api/books` (filters: `q`, `genre`, `featured`, `limit`, `sort` incl. `popular|price-asc|price-desc|rating|newest`), `GET /api/books/genres` (counts per genre), `GET /api/books/:id` (with live `reviewCount`/`avgRating`), admin-only `POST/PATCH/DELETE`. Includes `GET/POST /api/books/:id/reviews` and `DELETE /api/books/:bookId/reviews/:reviewId`.
  - `wishlist.ts` — `GET /api/wishlist`, `POST /api/wishlist/:bookId`, `DELETE /api/wishlist/:bookId`.
  - `orders.ts` — `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders` (atomic stock decrement inside a transaction), `POST /api/orders/:id/cancel` (restocks items).
  - `admin.ts` — admin-only `GET /api/admin/stats`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`, `DELETE /api/admin/orders/:id`, `GET /api/admin/users`, `PATCH /api/admin/users/:id` (role), `DELETE /api/admin/users/:id`, `PUT /api/admin/settings`, plus a public `GET /api/admin/settings` for the storefront to read brand/theme.

### Database Schema
Tables (created via SQL): `users`, `sessions`, `books`, `reviews`, `wishlist_items`, `orders`, `site_settings` (single-row brand/theme config) with appropriate indexes. IDs are random 24-char hex strings (not serial). Order items are stored as JSON snapshots so cancellations and history remain stable when books change.

### Frontend (`src/`)
- `lib/api.ts` — typed `fetch` wrapper that automatically attaches the bearer token from `localStorage["lexiconn_token"]`. Exports `authApi`, `bookApi`, `wishlistApi`, `orderApi`, `adminApi`.
- `context/` — provider stack (in `main.tsx`): `Toast > SiteSettings > Auth > Wishlist > Cart > RecentlyViewed > App`.
  - `ToastContext.tsx` — global `success/error/info` toasts with auto-dismiss.
  - `SiteSettingsContext.tsx` — fetches `/api/admin/settings` on mount and applies brand colors as CSS variables (`--brand-primary`, `--brand-accent`); also sets `document.title`. The Themes admin tab calls `refresh()` after save.
  - `AuthContext.tsx` — email/password auth, `openAuthModal()` for the login/signup modal.
  - `CartContext.tsx` — local cart in `localStorage["lexiconn_cart"]` (auto-migrates legacy `lumina_cart`); `addToCart(book, qty)` is stock-capped and emits toasts.
  - `WishlistContext.tsx` — API-backed with optimistic add/remove + rollback; `toggleWishlist(bookId, title?)` shows toast.
  - `RecentlyViewedContext.tsx` — last 8 viewed book IDs in `localStorage`.
- `components/` — `AuthModal`, `Layout`, `Navbar`, `Footer`, `BookCard` (live star ratings + review count), `Toast`.
- `pages/`
  - `Home` — gradient hero with stats, genre tile grid, popular row, recently-viewed row, featured grid.
  - `Catalog` — debounced server-side search, URL-synced filters (`?q=&genre=&sort=`), genre chips, sort dropdown.
  - `BookDetail` — adds to recently-viewed on load, quantity-aware Add to Cart, wishlist toggle with toast, review submit with toast.
  - `Cart`, `Checkout`, `OrderSuccess`, `Wishlist`, `Profile` (sidebar card, stats grid, order history linking to `/order/:id`).
  - `OrderDetail` (`/order/:id`) — status timeline stepper, cancel button (when allowed), full item/address/payment breakdown.
  - `Admin` — five tabs:
    - **Dashboard**: stat cards + Recharts revenue area chart + status pie chart + low-stock alert + recent orders.
    - **Inventory**: book CRUD with toasts.
    - **Orders**: status filter, search, inline status `<select>`, expandable details, delete button.
    - **Users**: list members with order count and total spend, change role (user ↔ admin), delete user. Self-protected (can't demote or delete yourself).
    - **Themes**: site name + tagline editor, color presets and custom hex pickers, hero image URL, plus a live preview panel. Saving applies the brand to every visitor through CSS variables.

## Development

- `npm run dev` — starts Express + Vite middleware on port 5000.
- `npm run build` — builds the frontend to `dist/`.
- `npm run lint` — TypeScript check.

The "Start application" workflow runs `npm run dev`.

## Deployment

Configured for Replit Autoscale: build with `npm run build`, run with `npx tsx server.ts`. The same Express server serves the built frontend in production.

## Notes

- No Firebase, no Stripe, no AI chatbot — all removed during the Postgres refactor.
- Sessions are stored server-side; the client only keeps a bearer token in `localStorage`.
- The first user to register becomes the admin and can manage everything in `/admin`.
- Order status transitions are validated server-side; cancelling an order automatically restocks its items.

# Lexiconn Books

A curated online bookstore built with Vite + React (frontend) and Express (backend), backed by Replit's built-in PostgreSQL database. Browse a catalog, manage a wishlist, leave reviews, and check out — all on a single port.

## Tech Stack

- **Frontend**: React 19, Vite 6, TypeScript, Tailwind CSS v4, React Router v7, Motion, Lucide icons.
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
  - `books.ts` — `GET /api/books` (filters: `q`, `genre`, `featured`, `limit`), `GET /api/books/:id`, admin-only `POST/PATCH/DELETE`. Includes `GET /api/books/:id/reviews` and `POST /api/books/:id/reviews` (auth).
  - `wishlist.ts` — `GET /api/wishlist`, `POST /api/wishlist/:bookId`, `DELETE /api/wishlist/:bookId`.
  - `orders.ts` — `GET /api/orders`, `POST /api/orders`.

### Database Schema
Tables (created via SQL): `users`, `sessions`, `books`, `reviews`, `wishlist_items`, `orders` with appropriate indexes. IDs are random 24-char hex strings (not serial).

### Frontend (`src/`)
- `lib/api.ts` — typed `fetch` wrapper that automatically attaches the bearer token from `localStorage["lexiconn_token"]`. Exports `authApi`, `bookApi`, `wishlistApi`, `orderApi`.
- `context/AuthContext.tsx` — email/password auth, `openAuthModal()` for the login/signup modal.
- `context/CartContext.tsx` — local cart state.
- `context/WishlistContext.tsx` — API-backed wishlist with optimistic updates.
- `components/AuthModal.tsx` — sign-in / sign-up modal.
- `components/Layout.tsx`, `Navbar.tsx`, `Footer.tsx`, `BookCard.tsx`.
- `pages/` — `Home`, `Catalog`, `BookDetail`, `Wishlist`, `Cart`, `Checkout`, `OrderSuccess`, `Profile`, `Admin`.

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
- The first user to register becomes the admin and can manage inventory in `/admin`.

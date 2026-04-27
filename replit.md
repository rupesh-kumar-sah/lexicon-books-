# Lexiconn Books

A React + TypeScript bookstore web app with an Express backend that integrates with Stripe for checkout and Firebase for data.

## Stack
- **Frontend:** React 19, React Router 7, Tailwind CSS 4, Vite 6
- **Backend:** Express 4, served via `tsx` (TypeScript runtime)
- **Integrations:** Stripe (checkout), Firebase (data), Google Generative AI

## Project Layout
- `server.ts` — Express server. In dev, it mounts Vite as middleware; in prod, it serves the built `dist/` folder. Exposes `/api/health` and `/api/checkout/create-session`.
- `vite.config.ts` — Vite config with Tailwind + React plugins.
- `index.html` — SPA entry point.
- `src/` — React app (pages, components, context, lib).
- `firestore.rules`, `firebase-*.json` — Firebase config.

## Replit Setup
- Single workflow **Start application** runs `npm run dev` (which runs `tsx server.ts`) on port **5000**.
- Vite is configured with `allowedHosts: true` and HMR sharing the Express HTTP server, so it works behind the Replit iframe proxy.
- Server binds to `0.0.0.0:5000`.

## Environment Variables
See `.env.example`:
- `GEMINI_API_KEY` — Google Gemini API key
- `APP_URL` — Public URL for the app
- `STRIPE_SECRET_KEY` — Stripe secret key
- `NEON_DATABASE_URL` — Postgres connection string for the user's own Neon database
- `NEON_DATA_API_URL` — (optional) Neon Data API base URL

## Database (Neon)
The app uses a user-owned Neon Postgres database via `@neondatabase/serverless`.
- Server-side client: `server.ts` initializes `neon(process.env.NEON_DATABASE_URL)`.
- Frontend-importable helper: `src/lib/neon.ts` exports `sql` (note: only safe to use from server-side or trusted environments — the connection string should never be exposed to the browser).
- Health check endpoint: `GET /api/db/health` returns `{ now, db, version }`.

## Deployment
Configured for **autoscale**:
- Build: `npm run build`
- Run: `NODE_ENV=production tsx server.ts`

# Lexiconn Books

A sophisticated literary portal featuring advanced catalog filtering, an AI-powered librarian, and secure book discovery.

## Tech Stack

- **Frontend**: React 19 + Vite 6 + TypeScript + Tailwind CSS v4
- **Routing**: React Router v7
- **Backend**: Express 4 (Node.js 20) running via `tsx`
- **Data**: Firebase (Firestore + Auth) — config in `firebase-applet-config.json`
- **AI**: Google Gemini (`@google/genai`) — uses `GEMINI_API_KEY` env var
- **Payments**: Stripe — uses `STRIPE_SECRET_KEY` env var

## Project Structure

- `server.ts` — Express server. In dev, mounts Vite as middleware. In production, serves the prebuilt `dist/` directory and falls back to `index.html` for SPA routes.
- `vite.config.ts` — Vite config; bound to `0.0.0.0:5000` with `allowedHosts: true` so the Replit proxy iframe can load the preview.
- `index.html` — App entry, loads `src/main.tsx`.
- `src/` — Application source
  - `App.tsx`, `main.tsx` — Root and providers
  - `pages/` — Route components (Home, Catalog, BookDetail, Cart, Checkout, Wishlist, Profile, Admin, OrderSuccess)
  - `components/` — Layout, Navbar, Footer, BookCard, AILibrarian
  - `context/` — Auth, Cart, Wishlist contexts
  - `lib/firebase.ts` — Firebase init

## Replit Setup

- Single workflow `Start application` runs `npm run dev`, which starts `server.ts` on port `5000`.
- The Express server hosts both the API (`/api/*`) and the Vite-served frontend on the same port (5000) — this is why no separate backend port is needed.
- Deployment is configured as `autoscale` with `npm run build` and `npx tsx server.ts`.

## Environment Variables (optional)

- `GEMINI_API_KEY` — for the AI Librarian feature
- `STRIPE_SECRET_KEY` — for live Stripe checkout (without it the server returns a simulated checkout session)

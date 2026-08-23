# Render Deployment Blueprint

This repository is ready to deploy on Render with automatic environment variable injection.

## What this does

- Uses `render.yaml` to define a Render web service
- Runs `npm ci && npm run build` during build
- Starts the app with `npm start`
- Loads production environment variables from Render secrets
- Keeps `.env` local-only and out of source control

## How to use

1. Create the service in Render and connect it to your `main` branch.
2. Create Render environment groups or secrets for the required values:
   - `DATABASE_URL`
   - `ADMIN_DATABASE_URL`
   - `JWT_SECRET`
   - `SESSION_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PIN`
   - `ADMIN_SECRET_PATH`
   - `VITE_ADMIN_PATH`
   - `GROQ_API_KEY` (server-side only)
   - `GOOGLE_MAPS_API_KEY`
   - `FRONTEND_URL`
   - `RENDER_EXTERNAL_URL`

3. Optionally set non-secret variables in Render if needed:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `LOG_ENABLED=false`
   - `LOG_LEVEL=error`

## Why this is secure

Render injects environment variables at runtime, so no `.env` file is required in production. The `.env` file should remain local for development only.

## Notes

- The app uses `dotenv` for local development, but Render will supply all production values through `process.env`.
- The `render.yaml` file is the canonical deployment blueprint for the service.
- If using `render.yaml` with secrets, create each secret in the Render dashboard before deployment.

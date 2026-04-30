import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { attachUser } from './server/auth';
import authRoutes from './server/routes/auth';
import bookRoutes from './server/routes/books';
import wishlistRoutes from './server/routes/wishlist';
import orderRoutes from './server/routes/orders';
import sqlRoutes from './server/routes/sql';
import adminRoutes from './server/routes/admin';
import { seedIfEmpty } from './server/seed';
import { ensureSchema } from './server/schema';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 5000;

  app.use(express.json({ limit: '1mb' }));
  app.use(attachUser);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/books', bookRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/sql', sqlRoutes);
  app.use('/api/admin', adminRoutes);

  // Ensure schema exists, then seed DB on startup if empty (non-blocking)
  ensureSchema()
    .then(() => seedIfEmpty())
    .catch((e) => console.error('[db init] failed:', e));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

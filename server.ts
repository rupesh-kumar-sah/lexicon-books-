import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

import { attachUser } from './server/auth';
import authRoutes from './server/routes/auth';
import bookRoutes from './server/routes/books';
import wishlistRoutes from './server/routes/wishlist';
import orderRoutes from './server/routes/orders';
import sqlRoutes from './server/routes/sql';
import adminRoutes from './server/routes/admin';
import { seedIfEmpty } from './server/seed';
import { ensureSchema } from './server/schema';
import { query } from './server/db';
import morgan from 'morgan';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { slowDown } from 'express-slow-down';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: (hits) => hits * 100, // begin adding 100ms of delay per request above 50
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-7', // set `RateLimit` and `RateLimit-Policy` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => process.env.NODE_ENV !== 'production' || req.path.startsWith('/api/books'), // Don't rate limit catalog in dev or at all
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 5000;

  // Trust proxy for correct IP detection behind reverse proxies (1 level for Render/Cloudflare)
  app.set('trust proxy', 1);

  // Security headers with relaxed CSP for Vite production builds
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://*", "blob:"],
        connectSrc: ["'self'", "https://*", "wss://*", "ws://*"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https://*"],
        frameSrc: ["'self'", "https://*"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  // Data Sanitization
  const hpp = (await import('hpp')).default;
  const xss = (await import('xss-clean')).default;
  const mongoSanitize = (await import('express-mongo-sanitize')).default;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(hpp()); // Prevent HTTP Parameter Pollution
  app.use(xss()); // Sanitize user input from POST body, GET queries, and params
  app.use(mongoSanitize()); // Prevent NoSQL injection (even if using SQL, good for JSON)

  app.use(compression());

  app.use('/api/', speedLimiter); // Slow down repeated requests
  app.use('/api/', limiter); // Apply rate limiting to all API routes

  // Simple WAF (Web Application Firewall) to block common attack patterns
  app.use((req, res, next) => {
    const maliciousPatterns = [
      /<script.*?>/i,
      /javascript:/i,
      /onload=/i,
      /onerror=/i,
      /UNION SELECT/i,
      /OR 1=1/i,
    ];
    const checkValue = (val: any): boolean => {
      if (typeof val === 'string') {
        return maliciousPatterns.some(p => p.test(val));
      }
      if (typeof val === 'object' && val !== null) {
        return Object.values(val).some(checkValue);
      }
      return false;
    };

    if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
      console.warn(`[WAF Blocked] Suspicious request from ${req.ip}: ${req.method} ${req.originalUrl}`);
      return res.status(403).json({ error: 'Blocked by security firewall' });
    }
    next();
  });

  // CORS – allow frontend origins to reach API
  app.use((req, res, next) => {
    const origin = req.headers.origin || '';
    const allowed = [
      'http://localhost:5000',
      'http://localhost:5173',
      process.env.FRONTEND_URL || '',
    ].filter(Boolean);

    // In production, only allow specifically defined origins or same-origin requests
    if (process.env.NODE_ENV === 'production') {
      const host = req.headers.host || '';
      const isSameOrigin = !origin || origin.replace(/^https?:\/\//, '') === host;

      if (isSameOrigin || allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
      } else {
        // Log unauthorized CORS attempt
        if (origin) console.warn(`[CORS Blocked] Unauthorized origin: ${origin} (Host: ${host})`);
        return res.status(403).json({ error: 'CORS policy violation' });
      }
    } else {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-security-token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_INDEXING !== 'true') {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(morgan('dev'));
  app.use(attachUser);

  app.get('/robots.txt', (req, res) => {
    const baseUrl = (process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const indexingAllowed = process.env.ALLOW_INDEXING === 'true';
    res.type('text/plain').send([
      'User-agent: *',
      indexingAllowed ? 'Allow: /' : 'Disallow: /',
      `Sitemap: ${baseUrl}/sitemap.xml`,
    ].join('\n') + '\n');
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = (process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const books = await query<{ id: string; created_at: Date }>('SELECT id, created_at FROM books ORDER BY created_at DESC LIMIT 5000');
      const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      const urls = ['/', '/catalog', '/privacy', '/terms', ...books.rows.map((book) => `/book/${encodeURIComponent(book.id)}`)];
      const body = urls.map((url) => `  <url><loc>${escapeXml(baseUrl + url)}</loc></url>`).join('\n');
      res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
    } catch (error) {
      console.error('sitemap generation error', error);
      res.status(500).type('text/plain').send('Sitemap unavailable');
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/books', bookRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/sql', sqlRoutes);
  app.use('/api/admin', adminRoutes);

  // Ensure schema exists, then seed DB on startup if empty
  ensureSchema()
    .then(async () => {
      await seedIfEmpty();
      // Pre-warm the database and cache
      console.log('[Security] Pre-warming database and cache for ultra-fast response...');
      const prewarm = [
        query('SELECT genre, COUNT(*)::text AS count FROM books GROUP BY genre'),
        query('SELECT * FROM books WHERE featured = true LIMIT 8'),
        query('SELECT * FROM books ORDER BY rating DESC LIMIT 8'),
        query('SELECT * FROM site_settings WHERE id = \'default\''),
      ];
      await Promise.all(prewarm).catch(() => {});
      console.log('[Security] Cache warmed. System ready at peak speed.');
    })
    .catch((e) => console.error('[db init] failed:', e));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    
    // Serve static files with proper cache headers
    app.use(express.static(distPath, {
      maxAge: '1h', // Shorter cache for initial troubleshooting
      etag: true,
      index: false // We handle index.html manually via the catch-all
    }));

    // Catch-all route to serve index.html for SPA routing
    app.get('*', (req, res) => {
      // Don't serve index.html for missing assets or API calls
      if (req.path.startsWith('/api/') || req.path.includes('.')) {
        console.warn(`[404] Resource not found: ${req.path}`);
        return res.status(404).send('Not Found');
      }
      
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('[Server] Failed to send index.html:', err);
          res.status(500).send('Application Error: Could not load frontend. Please ensure "npm run build" has been executed.');
        }
      });
    });
  }

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error]', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

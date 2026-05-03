# 📚 Lexicon Books - Secure Book Marketplace

A full-stack, production-ready book e-commerce application with secure admin portal, real-time inventory management, and advanced order tracking.

## 🌟 Key Features

### Public Application
- 📖 Browse book catalog with advanced search and filtering
- 💳 Secure checkout with shipping cost calculation  
- 📍 Order tracking with map-based delivery location
- ❤️ Wishlist and save for later
- 👤 User profiles with order history
- 🎨 Customizable theme and branding
- 📱 Mobile-responsive design

### Admin Portal (Secure)
- **Access:** `/admin-dashboard-secret-2063` (requires authentication)
- 📊 Real-time analytics dashboard
- 📦 Inventory management with stock alerts
- 📋 Order management with status tracking
- 👥 User management and role control
- 🎨 Theme customization
- 🔐 Firewall protected with email + password + PIN

### Security & Reliability
- ✅ bcrypt password hashing
- ✅ Rate limiting and DDoS protection
- ✅ SQL injection and XSS protection
- ✅ CORS protection in production
- ✅ Database persistence with PostgreSQL
- ✅ Session management with auto-expiration
- ✅ HTTPS/SSL enforced in production
- ✅ Comprehensive logging and auditing

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Git

### Local Development

1. **Clone and install:**
   ```bash
   git clone <repository>
   cd lexicon-books
   npm install
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   node admin-setup.mjs  # Generate admin password hash
   ```

3. **Configure database:**
   ```bash
   # Create PostgreSQL database
   createdb lexicon_books
   
   # Set DATABASE_URL in .env
   export DATABASE_URL="postgresql://user:password@localhost:5432/lexicon_books"
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Access application:**
   - Public app: http://localhost:5000
   - Admin portal: http://localhost:5000/admin-dashboard-secret-2063

### Build for Production

```bash
npm run build
NODE_ENV=production npm run start
```

---

## 📋 Project Structure

```
lexicon-books/
├── src/                      # React frontend
│   ├── components/           # UI components
│   ├── pages/                # Page components
│   ├── context/              # React contexts
│   ├── lib/                  # Utilities
│   └── App.tsx               # Main app
│
├── server/                   # Express backend
│   ├── routes/               # API endpoints
│   │   ├── admin.ts          # Admin dashboard API
│   │   ├── admin-portal.ts   # Admin auth/security
│   │   ├── auth.ts           # User authentication
│   │   └── ...
│   ├── db.ts                 # Database connection
│   ├── auth.ts               # Auth utilities
│   ├── schema.ts             # Database schema
│   └── seed.ts               # Initial data
│
├── server.ts                 # Express app setup
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript config
├── Dockerfile                # Docker image
├── render.yaml               # Render deployment
├── ADMIN_SETUP.md            # Admin setup guide
├── DEPLOYMENT.md             # Deployment guide
└── package.json              # Dependencies
```

---

## 🔐 Admin Portal Setup

### Access Credentials
- **URL:** `/admin-dashboard-secret-2063`
- **Email:** `sahkkr702@gmail.com`
- **Password:** `rupesh@0123456`
- **PIN:** `2063`

### First Time Setup
1. Generate admin password hash:
   ```bash
   node admin-setup.mjs
   ```

2. Add to `.env` file:
   ```env
   ADMIN_EMAIL=sahkkr702@gmail.com
   ADMIN_HASHED_PASSWORD=<hash-from-above>
   ADMIN_PIN=2063
   ```

3. Access at: `http://localhost:5000/admin-dashboard-secret-2063`

See [ADMIN_SETUP.md](ADMIN_SETUP.md) for detailed setup and security information.

---

## 🌐 Deployment

### Deploy to Render.com (Recommended)

1. **Prepare environment variables** (see DEPLOYMENT.md)

2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

3. **Deploy on Render:**
   - Go to https://render.com/dashboard
   - Create new service from GitHub
   - Render will auto-detect `render.yaml`
   - Set environment variables
   - Deploy!

4. **Verify deployment:**
   - Health check: `https://your-app.onrender.com/api/health`
   - Admin portal: `https://your-app.onrender.com/admin-dashboard-secret-2063`

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed Render deployment guide.

---

## 🗄️ Database

### Schema Overview
- **users** - User accounts with roles (admin/user)
- **books** - Product inventory with details
- **orders** - Customer orders with tracking
- **site_settings** - Theme and configuration
- **sessions** - User session management
- **reviews** - Book ratings and reviews

### Data Persistence
- ✅ All data persists in PostgreSQL database
- ✅ Automatic schema creation on startup
- ✅ Initial seed data on first run
- ✅ Admin can add/edit/delete products
- ✅ Changes persist across server restarts

### Backups
- Render provides automatic daily backups
- Configure backup retention in Render dashboard

---

## 📊 Environment Variables

**Development (.env file)**
```env
NODE_ENV=development
LOG_ENABLED=true
DATABASE_URL=postgresql://user:pass@localhost/lexicon_books
ADMIN_EMAIL=sahkkr702@gmail.com
ADMIN_HASHED_PASSWORD=<hash>
ADMIN_PIN=2063
GROQ_API_KEY=<your-key>
GOOGLE_MAPS_API_KEY=<your-key>
```

**Production (Render/Deployment)**
```env
NODE_ENV=production
LOG_ENABLED=false
DATABASE_URL=<render-provided-url>
ADMIN_EMAIL=sahkkr702@gmail.com
ADMIN_HASHED_PASSWORD=<hash>
ADMIN_PIN=2063
JWT_SECRET=<secure-random>
SESSION_SECRET=<secure-random>
```

See `.env.example` for full list of variables.

---

## 🔍 API Endpoints

### Public Endpoints
- `GET /api/health` - Server health check
- `GET /api/books` - List books
- `GET /api/books/:id` - Get book details
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/orders/:id` - Get order details

### Admin Endpoints
- `POST /api/admin-portal/login` - Admin authentication
- `GET /api/admin/stats` - Dashboard analytics
- `GET /api/admin/orders` - List orders
- `POST /api/admin/books` - Add book
- `PUT /api/admin/books/:id` - Update book
- `DELETE /api/admin/books/:id` - Delete book

All admin endpoints require authentication via `X-Admin-Security-Token` header.

---

## 🛠️ Development Commands

```bash
# Development
npm run dev                  # Start dev server with hot reload
npm run lint               # Run TypeScript type checking
npm run build              # Build for production
npm run preview            # Preview production build locally
npm run clean              # Remove build artifacts

# Utilities
node admin-setup.mjs       # Generate admin password hash
npm run start              # Start production server
```

---

## 🔒 Security Features

1. **Authentication**
   - Secure password hashing with bcrypt
   - Session tokens with expiration
   - Role-based access control (RBAC)

2. **API Security**
   - Rate limiting (100 req/15 min)
   - Input sanitization (XSS, SQL injection)
   - CORS protection
   - Helmet security headers

3. **Admin Portal**
   - Multi-factor authentication (email + password + PIN)
   - Firewall protection on all admin routes
   - Session management with auto-cleanup
   - Comprehensive audit logging

4. **Data Protection**
   - SSL/TLS encryption in transit
   - Password hashing at rest
   - Database connection pooling
   - Automatic schema validation

---

## 🐛 Troubleshooting

### Admin Portal Issues
- **"Invalid credentials"** - Verify email, password, and PIN match `.env`
- **"Access Denied"** - Check URL is exactly `/admin-dashboard-secret-2063`
- **"Cannot connect to database"** - Verify DATABASE_URL is correct

### Deployment Issues
- **Build fails** - Check Node version and run `npm install` locally first
- **Database not found** - Verify PostgreSQL service is running
- **No products after restart** - This is expected! Data persists in database

See [DEPLOYMENT.md](DEPLOYMENT.md) for more troubleshooting tips.

---

## 📝 Recent Updates (v1.0.0)

### ✨ New Features
- ✅ Separate secure admin portal with firewall protection
- ✅ Email + Password + PIN multi-factor authentication
- ✅ Enhanced database persistence guarantees
- ✅ Render.com deployment configuration
- ✅ Environment-based logging control
- ✅ Comprehensive admin setup documentation

### 🔒 Security Improvements
- ✅ Admin login removed from public app
- ✅ Secret URL-based admin portal access
- ✅ Firewall protection on all admin routes
- ✅ Sanitized logging (no sensitive data)
- ✅ Rate limiting and request sanitization

### 📦 Production Ready
- ✅ Production build optimization
- ✅ Render deployment guide
- ✅ Environment variable management
- ✅ Error handling and monitoring
- ✅ Database persistence verification

---

## 📄 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review [ADMIN_SETUP.md](ADMIN_SETUP.md) and [DEPLOYMENT.md](DEPLOYMENT.md)
3. Check server logs: `npm run dev`
4. Verify environment variables are correctly set

---

## 🎯 Roadmap

- [ ] Payment gateway integration
- [ ] Email notifications
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Mobile app
- [ ] API rate limiting per user
- [ ] Advanced inventory forecasting

---

**Happy reading! 📚**

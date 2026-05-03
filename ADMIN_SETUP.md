# Lexicon Books - Admin Portal Setup

## 🔐 Security Overview

The admin portal is completely separate from the main application and only accessible via a **secret URL** with multi-factor authentication (email, password, and PIN).

### Key Security Features:
- ✅ Firewall protection on all admin routes
- ✅ Email + Password + PIN authentication required
- ✅ Secure bcrypt password hashing
- ✅ Session management with automatic expiration (24 hours)
- ✅ All access attempts are logged for security auditing
- ✅ No logs exposed to the application
- ✅ No admin login in the public app

---

## 🚀 Admin Access

### Secret URL
```
https://your-domain.com/admin-dashboard-secret-2063
```

### Admin Credentials
- **Email:** `sahkkr702@gmail.com`
- **Password:** `rupesh@0123456`
- **PIN:** `2063`

> ⚠️ **IMPORTANT:** Change these credentials immediately after first login in production.

---

## 🔧 Environment Configuration

All admin settings are stored in `.env` file (not committed to git):

```env
# Admin Portal Security
ADMIN_SECRET_PATH=admin-dashboard-secret-2063
ADMIN_EMAIL=sahkkr702@gmail.com
ADMIN_HASHED_PASSWORD=$2b$10$bJpZMOrS4k5U6K5v4VfZe.QwvvaATX3kop/EQmhZwLQ0nrvTphIKy
ADMIN_PIN=2063
VITE_ADMIN_PATH=/admin-dashboard-secret-2063

# Security Tokens
VITE_ADMIN_SECURITY_TOKEN=admin-dashboard-secret-2063
```

---

## 📝 Initial Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
```bash
# Generate admin password hash
node admin-setup.mjs

# Copy the output to your .env file
# The hashed password is bcrypt-encrypted and cannot be reversed
```

### 3. Setup Database
```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@host:port/database_name"

# Start the server (will auto-create schema and seed data)
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 🛡️ Firewall & Security Rules

The admin portal implements:

1. **Route Validation**: Only `/admin-dashboard-secret-2063` paths are allowed
2. **Request Sanitization**: Malicious patterns are blocked (SQL injection, XSS, etc.)
3. **Rate Limiting**: Max 100 requests per 15 minutes per IP
4. **CORS Protection**: Only same-origin requests accepted in production
5. **Session Security**: 24-hour expiration, auto-cleanup of expired sessions

---

## 🌐 Deployment on Render

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up and create new service

### Step 2: Connect Repository
1. Connect your GitHub repository
2. Select the repository branch

### Step 3: Configure Environment Variables
In Render dashboard, set:

```
NODE_ENV=production
LOG_ENABLED=false
DATABASE_URL=<your-postgres-db-url>
ADMIN_EMAIL=sahkkr702@gmail.com
ADMIN_HASHED_PASSWORD=<hash-from-admin-setup.mjs>
ADMIN_PIN=2063
JWT_SECRET=<generate-random-secure-string>
SESSION_SECRET=<generate-random-secure-string>
GROQ_API_KEY=<your-api-key>
GOOGLE_MAPS_API_KEY=<your-api-key>
```

### Step 4: Deploy

1. **Using Dockerfile** (Recommended)
   ```bash
   # Render will automatically detect Dockerfile
   # and build/deploy accordingly
   ```

2. **Using render.yaml**
   - Push `render.yaml` to your repository
   - Render will auto-configure web service + PostgreSQL database

### Step 5: Verify Deployment
```bash
# Check health endpoint
curl https://your-app.onrender.com/api/health

# Access admin portal
https://your-app.onrender.com/admin-dashboard-secret-2063
```

---

## 📊 Admin Dashboard Features

### Dashboard Analytics
- Total revenue and orders
- Customer statistics
- Low stock alerts
- Top genres by sales
- Recent order activity
- 14-day revenue trends

### Inventory Management
- Add/edit books with cover image upload
- Manage stock levels
- Featured product selection
- Real-time search and sorting

### Order Management
- View all orders with filtering
- Update order status (pending → processing → shipped → delivered)
- View detailed customer information
- Map-based delivery location visualization
- Delete/cancel orders with automatic stock adjustment

### User Management
- View all registered users
- Promote/demote admin roles
- Track user spending and order history
- Delete user accounts

### Theme & Settings
- Customize site branding (name, tagline, colors)
- Color presets or custom hex codes
- Shipping fee configuration
- Legal pages (privacy, terms) with markdown support
- Footer text customization

---

## 🔍 Database Schema

The admin portal uses PostgreSQL with the following key tables:

- **users**: User accounts and admin roles
- **books**: Product inventory
- **orders**: Customer orders with status tracking
- **site_settings**: Theme and configuration
- **sessions**: User session management
- **reviews**: Book reviews and ratings

---

## 📋 Troubleshooting

### "Invalid credentials" error
- Verify email matches: `sahkkr702@gmail.com`
- Verify PIN is exactly: `2063`
- Check that password hash in `.env` matches the generated one

### Admin portal not accessible
- Verify URL is correct: `/admin-dashboard-secret-2063`
- Check that admin routes are mounted in server
- Verify firewall rules allow admin traffic

### Database connection error
- Verify `DATABASE_URL` is set correctly
- Check database is running and accessible
- Verify user has permissions to create tables

### No products showing after restart
- **This is NOT a bug** - Products persist in the database
- If products are missing, check database URL configuration
- Run seed script: `npm run dev`

---

## 🔑 Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use strong passwords** - Change admin password after setup
3. **Enable HTTPS** - Always use HTTPS in production
4. **Rotate secrets** - Periodically change JWT and SESSION secrets
5. **Monitor logs** - Check admin access logs for suspicious activity
6. **Backup database** - Regular backups of PostgreSQL database

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs: `npm run dev`
3. Verify all environment variables are set
4. Check database connectivity

---

## 📝 License

This admin portal is part of the Lexicon Books project.

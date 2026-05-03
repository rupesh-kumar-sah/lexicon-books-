# Deployment Guide - Render.com

## Overview

This guide covers deploying Lexicon Books to Render.com with full production setup including PostgreSQL database, environment configuration, and admin portal security.

---

## Prerequisites

- Render.com account (free tier available)
- GitHub repository with code pushed
- Environment variables prepared (see below)

---

## Step 1: Prepare Environment Variables

Before deploying, have these environment variables ready:

```env
NODE_ENV=production
LOG_ENABLED=false
PORT=5000
HOST=0.0.0.0

# Database (Will be provided by Render)
DATABASE_URL=postgresql://user:pass@host/db

# Admin Portal
ADMIN_EMAIL=sahkkr702@gmail.com
ADMIN_HASHED_PASSWORD=$2b$10$bJpZMOrS4k5U6K5v4VfZe.QwvvaATX3kop/EQmhZwLQ0nrvTphIKy
ADMIN_PIN=2063
ADMIN_SECRET_PATH=admin-dashboard-secret-2063
VITE_ADMIN_PATH=/admin-dashboard-secret-2063

# Security
JWT_SECRET=<generate-strong-random-string>
SESSION_SECRET=<generate-strong-random-string>
VITE_ADMIN_SECURITY_TOKEN=admin-dashboard-secret-2063

# API Keys (optional)
GROQ_API_KEY=<your-groq-key>
GOOGLE_MAPS_API_KEY=<your-google-maps-key>
VITE_GOOGLE_MAPS_API_KEY=<your-google-maps-key>
```

To generate random secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 2: Deploy on Render (Option A - Recommended: Using render.yaml)

### 2a. Using Automatic Deploy with render.yaml

1. **Verify `render.yaml` exists** in your repository root (should already be there)

2. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Production ready with admin portal and database persistence"
   git push origin main
   ```

3. **Connect to Render**
   - Go to https://render.com/dashboard
   - Click "New +" → "Infrastructure"
   - Select your GitHub repository
   - Render should auto-detect `render.yaml`
   - Review the generated service definitions and click "Deploy"

> This is the correct blueprint if you want Render to deploy using the `render.yaml` setup. It lets Render create both the web service and the PostgreSQL database automatically.

4. **Render will automatically:**
   - Create PostgreSQL database
   - Build and deploy web service
   - Set up environment variables
   - Configure networking between services

---

## Step 2: Deploy on Render (Option B - Manual Docker Deploy)

### 2b. Manual Dockerfile Deploy

1. **Create Render Web Service**
   - Go to https://render.com/dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select branch (main/master)

2. **Configure Web Service**
   - Name: `lexicon-books-app`
   - Runtime: `Docker`
   - Root Directory: (leave empty or set to repository root)
   - Build Command: (leave empty - uses Dockerfile)
   - Start Command: (leave empty - uses Dockerfile CMD)

3. **Set Environment Variables** in Render dashboard:
   ```
   NODE_ENV=production
   LOG_ENABLED=false
   JWT_SECRET=<your-generated-secret>
   SESSION_SECRET=<your-generated-secret>
   ADMIN_EMAIL=sahkkr702@gmail.com
   ADMIN_HASHED_PASSWORD=<hash-from-admin-setup.mjs>
   ADMIN_PIN=2063
   GROQ_API_KEY=<your-key>
   GOOGLE_MAPS_API_KEY=<your-key>
   ```

4. **Create PostgreSQL Database Service**
   - Click "New +" → "PostgreSQL"
   - Name: `lexicon-books-db`
   - Database Name: `lexicon_books`
   - User: (auto-generated)
   - Region: (select closest region)
   - Click "Create Database"

5. **Link Database to Web Service**
   - Go to Web Service → Environment
   - Add environment variable:
     ```
     DATABASE_URL=<copy-from-database-internal-connection-string>
     ADMIN_DATABASE_URL=<copy-from-database-internal-connection-string>
     ```

6. **Deploy**
   - Click "Deploy"
   - Monitor build logs in "Logs" tab

---

## Step 3: Verify Deployment

### Health Check
```bash
curl https://<your-app>.onrender.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2024-05-04T..."}
```

### Admin Portal Access
Open browser to:
```
https://<your-app>.onrender.com/admin-dashboard-secret-2063
```

Login with:
- Email: `sahkkr702@gmail.com`
- Password: `rupesh@0123456`
- PIN: `2063`

### Check Database Connection
```bash
# Via admin panel → Dashboard
# Should show "Total Books", "Total Customers", etc.
```

---

## Step 4: Post-Deployment Configuration

### Enable Auto-Deploy
1. Go to Render dashboard → Web Service
2. Settings → Auto-Deploy
3. Select "Yes" to auto-deploy on push

### Setup Domain
1. Settings → Custom Domain
2. Add your domain (e.g., lexicon-books.com)
3. Configure DNS records per Render instructions

### Monitor Performance
- Logs: `Dashboard → Logs` - Real-time server logs
- Metrics: `Dashboard → Metrics` - CPU, memory, bandwidth
- Events: `Dashboard → Events` - Deployment history

---

## Troubleshooting

### Build Fails: "npm packages not found"
- Check `package-lock.json` exists in repository
- Verify Node version in `package.json` is compatible
- Try: `rm -rf node_modules && npm install`

### Build Fails: "Database connection error"
- Verify DATABASE_URL environment variable is set
- Check PostgreSQL service is running (check Render dashboard)
- Wait 2-3 minutes after database creation for it to be ready

### App starts but no data
- Check `/api/health` endpoint returns OK
- Verify DATABASE_URL in logs (Dashboard → Logs)
- Check if seed script ran: look for "[seed]" logs
- May need to manually seed: connect to DB and run schema.sql

### Admin Portal shows 403 Forbidden
- Verify `ADMIN_EMAIL`, `ADMIN_HASHED_PASSWORD`, `ADMIN_PIN` in environment
- Check exact URL path: `/admin-dashboard-secret-2063`
- Clear browser cache and try again

### Static assets not loading (CSS/JS broken)
- Verify build completed successfully
- Check `dist/` folder contains all assets
- May need to clear Render cache: Settings → Clear Build Cache
- Redeploy

### Database quota exceeded
- Check storage usage in PostgreSQL dashboard
- Delete old/test data if needed
- Consider upgrading plan if approaching limits

---

## Monitoring & Maintenance

### Daily Checks
- Monitor admin dashboard for new orders
- Check for low stock items
- Review error logs

### Weekly Checks
- Database backup status
- Performance metrics (CPU, memory)
- Failed request logs

### Monthly Maintenance
- Update dependencies: `npm update`
- Rotate admin password
- Review access logs

---

## Production Best Practices

1. **Never debug in production** - Use `LOG_ENABLED=false`
2. **Regular backups** - Render has automatic daily backups
3. **HTTPS enforced** - All traffic is encrypted
4. **DDoS protection** - Render includes basic protection
5. **Auto-scaling** - Render scales based on traffic (paid plans)

---

## Rollback Procedure

If deployment has issues:

1. Go to Render dashboard
2. Click on Web Service
3. Events → Find previous successful deploy
4. Click → "Redeploy" on that version
5. Or use `git revert <commit-hash>` and push

---

## Cost Estimation

### Free Tier (Suitable for Testing)
- Web Service: Free (sleeps after 15 min inactivity)
- PostgreSQL: Free (shared, limited storage)
- Total: $0/month

### Starter Tier (Suitable for Production)
- Web Service: ~$7/month (always on, auto-scale)
- PostgreSQL: ~$15/month (dedicated, regular backups)
- Total: ~$22/month

### Scale as Needed
Upgrade to higher tiers as traffic grows.

---

## Support Resources

- Render Docs: https://render.com/docs
- PostgreSQL Guide: https://www.postgresql.org/docs/
- Node.js Deployment: https://nodejs.org/en/docs/guides/nodejs-docker-webapp/

---

## Success Checklist

- [ ] Environment variables set in Render
- [ ] Database service created and connected
- [ ] Build completes without errors
- [ ] App health check returns OK
- [ ] Admin portal accessible at secret URL
- [ ] Database connection working
- [ ] Initial seed data loaded
- [ ] Admin can log in and see dashboard
- [ ] Products visible after restart

✅ All checked? You're ready for production!

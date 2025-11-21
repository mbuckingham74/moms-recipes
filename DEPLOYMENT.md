# Deployment Guide - Mom's Recipes

Production deployment guide for **moms-recipes.tachyonfuture.com**

## Pre-Deployment Checklist

- ✅ DNS A record configured in Cloudflare
- ✅ Backend API production-ready
- ⬜ Frontend built and ready to deploy
- ⬜ Server/hosting environment selected

---

## Production Environment Variables

Create `.env` file on production server with:

```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://moms-recipes.tachyonfuture.com
```

**Important:** The `FRONTEND_URL` must match your exact domain for CORS to work properly.

---

## Deployment Options

### Option 1: Traditional VPS (DigitalOcean, Linode, etc.)

#### Backend Setup

```bash
# 1. Clone repository
git clone https://github.com/mbuckingham74/moms-recipes.git
cd moms-recipes

# 2. Install dependencies
npm install --production

# 3. Create production .env
cat > .env << EOF
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://moms-recipes.tachyonfuture.com
EOF

# 4. Start with PM2 (process manager)
npm install -g pm2
pm2 start backend/src/server.js --name moms-recipes
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name moms-recipes.tachyonfuture.com;

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend (React build)
    location / {
        root /var/www/moms-recipes/build;
        try_files $uri /index.html;
    }
}
```

#### SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d moms-recipes.tachyonfuture.com
```

---

### Option 2: Docker Deployment

#### Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source
COPY . .

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "backend/src/server.js"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: .
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - NODE_ENV=production
      - FRONTEND_URL=https://moms-recipes.tachyonfuture.com
    volumes:
      - ./backend/data:/app/backend/data
      - ./backend/uploads:/app/backend/uploads
```

**Deploy:**
```bash
docker-compose up -d
```

---

### Option 3: Cloud Platform (Heroku, Railway, Render)

Most platforms auto-detect Node.js apps and use `npm start`.

**Environment Variables to Set:**
- `NODE_ENV` = `production`
- `FRONTEND_URL` = `https://moms-recipes.tachyonfuture.com`
- `PORT` = (usually auto-assigned, or set to `3001`)

**Note:** Ensure persistent storage for `backend/data/` directory (SQLite database).

---

## Frontend Deployment

### Build React App

```bash
cd frontend  # (when created)
npm install
npm run build
```

### Deploy Options

**Static Hosting (Cloudflare Pages, Netlify, Vercel):**
- Upload `build/` directory
- Set environment variable: `REACT_APP_API_URL=https://moms-recipes.tachyonfuture.com/api`

**Same Server as Backend:**
- Copy `build/` to `/var/www/moms-recipes/build/`
- Nginx serves static files, proxies `/api` to backend

---

## Database Considerations

### SQLite in Production

**Pros:**
- Zero configuration
- No separate database server
- Fast for read-heavy workloads (recipes)
- Perfect for < 1000 recipes

**Important:**
- ✅ Backup `backend/data/recipes.db` regularly
- ✅ Ensure persistent storage (not ephemeral containers)
- ✅ For high traffic, consider read replicas or switch to PostgreSQL

### Backup Strategy

```bash
# Automated daily backup
0 2 * * * cp /app/backend/data/recipes.db /backups/recipes-$(date +\%Y\%m\%d).db
```

Or use `sqlite3` backup command:
```bash
sqlite3 backend/data/recipes.db ".backup backups/recipes.db"
```

---

## Monitoring & Maintenance

### Health Check

```bash
curl https://moms-recipes.tachyonfuture.com/api/health
# Should return: {"status":"ok","message":"Recipe API is running"}
```

### PM2 Monitoring

```bash
pm2 status
pm2 logs moms-recipes
pm2 monit  # Real-time monitoring
```

### Server Requirements

**Minimum:**
- 1 CPU core
- 512 MB RAM
- 10 GB storage

**Recommended:**
- 2 CPU cores
- 1 GB RAM
- 20 GB storage (for images)

---

## Security Checklist

- ✅ HTTPS enabled (SSL certificate)
- ✅ CORS restricted to production domain
- ✅ Environment variables not committed to git
- ✅ API input validation enabled
- ⬜ Rate limiting (optional, add if needed)
- ⬜ API authentication (optional, for admin features)

---

## Cloudflare Configuration

Since you're using Cloudflare:

### DNS Settings
- **Type:** A
- **Name:** moms-recipes
- **Content:** Your server IP
- **Proxy status:** Proxied (orange cloud) ✅

### SSL/TLS Settings
- **SSL/TLS encryption mode:** Full (strict)
- Auto HTTPS rewrites: On

### Performance
- **Auto Minify:** HTML, CSS, JS
- **Brotli:** Enabled
- **Caching Level:** Standard

---

## Post-Deployment Testing

```bash
# 1. Health check
curl https://moms-recipes.tachyonfuture.com/api/health

# 2. Create test recipe
curl -X POST https://moms-recipes.tachyonfuture.com/api/recipes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Recipe","ingredients":[],"tags":[]}'

# 3. Fetch recipes
curl https://moms-recipes.tachyonfuture.com/api/recipes

# 4. Frontend loads
open https://moms-recipes.tachyonfuture.com
```

---

## Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` matches exact domain (including https://)
- Check `NODE_ENV=production` is set
- Inspect browser console for origin mismatch

### Database Issues
- Ensure `backend/data/` directory has write permissions
- Check disk space: `df -h`
- Verify SQLite file isn't corrupted: `sqlite3 backend/data/recipes.db "PRAGMA integrity_check;"`

### Server Not Starting
- Check logs: `pm2 logs` or `docker logs`
- Verify port 3001 isn't already in use: `lsof -i :3001`
- Ensure all dependencies installed: `npm install`

---

## Scaling Considerations

### When to Upgrade from SQLite

Consider PostgreSQL if:
- More than 5000 recipes
- High concurrent writes (multiple users adding recipes)
- Need advanced querying or full-text search

### Migration Path

If needed, switch to PostgreSQL:
1. Export SQLite data
2. Update [backend/src/config/database.js](backend/src/config/database.js) to use `pg` driver
3. Minimal code changes (prepared statements are compatible)

---

## Rollback Plan

If deployment fails:

```bash
# PM2
pm2 stop moms-recipes
git checkout <previous-commit>
npm install
pm2 restart moms-recipes

# Docker
docker-compose down
git checkout <previous-commit>
docker-compose up -d --build
```

---

## Support

- **Documentation:** [README.md](README.md)
- **API Reference:** [README.md#api-endpoints](README.md#api-endpoints)
- **Design System:** [FRONTEND_DESIGN.md](FRONTEND_DESIGN.md)
- **Fixes Log:** [FIXES_SUMMARY.md](FIXES_SUMMARY.md)

---

**Deployment Target:** https://moms-recipes.tachyonfuture.com
**Repository:** https://github.com/mbuckingham74/moms-recipes
**Backend Status:** Production-ready ✅
**Frontend Status:** Design complete, implementation pending

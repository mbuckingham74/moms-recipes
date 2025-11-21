# MySQL Migration - Complete ✅

## Summary

Successfully migrated the Mom's Recipes application from SQLite to MySQL with async/await support. The application is now ready for Docker deployment on your tachyonfuture.com server.

## Changes Made

### 1. Database Layer

**Files Modified:**
- ✅ `backend/src/config/database.js` - Now detects environment and switches between SQLite (dev) and MySQL (prod)
- ✅ `backend/src/config/database.mysql.js` - New MySQL adapter with prepare() API compatible with existing code

**Key Features:**
- Automatic database/table creation on startup
- Connection pooling (10 connections)
- Transaction support
- Compatible API with better-sqlite3

**SQL Changes:**
- `INSERT OR IGNORE` → `INSERT IGNORE` (MySQL syntax)
- `strftime('%s', 'now')` → `UNIX_TIMESTAMP()` (MySQL syntax)
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `INT AUTO_INCREMENT PRIMARY KEY`

### 2. Model Layer

**Files Modified:**
- ✅ `backend/src/models/recipeModel.js` - All methods converted to async/await

**Backup Created:**
- `backend/src/models/recipeModel.js.sqlite` - Original SQLite version (for reference)

**Changes:**
- All static methods now use `async`
- All database calls now use `await`
- `forEach` loops replaced with `for...of` loops (for async/await support)
- Transaction callbacks are now async

### 3. Controller Layer

**Files Modified:**
- ✅ `backend/src/controllers/recipeController.js` - All model calls now use `await`

**Changes:**
- `await RecipeModel.create()`
- `await RecipeModel.getById()`
- `await RecipeModel.getAll()`
- `await RecipeModel.update()`
- `await RecipeModel.delete()`
- `await RecipeModel.getAllTags()`
- `await RecipeModel.searchByTitle()`, `searchByIngredient()`, `combinedSearch()`

### 4. Dependencies

**Files Modified:**
- ✅ `package.json` - Added `mysql2@^3.11.5`

**Installed:**
```bash
npm install  # Installed mysql2 and dependencies
```

### 5. Docker Configuration

**Files Created:**
- ✅ `docker-compose.yml` - Full stack orchestration
- ✅ `backend/Dockerfile` - Backend container
- ✅ `frontend/Dockerfile` - Frontend container (React + nginx)
- ✅ `frontend/nginx.conf` - Nginx web server configuration
- ✅ `.env.docker.example` - Environment template

**Configuration:**
- Connects to existing `meteo-mysql-prod` MySQL container
- Uses `npm_network` for reverse proxy access
- Uses `meteo-internal` for database access
- Health checks configured for both containers

### 6. Documentation

**Files Created:**
- ✅ `DOCKER_DEPLOYMENT.md` - Complete deployment guide
- ✅ `MYSQL_MIGRATION_TODO.md` - Implementation notes (now superseded)
- ✅ `MYSQL_MIGRATION_COMPLETE.md` - This file

## Testing Locally

### Option 1: Test with SQLite (Development Mode)

```bash
# Uses existing SQLite database
npm run dev

# Visit http://localhost:3001/health
```

### Option 2: Test with MySQL (Production Mode)

You'll need a local MySQL server:

```bash
# Start MySQL container for testing
docker run -d \
  --name test-mysql \
  -e MYSQL_ROOT_PASSWORD=testpass \
  -e MYSQL_DATABASE=moms_recipes \
  -p 3306:3306 \
  mysql:8

# Create .env with MySQL settings
cat > .env << EOF
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=testpass
DB_NAME=moms_recipes
PORT=3001
EOF

# Start the backend
npm start

# Test the API
curl http://localhost:3001/health
```

## Deployment to Production

Follow the complete guide in [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md).

### Quick Start

```bash
# SSH to server
ssh michael@tachyonfuture.com

# Clone repo (or pull latest)
cd ~/moms-recipes
git pull origin main

# Configure environment
cp .env.docker.example .env
nano .env  # Add MySQL password

# Build and start
docker compose up -d --build

# Check logs
docker compose logs -f
```

### Configure NPM

1. **Backend API**: `api.recipes.tachyonfuture.com` → `moms-recipes-backend:3001`
2. **Frontend**: `recipes.tachyonfuture.com` → `moms-recipes-frontend:80`

Both with SSL certificates from Let's Encrypt.

## Environment Variables

### Development (.env)
```bash
PORT=3001
NODE_ENV=development
# SQLite is used automatically
```

### Production (.env)
```bash
NODE_ENV=production
DB_HOST=meteo-mysql-prod
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=moms_recipes
FRONTEND_URL=https://recipes.tachyonfuture.com
PORT=3001
```

## Database Schema

MySQL database `moms_recipes` with 4 tables:

1. **recipes** - Main recipe data
   - id, title, source, date_added, instructions, image_path, created_at, updated_at

2. **ingredients** - Recipe ingredients
   - id, recipe_id, name, quantity, unit, position
   - Foreign key to recipes with CASCADE delete

3. **tags** - Tag definitions
   - id, name (unique), created_at

4. **recipe_tags** - Many-to-many relationship
   - recipe_id, tag_id (composite primary key)
   - Foreign keys to both recipes and tags with CASCADE delete

All tables use:
- InnoDB engine
- UTF-8MB4 charset
- Unicode collation
- Appropriate indexes for performance

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Nginx Proxy Manager (npm_network)             │
│  - SSL Termination                              │
│  - Reverse Proxy                                │
└────────────┬────────────────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────┐      ┌──────────┐
│ Frontend│      │ Backend  │
│ (nginx) │      │ (Node.js)│
│  :80    │      │  :3001   │
└─────────┘      └─────┬────┘
                       │
                       │ meteo-internal
                       ▼
              ┌──────────────────┐
              │ meteo-mysql-prod │
              │  (MySQL 8)       │
              │  :3306           │
              └──────────────────┘
```

## Rollback Plan

If something goes wrong, you can quickly rollback:

### Rollback Code

```bash
cd ~/moms-recipes

# Restore SQLite model
cp backend/src/models/recipeModel.js.sqlite backend/src/models/recipeModel.js

# Remove MySQL from database.js
# (Revert to original SQLite-only version)

# Use SQLite in Docker
# Update docker-compose.yml to remove MySQL dependencies
```

### Rollback Docker

```bash
docker compose down
# Fix issues
docker compose up -d --build
```

## Verification Checklist

After deployment, verify:

- [ ] Backend health check: `https://api.recipes.tachyonfuture.com/health`
- [ ] Frontend loads: `https://recipes.tachyonfuture.com`
- [ ] Can view recipes list
- [ ] Can view individual recipe
- [ ] Can create new recipe
- [ ] Can edit recipe
- [ ] Can delete recipe
- [ ] Can search by title
- [ ] Can search by ingredient
- [ ] Can filter by tags
- [ ] Images upload and display correctly
- [ ] MySQL database has data: `docker exec -it meteo-mysql-prod mysql -u root -p`

## Performance Notes

**MySQL vs SQLite:**
- MySQL handles concurrent requests better
- Connection pooling (10 connections)
- Better for multiple users
- Shared with other apps on server (meteo)

**Async/Await Benefits:**
- Non-blocking database operations
- Better performance under load
- Modern JavaScript patterns
- Easier error handling

## Maintenance

### Backups

Add to `~/backup-databases.sh`:

```bash
# Backup Mom's Recipes database
docker exec meteo-mysql-prod mysqldump \
  -u root -p${MYSQL_ROOT_PASSWORD} \
  moms_recipes | \
  gzip > "${BACKUP_DIR}/moms-recipes-$(date +%Y%m%d-%H%M%S).sql.gz"
```

### Monitoring

Add to Uptime Kuma (see [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md#8-add-to-monitoring-optional))

## Troubleshooting

### Backend can't connect to MySQL

```bash
# Check if backend is on meteo-internal network
docker network inspect meteo-internal | grep moms-recipes-backend

# Connect if needed
docker network connect meteo-internal moms-recipes-backend
docker restart moms-recipes-backend
```

### Database initialization errors

```bash
# Check MySQL logs
docker logs meteo-mysql-prod

# Check backend logs
docker logs moms-recipes-backend

# Manually create database
docker exec -it meteo-mysql-prod mysql -u root -p
CREATE DATABASE moms_recipes;
exit;

# Restart backend
docker restart moms-recipes-backend
```

### 502 Errors

See [DOCKER_DEPLOYMENT.md#troubleshooting](DOCKER_DEPLOYMENT.md#troubleshooting)

## Success Metrics

✅ All code converted to async/await
✅ MySQL adapter provides compatible API
✅ Docker containers configured
✅ Environment variables documented
✅ Deployment guide complete
✅ Rollback plan documented
✅ Dependencies installed

## Next Steps

1. ✅ Code migration - **COMPLETE**
2. ✅ Deploy to server - **COMPLETE**
3. ✅ Configure NPM reverse proxy - **COMPLETE**
4. ✅ Test all functionality - **COMPLETE**
5. 🔄 Set up monitoring - Recommended
6. 🔄 Configure backups - Recommended

---

## Deployment Summary

**Deployed URLs:**
- Frontend: https://moms-recipes.tachyonfuture.com
- Backend API: https://api.moms-recipes.tachyonfuture.com

**Infrastructure:**
- Frontend: Nginx serving React SPA
- Backend: Node.js Express API
- Database: MySQL 8 (shared meteo-mysql-prod container)
- Proxy: Nginx Proxy Manager with Let's Encrypt SSL
- Networks: npm_network + meteo-internal

**Key Fixes Applied:**
- MySQL adapter: Use `query()` instead of `execute()` for complex SQL with GROUP BY
- MySQL LIMIT syntax: Changed from `LIMIT ? OFFSET ?` to `LIMIT ?, ?` (offset, count)
- SQL whitespace normalization: Strip and normalize whitespace for MySQL prepared statements
- Frontend build: Added `VITE_API_BASE_URL` build argument for production API URL
- CORS configuration: Backend configured with production frontend URL

---

**Migration completed:** November 21, 2025
**Deployment completed:** November 21, 2025
**By:** Claude Code
**Status:** ✅ **LIVE IN PRODUCTION**

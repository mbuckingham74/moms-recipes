# Docker Deployment Guide - Mom's Recipes

## Overview

This application is containerized and designed to run on the tachyonfuture.com server infrastructure. It uses:

- **Backend**: Node.js/Express API with MySQL database
- **Frontend**: React (Vite) served via nginx
- **Database**: Shared MySQL container (`meteo-mysql-prod`)
- **Reverse Proxy**: Nginx Proxy Manager (NPM)
- **Networks**: `npm_network` (public services) and `meteo-internal` (database access)

## Prerequisites

1. SSH access to tachyonfuture.com server
2. Docker and Docker Compose installed
3. Existing `meteo-mysql-prod` MySQL container running
4. Nginx Proxy Manager configured and running
5. Networks `npm_network` and `meteo-internal` must exist

## Directory Structure

```
moms-recipes/
├── backend/
│   ├── Dockerfile
│   ├── src/
│   ├── uploads/          # Persistent volume for recipe images
│   └── data/             # Development SQLite databases (ignored in prod)
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
├── docker-compose.yml
├── .env.docker.example
└── DOCKER_DEPLOYMENT.md  # This file
```

## Deployment Steps

### 1. Clone Repository on Server

```bash
ssh michael@tachyonfuture.com
cd ~
git clone <repository-url> moms-recipes
cd moms-recipes
```

### 2. Configure Environment Variables

```bash
# Copy the example env file
cp .env.docker.example .env

# Edit with your MySQL password and settings
nano .env
```

Required environment variables in `.env`:

```bash
NODE_ENV=production
DB_HOST=meteo-mysql-prod
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<your_mysql_root_password>
DB_NAME=moms_recipes
FRONTEND_URL=https://recipes.tachyonfuture.com
PORT=3001
```

### 3. Verify MySQL Container

Ensure the MySQL container is running and accessible:

```bash
# Check if meteo-mysql-prod is running
docker ps | grep meteo-mysql-prod

# Verify it's on meteo-internal network
docker network inspect meteo-internal | grep meteo-mysql-prod
```

### 4. Build and Start Containers

```bash
# Build and start in detached mode
docker compose up -d --build

# Check logs
docker compose logs -f

# Verify containers are running
docker ps | grep moms-recipes
```

Expected containers:
- `moms-recipes-backend` - Node.js API on port 3001
- `moms-recipes-frontend` - nginx serving React app on port 80

### 5. Initialize Database

The backend will automatically create the `moms_recipes` database and tables on first run. Verify:

```bash
# Connect to MySQL
docker exec -it meteo-mysql-prod mysql -u root -p

# Check database was created
SHOW DATABASES;
USE moms_recipes;
SHOW TABLES;

# Should see: recipes, ingredients, tags, recipe_tags
exit;
```

### 6. Configure Nginx Proxy Manager

#### Backend API Proxy Host

1. Log into NPM: https://npm.tachyonfuture.com
2. Create new Proxy Host:
   - **Domain Names**: `api.recipes.tachyonfuture.com` (or your preferred subdomain)
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `moms-recipes-backend`
   - **Forward Port**: `3001`
   - **Cache Assets**: Off
   - **Block Common Exploits**: On
   - **Websockets Support**: Off
3. SSL tab:
   - Request new Let's Encrypt certificate
   - Force SSL: On
   - HTTP/2 Support: On
4. Advanced (optional):
   ```nginx
   # Rate limiting (optional)
   limit_req_zone $binary_remote_addr zone=recipes_api:10m rate=10r/s;
   limit_req zone=recipes_api burst=20 nodelay;
   ```

#### Frontend Proxy Host

1. Create new Proxy Host:
   - **Domain Names**: `recipes.tachyonfuture.com`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `moms-recipes-frontend`
   - **Forward Port**: `80`
   - **Cache Assets**: On
   - **Block Common Exploits**: On
   - **Websockets Support**: Off
2. SSL tab:
   - Request new Let's Encrypt certificate
   - Force SSL: On
   - HTTP/2 Support: On
   - HSTS Enabled: On

### 7. Verify Deployment

```bash
# Check container health
docker ps --format '{{.Names}}\t{{.Status}}'

# Test backend API
curl https://api.recipes.tachyonfuture.com/health

# Test frontend
curl https://recipes.tachyonfuture.com

# Check backend logs
docker logs moms-recipes-backend --tail 50

# Check frontend logs
docker logs moms-recipes-frontend --tail 50
```

### 8. Add to Monitoring (Optional)

#### Uptime Kuma

Add container monitors via SQLite:

```bash
docker run --rm -v ~/uptime-kuma/uptime-kuma-data:/data nouchka/sqlite3 /data/kuma.db \
  "INSERT INTO monitor (name, user_id, active, type, docker_container, docker_host, interval)
   VALUES ('Mom'\''s Recipes Backend', 1, 1, 'docker', 'moms-recipes-backend', 1, 60);"

docker run --rm -v ~/uptime-kuma/uptime-kuma-data:/data nouchka/sqlite3 /data/kuma.db \
  "INSERT INTO monitor (name, user_id, active, type, docker_container, docker_host, interval)
   VALUES ('Mom'\''s Recipes Frontend', 1, 1, 'docker', 'moms-recipes-frontend', 1, 60);"

cd ~/uptime-kuma && docker compose restart
```

## Data Migration (Optional)

If you have existing recipe data in SQLite, you can migrate it:

### Export from SQLite

```bash
# On your local development machine
cd backend/data
sqlite3 recipes.db

# Export to SQL file
.output recipes_export.sql
.dump
.exit
```

### Import to MySQL

```bash
# Transfer file to server
scp recipes_export.sql michael@tachyonfuture.com:~/

# SSH to server
ssh michael@tachyonfuture.com

# Convert SQLite SQL to MySQL-compatible format
# (Manual conversion may be needed for syntax differences)
# Then import:
docker exec -i meteo-mysql-prod mysql -u root -p moms_recipes < ~/recipes_export.sql
```

## Updating the Application

### Standard Update

```bash
cd ~/moms-recipes
git pull origin main
docker compose up -d --build
```

### Backend-Only Update

```bash
docker compose up -d --build moms-recipes-backend
```

### Frontend-Only Update

```bash
docker compose up -d --build moms-recipes-frontend
```

## Backup Procedures

### Database Backup

Add to existing backup script (`~/backup-databases.sh`):

```bash
# Backup Mom's Recipes database
docker exec meteo-mysql-prod mysqldump -u root -p${MYSQL_ROOT_PASSWORD} moms_recipes | \
  gzip > "${BACKUP_DIR}/moms-recipes-$(date +%Y%m%d-%H%M%S).sql.gz"
```

### Recipe Images Backup

```bash
# Backup uploads directory
tar -czf ~/backups/moms-recipes-uploads-$(date +%Y%m%d).tar.gz -C ~/moms-recipes/backend uploads/
```

## Troubleshooting

### Backend Can't Connect to MySQL

```bash
# Check if backend is on meteo-internal network
docker network inspect meteo-internal | grep moms-recipes-backend

# If not connected, add it
docker network connect meteo-internal moms-recipes-backend

# Restart backend
docker restart moms-recipes-backend
```

### 502 Errors from NPM

```bash
# Verify containers are on npm_network
docker network inspect npm_network | grep moms-recipes

# If not connected
docker network connect npm_network moms-recipes-backend
docker network connect npm_network moms-recipes-frontend

# Restart NPM
cd /docker/nginx-proxy-manager && docker compose restart
```

### Database Permission Errors

```bash
# Connect to MySQL and grant permissions
docker exec -it meteo-mysql-prod mysql -u root -p

GRANT ALL PRIVILEGES ON moms_recipes.* TO 'root'@'%';
FLUSH PRIVILEGES;
exit;
```

### View Container Logs

```bash
# Backend logs
docker logs moms-recipes-backend -f

# Frontend logs
docker logs moms-recipes-frontend -f

# Both at once
docker logs moms-recipes-backend -f & docker logs moms-recipes-frontend -f &
```

### Restart Everything

```bash
cd ~/moms-recipes
docker compose restart
```

### Nuclear Option - Rebuild from Scratch

```bash
cd ~/moms-recipes
docker compose down
docker compose up -d --build --force-recreate
```

## Container Management

### Start/Stop

```bash
# Stop all
docker compose stop

# Start all
docker compose start

# Restart all
docker compose restart

# Stop and remove containers (keeps data)
docker compose down

# Remove everything including volumes (DANGER!)
docker compose down -v
```

### View Status

```bash
# Container status
docker compose ps

# Resource usage
docker stats moms-recipes-backend moms-recipes-frontend

# Health status
docker inspect moms-recipes-backend | grep -A 10 Health
docker inspect moms-recipes-frontend | grep -A 10 Health
```

## Environment Configuration

### Development Mode (Local)

Uses SQLite database for development:

```bash
# Run locally without Docker
npm install
npm run dev
```

### Production Mode (Docker)

Set `NODE_ENV=production` to use MySQL:

```bash
NODE_ENV=production npm start
```

## Security Notes

1. **Never commit `.env` files** - They're in .gitignore
2. **MySQL password** should be strong and stored securely
3. **CORS** is configured to only allow the frontend domain
4. **File uploads** are validated for image types only
5. **Rate limiting** can be added via NPM advanced configuration
6. **Health checks** are configured for both containers

## Resource Usage

Expected resource consumption:

- **Backend**: ~100MB RAM, minimal CPU
- **Frontend**: ~20MB RAM, minimal CPU
- **MySQL**: Shared with meteo app
- **Storage**: Minimal (~100MB for images)

## Support

For issues:
1. Check container logs: `docker compose logs`
2. Review [SYSADMIN.md](https://github.com/mbuckingham74/docker-configs/blob/main/SYSADMIN.md)
3. Check server health: https://status.tachyonfuture.com

---

**Last Updated**: November 21, 2025
**Author**: Claude Code
**Server**: tachyonfuture.com

# Deployment Guide

## Environment Variables (.env)

### CRITICAL: .env File Management

The `.env` file contains sensitive credentials and should be managed carefully:

- ✅ `.env` exists **locally** (for development)
- ✅ `.env` exists **on server** (for production)
- ❌ `.env` is **NOT** in git (it's in `.gitignore`)
- ❌ `.env` is **NEVER** pushed to GitHub

### Server .env Location

The production `.env` file is located at: `~/moms-recipes/.env`

### Required Environment Variables

```bash
# Node Environment
NODE_ENV=production

# Database (MySQL)
DB_HOST=meteo-mysql-prod
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<mysql_password>
DB_NAME=moms_recipes

# Application
FRONTEND_URL=https://mom-recipes.tachyonfuture.com
PORT=3001

# Security & APIs
JWT_SECRET=<generated_secret>
ANTHROPIC_API_KEY=<your_claude_api_key>

# Admin Accounts
ADMIN1_USERNAME=<username>
ADMIN1_PASSWORD=<password>
ADMIN1_EMAIL=<email>
ADMIN2_USERNAME=<username>
ADMIN2_PASSWORD=<password>
ADMIN2_EMAIL=<email>
```

## .env Template System

**To prevent chronic .env loss issues, the server uses a template system:**

- **`.env.production.template`** (server-side only) - Source of truth for production environment
- **`.env`** - Automatically restored from template during deployments
- **`deploy-safe.sh`** - Automatically applies template before deployment
- **`restore-env.sh`** - Manually restore .env from template anytime

The template is stored **only on the server** (not in git) for security. It's automatically applied by `deploy-safe.sh` to ensure credentials are never lost.

## Deployment Process

### Standard Deployment (Code Changes Only)

```bash
# SSH to server
ssh michael@tachyonfuture.com

# Navigate to project
cd ~/moms-recipes

# Pull latest code
git pull

# Rebuild and restart containers
docker compose up -d --build
```

###  Deployment with .env Changes

If you need to update environment variables:

```bash
# SSH to server
ssh michael@tachyonfuture.com

# Navigate to project
cd ~/moms-recipes

# Edit the production template (this is the source of truth)
nano .env.production.template

# Restore .env from template
./restore-env.sh

# Restart containers to pick up new variables
docker compose restart
```

**IMPORTANT:** Always edit `.env.production.template` (not `.env` directly). The template is automatically applied during deployments.

### Verifying .env is Loaded

```bash
# Check that .env exists
cat ~/moms-recipes/.env

# Verify docker-compose reads it
docker compose config | grep -A 5 ANTHROPIC_API_KEY

# Check environment variables in running container
docker exec moms-recipes-backend printenv | grep ANTHROPIC_API_KEY
```

## Troubleshooting

### "Environment variable not set" warnings

If you see warnings like:
```
The "ANTHROPIC_API_KEY" variable is not set. Defaulting to a blank string.
```

**Solution:**
1. Check if `.env` file exists: `ls -la ~/moms-recipes/.env`
2. If missing, recreate it with all required variables
3. Restart containers: `docker compose restart`

### .env File Missing After git pull

The `.env` file should **NOT** be affected by `git pull` because it's in `.gitignore`.

If it's missing:
1. Recreate it manually on the server
2. Add all required environment variables
3. Restart containers

### Container Shows "unhealthy"

Check logs:
```bash
docker logs moms-recipes-backend --tail 50
docker logs moms-recipes-frontend --tail 50
```

Common issues:
- Database connection failure (check DB_PASSWORD)
- API key missing (check ANTHROPIC_API_KEY)
- Port conflicts

## Best Practices

1. **Never commit .env to git**
2. **Keep .env.example updated** with all required variables (without values)
3. **Back up server .env** to a secure location (not in git)
4. **Use strong passwords** for admin accounts
5. **Rotate JWT_SECRET** periodically for security

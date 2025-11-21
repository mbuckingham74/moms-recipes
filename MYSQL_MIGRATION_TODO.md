# MySQL Migration - Implementation Notes

## Current Status

✅ **Completed:**
- Docker configuration files created
- MySQL database schema defined
- Environment configuration set up
- Deployment documentation written
- `mysql2` package added to dependencies

⚠️ **Requires Code Refactoring:**
The existing codebase uses `better-sqlite3` which provides a **synchronous** API:

```javascript
const result = db.prepare('SELECT * FROM recipes').all();
```

MySQL with `mysql2` requires an **asynchronous** API:

```javascript
const [result] = await pool.execute('SELECT * FROM recipes');
```

## Options to Complete Migration

### Option 1: Refactor to Async/Await (Recommended)

Convert the model layer to use async/await throughout:

**Files to update:**
1. `backend/src/models/recipeModel.js` - Make all methods async
2. `backend/src/controllers/recipeController.js` - Add async/await
3. `backend/src/routes/recipeRoutes.js` - Ensure routes handle async controllers

**Example change:**
```javascript
// Before (SQLite - synchronous)
static getById(id) {
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
  return recipe;
}

// After (MySQL - asynchronous)
static async getById(id) {
  const db = require('../config/database');
  const stmt = db.prepare('SELECT * FROM recipes WHERE id = ?');
  const recipe = await stmt.get(id);
  return recipe;
}
```

### Option 2: Use SQLite in Production

Keep using SQLite even in Docker:

1. Remove MySQL database configuration
2. Mount SQLite database file as Docker volume
3. Simpler deployment, no async refactoring needed

**docker-compose.yml update:**
```yaml
volumes:
  - ./backend/data:/app/backend/data  # Mount SQLite DB
```

### Option 3: Hybrid Approach

Use SQLite for development, MySQL for production with a database adapter layer:

1. Create a database wrapper that detects environment
2. Provide consistent API for both databases
3. Requires either:
   - Making MySQL synchronous (using `deasync` - not recommended)
   - Refactoring to async/await

## Recommended Approach

**Option 1 (Async Refactoring)** is the best long-term solution because:
- MySQL is more scalable and production-ready
- Async/await is modern JavaScript best practice
- You're already using Express 5.x which supports async route handlers
- The refactoring is straightforward (mostly adding `async` and `await` keywords)

**Estimated effort:** 2-3 hours to refactor and test

## Quick Start: Using SQLite in Docker

If you want to deploy **immediately** without refactoring:

1. Update `docker-compose.yml`:
```yaml
services:
  moms-recipes-backend:
    environment:
      NODE_ENV: production
      # Remove DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
    volumes:
      - ./backend/data:/app/backend/data  # Add this
      - ./backend/uploads:/app/uploads
    # Remove: depends_on: meteo-mysql-prod
    networks:
      - npm_network  # Remove meteo-internal
```

2. Update `backend/Dockerfile`:
```dockerfile
# Keep better-sqlite3
RUN npm ci --only=production

# Create data directory
RUN mkdir -p data uploads
```

3. Deploy immediately - no code changes needed!

## Files Created

All Docker configuration is ready to use:

- `docker-compose.yml` - Container orchestration
- `backend/Dockerfile` - Backend container
- `frontend/Dockerfile` - Frontend container
- `frontend/nginx.conf` - Nginx configuration
- `.env.docker.example` - Environment template
- `DOCKER_DEPLOYMENT.md` - Complete deployment guide
- `backend/src/config/database.js` - Database adapter (switches based on NODE_ENV)
- `backend/src/config/database.mysql.js` - MySQL configuration

## Decision Point

**Choose one:**

1. ✅ **Deploy now with SQLite** (no code changes, works immediately)
2. ⏱️ **Refactor to MySQL** (2-3 hours of async/await conversion)
3. 🔄 **Hybrid approach** (complex, not recommended)

My recommendation: **Start with SQLite** (Option 1 above), deploy and test, then refactor to MySQL later if needed for scalability.

---

**Author:** Claude Code
**Date:** November 21, 2025

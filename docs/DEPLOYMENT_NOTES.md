# Deployment Notes

## Initial Production Deployment - November 23, 2025

### Deployment Summary

Successfully deployed Mom's Recipes admin panel (Phase 1) to production:
- **Frontend**: https://mom-recipes.tachyonfuture.com
- **Backend API**: https://api.mom-recipes.tachyonfuture.com
- **Database**: MySQL 8 (meteo-mysql-prod container)

### Issues Encountered & Resolutions

#### 1. Module Import Error
**Issue**: Backend failed to start with "Cannot find module '../middleware/asyncHandler'"

**Root Cause**: `authController.js` and `pdfController.js` were importing `asyncHandler` as a separate module, but it's exported from `errorHandler.js`

**Fix**: Updated imports in both files:
```javascript
// Before
const asyncHandler = require('../middleware/asyncHandler');

// After
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
```

**Commit**: `8a94afa`

---

#### 2. Environment Variables Not Loading
**Issue**: Docker Compose reported all admin credentials and API keys as "not set", defaulting to blank strings

**Root Cause**: `.env` file on production server was missing the new variables added in Phase 1

**Fix**: Updated production `.env` file with all required variables:
- `JWT_SECRET`
- `ANTHROPIC_API_KEY`
- `ADMIN1_USERNAME`, `ADMIN1_PASSWORD`, `ADMIN1_EMAIL`
- `ADMIN2_USERNAME`, `ADMIN2_PASSWORD`, `ADMIN2_EMAIL`
- `FRONTEND_URL`

**Command**:
```bash
ssh user@server "cd ~/moms-recipes && docker compose down && docker compose up -d"
```

---

#### 3. Admin Users Seeded Successfully
**Result**: Created 2 admin users in production MySQL database:
- User ID 1: michael (admin)
- User ID 2: mom (admin)

---

#### 4. Dashboard API Error
**Issue**: Admin dashboard displayed "Failed to load dashboard data" error

**Root Cause**: Dashboard was calling `api.getAll()` which doesn't exist. Should use `api.get('/recipes')`

**Fix**: Updated `Dashboard.jsx`:
```javascript
// Before
const recipesResponse = await api.getAll();
const totalRecipes = recipesResponse.data?.data?.length || 0;

// After
const recipesResponse = await api.get('/recipes');
const totalRecipes = recipesResponse.data?.recipes?.length || 0;
```

**Commit**: `e0a6450`

---

#### 5. CORS Error - Wrong Domain
**Issue**: Login failed with CORS error. Browser console showed:
```
Access-Control-Allow-Origin header has value 'https://recipes.tachyonfuture.com'
that is not equal to the supplied origin
```

**Root Cause**: `FRONTEND_URL` in production `.env` was set to `https://recipes.tachyonfuture.com` (missing "moms-" prefix)

**Correct Domain**: `https://mom-recipes.tachyonfuture.com`

**Fix**: Updated production `.env` file and restarted Docker containers:
```bash
ssh user@server "cd ~/moms-recipes && \
  sed -i 's|https://recipes.tachyonfuture.com|https://mom-recipes.tachyonfuture.com|g' .env && \
  docker compose down && docker compose up -d"
```

**Important**: Must use `docker compose down` followed by `up -d` to reload environment variables. A simple `restart` won't pick up `.env` changes.

---

### Production Environment Variables Checklist

Ensure these are set in `/home/michael/moms-recipes/.env` on production server:

```env
NODE_ENV=production
DB_HOST=meteo-mysql-prod
DB_PORT=3306
DB_USER=root
DB_PASSWORD=[MySQL root password]
DB_NAME=moms_recipes
FRONTEND_URL=https://mom-recipes.tachyonfuture.com
PORT=3001

# Authentication
JWT_SECRET=[production JWT secret]
ANTHROPIC_API_KEY=[Anthropic API key]

# Admin Users
ADMIN1_USERNAME=[admin1 username]
ADMIN1_PASSWORD=[admin1 password]
ADMIN1_EMAIL=[admin1 email]

ADMIN2_USERNAME=[admin2 username]
ADMIN2_PASSWORD=[admin2 password]
ADMIN2_EMAIL=[admin2 email]
```

### Deployment Commands

**Standard Deployment** (after git push):
```bash
ssh michael@tachyonfuture.com "cd ~/moms-recipes && \
  git pull && \
  docker compose up -d --build"
```

**Full Restart** (when environment variables change):
```bash
ssh michael@tachyonfuture.com "cd ~/moms-recipes && \
  docker compose down && \
  docker compose up -d --build"
```

**Check Container Status**:
```bash
ssh michael@tachyonfuture.com "docker ps | grep moms-recipes"
```

**View Backend Logs**:
```bash
ssh michael@tachyonfuture.com "docker logs moms-recipes-backend --tail 50"
```

**Seed Admin Users** (if needed):
```bash
ssh michael@tachyonfuture.com \
  "docker exec moms-recipes-backend node backend/scripts/seedAdminUsers.js"
```

### Verification Steps

After deployment, verify:

1. **Backend Health**: `curl https://api.mom-recipes.tachyonfuture.com/health`
   - Should return: `{"status":"ok","message":"Recipe API is running"}`

2. **Frontend Access**: Visit https://mom-recipes.tachyonfuture.com
   - Should load the homepage with recipe listing

3. **Login**: Visit https://mom-recipes.tachyonfuture.com/login
   - Should successfully authenticate with admin credentials
   - Should redirect to `/admin` dashboard

4. **Dashboard**: Should show:
   - Total Recipes: 0 (or current count)
   - Pending Reviews: 0 (or current count)
   - No error messages

5. **CORS**: Check browser console for CORS errors
   - Should see no errors
   - All API requests should succeed

### Common Issues

**Login fails with CORS error**:
- Check `FRONTEND_URL` in production `.env` matches the actual domain
- Restart containers with `docker compose down && docker compose up -d`

**Dashboard shows "Failed to load dashboard data"**:
- Check frontend code was deployed (may need cache clear)
- Verify API endpoints are accessible

**Environment variables not loading**:
- Must use `docker compose down` then `up -d` (restart won't work)
- Verify `.env` file exists in `~/moms-recipes/` directory
- Check docker-compose.yml has all variables mapped

### Next Steps (Phase 2)

Frontend UI components to implement:
1. PDF Upload page with drag-and-drop (`/admin/upload`)
2. Pending recipes list (`/admin/pending`)
3. Pending recipe review/edit page (`/admin/pending/:id`)
4. Update Header to show auth state and admin menu
5. Enhanced Dashboard with recent uploads

All backend APIs are ready and working!

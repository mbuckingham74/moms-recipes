# Quick Start Guide - Mom's Recipes

## Repository
**GitHub:** https://github.com/mbuckingham74/moms-recipes
**Status:** Public

## Setup (Fresh Clone)

```bash
git clone https://github.com/mbuckingham74/moms-recipes.git
cd moms-recipes
npm install
npm run dev
```

Server starts at: http://localhost:3001

## Key Files

- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete development history and context
- **[README.md](README.md)** - Full API documentation with examples
- **[backend/src/config/database.js](backend/src/config/database.js)** - Database schema
- **[backend/src/models/recipeModel.js](backend/src/models/recipeModel.js)** - All database queries
- **[backend/example-add-recipe.js](backend/example-add-recipe.js)** - Recipe import template

## Quick Test

```bash
# Health check
curl http://localhost:3001/health

# Add a recipe
curl -X POST http://localhost:3001/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Recipe",
    "ingredients": [{"name": "flour", "quantity": "2", "unit": "cups"}],
    "tags": ["test"]
  }'

# Search by ingredient
curl "http://localhost:3001/api/recipes/search?ingredient=flour"
```

## Project Status

✅ Backend API complete
✅ Database schema optimized
✅ Search functionality working
⬜ Recipe import (0/370)
⬜ Frontend development

## Next Steps

1. Extract text from scanned recipes
2. Parse into structured format
3. Bulk import using API
4. Build React frontend
5. Deploy

## Resume Development

Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for complete context on what's been built and why.

All design decisions, database schema rationale, and future roadmap documented there.

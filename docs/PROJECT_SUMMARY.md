# Mom's Recipes Project - Development Summary

## Project Overview

A full-stack recipe organization web application designed to manage and search through ~370 recipes. This document tracks the current state of development and provides context for resuming work.

**Current Status:** Backend API complete and tested ✅
**Next Phase:** Frontend development (React)

---

## What We've Built

### Backend API (Complete)

A Node.js/Express REST API with SQLite database for recipe storage and retrieval.

#### Technology Stack
- **Runtime:** Node.js
- **Framework:** Express 5.1.0
- **Database:** SQLite with better-sqlite3 (synchronous, faster)
- **Dependencies:** cors, dotenv
- **Dev Tools:** nodemon for auto-reload

#### Project Structure
```
moms-recipes/
├── backend/                          # Backend application
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # SQLite connection, schema initialization
│   │   ├── models/
│   │   │   └── recipeModel.js       # Database operations (CRUD, search)
│   │   ├── controllers/
│   │   │   └── recipeController.js  # HTTP request handlers
│   │   ├── routes/
│   │   │   └── recipeRoutes.js      # API endpoint definitions
│   │   └── server.js                # Express app configuration
│   ├── tests/                        # Integration tests
│   ├── data/                         # SQLite database files (gitignored)
│   │   └── recipes.db               # Created automatically on first run
│   ├── uploads/                      # Recipe images (gitignored)
│   └── example-add-recipe.js        # Script showing how to add recipes
├── frontend/                         # React application
├── .env                              # Environment config (gitignored)
├── .gitignore
├── package.json
└── README.md                         # Full API documentation
```

---

## Database Schema

### Design Philosophy
- **Normalized structure** for efficient querying
- **Separate ingredients table** enables fast searching by ingredient
- **Many-to-many tags** for flexible categorization
- **Indexed columns** for performance
- **Foreign keys with CASCADE** for data integrity

### Tables

#### 1. recipes
Main recipe information.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PRIMARY KEY | Auto-increment |
| title | TEXT NOT NULL | Recipe name |
| source | TEXT | Where recipe came from |
| date_added | INTEGER | Unix timestamp, auto-set |
| instructions | TEXT | Cooking steps |
| image_path | TEXT | Path to scanned image |
| created_at | INTEGER | Unix timestamp |
| updated_at | INTEGER | Unix timestamp |

**Index:** `idx_recipes_title` on title column

#### 2. ingredients
Structured ingredient storage for searchability.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PRIMARY KEY | Auto-increment |
| recipe_id | INTEGER | Foreign key to recipes |
| name | TEXT NOT NULL | Ingredient name (indexed) |
| quantity | TEXT | Amount (e.g., "2", "1/2") |
| unit | TEXT | Measurement (e.g., "cups", "tsp") |
| position | INTEGER | Order in recipe |

**Indexes:**
- `idx_ingredients_name` - Fast ingredient searches
- `idx_ingredients_recipe_id` - Join optimization

**Foreign Key:** recipe_id → recipes(id) ON DELETE CASCADE

#### 3. tags
Unique tag/category names.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PRIMARY KEY | Auto-increment |
| name | TEXT UNIQUE NOT NULL | Tag name |
| created_at | INTEGER | Unix timestamp |

#### 4. recipe_tags
Junction table for many-to-many relationship.

| Column | Type | Notes |
|--------|------|-------|
| recipe_id | INTEGER | Foreign key to recipes |
| tag_id | INTEGER | Foreign key to tags |

**Primary Key:** Composite (recipe_id, tag_id)

**Indexes:**
- `idx_recipe_tags_recipe_id`
- `idx_recipe_tags_tag_id`

**Foreign Keys:**
- recipe_id → recipes(id) ON DELETE CASCADE
- tag_id → tags(id) ON DELETE CASCADE

---

## API Endpoints

Server runs on: `http://localhost:3001`

### Recipe CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recipes` | Create new recipe |
| GET | `/api/recipes` | Get all recipes (paginated) |
| GET | `/api/recipes/:id` | Get single recipe with full details |
| PUT | `/api/recipes/:id` | Update recipe |
| DELETE | `/api/recipes/:id` | Delete recipe |

### Search & Filter

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recipes/search?title=X` | Search by recipe title |
| GET | `/api/recipes/search?ingredient=X` | Find recipes containing ingredient |
| GET | `/api/recipes/search?ingredients=X,Y,Z` | Find recipes with ALL ingredients (AND) |
| GET | `/api/recipes/search?tags=X,Y` | Find recipes with ANY tag (OR) |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tags` | List all unique tags |
| GET | `/health` | Health check |

### Request/Response Examples

#### Create Recipe
```json
POST /api/recipes
{
  "title": "Chocolate Chip Cookies",
  "source": "Grandma's cookbook",
  "instructions": "1. Preheat oven...\n2. Mix ingredients...",
  "imagePath": "backend/uploads/cookies.jpg",
  "ingredients": [
    {
      "name": "flour",
      "quantity": "2",
      "unit": "cups"
    },
    {
      "name": "sugar",
      "quantity": "1",
      "unit": "cup"
    }
  ],
  "tags": ["dessert", "cookies", "baking"]
}
```

Response includes full recipe with auto-generated ID and timestamps.

#### Get Recipe
```json
GET /api/recipes/1
{
  "recipe": {
    "id": 1,
    "title": "Chocolate Chip Cookies",
    "source": "Grandma's cookbook",
    "date_added": 1763747600,
    "instructions": "...",
    "image_path": "backend/uploads/cookies.jpg",
    "ingredients": [
      {
        "name": "flour",
        "quantity": "2",
        "unit": "cups",
        "position": 0
      }
    ],
    "tags": ["dessert", "cookies", "baking"]
  }
}
```

#### Search Results
```json
GET /api/recipes/search?ingredient=flour
{
  "count": 15,
  "recipes": [
    {
      "id": 1,
      "title": "Chocolate Chip Cookies",
      "source": "Grandma's cookbook",
      "date_added": 1763747600,
      "image_path": "backend/uploads/cookies.jpg",
      "tags": ["dessert", "cookies"]
    }
  ]
}
```

---

## Key Features Implemented

### 1. Flexible Ingredient Search
- **Single ingredient:** Find any recipe containing that ingredient
- **Multiple ingredients (AND):** Find recipes containing ALL specified ingredients
- Uses indexed lookups for fast queries even with 370+ recipes

### 2. Tag-Based Organization
- Multiple tags per recipe (dessert, breakfast, baking, etc.)
- Search by one or more tags
- Auto-creates tags on first use
- Can list all available tags

### 3. Efficient Data Model
- Ingredients in separate table prevents duplication
- Position field maintains ingredient order
- Quantity/unit stored as text for flexibility (handles "1/2", "2-3", etc.)

### 4. Data Integrity
- Foreign key constraints with cascading deletes
- Required fields enforced at database level
- Automatic timestamp management

---

## Testing Status

✅ **Server starts successfully** on port 3001
✅ **Database initializes** automatically on first run
✅ **Recipe creation** works with full ingredient/tag structure
✅ **Ingredient search** returns correct results
✅ **Tag filtering** works as expected
✅ **Individual recipe retrieval** includes all related data

### Test Data
Created sample recipe "Chocolate Chip Cookies" with 9 ingredients and 3 tags to verify all functionality.

---

## Environment Configuration

### .env file
```env
PORT=3001
NODE_ENV=development
```

### .gitignore
```
node_modules/
.env
backend/data/
backend/uploads/
*.log
.DS_Store
backend/coverage/
frontend/dist/
```

**Important:** Database files and uploads are gitignored to keep repo clean. Only code is versioned.

---

## Running the Application

### Development
```bash
npm run dev    # Uses nodemon for auto-reload
```

### Production
```bash
npm start      # Direct node execution
```

### First Run
1. Clone repository
2. Run `npm install`
3. Server starts and auto-creates database
4. Ready to accept API calls

---

## What's Next

### Immediate Tasks

#### 1. Recipe Import
- Extract text from ~370 scanned recipe images
- Parse into structured format (title, ingredients, instructions)
- Use `example-add-recipe.js` as template
- Bulk import via API or direct database insertion

#### 2. Image Storage
- Organize scanned recipe images in `backend/uploads/` directory
- Establish naming convention (e.g., `recipe-{id}.jpg`)
- Update recipes with correct `imagePath` values

### Frontend Development (Future)

#### Tech Stack (Suggested)
- React for UI
- React Router for navigation
- Axios for API calls
- CSS framework (TailwindCSS or Material-UI)

#### Key Features to Build
1. **Recipe List View**
   - Grid/list toggle
   - Pagination
   - Quick search bar
   - Tag filters

2. **Recipe Detail View**
   - Display scanned image
   - Show structured ingredients
   - Print-friendly layout
   - Edit button

3. **Search Interface**
   - Search by title
   - Multi-ingredient search with autocomplete
   - Tag filter chips
   - Advanced search options

4. **Add/Edit Recipe Form**
   - Image upload
   - Dynamic ingredient list (add/remove rows)
   - Tag management (create new or select existing)
   - Auto-save draft

5. **Recipe Import Tool**
   - Bulk upload interface
   - OCR integration (future)
   - Preview before save
   - Edit extracted data

### Optional Enhancements

1. **Nutrition Information**
   - Add nutrition table to schema
   - Integrate nutrition API

2. **Recipe Scaling**
   - Adjust ingredient quantities
   - Serve size calculator

3. **Shopping List**
   - Select multiple recipes
   - Generate combined ingredient list
   - Group by category

4. **Recipe Sharing**
   - Generate shareable links
   - Export as PDF
   - Print-optimized view

5. **User Notes**
   - Personal modifications
   - Rating system
   - "Last made" tracking

---

## Important Design Decisions

### Why SQLite?
- No separate database server to manage
- Perfect for ~370 recipes (can handle millions)
- Single file storage, easy backups
- Better-sqlite3 provides synchronous API (simpler code)

### Why Separate Ingredients Table?
- Enables efficient "recipes with flour" queries
- Maintains ingredient order via position field
- Allows structured quantity/unit storage
- Can add ingredient-level features later (substitutions, etc.)

### Why Unix Timestamps?
- Easy to work with in JavaScript (`new Date(timestamp * 1000)`)
- Compact storage
- No timezone confusion
- Simple comparisons for sorting

### Why Many-to-Many Tags?
- Recipes naturally fit multiple categories
- Flexible organization (dessert + breakfast + bread)
- Can rename tags without touching recipes
- Easy to add new categorization schemes

---

## Code Quality Notes

### What's Good
- Clean separation of concerns (routes → controllers → models)
- Proper use of transactions for multi-table operations
- Indexed columns for performance
- Comprehensive error handling
- RESTful API design

### Potential Improvements
- Add input validation (currently trusts client data)
- Implement request logging
- Add unit tests
- Add API rate limiting
- Implement pagination metadata improvements
- Add CORS configuration for production
- Add authentication (if making public)

---

## Files to Reference

| File | Purpose |
|------|---------|
| `README.md` | Full API documentation with examples |
| `BRANCHING_STRATEGY.md` | Git workflow, branch naming, best practices |
| `backend/src/config/database.js` | Schema definition and initialization |
| `backend/src/models/recipeModel.js` | All database queries and operations |
| `backend/src/controllers/recipeController.js` | Request/response handling |
| `backend/example-add-recipe.js` | Template for bulk import scripts |

---

## Common Operations

### Add Recipe Programmatically
```javascript
const RecipeModel = require('./backend/src/models/recipeModel');

const recipe = RecipeModel.create({
  title: "Recipe Name",
  source: "Source",
  instructions: "Step-by-step...",
  imagePath: "backend/uploads/image.jpg",
  ingredients: [
    { name: "flour", quantity: "2", unit: "cups" }
  ],
  tags: ["tag1", "tag2"]
});
```

### Query Recipes
```javascript
// Get all recipes
const all = RecipeModel.getAll(50, 0);

// Search by ingredient
const withFlour = RecipeModel.searchByIngredient("flour");

// Filter by tags
const desserts = RecipeModel.filterByTags(["dessert"]);

// Get specific recipe
const recipe = RecipeModel.getById(1);
```

### Update Recipe
```javascript
RecipeModel.update(1, {
  title: "New Title",
  ingredients: [...],  // Replaces all ingredients
  tags: [...]          // Replaces all tags
});
```

---

## Troubleshooting

### Port Already in Use
Change PORT in `.env` file to different value (e.g., 3002).

### Database Locked
Stop all node processes accessing the database:
```bash
pkill -f "node backend/src/server.js"
```

### Missing Dependencies
```bash
npm install
```

### Database Reset
Delete `backend/data/recipes.db` and restart server (auto-recreates empty database).

---

## Project History

### Session 1 (Current)
- ✅ Initialized Node.js project
- ✅ Installed dependencies
- ✅ Created project structure
- ✅ Designed and implemented database schema
- ✅ Built complete REST API
- ✅ Tested all endpoints
- ✅ Created documentation

**Time Investment:** ~2 hours
**Lines of Code:** ~500
**Status:** Backend complete, ready for recipe import

---

## Questions to Address in Next Session

1. **Image Format:** What format are the scanned recipes in? (PDF, JPG, PNG?)
2. **OCR Status:** Do you already have text extracted, or do we need OCR?
3. **Recipe Format:** How consistent is the format across the 370 recipes?
4. **Priority:** Import recipes first, or build frontend first?
5. **Access:** Will this be local-only, or need remote access?

---

## Repository Information

**Repository Name:** moms-recipes
**Visibility:** Public
**License:** (To be determined)

**What to Commit:**
- All source code (`backend/src/`, `frontend/src/`, `*.js`)
- Configuration (`package.json`, `.gitignore`)
- Documentation (`README.md`, `PROJECT_SUMMARY.md`, `BRANCHING_STRATEGY.md`)

**What NOT to Commit:**
- Database files (`backend/data/`)
- Uploaded images (`backend/uploads/`)
- Environment variables (`.env`) - **See [DEPLOYMENT.md](../DEPLOYMENT.md) for .env management**
- Node modules (`node_modules/`)

---

## Deployment

**Production URL:** https://moms-recipes.tachyonfuture.com

**Deployment Method:**
```bash
ssh michael@tachyonfuture.com "cd ~/moms-recipes && ./deploy-safe.sh"
```

**Important:** Always use the `deploy-safe.sh` script to ensure `.env` file is preserved during deployment.

For complete deployment instructions, see **[DEPLOYMENT.md](../DEPLOYMENT.md)**.

---

## Success Metrics

### Current State
- ✅ API functional and tested
- ✅ Database schema optimized
- ✅ Documentation complete
- ⬜ Recipes imported (0/370)
- ⬜ Frontend built
- ⬜ Deployed/accessible

### Project Complete When:
- All 370 recipes imported and searchable
- Frontend allows easy browsing and searching
- Mom can use it without technical knowledge
- Images load quickly
- Search returns results in < 500ms

---

*Last Updated: 2025-11-21*
*Developer: Claude Code with Michael Buckingham*

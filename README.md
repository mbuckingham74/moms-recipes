# Mom's Recipes

[![CI](https://github.com/mbuckingham74/moms-recipes/actions/workflows/ci.yml/badge.svg)](https://github.com/mbuckingham74/moms-recipes/actions/workflows/ci.yml)
[![CD](https://github.com/mbuckingham74/moms-recipes/actions/workflows/cd.yml/badge.svg)](https://github.com/mbuckingham74/moms-recipes/actions/workflows/cd.yml)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Latest-646CFF?logo=vite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-80%25%20coverage-C21325?logo=jest&logoColor=white)

A full-stack recipe organization web application for managing and searching through ~370 family recipes.

**📚 Documentation:**
- [API Documentation](#api-endpoints)
- [Frontend Design Guide](docs/FRONTEND_DESIGN.md) - Complete design system with warm kitchen color palette
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment to moms-recipes.tachyonfuture.com
- [Docker Deployment](docs/DOCKER_DEPLOYMENT.md) - Docker setup and container orchestration
- [Project Summary](docs/PROJECT_SUMMARY.md) - Development history and architecture decisions
- [Quick Start](docs/QUICK_START.md) - Fast setup and resume guide
- [CI/CD Setup](docs/CI_CD_SETUP.md) - GitHub Actions pipeline configuration
- [MySQL Migration](docs/MYSQL_MIGRATION_COMPLETE.md) - SQLite to MySQL migration details

## Current Status

✅ **Backend API** - Complete and tested (80% code coverage)
✅ **Frontend** - React application complete with warm kitchen design
✅ **Production Deployment** - Live at https://moms-recipes.tachyonfuture.com
⬜ **Recipe Import** - 0/370 recipes imported

## Features

- Store recipe information (title, source, instructions, images)
- Structured ingredient storage for efficient searching
- Tag-based categorization and filtering
- Full-text search by title, ingredient, or tags
- RESTful API with CRUD operations

## Tech Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express 5.1.0
- **Database**: MySQL 8 (production) / SQLite (development)
- **Testing**: Jest + Supertest (80% coverage)
- **Features**: CORS, validation, error handling, async/await

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router
- **HTTP Client**: Axios
- **Styling**: CSS3 with custom properties

## Project Structure

```
moms-recipes/
├── backend/                      # Backend application
│   ├── src/                      # Backend source code
│   │   ├── config/
│   │   │   └── database.js      # Database connection and schema
│   │   ├── models/
│   │   │   └── recipeModel.js   # Recipe data operations
│   │   ├── controllers/
│   │   │   └── recipeController.js  # Request handlers
│   │   ├── middleware/
│   │   │   └── errorHandler.js  # Centralized error handling
│   │   ├── routes/
│   │   │   └── recipeRoutes.js  # API routes
│   │   └── server.js            # Express server setup
│   ├── tests/                    # Backend integration tests
│   ├── data/                     # SQLite database files
│   └── uploads/                  # Recipe image files
├── frontend/                     # React application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API integration
│   │   └── utils/               # Helper functions
│   ├── public/
│   └── index.html
├── .env                          # Environment variables
└── package.json
```

## Database Schema

### Tables

**recipes**
- `id` (PRIMARY KEY)
- `title` (TEXT, required)
- `source` (TEXT)
- `date_added` (INTEGER, Unix timestamp)
- `instructions` (TEXT)
- `image_path` (TEXT)
- `created_at`, `updated_at`

**ingredients**
- `id` (PRIMARY KEY)
- `recipe_id` (FOREIGN KEY)
- `name` (TEXT, indexed for search)
- `quantity` (TEXT)
- `unit` (TEXT)
- `position` (INTEGER)

**tags**
- `id` (PRIMARY KEY)
- `name` (TEXT, unique)

**recipe_tags** (junction table)
- `recipe_id`, `tag_id` (composite PRIMARY KEY)

## Quick Start

### Backend Setup

```bash
# Install backend dependencies
npm install

# Run backend tests (optional)
npm test

# Start backend development server
npm run dev
```

Backend runs on `http://localhost:3001`

### Frontend Setup

```bash
# Install frontend dependencies
cd frontend
npm install

# Start frontend development server
npm run dev
```

Frontend runs on `http://localhost:5173`

### Full Application

1. Start backend: `npm run dev` (from root)
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:5173 in your browser

See [frontend/README.md](frontend/README.md) for detailed frontend documentation.

## API Endpoints

### Recipes

#### Create Recipe
```http
POST /api/recipes
Content-Type: application/json

{
  "title": "Chocolate Chip Cookies",
  "source": "Grandma's cookbook",
  "instructions": "Mix ingredients...",
  "imagePath": "uploads/cookies.jpg",
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

#### Get All Recipes
```http
GET /api/recipes?limit=50&offset=0
```

Response includes pagination info and recipe list with tags.

#### Get Recipe by ID
```http
GET /api/recipes/:id
```

Returns complete recipe with ingredients and tags.

#### Search Recipes

**By Title:**
```http
GET /api/recipes/search?title=chocolate
```

**By Single Ingredient:**
```http
GET /api/recipes/search?ingredient=flour
```

**By Multiple Ingredients (AND search):**
```http
GET /api/recipes/search?ingredients=flour,sugar,butter
```
Returns only recipes containing ALL specified ingredients.

**By Tags:**
```http
GET /api/recipes/search?tags=dessert,cookies
```
Returns recipes with ANY of the specified tags.

#### Update Recipe
```http
PUT /api/recipes/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "ingredients": [...],
  "tags": [...]
}
```

Only include fields you want to update.

#### Delete Recipe
```http
DELETE /api/recipes/:id
```

### Tags

#### Get All Tags
```http
GET /api/tags
```

Returns list of all unique tags in the system.

### Health Check
```http
GET /health
```

## Example Usage

### Adding a Recipe

```bash
curl -X POST http://localhost:3001/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Banana Bread",
    "source": "Mom'\''s handwritten notes",
    "instructions": "Preheat oven to 350°F. Mix dry ingredients...",
    "imagePath": "uploads/banana-bread.jpg",
    "ingredients": [
      {"name": "bananas", "quantity": "3", "unit": "whole"},
      {"name": "flour", "quantity": "2", "unit": "cups"},
      {"name": "sugar", "quantity": "1", "unit": "cup"},
      {"name": "eggs", "quantity": "2", "unit": "whole"}
    ],
    "tags": ["bread", "breakfast", "dessert"]
  }'
```

### Searching for Recipes

```bash
# Find all recipes with flour
curl http://localhost:3001/api/recipes/search?ingredient=flour

# Find recipes with both flour AND eggs
curl http://localhost:3001/api/recipes/search?ingredients=flour,eggs

# Find all desserts
curl http://localhost:3001/api/recipes/search?tags=dessert

# Find recipes by title
curl http://localhost:3001/api/recipes/search?title=bread
```

## Data Model Design Notes

- **Ingredients are normalized** in a separate table for efficient searching
- **Many-to-many relationship** between recipes and tags allows flexible categorization
- **Indexes** on ingredient names and recipe titles for fast searches
- **Foreign key constraints** ensure data integrity with cascading deletes
- **Unix timestamps** for date fields (easy to work with in JavaScript)

## Next Steps

1. **Image Upload**: Add endpoint for uploading recipe images
2. **Advanced Search**: Combine multiple search criteria
3. **Recipe Import**: Bulk import functionality for the 370 recipes
4. **Frontend**: Build React interface
5. **OCR Integration**: Add text extraction from scanned recipe images

## Development Notes

- SQLite database file is created automatically on first run in `backend/data/recipes.db`
- Uploaded images should be stored in `backend/uploads/` directory
- All timestamps are stored as Unix epoch seconds
- Database uses `better-sqlite3` for synchronous operations (faster and simpler)

## Environment Variables

Create a `.env` file:

```env
PORT=3001
NODE_ENV=development
```

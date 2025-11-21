# Mom's Recipes Backend

A Node.js/Express backend API for organizing and searching through ~370 recipes with SQLite database.

## Features

- Store recipe information (title, source, instructions, images)
- Structured ingredient storage for efficient searching
- Tag-based categorization and filtering
- Full-text search by title, ingredient, or tags
- RESTful API with CRUD operations

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite with better-sqlite3
- **Features**: CORS enabled, environment configuration

## Project Structure

```
moms-recipes/
├── src/
│   ├── config/
│   │   └── database.js          # Database connection and schema
│   ├── models/
│   │   └── recipeModel.js       # Recipe data operations
│   ├── controllers/
│   │   └── recipeController.js  # Request handlers
│   ├── routes/
│   │   └── recipeRoutes.js      # API routes
│   └── server.js                # Express server setup
├── data/                         # SQLite database files
├── uploads/                      # Recipe image files
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

## Installation

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

The server will run on `http://localhost:3001` (or the port specified in `.env`).

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

- SQLite database file is created automatically on first run in `data/recipes.db`
- Uploaded images should be stored in `uploads/` directory
- All timestamps are stored as Unix epoch seconds
- Database uses `better-sqlite3` for synchronous operations (faster and simpler)

## Environment Variables

Create a `.env` file:

```env
PORT=3001
NODE_ENV=development
```

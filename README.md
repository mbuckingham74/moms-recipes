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

A full-stack recipe organization web application for managing and searching through family recipes.

**🌐 Live Demo:** [https://moms-recipes.tachyonfuture.com](https://moms-recipes.tachyonfuture.com)

**📚 Documentation:**
- **[Deployment Guide](DEPLOYMENT.md)** - **IMPORTANT:** Environment variable management and safe deployment
- [API Documentation](#api-endpoints)
- [Security Guidelines](SECURITY_GUIDELINES.md) - Security best practices and credential management
- [Dependency Notes](DEPENDENCIES.md) - Dependency management and migration strategies
- [Frontend Design Guide](docs/FRONTEND_DESIGN.md) - Complete design system with warm kitchen color palette
- [Docker Deployment](docs/DOCKER_DEPLOYMENT.md) - Docker setup and container orchestration
- [Project Summary](docs/PROJECT_SUMMARY.md) - Development history and architecture decisions
- [Quick Start](docs/QUICK_START.md) - Fast setup and resume guide
- [CI/CD Setup](docs/CI_CD_SETUP.md) - GitHub Actions pipeline configuration
- [MySQL Migration](docs/MYSQL_MIGRATION_COMPLETE.md) - SQLite to MySQL migration details
- [Fixes Summary](docs/FIXES_SUMMARY.md) - Bug fixes and improvements log

## Current Status

✅ **Backend API** - Complete and tested (80% code coverage)
✅ **Frontend** - React application complete with warm kitchen design
✅ **Admin Panel** - Authentication, dashboard, and PDF upload backend ready
✅ **Production Deployment** - Live at https://moms-recipes.tachyonfuture.com
⬜ **Recipe Import** - 0/370 recipes imported (PDF upload UI coming in Phase 2)

## Features

### Public Features
- Browse and search family recipes
- Full-text search by title, ingredient, or tags
- Tag-based categorization and filtering
- Responsive design with warm kitchen color palette

### Admin Features 🔐
- **Authentication**: Secure JWT-based login with httpOnly cookies
- **Admin Dashboard**: View stats and manage recipes
- **PDF Recipe Upload**: AI-powered recipe parsing with Anthropic Claude
  - Upload PDF recipes (text-based PDFs supported)
  - Automatic extraction of title, ingredients, instructions, and tags
  - Review and edit before publishing
- **Manual Recipe Entry**: Traditional form-based recipe creation
- **Role-based Access**: Admin vs. viewer permissions

## Tech Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express 5.1.0
- **Database**: MySQL 8 (all environments)
- **Authentication**: JWT + bcrypt with httpOnly cookies
- **Security**: CSRF protection on state-changing routes
- **AI Integration**: Anthropic Claude for recipe parsing (optional)
- **File Processing**: Multer + pdf-parse for PDF uploads
- **Testing**: Jest + Supertest (80% coverage)
- **Features**: CORS, validation, error handling, async/await

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router with protected routes
- **State Management**: React Context (Auth)
- **HTTP Client**: Axios
- **File Upload**: react-dropzone (Phase 2)
- **Styling**: CSS3 with custom properties

## Project Structure

```
moms-recipes/
├── backend/                      # Backend application
│   ├── src/                      # Backend source code
│   │   ├── config/
│   │   │   ├── database.js      # MySQL connection and schema
│   │   │   └── jwt.js           # JWT configuration
│   │   ├── models/
│   │   │   └── recipeModel.js   # Recipe data operations
│   │   ├── controllers/
│   │   │   └── recipeController.js  # Request handlers
│   │   ├── middleware/
│   │   │   ├── errorHandler.js  # Centralized error handling
│   │   │   ├── auth.js          # JWT authentication
│   │   │   └── csrf.js          # CSRF protection
│   │   ├── routes/
│   │   │   └── recipeRoutes.js  # API routes
│   │   └── server.js            # Express server setup
│   ├── tests/                    # Backend integration tests
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

### Core Tables

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

### Admin Tables

**users**
- `id` (PRIMARY KEY)
- `username` (TEXT, unique)
- `email` (TEXT)
- `password_hash` (TEXT, bcrypt)
- `role` (ENUM: 'admin', 'viewer')
- `created_at`, `updated_at`

**uploaded_files**
- `id` (PRIMARY KEY)
- `filename`, `original_name`, `file_path`
- `file_size`, `mime_type`
- `uploaded_by` (FOREIGN KEY to users)
- `processed` (BOOLEAN)
- `uploaded_at`

**pending_recipes**
- `id` (PRIMARY KEY)
- `file_id` (FOREIGN KEY to uploaded_files)
- `title`, `source`, `instructions`
- `raw_text` (extracted PDF text)
- `parsed_data` (JSON from Claude)
- `created_at`

**pending_ingredients** & **pending_tags**
- Temporary storage for PDF-parsed recipes awaiting approval

## Quick Start

### Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure environment variables in `.env`:
```env
# Required
JWT_SECRET=your-secret-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key

# Admin users (for initial setup)
ADMIN1_USERNAME=your-username
ADMIN1_PASSWORD=your-secure-password
ADMIN1_EMAIL=your-email@example.com
```

See [SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md) for best practices.

### Backend Setup

```bash
# Install backend dependencies
npm install

# Create admin users
node backend/scripts/seedAdminUsers.js

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

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

Sets httpOnly cookie with JWT token.

#### Logout
```http
POST /api/auth/logout
```

Clears authentication cookie.

#### Get Current User
```http
GET /api/auth/me
```

Returns current authenticated user info.

### Admin - PDF Upload

#### Upload and Parse PDF
```http
POST /api/admin/upload-pdf
Content-Type: multipart/form-data
Authorization: Required (admin)

pdf: <file>
```

Uploads PDF, extracts text, parses with Claude AI, saves as pending recipe.

#### Get Pending Recipes
```http
GET /api/admin/pending-recipes
Authorization: Required (admin)
```

#### Get Pending Recipe
```http
GET /api/admin/pending-recipes/:id
Authorization: Required (admin)
```

#### Update Pending Recipe
```http
PUT /api/admin/pending-recipes/:id
Authorization: Required (admin)
```

#### Approve Pending Recipe
```http
POST /api/admin/pending-recipes/:id/approve
Authorization: Required (admin)
```

Moves pending recipe to main recipes table.

### Recipes

#### Create Recipe
```http
POST /api/recipes
Content-Type: application/json
Authorization: Required (admin)

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
Authorization: Required (admin)

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
Authorization: Required (admin)
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

- MySQL is required for all environments (development, test, production)
- Uploaded images should be stored in `backend/uploads/` directory
- All timestamps are stored as Unix epoch seconds
- Database schema is automatically created on first run

## Environment Variables

Create a `.env` file (see `.env.example` for template):

```env
PORT=3001
NODE_ENV=development

# Database (MySQL required)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=moms_recipes

# Authentication (required - min 32 chars in production)
JWT_SECRET=your-secret-key-change-in-production-min-32-chars

# CSRF Protection (required in production)
CSRF_SECRET=your-csrf-secret-change-in-production

# Anthropic API (optional - AI features disabled if not set)
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Admin Users (for seed script)
ADMIN1_USERNAME=your-admin-username
ADMIN1_PASSWORD=your-secure-password
ADMIN1_EMAIL=your-email@example.com

# Production CORS (required in production)
# FRONTEND_URL=https://moms-recipes.tachyonfuture.com
```

**Security:** See [SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md) for credential management best practices.

### Required Environment Variables (Production)

| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | MySQL database password |
| `JWT_SECRET` | JWT signing secret (min 32 characters) |
| `CSRF_SECRET` | CSRF protection secret |
| `FRONTEND_URL` | Frontend URL for CORS |

### Optional Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Enables AI features (PDF parsing, calorie estimation) |

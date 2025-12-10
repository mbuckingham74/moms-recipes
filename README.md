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

A full-stack recipe management system powered by AI. Import recipes from PDFs, photos, or URLs with automatic parsing. Get intelligent serving size and calorie estimates. Built with React 19, Node.js/Express, MySQL 8, and multi-provider AI support (Claude, GPT-4, Gemini).

**🌐 Live Demo:** [https://mom-recipes.tachyonfuture.com](https://mom-recipes.tachyonfuture.com)

## AI-Powered Features

The real power of Mom's Recipes lies in its AI capabilities, which transform how you digitize and manage recipes:

### PDF Recipe Parsing
Upload scanned or text-based PDF recipes and let AI extract structured data automatically. The system identifies titles, ingredients (with quantities and units), instructions, and suggests appropriate tags—turning your grandmother's handwritten recipe cards into searchable, organized digital recipes.

### Recipe Image Management
Upload and manage multiple images per recipe. Set a hero image for recipe cards and galleries, with a lightbox viewer for the full collection. Supports JPEG, PNG, GIF, and WebP formats.

### Recipe Image Recognition
*Coming soon* - Take a photo of a recipe from a cookbook or magazine, and AI will extract all the recipe details, just like PDF parsing but for images.

### Smart Link Import
Paste any recipe URL and the system intelligently extracts recipe data. For sites with structured data (AllRecipes, Food Network, etc.), it uses JSON-LD schema. For other sites, AI parses the page content to identify and extract recipe components. **Images are automatically downloaded** from the source URL and attached as the hero image when the recipe is approved.

### Serving Size & Calorie Estimation
AI analyzes your recipe's ingredients and portions to estimate calories per serving. Helpful for meal planning and dietary tracking without manual calorie counting.

**📚 Documentation:**
- **[Deployment Guide](DEPLOYMENT.md)** - Environment variables and production deployment
- [Security Guidelines](SECURITY_GUIDELINES.md) - Security best practices and credential management
- [All Documentation](docs/README.md) - Complete docs index (design, Docker, CI/CD, and more)

## Current Status

✅ **Backend API** - Complete and tested (80% code coverage)
✅ **Frontend** - React application complete with warm kitchen design
✅ **Admin Panel** - Authentication, dashboard, and PDF upload backend ready
✅ **Production Deployment** - Live at https://mom-recipes.tachyonfuture.com
⬜ **Recipe Import** - 0/370 recipes imported (PDF upload UI coming in Phase 2)

## Features

### Public Features
- Browse and search family recipes
- Full-text search by title, ingredient, or tags
- Tag-based categorization and filtering
- Responsive design with warm kitchen color palette

### User Features 👤
- **User Registration**: Create an account with email/password
- **Save Recipes**: Build a personal collection of favorite recipes
- **Submit Recipes**: Contribute recipes for admin review before publishing
- **Track Submissions**: Monitor submission status (pending, approved, rejected)
- **User Dashboard**: View saved recipes, submission stats, and quick actions

### Admin Features 🔐
- **Authentication**: Secure JWT-based login with httpOnly cookies (30-day sessions)
- **Personalized Greeting**: Header displays "Hello, {username}!" when logged in
- **Persistent Admin Sidebar**: Quick Actions navigation visible on all admin pages
  - Dashboard, Upload PDF, Import from URL, Add Recipe, Review Pending, User Submissions, All Recipes, AI Settings
  - Responsive design (collapses on mobile)
- **User Submissions Review**: Review, approve, or reject user-submitted recipes
- **Admin Dashboard**: View stats and metrics (clickable cards for navigation)
  - AI status panel showing current provider and model
- **Admin Recipes Table**: Sortable table view of all recipes with:
  - Name (clickable link to recipe)
  - Category (first tag)
  - Main Ingredient
  - Calories per Serving
  - Date Added
  - Times Cooked (for tracking cooking history)
- **AI Settings**: Configure AI provider for recipe parsing and calorie estimation
  - **Multi-provider support**: Anthropic Claude, OpenAI GPT-4, Google Gemini
  - **Model selection**: Choose from multiple models per provider (e.g., Claude Sonnet 4.5, GPT-4o, Gemini 1.5 Pro)
  - **API key management**: Store keys securely (AES-256 encrypted) or use environment variables
  - **Connection testing**: Verify API key works before saving
  - **Per-provider key storage**: Each provider has its own stored key, allowing easy switching
- **PDF Recipe Upload**: AI-powered recipe parsing
  - Upload PDF recipes (text-based PDFs supported)
  - Automatic extraction of title, ingredients, instructions, and tags
  - Works with any configured AI provider
  - Review and edit before publishing
- **URL Recipe Import**: Import recipes from any website
  - Paste a recipe URL and automatically extract recipe data
  - Smart extraction using JSON-LD schema when available (AllRecipes, Food Network, etc.)
  - AI-powered parsing for sites without structured data
  - **Automatic image extraction**: Downloads recipe images and attaches as hero image on approval
  - Comprehensive SSRF protection (blocks private IPs, cloud metadata endpoints)
  - Review and edit before publishing (with image preview)
- **Recipe Image Upload**: Upload and manage recipe images
  - Multiple images per recipe with hero image selection
  - Image gallery with lightbox viewer
  - Supports JPEG, PNG, GIF, WebP (max 5MB each)
- **Manual Recipe Entry**: Traditional form-based recipe creation
- **Role-based Access**: Admin vs. viewer permissions

## Tech Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express 5.1.0
- **Database**: MySQL 8 (all environments)
- **Authentication**: JWT + bcrypt with httpOnly cookies
- **Security**: CSRF protection on state-changing routes
- **AI Integration**: Multi-provider support (Anthropic Claude, OpenAI, Google Gemini)
  - Configurable via Admin Panel or environment variables
  - Encrypted API key storage in database
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
│   │   │   ├── recipeModel.js   # Recipe data operations
│   │   │   ├── recipeImageModel.js  # Recipe image management
│   │   │   ├── userModel.js     # User accounts and preferences
│   │   │   ├── savedRecipeModel.js    # User saved recipes
│   │   │   └── submittedRecipeModel.js # User recipe submissions
│   │   ├── controllers/
│   │   │   ├── recipeController.js    # Recipe request handlers
│   │   │   ├── userController.js      # User registration/profile
│   │   │   ├── savedRecipeController.js
│   │   │   └── submittedRecipeController.js
│   │   ├── middleware/
│   │   │   ├── errorHandler.js  # Centralized error handling
│   │   │   ├── auth.js          # JWT authentication
│   │   │   └── csrf.js          # CSRF protection
│   │   ├── routes/
│   │   │   ├── recipeRoutes.js  # Recipe API routes
│   │   │   ├── userRoutes.js    # User feature routes
│   │   │   └── submissionRoutes.js # Admin submission review routes
│   │   └── server.js            # Express server setup
│   ├── tests/                    # Backend integration tests
│   └── uploads/                  # Recipe image files
├── frontend/                     # React application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── AdminLayout.jsx  # Admin sidebar layout wrapper
│   │   │   ├── Header.jsx       # Main site header (with user menu)
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/               # Page components
│   │   │   ├── admin/           # Admin panel pages
│   │   │   │   └── UserSubmissions.jsx # Review user submissions
│   │   │   └── user/            # User feature pages
│   │   │       ├── UserDashboard.jsx
│   │   │       ├── SavedRecipes.jsx
│   │   │       ├── SubmitRecipe.jsx
│   │   │       └── MySubmissions.jsx
│   │   ├── styles/              # Component-specific CSS
│   │   ├── services/            # API integration (auto CSRF handling)
│   │   └── contexts/            # React context providers
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
- `estimated_calories` (INTEGER, nullable)
- `times_cooked` (INTEGER, default 0)
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

**recipe_images**
- `id` (PRIMARY KEY)
- `recipe_id` (FOREIGN KEY, CASCADE DELETE)
- `filename` (TEXT, UUID-generated)
- `original_name` (TEXT)
- `file_size` (INTEGER, bytes)
- `mime_type` (TEXT)
- `is_hero` (BOOLEAN, default FALSE)
- `position` (INTEGER, for gallery ordering)
- `uploaded_by` (FOREIGN KEY to users)
- `uploaded_at` (INTEGER, Unix timestamp)

### User Tables

**users**
- `id` (PRIMARY KEY)
- `username` (TEXT, unique)
- `email` (TEXT, unique for registered users)
- `password_hash` (TEXT, bcrypt)
- `role` (ENUM: 'admin', 'viewer')
- `created_at`, `updated_at`

**user_preferences**
- `user_id` (PRIMARY KEY, FOREIGN KEY to users)
- `theme` (ENUM: 'light', 'dark')
- `created_at`, `updated_at`

**user_saved_recipes**
- `user_id` (FOREIGN KEY to users)
- `recipe_id` (FOREIGN KEY to recipes)
- `saved_at` (INTEGER, Unix timestamp)
- Composite PRIMARY KEY (user_id, recipe_id)

**user_submitted_recipes**
- `id` (PRIMARY KEY)
- `user_id` (FOREIGN KEY to users)
- `title`, `source`, `instructions`, `servings`
- `status` (ENUM: 'pending', 'approved', 'rejected')
- `admin_notes` (TEXT) - Feedback from reviewer
- `reviewed_by` (FOREIGN KEY to users)
- `reviewed_at`, `created_at`, `updated_at`

**user_submitted_ingredients** & **user_submitted_tags**
- Temporary storage for user-submitted recipes awaiting approval

### Admin Tables

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

### Configuration Tables

**settings** (key-value store for app configuration)
- `setting_key` (PRIMARY KEY, VARCHAR)
- `setting_value` (TEXT)
- `encrypted` (BOOLEAN) - API keys are AES-256 encrypted
- `updated_at` (INTEGER, Unix timestamp)
- `updated_by` (FOREIGN KEY to users)

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

Sets httpOnly cookie with JWT token (30-day expiration).

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

#### Register User
```http
POST /api/users/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "securepassword"
}
```

Creates a new user account (role: viewer).

### User Features

#### Get Saved Recipes
```http
GET /api/users/saved-recipes?limit=20&offset=0
Authorization: Required
```

Returns user's saved recipes with pagination.

#### Save Recipe
```http
POST /api/users/saved-recipes/:recipeId
Authorization: Required
```

#### Remove Saved Recipe
```http
DELETE /api/users/saved-recipes/:recipeId
Authorization: Required
```

#### Submit Recipe
```http
POST /api/users/submissions
Content-Type: application/json
Authorization: Required

{
  "title": "My Recipe",
  "source": "Family tradition",
  "instructions": "Step-by-step...",
  "servings": 4,
  "ingredients": [{"name": "flour", "quantity": "2", "unit": "cups"}],
  "tags": ["dessert"]
}
```

Submits a recipe for admin review.

#### Get My Submissions
```http
GET /api/users/submissions?limit=20&offset=0&status=pending
Authorization: Required
```

Returns user's submitted recipes with optional status filter.

#### Delete Submission
```http
DELETE /api/users/submissions/:id
Authorization: Required
```

Delete a pending submission (only owner, only if pending).

### Admin - Recipe Import

#### Upload and Parse PDF
```http
POST /api/admin/upload-pdf
Content-Type: multipart/form-data
Authorization: Required (admin)

pdf: <file>
```

Uploads PDF, extracts text, parses with Claude AI, saves as pending recipe.

#### Import Recipe from URL
```http
POST /api/admin/import-url
Content-Type: application/json
Authorization: Required (admin)

{
  "url": "https://www.allrecipes.com/recipe/12345/chocolate-chip-cookies/"
}
```

Fetches the URL, extracts recipe data (JSON-LD or AI parsing), saves as pending recipe.

**Security:** Includes comprehensive SSRF protection - blocks private IPs (10.x, 172.16-31.x, 192.168.x, 127.x), cloud metadata endpoints (169.254.169.254), IPv6 private ranges, and validates all redirect destinations.

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

#### Mark Recipe as Cooked
```http
POST /api/recipes/:id/cooked
Authorization: Required (admin)
```

Increments the `times_cooked` counter for tracking cooking history.

### Recipe Images

#### Upload Images
```http
POST /api/recipes/:id/images
Content-Type: multipart/form-data
Authorization: Required (admin)

images: <file(s)>
isHero: true (optional, sets first image as hero)
```

Uploads one or more images to a recipe. Supports JPEG, PNG, GIF, WebP (max 5MB each).

#### Get Recipe Images
```http
GET /api/recipes/:id/images
```

Returns all images for a recipe with sanitized URLs.

#### Set Hero Image
```http
PUT /api/recipes/:recipeId/images/:imageId/hero
Authorization: Required (admin)
```

Sets the specified image as the hero (main display) image.

#### Delete Image
```http
DELETE /api/recipes/:recipeId/images/:imageId
Authorization: Required (admin)
```

Deletes an image from the recipe and removes the file from disk.

#### Reorder Images
```http
PUT /api/recipes/:id/images/reorder
Content-Type: application/json
Authorization: Required (admin)

{
  "imageOrder": [3, 1, 2]
}
```

Updates image positions. All image IDs must belong to the recipe.

### Admin - Recipe Management

#### Get Admin Recipe List
```http
GET /api/admin/recipes?limit=50&offset=0&sortBy=date_added&sortOrder=DESC
Authorization: Required (admin)
```

Returns a table-optimized list with columns: id, title, category (first tag), mainIngredient (first ingredient), estimatedCalories, dateAdded, timesCooked.

**Sort options:** `title`, `date_added`, `estimated_calories`, `times_cooked`

### Admin - User Submissions

#### Get All User Submissions
```http
GET /api/admin/submissions?limit=20&offset=0&status=pending
Authorization: Required (admin)
```

Returns all user-submitted recipes with optional status filter.

#### Review Submission
```http
GET /api/admin/submissions/:id
Authorization: Required (admin)
```

Returns full submission details for review.

#### Approve Submission
```http
POST /api/admin/submissions/:id/approve
Content-Type: application/json
Authorization: Required (admin)

{
  "notes": "Optional approval notes"
}
```

Creates a published recipe from the submission.

#### Reject Submission
```http
POST /api/admin/submissions/:id/reject
Content-Type: application/json
Authorization: Required (admin)

{
  "notes": "Reason for rejection (required)"
}
```

Rejects submission with feedback for the user.

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

1. ~~**Image Upload**: Add endpoint for uploading recipe images~~ ✅ Complete
2. **Advanced Search**: Combine multiple search criteria
3. **Recipe Import**: Bulk import functionality for the 370 recipes
4. **OCR Integration**: Add text extraction from scanned recipe images

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

# AI Provider API Keys (optional - configure via Admin Panel or env vars)
# At least one is required for AI features (PDF parsing, calorie estimation)
ANTHROPIC_API_KEY=your-anthropic-api-key-here
OPENAI_API_KEY=your-openai-api-key-here
GOOGLE_API_KEY=your-google-api-key-here

# Admin Users (for seed script)
ADMIN1_USERNAME=your-admin-username
ADMIN1_PASSWORD=your-secure-password
ADMIN1_EMAIL=your-email@example.com

# Production CORS (required in production)
# FRONTEND_URL=https://moms-recipes.example.com
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
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude (AI features) |
| `OPENAI_API_KEY` | API key for OpenAI GPT-4 (AI features) |
| `GOOGLE_API_KEY` | API key for Google Gemini (AI features) |

**Note:** At least one AI provider API key is required to enable AI features. Keys can also be configured via the Admin Panel (stored encrypted in the database).

# Claude Code Instructions

This file contains important instructions for Claude Code when working on this project.

## AI Service (Multi-Provider)

The app supports multiple AI providers: **Anthropic Claude**, **OpenAI GPT-4**, and **Google Gemini**.

- All AI calls must go through `backend/src/services/aiService.js` (provider-agnostic)
- Never instantiate AI provider clients directly in controllers - always use AIService
- Provider and model are configurable via Admin Panel or database settings
- API keys can be set via environment variables OR stored encrypted in the database
- The default Claude model ID is `claude-sonnet-4-5-20250929`
- Do NOT use deprecated model IDs like `claude-3-5-sonnet-*`

## Database

- **MySQL only** - SQLite is not supported
- Do not add SQLite fallbacks or conditional database code
- All environments (dev, test, production) use MySQL

## User Features

The app supports regular user accounts (role: 'viewer') with these features:

- **Registration**: `/api/users/register` - creates account with email validation
- **Saved Recipes**: Users can save/unsave recipes to their collection
- **Recipe Submissions**: Users can submit recipes for admin review
- **User Dashboard**: Shows stats and recent activity at `/dashboard`

Key implementation details:
- User preferences use upsert (INSERT ON DUPLICATE KEY UPDATE) to handle legacy users
- CSRF tokens are automatically fetched and included via the API service interceptor
- Submission counts use a dedicated endpoint for accuracy (not filtered from paginated results)
- Admin reviews submissions at `/admin/user-submissions`

## Recipe Images

Admins can upload images for recipes. The system supports:

- **Hero image**: The main display image shown on recipe cards and detail pages
- **Gallery images**: Additional images viewable in a lightbox on the detail page
- Images are stored in `backend/uploads/images/` with UUID filenames
- Supported formats: JPEG, PNG, GIF, WebP (max 5MB each)
- API responses use sanitized URLs (`/uploads/images/filename.jpg`) - never expose server file paths
- When a recipe is deleted, all associated image files are removed from disk

Key implementation details:
- `RecipeImageModel` handles CRUD with `getByIdPublic()`/`getByRecipeIdPublic()` for sanitized responses
- Frontend uses `urlHelpers.js` to construct proper image URLs (handles `/api` suffix stripping)
- Image ownership is validated in reorder endpoint to prevent manipulation

## Environment Variables (Production Required)

- `DB_PASSWORD` - MySQL password
- `JWT_SECRET` - Must be at least 32 characters
- `CSRF_SECRET` - Required for CSRF protection
- `FRONTEND_URL` - For CORS configuration

### AI Provider Keys (Optional - at least one needed for AI features)

- `ANTHROPIC_API_KEY` - For Claude models
- `OPENAI_API_KEY` - For GPT-4 models
- `GOOGLE_API_KEY` - For Gemini models

Note: API keys can also be configured via the Admin Panel (stored encrypted in database).

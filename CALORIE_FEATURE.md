# AI Calorie Estimation Feature

## Overview
This document describes the AI-powered calorie estimation feature added to Mom's Recipes application.

## Features Implemented

### 1. Dashboard Metrics Panel (Option C)
**Location:** `/admin` dashboard

**New Metrics:**
- Total Recipes
- Pending Reviews (highlighted in red)
- Categories Count
- Recipes Added This Week
- Average Calories per Serving
- Percentage of Recipes with Calorie Data

**Design Changes:**
- Replaced clickable-looking stat cards with clean, informational metric panels
- Removed hover effects and shadows that made stats appear interactive
- Added clear visual hierarchy with bordered panels
- Metrics displayed in a grid layout with responsive design

### 2. AI Calorie Estimation
**Technology:** Anthropic Claude API (claude-3-5-sonnet-20241022)

**How it works:**
1. Admin clicks "Estimate Calories with AI" button on recipe detail page
2. Backend sends recipe data (title, ingredients, instructions, servings) to Claude
3. Claude analyzes the recipe and returns:
   - Estimated calories per serving
   - Confidence level (low/medium/high)
   - Brief explanation
4. Data is stored in database and displayed on recipe page

**Database Schema:**
- `servings` (INT) - Number of servings the recipe makes
- `estimated_calories` (INT) - Estimated calories per serving
- `calories_confidence` (ENUM: 'low', 'medium', 'high') - AI confidence level

### 3. Recipe Detail Page Updates
**For All Users:**
- Display calorie information when available
- Show confidence badge (color-coded: yellow/blue/green)
- Display disclaimer: "AI-estimated based on ingredients. Actual values may vary."

**For Admin Users:**
- Button to estimate calories for recipes without data
- Button to re-estimate calories for existing data
- Error handling and loading states

## Files Modified

### Frontend
- `frontend/src/pages/admin/Dashboard.jsx` - Dashboard metrics panel
- `frontend/src/styles/Dashboard.css` - Metrics styling
- `frontend/src/pages/RecipeDetail.jsx` - Calorie display and estimation
- `frontend/src/pages/RecipeDetail.css` - Calorie section styling

### Backend
- `backend/src/config/database.mysql.js` - Added calorie fields to schema
- `backend/src/models/recipeModel.js` - Added methods:
  - `getDashboardStats()` - Fetch all dashboard metrics
  - `updateCalories()` - Update calorie data for a recipe
- `backend/src/controllers/recipeController.js` - Added endpoints:
  - `getDashboardStats()` - GET /admin/stats
  - `estimateCalories()` - POST /recipes/:id/estimate-calories
- `backend/src/routes/recipeRoutes.js` - Registered new routes

### Database
- `backend/migrations/add_calories_to_recipes.js` - Migration script

## Setup Instructions

### 1. Set Environment Variable
Add your Anthropic API key to `.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Run Database Migration
For production (MySQL):
```bash
node backend/migrations/add_calories_to_recipes.js
```

The migration will:
- Add `servings`, `estimated_calories`, and `calories_confidence` columns to recipes table
- Check if columns already exist (safe to run multiple times)
- Work with both MySQL (production) and SQLite (development)

### 3. Deploy to Production
```bash
# SSH into server
ssh michael@tachyonfuture.com

# Navigate to project
cd ~/moms-recipes

# Pull latest changes
git pull

# Add ANTHROPIC_API_KEY to .env file
nano .env  # or use your preferred editor

# Run migration
node backend/migrations/add_calories_to_recipes.js

# Rebuild and restart containers
docker compose up -d --build
```

## Usage

### Admin Dashboard
1. Log in as admin
2. Navigate to `/admin`
3. View comprehensive metrics including calorie statistics

### Estimating Calories
1. Navigate to any recipe detail page
2. As admin, you'll see:
   - "Estimate Calories with AI" button (if no data)
   - "Re-estimate Calories" button (if data exists)
3. Click to trigger AI estimation
4. Wait for processing (typically 2-5 seconds)
5. Calorie data is saved and displayed automatically

### User Experience
- Regular users see calorie information when available
- Admins can manage and estimate calorie data
- Clear disclaimers indicate AI-estimated nature of data
- Confidence levels help users understand accuracy

## Cost Considerations
- Each calorie estimation costs approximately $0.002-0.005
- Estimated based on ~500 tokens per request
- Consider batch processing for multiple recipes
- Re-estimation is available but should be used judiciously

## Future Enhancements
- Batch calorie estimation for all recipes
- Manual calorie entry option
- Nutritional information beyond calories (protein, carbs, fat)
- Integration with USDA nutrition database for validation
- Automatic estimation during recipe creation/upload

## Technical Notes
- The feature gracefully handles missing Anthropic API key
- Error messages guide users to check configuration
- Frontend has proper loading and error states
- Database migration is idempotent (safe to re-run)
- Confidence levels are color-coded for quick assessment

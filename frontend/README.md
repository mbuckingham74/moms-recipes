# Mom's Recipes - Frontend

A warm, kitchen-themed React application for browsing and managing family recipes.

## Features

- **Browse Recipes**: View all recipes with pagination (50 per page)
- **Search**: Search recipes by title or ingredient
- **Recipe Details**: View full recipe with ingredients and instructions
- **Add/Edit Recipes**: Create new recipes or edit existing ones
- **Tag System**: Organize recipes with color-coded tags
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile

## Design

The application uses a **warm kitchen color palette** inspired by traditional cooking spaces:

- **Cream** (#FFF8E7) - Primary background
- **Terracotta** (#D4745E) - Primary accent
- **Sage** (#9CAF88) - Secondary accent
- **Espresso** (#5C4033) - Text and headers
- **Chocolate** (#3E2723) - Dark text

### Typography

- **Playfair Display** - Elegant serif for headings and recipe titles
- **Inter** - Clean sans-serif for body text and UI elements
- **Merriweather** - Readable serif for recipe instructions
- **Caveat** - Handwritten style for special notes

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API requests
- **CSS3** - Custom styling with CSS variables

## Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Header.jsx
│   │   ├── Header.css
│   │   ├── RecipeCard.jsx
│   │   ├── RecipeCard.css
│   │   ├── SearchBar.jsx
│   │   └── SearchBar.css
│   ├── pages/                # Page components
│   │   ├── Home.jsx          # Recipe listing with search
│   │   ├── Home.css
│   │   ├── RecipeDetail.jsx  # Individual recipe view
│   │   ├── RecipeDetail.css
│   │   ├── RecipeForm.jsx    # Add/Edit recipe form
│   │   └── RecipeForm.css
│   ├── services/             # API integration
│   │   └── api.js            # Axios configuration and endpoints
│   ├── App.jsx               # Main app with routing
│   ├── App.css
│   ├── index.css             # Global styles and CSS variables
│   └── main.jsx              # App entry point
├── public/                   # Static assets
├── index.html                # HTML template
├── vite.config.js            # Vite configuration with proxy
└── package.json
```

## Development

### Prerequisites

- Node.js 18+ installed
- Backend API running on port 3001

### Installation

```bash
cd frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5173

### API Configuration

The API base URL is configurable via environment variable:

```bash
# Development (uses Vite proxy) - .env or leave empty
VITE_API_BASE_URL=

# Production (different origin) - .env.production
VITE_API_BASE_URL=https://api.tachyonfuture.com/api
```

See [.env.example](.env.example) for configuration options.

**Vite Proxy (Development):**
- `/api/*` → `http://localhost:3001/api/*`
- `/uploads/*` → `http://localhost:3001/uploads/*`

This avoids CORS issues during development.

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## Available Routes

- `/` - Home page with recipe listing and search
- `/recipe/:id` - Recipe detail page
- `/add` - Add new recipe form
- `/edit/:id` - Edit existing recipe form

## Key Components

### Header
Sticky navigation bar with logo and navigation links.

### RecipeCard
Card component for displaying recipe preview in grid layout. Shows:
- Recipe image or placeholder emoji
- Recipe title
- Source
- Tags (color-coded)
- Date added

### SearchBar
Search input with clear button. Searches both recipe titles and ingredients.

### Home
Main page component featuring:
- Hero section with search bar
- Recipe grid with cards
- Pagination controls
- Loading and error states

### RecipeDetail
Full recipe view with:
- Breadcrumb navigation
- Edit and delete buttons
- Image display
- Ingredients list with quantities/units
- Instructions
- Delete confirmation modal

### RecipeForm
Form for creating/editing recipes with:
- Basic info fields (title, source, image path)
- Dynamic ingredient list builder
- Tag input with visual chips
- Instructions textarea
- Form validation

## Styling Approach

- **CSS Variables** for consistent theming
- **Component-level CSS** for encapsulation
- **Mobile-first** responsive design
- **Semantic HTML** for accessibility
- **Smooth transitions** for interactive elements

## API Integration

All API calls are centralized in `src/services/api.js`:

```javascript
import { recipeAPI } from '../services/api';

// Get all recipes with pagination
const response = await recipeAPI.getAll({ limit: 50, offset: 0 });

// Search recipes
const response = await recipeAPI.search({ title: 'chocolate' });

// Get recipe by ID
const response = await recipeAPI.getById(123);

// Create recipe
const response = await recipeAPI.create(recipeData);

// Update recipe
const response = await recipeAPI.update(123, recipeData);

// Delete recipe
const response = await recipeAPI.delete(123);

// Get all tags
const response = await recipeAPI.getTags();
```

## React Best Practices

This application implements several React best practices:

### Request Cancellation with AbortController
All API requests can be cancelled to prevent:
- Stale responses from overwriting newer data
- Memory leaks from setting state after unmount
- Race conditions in React StrictMode

```javascript
useEffect(() => {
  const abortController = new AbortController();
  loadData(abortController.signal);
  return () => abortController.abort();
}, [loadData]);
```

### Proper Effect Dependencies
- Loader functions wrapped in `useCallback` with correct dependencies
- Effects include all functions they call in dependency arrays
- Prevents infinite loops and missing updates

### Shared Utilities
Common logic extracted to `src/utils/recipeHelpers.js`:
- `getTagClass(tag)` - Consistent tag styling
- `formatDate(timestamp, short)` - Date formatting

Benefits: DRY principle, easier maintenance, consistent behavior

### Environment-Based Configuration
- API base URL configurable via `VITE_API_BASE_URL`
- Supports development (proxy) and production (direct) deployments
- No hardcoded URLs in application code

## Future Enhancements

- Image upload functionality (currently uses paths)
- Advanced filters (multiple tags, date ranges)
- Recipe favorites/bookmarks
- Print-friendly recipe view
- Recipe sharing functionality
- Bulk import tool

## Notes

- The application expects the backend API to be running on port 3001
- Recipe images should be placed in the backend's `/uploads` directory
- Tag colors are automatically assigned based on common category names
- All forms include client-side validation
- Delete operations require confirmation

---

**Last Updated**: November 2024
**Developer**: Claude Code with Michael Buckingham

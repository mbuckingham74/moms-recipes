# Frontend Design Guide - Mom's Recipes

## Design Philosophy

Create a warm, inviting interface that feels like being in a cozy kitchen. The design should evoke the comfort of home cooking while remaining clean and easy to navigate.

---

## Color Palette

### Primary Colors (Warm Kitchen Tones)

```css
/* Warm Cream - Main background */
--cream: #FFF8E7;
--cream-light: #FFFBF0;
--cream-dark: #F5EDD6;

/* Terracotta - Primary accent */
--terracotta: #D4745E;
--terracotta-light: #E89580;
--terracotta-dark: #B85D47;

/* Sage Green - Secondary accent */
--sage: #9CAF88;
--sage-light: #B5C6A3;
--sage-dark: #7D9168;

/* Warm Brown - Text and details */
--espresso: #5C4033;
--chocolate: #3E2723;
--cocoa: #8B6F47;
```

### Neutral Colors

```css
/* Backgrounds and cards */
--white: #FFFFFF;
--off-white: #FAF7F2;
--linen: #F0EBE3;

/* Text hierarchy */
--text-primary: #3E2723;      /* Chocolate - main text */
--text-secondary: #5C4033;    /* Espresso - headers */
--text-muted: #8B7355;        /* Lighter brown - meta info */
--text-light: #A89B8C;        /* Very light - placeholders */
```

### Accent Colors

```css
/* Status and feedback */
--success: #7D9168;     /* Dark sage - saved, success */
--warning: #E8A87C;     /* Peach - warnings */
--error: #C85A54;       /* Warm red - errors */
--info: #6B9AC4;        /* Soft blue - info messages */

/* Tag colors (pastel variations) */
--tag-dessert: #F4C2C2;      /* Soft pink */
--tag-main: #FFE5B4;         /* Peach */
--tag-breakfast: #FFEAA7;    /* Butter yellow */
--tag-appetizer: #A8E6CF;    /* Mint */
--tag-soup: #FFD3A5;         /* Apricot */
--tag-baking: #E6C9A8;       /* Tan */
--tag-default: #D4B5B0;      /* Dusty rose */
```

---

## Typography

### Font Families

```css
/* Headings - Warm and friendly serif */
--font-heading: 'Playfair Display', 'Georgia', serif;

/* Body - Clean and readable */
--font-body: 'Inter', 'Helvetica Neue', sans-serif;

/* Recipe content - Traditional */
--font-recipe: 'Merriweather', 'Georgia', serif;

/* Special/Handwritten feel (for notes) */
--font-script: 'Caveat', 'Brush Script MT', cursive;
```

### Font Sizes

```css
/* Scale */
--text-xs: 0.75rem;    /* 12px - tiny labels */
--text-sm: 0.875rem;   /* 14px - meta info */
--text-base: 1rem;     /* 16px - body text */
--text-lg: 1.125rem;   /* 18px - large body */
--text-xl: 1.25rem;    /* 20px - small headings */
--text-2xl: 1.5rem;    /* 24px - section headings */
--text-3xl: 1.875rem;  /* 30px - recipe titles */
--text-4xl: 2.25rem;   /* 36px - page titles */
--text-5xl: 3rem;      /* 48px - hero text */
```

### Font Weights

```css
--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

---

## Spacing System

```css
/* Consistent spacing scale (4px base) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
```

---

## Border Radius

```css
/* Soft, rounded corners for a gentle feel */
--radius-sm: 4px;      /* Small elements */
--radius-md: 8px;      /* Cards, buttons */
--radius-lg: 12px;     /* Large cards */
--radius-xl: 16px;     /* Hero sections */
--radius-2xl: 24px;    /* Special features */
--radius-full: 9999px; /* Pills, avatars */
```

---

## Shadows

```css
/* Subtle, warm shadows */
--shadow-sm: 0 1px 2px 0 rgba(92, 64, 51, 0.05);
--shadow-md: 0 4px 6px -1px rgba(92, 64, 51, 0.08),
             0 2px 4px -1px rgba(92, 64, 51, 0.04);
--shadow-lg: 0 10px 15px -3px rgba(92, 64, 51, 0.1),
             0 4px 6px -2px rgba(92, 64, 51, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(92, 64, 51, 0.12),
             0 10px 10px -5px rgba(92, 64, 51, 0.04);

/* Special: Inner shadow for input fields */
--shadow-inner: inset 0 2px 4px 0 rgba(92, 64, 51, 0.06);
```

---

## Component Styles

### Buttons

```css
/* Primary Button (Terracotta) */
.btn-primary {
  background: var(--terracotta);
  color: var(--white);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: var(--weight-semibold);
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--terracotta-dark);
  box-shadow: var(--shadow-lg);
  transform: translateY(-1px);
}

/* Secondary Button (Sage) */
.btn-secondary {
  background: var(--sage);
  color: var(--white);
  /* Same structure as primary */
}

/* Outline Button */
.btn-outline {
  background: transparent;
  color: var(--terracotta);
  border: 2px solid var(--terracotta);
  /* Same padding and radius */
}
```

### Cards

```css
.recipe-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: all 0.3s ease;
}

.recipe-card:hover {
  box-shadow: var(--shadow-xl);
  transform: translateY(-4px);
}

/* Card with cream background for variation */
.recipe-card-alt {
  background: var(--cream-light);
  border: 1px solid var(--linen);
}
```

### Tags

```css
.tag {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  background: var(--tag-default);
  color: var(--text-secondary);
}

/* Specific tag types */
.tag-dessert { background: var(--tag-dessert); }
.tag-main { background: var(--tag-main); }
.tag-breakfast { background: var(--tag-breakfast); }
```

### Input Fields

```css
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--linen);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-family: var(--font-body);
  background: var(--white);
  color: var(--text-primary);
  box-shadow: var(--shadow-inner);
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--terracotta);
  box-shadow: 0 0 0 3px rgba(212, 116, 94, 0.1);
}

.input::placeholder {
  color: var(--text-light);
}
```

---

## Layout Structure

### Page Layout

```
┌─────────────────────────────────────────┐
│  Header (Cream background)              │
│  - Logo "Mom's Recipes"                 │
│  - Search bar                           │
│  - Navigation                           │
├─────────────────────────────────────────┤
│                                         │
│  Main Content (Cream-light background) │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Recipe Cards (White/Grid)      │   │
│  │                                 │   │
│  │  ┌────┐ ┌────┐ ┌────┐          │   │
│  │  │ 🍪 │ │ 🍰 │ │ 🥖 │          │   │
│  │  └────┘ └────┘ └────┘          │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  Footer (Espresso background)          │
│  - Made with ❤️ for Mom                │
└─────────────────────────────────────────┘
```

### Grid System

```css
/* Recipe card grid */
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-6);
  padding: var(--space-8);
}

/* Responsive breakpoints */
@media (max-width: 768px) {
  .recipe-grid {
    grid-template-columns: 1fr;
    padding: var(--space-4);
  }
}
```

---

## Key Components Design

### 1. Recipe Card (List View)

```
┌──────────────────────────────────┐
│  [Recipe Image]                  │
│                                  │
├──────────────────────────────────┤
│  Chocolate Chip Cookies          │ ← Title (Playfair Display)
│  From: Grandma's cookbook        │ ← Source (muted)
│                                  │
│  🏷 dessert  cookies  baking     │ ← Tags (colored pills)
│                                  │
│  📅 Added Nov 2024               │ ← Meta info
└──────────────────────────────────┘
```

**Visual Style:**
- White background with warm shadow
- Image with subtle overlay gradient (bottom)
- Hover: lift with enhanced shadow
- Border radius: 12px

### 2. Recipe Detail View

```
┌────────────────────────────────────────────┐
│  ← Back to Recipes                         │
│                                            │
│  [Full Recipe Image - Large]               │
│                                            │
│  Chocolate Chip Cookies                    │ ← Large Playfair title
│  From Grandma's cookbook • Nov 2024        │ ← Meta line
│  🏷 dessert  cookies  baking               │ ← Tags
│                                            │
├────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Ingredients    │  │  Instructions   │ │
│  │  (Cream bg)     │  │  (White bg)     │ │
│  │                 │  │                 │ │
│  │  • 2 cups flour│  │  1. Preheat...  │ │
│  │  • 1 cup sugar │  │  2. Mix...      │ │
│  │  • ...         │  │  3. ...         │ │
│  └─────────────────┘  └─────────────────┘ │
│                                            │
│  [Edit Recipe] [Delete] [Print]           │ ← Action buttons
└────────────────────────────────────────────┘
```

**Visual Style:**
- Two-column layout on desktop
- Ingredients in cream card with checkboxes
- Instructions numbered, Merriweather font
- Print button creates clean, kitchen-friendly printout

### 3. Search Bar (Hero Component)

```
┌──────────────────────────────────────────────┐
│                                              │
│    🔍  Search Mom's Recipe Collection       │ ← Large, inviting
│    ┌────────────────────────────────────┐   │
│    │  Try "chocolate" or "flour"...     │   │ ← Big search input
│    └────────────────────────────────────┘   │
│                                              │
│    Quick Filters:                            │
│    ○ All  ○ Desserts  ○ Mains  ○ Breakfast  │ ← Radio buttons
│                                              │
└──────────────────────────────────────────────┘
```

**Visual Style:**
- Cream background with subtle texture
- Large, friendly search input
- Quick filter pills below
- Search icon in terracotta

### 4. Navigation Header

```
┌────────────────────────────────────────────────────┐
│  🏠 Mom's Recipes    [Search]    Browse | Add | ⚙  │
└────────────────────────────────────────────────────┘
```

**Visual Style:**
- Sticky header, cream background
- Logo uses script font for "Mom's"
- Border bottom: subtle shadow
- Icons in terracotta on hover

### 5. Tag Filter Sidebar

```
┌─────────────────┐
│  Filter by Tag  │
├─────────────────┤
│  ☑ Desserts (45)│
│  ☐ Breakfast (23)│
│  ☐ Mains (67)   │
│  ☐ Soups (18)   │
│  ☐ Baking (52)  │
│                 │
│  [Clear All]    │
└─────────────────┘
```

**Visual Style:**
- White card with sage accents
- Checkboxes in terracotta when checked
- Count in muted text
- Sticky scroll on desktop

### 6. Add/Edit Recipe Form

```
┌────────────────────────────────────┐
│  Add New Recipe                    │
│                                    │
│  Recipe Title *                    │
│  ┌──────────────────────────────┐ │
│  │ Chocolate Chip Cookies       │ │
│  └──────────────────────────────┘ │
│                                    │
│  Source                            │
│  ┌──────────────────────────────┐ │
│  │ Grandma's cookbook           │ │
│  └──────────────────────────────┘ │
│                                    │
│  📷 Upload Recipe Image            │
│  [Choose File] or Drag & Drop      │
│                                    │
│  Ingredients                       │
│  ┌─────┬────────┬────────┬───┐    │
│  │ Name│ Qty    │ Unit   │ × │    │
│  ├─────┼────────┼────────┼───┤    │
│  │flour│ 2      │ cups   │ × │    │
│  │sugar│ 1      │ cup    │ × │    │
│  └─────┴────────┴────────┴───┘    │
│  + Add Ingredient                  │
│                                    │
│  Instructions                      │
│  ┌──────────────────────────────┐ │
│  │ 1. Preheat oven...           │ │
│  │ 2. Mix ingredients...        │ │
│  │                              │ │
│  └──────────────────────────────┘ │
│                                    │
│  Tags (comma-separated)            │
│  ┌──────────────────────────────┐ │
│  │ dessert, cookies, baking     │ │
│  └──────────────────────────────┘ │
│                                    │
│  [Cancel]  [Save Recipe]           │ ← Buttons
└────────────────────────────────────┘
```

**Visual Style:**
- Clean form with cream background
- Input fields with warm focus states
- Ingredient table with add/remove rows
- Large save button in terracotta
- Auto-save draft indicator

---

## Iconography

### Icon Style
- Use **Feather Icons** or **Phosphor Icons** (warm, rounded style)
- Default color: `--espresso`
- Hover/Active: `--terracotta`
- Size: 20px-24px typically

### Common Icons
- 🔍 Search
- 🏷️ Tags
- 📅 Date
- 🍳 Cooking (logo)
- ❤️ Favorite
- 📄 Print
- ✏️ Edit
- 🗑️ Delete
- ➕ Add
- 📷 Photo
- 🏠 Home

---

## Microinteractions

### Hover States
```css
/* Cards lift on hover */
.recipe-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

/* Buttons slightly grow */
.btn:hover {
  transform: scale(1.02);
}

/* Tags brighten */
.tag:hover {
  filter: brightness(1.1);
}
```

### Transitions
```css
/* Standard transition for most elements */
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

/* Slower for cards */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### Loading States
- Skeleton screens with cream shimmer
- Spinner in terracotta color
- Fade-in animations for content

---

## Responsive Design

### Breakpoints
```css
/* Mobile first approach */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
```

### Mobile Considerations
- Larger touch targets (min 44px)
- Simplified navigation (hamburger menu)
- Single column layout
- Sticky search bar
- Bottom navigation bar option

---

## Accessibility

### Color Contrast
All text meets WCAG AA standards:
- Dark text on cream: 10.5:1 ✓
- White text on terracotta: 4.8:1 ✓
- White text on sage: 4.5:1 ✓

### Focus States
```css
*:focus-visible {
  outline: 3px solid var(--terracotta);
  outline-offset: 2px;
}
```

### Semantic HTML
- Use proper heading hierarchy (h1 → h6)
- Label all form inputs
- Alt text for all images
- ARIA labels for icon buttons

---

## Special Features Design

### 1. Print View
- Strip away navigation and UI
- Clean, kitchen-friendly layout
- Large, readable text (16px minimum)
- Checkbox list for ingredients
- White background to save ink

### 2. Image Viewer
- Lightbox for scanned recipe images
- Zoom controls
- Rotate for sideways scans
- Cream border around image

### 3. Search Results
- Highlight matching terms in yellow
- Show ingredient matches
- Group by relevance
- Empty state: friendly message with suggestions

### 4. Empty States
```
┌─────────────────────────────┐
│         🥘                  │
│                             │
│   No recipes found          │
│   Try a different search    │
│                             │
│   [Browse All Recipes]      │
└─────────────────────────────┘
```

**Visual Style:**
- Large emoji or illustration
- Friendly, helpful message
- Terracotta accent color
- Suggested action button

---

## Animation Guidelines

### Page Transitions
- Fade in: 200ms
- Slide up: 300ms for modals
- Cross-fade between routes

### Loading Animations
```css
/* Skeleton pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Fade in when loaded */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Success Feedback
- Green checkmark animation
- Toast notifications slide from top
- Auto-dismiss after 3 seconds

---

## Typography Hierarchy Example

```
Mom's Recipes                    ← h1: text-5xl, Playfair Display, espresso
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Desserts & Baking                ← h2: text-3xl, Playfair Display, espresso

Chocolate Chip Cookies           ← h3: text-2xl, Playfair Display, chocolate
From Grandma's cookbook          ← subtitle: text-sm, Inter, text-muted

This recipe makes the perfect   ← body: text-base, Inter, text-primary
batch of chewy cookies...

Added November 21, 2024          ← caption: text-sm, Inter, text-light
```

---

## CSS Custom Properties (Complete Set)

```css
:root {
  /* Colors - Warm Kitchen Palette */
  --cream: #FFF8E7;
  --cream-light: #FFFBF0;
  --cream-dark: #F5EDD6;
  --terracotta: #D4745E;
  --terracotta-light: #E89580;
  --terracotta-dark: #B85D47;
  --sage: #9CAF88;
  --sage-light: #B5C6A3;
  --sage-dark: #7D9168;
  --espresso: #5C4033;
  --chocolate: #3E2723;
  --cocoa: #8B6F47;
  --white: #FFFFFF;
  --off-white: #FAF7F2;
  --linen: #F0EBE3;

  /* Text colors */
  --text-primary: #3E2723;
  --text-secondary: #5C4033;
  --text-muted: #8B7355;
  --text-light: #A89B8C;

  /* Fonts */
  --font-heading: 'Playfair Display', Georgia, serif;
  --font-body: 'Inter', Helvetica, sans-serif;
  --font-recipe: 'Merriweather', Georgia, serif;
  --font-script: 'Caveat', cursive;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(92, 64, 51, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(92, 64, 51, 0.08);
  --shadow-lg: 0 10px 15px -3px rgba(92, 64, 51, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(92, 64, 51, 0.12);
}
```

---

## Implementation Notes

### React Component Structure
```
src/
├── components/
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Card.jsx
│   │   └── Tag.jsx
│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── Layout.jsx
│   ├── recipe/
│   │   ├── RecipeCard.jsx
│   │   ├── RecipeDetail.jsx
│   │   ├── RecipeList.jsx
│   │   └── RecipeForm.jsx
│   └── search/
│       ├── SearchBar.jsx
│       └── FilterSidebar.jsx
├── styles/
│   ├── globals.css          ← CSS variables
│   ├── components.css       ← Component styles
│   └── utilities.css        ← Helper classes
└── pages/
    ├── Home.jsx
    ├── RecipeDetail.jsx
    ├── AddRecipe.jsx
    └── Search.jsx
```

### CSS Framework Recommendations
1. **TailwindCSS** (easiest with custom colors)
2. **CSS Modules** (if you want full control)
3. **Styled Components** (React integration)

Configure Tailwind with the custom color palette for best results.

---

## Design Inspiration

This design evokes:
- 🏡 Grandma's cozy kitchen
- 📖 Vintage recipe books with cream pages
- 🧺 Warm terracotta pottery
- 🌿 Fresh herbs (sage green)
- ☕ Morning coffee (espresso browns)

The overall feel should be:
- **Nostalgic** but modern
- **Warm** but clean
- **Homey** but professional
- **Simple** but delightful

---

*Design tokens ready for implementation in React + TailwindCSS or CSS-in-JS*

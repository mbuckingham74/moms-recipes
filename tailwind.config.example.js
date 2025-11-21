/** @type {import('tailwindcss').Config} */
/**
 * Tailwind CSS Configuration for Mom's Recipes
 *
 * This configuration implements the warm kitchen color palette
 * and design tokens from FRONTEND_DESIGN.md
 *
 * To use:
 * 1. Install Tailwind: npm install -D tailwindcss postcss autoprefixer
 * 2. Rename this file to tailwind.config.js
 * 3. Add fonts to your HTML or via Tailwind's font loading
 * 4. Import Tailwind directives in your CSS
 */

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette - Warm kitchen tones
        cream: {
          DEFAULT: '#FFF8E7',
          light: '#FFFBF0',
          dark: '#F5EDD6',
        },
        terracotta: {
          DEFAULT: '#D4745E',
          light: '#E89580',
          dark: '#B85D47',
        },
        sage: {
          DEFAULT: '#9CAF88',
          light: '#B5C6A3',
          dark: '#7D9168',
        },
        espresso: {
          DEFAULT: '#5C4033',
        },
        chocolate: {
          DEFAULT: '#3E2723',
        },
        cocoa: {
          DEFAULT: '#8B6F47',
        },

        // Neutrals
        'off-white': '#FAF7F2',
        linen: '#F0EBE3',

        // Text colors (semantic names)
        'text-primary': '#3E2723',
        'text-secondary': '#5C4033',
        'text-muted': '#8B7355',
        'text-light': '#A89B8C',

        // Tag colors
        tag: {
          dessert: '#F4C2C2',
          main: '#FFE5B4',
          breakfast: '#FFEAA7',
          appetizer: '#A8E6CF',
          soup: '#FFD3A5',
          baking: '#E6C9A8',
          default: '#D4B5B0',
        },
      },

      fontFamily: {
        heading: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Inter', 'Helvetica Neue', 'sans-serif'],
        recipe: ['Merriweather', 'Georgia', 'serif'],
        script: ['Caveat', 'Brush Script MT', 'cursive'],
      },

      fontSize: {
        'xs': '0.75rem',      // 12px
        'sm': '0.875rem',     // 14px
        'base': '1rem',       // 16px
        'lg': '1.125rem',     // 18px
        'xl': '1.25rem',      // 20px
        '2xl': '1.5rem',      // 24px
        '3xl': '1.875rem',    // 30px
        '4xl': '2.25rem',     // 36px
        '5xl': '3rem',        // 48px
      },

      spacing: {
        '1': '0.25rem',   // 4px
        '2': '0.5rem',    // 8px
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '5': '1.25rem',   // 20px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '10': '2.5rem',   // 40px
        '12': '3rem',     // 48px
        '16': '4rem',     // 64px
        '20': '5rem',     // 80px
      },

      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        'full': '9999px',
      },

      boxShadow: {
        'sm': '0 1px 2px 0 rgba(92, 64, 51, 0.05)',
        'md': '0 4px 6px -1px rgba(92, 64, 51, 0.08), 0 2px 4px -1px rgba(92, 64, 51, 0.04)',
        'lg': '0 10px 15px -3px rgba(92, 64, 51, 0.1), 0 4px 6px -2px rgba(92, 64, 51, 0.05)',
        'xl': '0 20px 25px -5px rgba(92, 64, 51, 0.12), 0 10px 10px -5px rgba(92, 64, 51, 0.04)',
        'inner': 'inset 0 2px 4px 0 rgba(92, 64, 51, 0.06)',
      },

      // Custom animations
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-in',
        slideUp: 'slideUp 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [
    // Recommended plugins for forms and typography
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
}

/**
 * Usage Examples:
 *
 * // Primary button
 * <button className="bg-terracotta hover:bg-terracotta-dark text-white px-6 py-3 rounded-md shadow-md transition">
 *   Add Recipe
 * </button>
 *
 * // Recipe card
 * <div className="bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
 *   <img src="..." className="w-full h-48 object-cover rounded-t-lg" />
 *   <div className="p-6">
 *     <h3 className="font-heading text-2xl text-chocolate mb-2">Recipe Title</h3>
 *     <p className="text-text-muted text-sm mb-4">From: Grandma's cookbook</p>
 *     <div className="flex gap-2">
 *       <span className="bg-tag-dessert text-chocolate text-sm px-3 py-1 rounded-full">dessert</span>
 *     </div>
 *   </div>
 * </div>
 *
 * // Search input
 * <input
 *   type="text"
 *   placeholder="Search recipes..."
 *   className="w-full px-4 py-3 border-2 border-linen rounded-md focus:border-terracotta focus:ring-4 focus:ring-terracotta/10 transition"
 * />
 *
 * // Typography
 * <h1 className="font-heading text-5xl text-espresso mb-4">Mom's Recipes</h1>
 * <p className="font-body text-base text-text-primary leading-relaxed">Body text...</p>
 * <p className="font-script text-xl text-terracotta">Handwritten note style</p>
 */

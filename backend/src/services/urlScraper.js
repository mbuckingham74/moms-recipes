const cheerio = require('cheerio');

class UrlScraper {
  /**
   * Fetch and extract recipe content from a URL
   * @param {string} url - The URL to scrape
   * @returns {Promise<Object>} - Extracted content with source URL
   */
  static async scrape(url) {
    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new Error('Invalid URL. Please provide a valid HTTP or HTTPS URL.');
    }

    // Fetch the page
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MomsRecipesBot/1.0; +https://moms-recipes.tachyonfuture.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
        timeout: 15000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.message.includes('timeout')) {
        throw new Error('Request timed out. The website took too long to respond.');
      }
      throw new Error(`Failed to fetch URL: ${err.message}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to extract structured recipe data (JSON-LD)
    const structuredData = this.extractJsonLd($);
    if (structuredData) {
      return {
        type: 'structured',
        source: url,
        hostname: parsedUrl.hostname,
        data: structuredData,
      };
    }

    // Fall back to extracting page content for Claude to parse
    const pageContent = this.extractPageContent($, parsedUrl.hostname);
    return {
      type: 'unstructured',
      source: url,
      hostname: parsedUrl.hostname,
      data: pageContent,
    };
  }

  /**
   * Extract JSON-LD structured data (schema.org Recipe)
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Object|null} - Structured recipe data or null
   */
  static extractJsonLd($) {
    const scripts = $('script[type="application/ld+json"]');

    for (let i = 0; i < scripts.length; i++) {
      try {
        const content = $(scripts[i]).html();
        if (!content) continue;

        let data = JSON.parse(content);

        // Handle @graph arrays (common in WordPress sites)
        if (data['@graph'] && Array.isArray(data['@graph'])) {
          data = data['@graph'].find(item =>
            item['@type'] === 'Recipe' ||
            (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
          );
        }

        // Check if this is a Recipe type
        if (data && (data['@type'] === 'Recipe' ||
            (Array.isArray(data['@type']) && data['@type'].includes('Recipe')))) {
          return this.normalizeStructuredRecipe(data);
        }
      } catch {
        // Invalid JSON, continue to next script
        continue;
      }
    }

    return null;
  }

  /**
   * Normalize structured recipe data to our format
   * @param {Object} recipe - Schema.org Recipe object
   * @returns {Object} - Normalized recipe data
   */
  static normalizeStructuredRecipe(recipe) {
    // Extract ingredients
    let ingredients = [];
    if (recipe.recipeIngredient) {
      ingredients = (Array.isArray(recipe.recipeIngredient)
        ? recipe.recipeIngredient
        : [recipe.recipeIngredient]
      ).map(ing => this.parseIngredientString(ing));
    }

    // Extract instructions
    let instructions = '';
    if (recipe.recipeInstructions) {
      if (typeof recipe.recipeInstructions === 'string') {
        instructions = recipe.recipeInstructions;
      } else if (Array.isArray(recipe.recipeInstructions)) {
        instructions = recipe.recipeInstructions.map((step, index) => {
          if (typeof step === 'string') {
            return `${index + 1}. ${step}`;
          } else if (step.text) {
            return `${index + 1}. ${step.text}`;
          } else if (step['@type'] === 'HowToSection') {
            // Handle sectioned instructions
            const sectionSteps = step.itemListElement || [];
            return `**${step.name || 'Section'}**\n` +
              sectionSteps.map((s, i) => `${i + 1}. ${s.text || s}`).join('\n');
          }
          return '';
        }).filter(Boolean).join('\n\n');
      }
    }

    // Extract category
    let category = null;
    if (recipe.recipeCategory) {
      category = Array.isArray(recipe.recipeCategory)
        ? recipe.recipeCategory[0]
        : recipe.recipeCategory;
    }

    // Extract tags/keywords
    let tags = [];
    if (recipe.keywords) {
      if (typeof recipe.keywords === 'string') {
        tags = recipe.keywords.split(',').map(t => t.trim()).filter(Boolean);
      } else if (Array.isArray(recipe.keywords)) {
        tags = recipe.keywords;
      }
    }
    if (recipe.recipeCuisine) {
      const cuisines = Array.isArray(recipe.recipeCuisine)
        ? recipe.recipeCuisine
        : [recipe.recipeCuisine];
      tags = [...tags, ...cuisines];
    }

    // Extract yield/servings
    let servings = null;
    if (recipe.recipeYield) {
      const yieldStr = Array.isArray(recipe.recipeYield)
        ? recipe.recipeYield[0]
        : recipe.recipeYield;
      const match = yieldStr.toString().match(/\d+/);
      if (match) {
        servings = parseInt(match[0], 10);
      }
    }

    return {
      title: recipe.name || 'Untitled Recipe',
      source: recipe.author?.name || recipe.publisher?.name || null,
      category,
      description: recipe.description || null,
      ingredients,
      instructions,
      tags: tags.slice(0, 10), // Limit to 10 tags
      servings,
      prepTime: recipe.prepTime || null,
      cookTime: recipe.cookTime || null,
      totalTime: recipe.totalTime || null,
      image: this.extractImageUrl(recipe.image),
    };
  }

  /**
   * Extract image URL from various schema.org formats
   * @param {*} image - Image field from recipe
   * @returns {string|null}
   */
  static extractImageUrl(image) {
    if (!image) return null;
    if (typeof image === 'string') return image;
    if (Array.isArray(image)) return this.extractImageUrl(image[0]);
    if (image.url) return image.url;
    if (image['@id']) return image['@id'];
    return null;
  }

  /**
   * Parse an ingredient string into components
   * @param {string} ingredientStr - Full ingredient string
   * @returns {Object} - Parsed ingredient with name, quantity, unit
   */
  static parseIngredientString(ingredientStr) {
    if (!ingredientStr || typeof ingredientStr !== 'string') {
      return { name: String(ingredientStr || ''), quantity: null, unit: null };
    }

    const str = ingredientStr.trim();

    // Common patterns for quantity + unit + ingredient
    // e.g., "2 cups flour", "1/2 teaspoon salt", "3 large eggs"
    const patterns = [
      // Fraction or decimal + unit + ingredient
      /^([\d./]+(?:\s*-\s*[\d./]+)?)\s+(cups?|tbsp?|tsp?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|quarts?|pints?|gallons?|pieces?|slices?|cloves?|cans?|packages?|sticks?|bunche?s?|heads?|sprigs?|pinche?s?|dashes?)\s+(.+)$/i,
      // Fraction or decimal + size modifier + ingredient (e.g., "2 large eggs")
      /^([\d./]+(?:\s*-\s*[\d./]+)?)\s+(small|medium|large|extra-large|whole)\s+(.+)$/i,
      // Just number + ingredient (e.g., "3 eggs")
      /^([\d./]+(?:\s*-\s*[\d./]+)?)\s+(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = str.match(pattern);
      if (match) {
        if (match.length === 4) {
          return {
            quantity: match[1],
            unit: match[2].toLowerCase(),
            name: match[3].trim(),
          };
        } else if (match.length === 3) {
          return {
            quantity: match[1],
            unit: 'whole',
            name: match[2].trim(),
          };
        }
      }
    }

    // No pattern matched, return as-is
    return { name: str, quantity: null, unit: null };
  }

  /**
   * Extract page content for unstructured parsing
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {string} hostname - Source hostname
   * @returns {Object} - Extracted page content
   */
  static extractPageContent($, hostname) {
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .comments, .sidebar, .advertisement, .ad, [class*="social"], [class*="share"]').remove();

    // Get page title
    const title = $('h1').first().text().trim() ||
                  $('title').text().trim() ||
                  'Unknown Recipe';

    // Try to find the main content area
    const contentSelectors = [
      'article',
      '[class*="recipe"]',
      '[class*="content"]',
      'main',
      '.post',
      '.entry',
    ];

    let mainContent = '';
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim().length > 200) {
        mainContent = element.text().trim();
        break;
      }
    }

    // Fallback to body content
    if (!mainContent) {
      mainContent = $('body').text().trim();
    }

    // Clean up the text
    mainContent = mainContent
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .substring(0, 15000); // Limit to ~15k chars for Claude context

    return {
      title,
      content: mainContent,
      hostname,
    };
  }
}

module.exports = UrlScraper;

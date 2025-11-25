const cheerio = require('cheerio');
const dns = require('dns').promises;

// Maximum response size (5MB should be plenty for any recipe page)
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;
// Request timeout in milliseconds
const REQUEST_TIMEOUT = 15000;

// Private/internal IP ranges that should be blocked (SSRF protection)
const BLOCKED_IP_RANGES = [
  /^127\./,                    // Loopback
  /^10\./,                     // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B
  /^192\.168\./,               // Private Class C
  /^169\.254\./,               // Link-local
  /^0\./,                      // Current network
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // Carrier-grade NAT
  /^::1$/,                     // IPv6 loopback
  /^fe80:/i,                   // IPv6 link-local
  /^fc00:/i,                   // IPv6 unique local
  /^fd/i,                      // IPv6 unique local
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',  // GCP metadata
  'metadata',
  '169.254.169.254',           // AWS/cloud metadata endpoint
];

class UrlScraper {
  /**
   * Check if an IP address is in a private/blocked range
   * @param {string} ip - IP address to check
   * @returns {boolean} - True if blocked
   */
  static isBlockedIp(ip) {
    return BLOCKED_IP_RANGES.some(pattern => pattern.test(ip));
  }

  /**
   * Check if a hostname is blocked
   * @param {string} hostname - Hostname to check
   * @returns {boolean} - True if blocked
   */
  static isBlockedHostname(hostname) {
    const lower = hostname.toLowerCase();
    return BLOCKED_HOSTNAMES.includes(lower) ||
           lower.endsWith('.internal') ||
           lower.endsWith('.local');
  }

  /**
   * Resolve hostname and check if it points to a blocked IP
   * @param {string} hostname - Hostname to resolve
   * @returns {Promise<void>} - Throws if blocked
   */
  static async validateHostname(hostname) {
    // Check blocked hostnames first
    if (this.isBlockedHostname(hostname)) {
      throw new Error('Access to internal/private hosts is not allowed.');
    }

    // Check if hostname is already an IP address
    if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) {
      if (this.isBlockedIp(hostname)) {
        throw new Error('Access to private/internal IP addresses is not allowed.');
      }
      return;
    }

    // Resolve hostname to IP and check
    try {
      const addresses = await dns.resolve4(hostname);
      for (const ip of addresses) {
        if (this.isBlockedIp(ip)) {
          throw new Error('This URL resolves to a private/internal IP address and cannot be accessed.');
        }
      }
    } catch (err) {
      if (err.code === 'ENOTFOUND') {
        throw new Error('Could not resolve hostname. Please check the URL.');
      }
      // For other DNS errors, check if the error is about blocked IPs
      if (err.message.includes('private') || err.message.includes('internal')) {
        throw err;
      }
      // Otherwise continue - let fetch handle it
    }
  }

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

    // SSRF protection: validate hostname doesn't resolve to internal/private IPs
    await this.validateHostname(parsedUrl.hostname);

    // Set up abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

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
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The website took too long to respond.');
      }
      throw new Error(`Failed to fetch URL: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    // Validate content-type is HTML-like
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') &&
        !contentType.includes('application/xhtml') &&
        !contentType.includes('text/plain')) {
      throw new Error('URL does not point to an HTML page. Please provide a link to a recipe webpage.');
    }

    // Check content-length if provided
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new Error('Page is too large to process. Please try a different URL.');
    }

    // Read response with size limit
    const html = await this.readResponseWithLimit(response, MAX_RESPONSE_SIZE);
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
   * Read response body with a size limit to prevent memory exhaustion
   * @param {Response} response - Fetch response object
   * @param {number} maxSize - Maximum allowed size in bytes
   * @returns {Promise<string>} - Response body as text
   */
  static async readResponseWithLimit(response, maxSize) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let totalSize = 0;
    let chunks = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalSize += value.length;
        if (totalSize > maxSize) {
          reader.cancel();
          throw new Error('Page is too large to process. Please try a different URL.');
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks and decode
    const allChunks = new Uint8Array(totalSize);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }

    return decoder.decode(allChunks);
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

const cheerio = require('cheerio');
const dns = require('dns').promises;

// Maximum response size (5MB should be plenty for any recipe page)
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;
// Request timeout in milliseconds
const REQUEST_TIMEOUT = 15000;
// Maximum number of redirects to follow
const MAX_REDIRECTS = 5;

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',  // GCP metadata
  'metadata',
  '169.254.169.254',           // AWS/cloud metadata endpoint
];

class UrlScraper {
  /**
   * Check if an IPv4 address is in a private/blocked range
   * @param {number[]} octets - Array of 4 octets (0-255)
   * @returns {boolean} - True if blocked
   */
  static isBlockedIPv4(octets) {
    const [a, b, c, d] = octets;

    // Validate octets
    if (octets.length !== 4 || octets.some(o => o < 0 || o > 255 || !Number.isInteger(o))) {
      return true; // Invalid = blocked for safety
    }

    // 127.0.0.0/8 - Loopback
    if (a === 127) return true;

    // 10.0.0.0/8 - Private Class A
    if (a === 10) return true;

    // 172.16.0.0/12 - Private Class B
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 - Private Class C
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 - Link-local
    if (a === 169 && b === 254) return true;

    // 0.0.0.0/8 - Current network
    if (a === 0) return true;

    // 100.64.0.0/10 - Carrier-grade NAT
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 224.0.0.0/4 - Multicast
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 - Reserved
    if (a >= 240) return true;

    return false;
  }

  /**
   * Extract embedded IPv4 from IPv6 address if present
   * Handles: ::ffff:a.b.c.d, ::ffff:XXYY:ZZWW, 2002:XXYY:ZZWW::, ::a.b.c.d
   * @param {string} ip - IPv6 address
   * @returns {number[]|null} - IPv4 octets or null if not embedded
   */
  static extractEmbeddedIPv4(ip) {
    const lower = ip.toLowerCase();

    // IPv4-mapped: ::ffff:a.b.c.d (dot-decimal notation)
    const mappedDotMatch = lower.match(/^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (mappedDotMatch) {
      return mappedDotMatch.slice(1, 5).map(Number);
    }

    // IPv4-mapped: ::ffff:XXYY:ZZWW (hex notation)
    const mappedHexMatch = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHexMatch) {
      const high = parseInt(mappedHexMatch[1], 16);
      const low = parseInt(mappedHexMatch[2], 16);
      return [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff];
    }

    // IPv4-compatible (deprecated but still valid): ::a.b.c.d
    const compatDotMatch = lower.match(/^::(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (compatDotMatch) {
      return compatDotMatch.slice(1, 5).map(Number);
    }

    // IPv4-compatible hex: ::XXYY:ZZWW (but not ::ffff:...)
    const compatHexMatch = lower.match(/^::([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (compatHexMatch && !lower.startsWith('::ffff:')) {
      const high = parseInt(compatHexMatch[1], 16);
      const low = parseInt(compatHexMatch[2], 16);
      return [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff];
    }

    // 6to4: 2002:XXYY:ZZWW::/48 - first 32 bits after 2002: are IPv4
    const sixtofourMatch = lower.match(/^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})/);
    if (sixtofourMatch) {
      const high = parseInt(sixtofourMatch[1], 16);
      const low = parseInt(sixtofourMatch[2], 16);
      return [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff];
    }

    // Teredo: 2001:0000:...  - IPv4 is encoded in last 32 bits (XOR'd with 0xffffffff)
    // We block Teredo entirely as it's complex and rarely legitimate for recipe sites
    if (lower.startsWith('2001:0000:') || lower.startsWith('2001:0:')) {
      return [127, 0, 0, 1]; // Return loopback to ensure it's blocked
    }

    return null;
  }

  /**
   * Check if an IP address (IPv4 or IPv6) is in a private/blocked range
   * @param {string} ip - IP address to check
   * @returns {boolean} - True if blocked
   */
  static isBlockedIp(ip) {
    if (!ip || typeof ip !== 'string') return true;

    const lower = ip.toLowerCase().trim();

    // Check for IPv4
    const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      return this.isBlockedIPv4(ipv4Match.slice(1, 5).map(Number));
    }

    // Check for embedded IPv4 in IPv6
    const embeddedIPv4 = this.extractEmbeddedIPv4(lower);
    if (embeddedIPv4) {
      return this.isBlockedIPv4(embeddedIPv4);
    }

    // Pure IPv6 checks
    // ::1 - Loopback
    if (lower === '::1') return true;

    // fe80::/10 - Link-local
    if (lower.startsWith('fe80:') || lower.startsWith('fe8') ||
        lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
      return true;
    }

    // fc00::/7 - Unique local (fc00:: and fd00::)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

    // ff00::/8 - Multicast
    if (lower.startsWith('ff')) return true;

    // :: alone (unspecified address)
    if (lower === '::') return true;

    return false;
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
   * Resolve hostname and check if it points to a blocked IP (both IPv4 and IPv6)
   * @param {string} hostname - Hostname to resolve
   * @returns {Promise<void>} - Throws if blocked
   */
  static async validateHostname(hostname) {
    // Check blocked hostnames first
    if (this.isBlockedHostname(hostname)) {
      throw new Error('Access to internal/private hosts is not allowed.');
    }

    // Check if hostname is already an IP address (IPv4 or IPv6)
    if (/^[\d.]+$/.test(hostname)) {
      // IPv4 literal
      if (this.isBlockedIp(hostname)) {
        throw new Error('Access to private/internal IP addresses is not allowed.');
      }
      return;
    }

    // Check for IPv6 literal (may be bracketed in URLs)
    const ipv6Match = hostname.match(/^\[?([a-fA-F0-9:]+)\]?$/);
    if (ipv6Match) {
      if (this.isBlockedIp(ipv6Match[1])) {
        throw new Error('Access to private/internal IP addresses is not allowed.');
      }
      return;
    }

    // Resolve hostname to IPs and check both A (IPv4) and AAAA (IPv6) records
    let hasAnyRecords = false;

    // Check IPv4 (A records)
    try {
      const ipv4Addresses = await dns.resolve4(hostname);
      hasAnyRecords = true;
      for (const ip of ipv4Addresses) {
        if (this.isBlockedIp(ip)) {
          throw new Error('This URL resolves to a private/internal IP address and cannot be accessed.');
        }
      }
    } catch (err) {
      // ENODATA means no A records, which is fine if AAAA records exist
      if (err.code !== 'ENODATA' && err.code !== 'ENOTFOUND') {
        if (err.message.includes('private') || err.message.includes('internal')) {
          throw err;
        }
      }
    }

    // Check IPv6 (AAAA records)
    try {
      const ipv6Addresses = await dns.resolve6(hostname);
      hasAnyRecords = true;
      for (const ip of ipv6Addresses) {
        if (this.isBlockedIp(ip)) {
          throw new Error('This URL resolves to a private/internal IPv6 address and cannot be accessed.');
        }
      }
    } catch (err) {
      // ENODATA means no AAAA records, which is fine if A records exist
      if (err.code !== 'ENODATA' && err.code !== 'ENOTFOUND') {
        if (err.message.includes('private') || err.message.includes('internal')) {
          throw err;
        }
      }
    }

    // If no DNS records at all, throw error
    if (!hasAnyRecords) {
      throw new Error('Could not resolve hostname. Please check the URL.');
    }
  }

  /**
   * Validate and parse a URL, ensuring it's HTTP/HTTPS
   * @param {string} url - URL to validate
   * @returns {URL} - Parsed URL object
   */
  static validateUrl(url) {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new Error('Invalid URL. Please provide a valid HTTP or HTTPS URL.');
    }
    return parsedUrl;
  }

  /**
   * Fetch a URL with manual redirect handling to validate each redirect destination
   * @param {string} url - URL to fetch
   * @param {AbortSignal} signal - Abort signal for timeout
   * @param {number} redirectCount - Current redirect count
   * @returns {Promise<Response>} - Final response
   */
  static async fetchWithSafeRedirects(url, signal, redirectCount = 0) {
    if (redirectCount > MAX_REDIRECTS) {
      throw new Error('Too many redirects. Please try a different URL.');
    }

    // Validate the URL and its hostname before each request
    const parsedUrl = this.validateUrl(url);
    await this.validateHostname(parsedUrl.hostname);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MomsRecipesBot/1.0; +https://moms-recipes.tachyonfuture.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'manual', // Don't automatically follow redirects
      signal,
    });

    // Handle redirects manually to validate each destination
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Redirect response missing Location header.');
      }

      // Resolve relative redirects against current URL
      const redirectUrl = new URL(location, url).href;

      // Recursively fetch the redirect destination (will validate hostname)
      return this.fetchWithSafeRedirects(redirectUrl, signal, redirectCount + 1);
    }

    return response;
  }

  /**
   * Fetch and extract recipe content from a URL
   * @param {string} url - The URL to scrape
   * @returns {Promise<Object>} - Extracted content with source URL
   */
  static async scrape(url) {
    // Validate initial URL
    const parsedUrl = this.validateUrl(url);

    // Set up abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // Fetch the page with safe redirect handling
    let response;
    try {
      response = await this.fetchWithSafeRedirects(url, controller.signal);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The website took too long to respond.');
      }
      // Re-throw our own validation errors as-is
      if (err.message.includes('private') || err.message.includes('internal') ||
          err.message.includes('redirects') || err.message.includes('resolve')) {
        throw err;
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

    // Get final URL (may differ from original due to redirects)
    const finalUrl = response.url || url;
    const finalHostname = new URL(finalUrl).hostname;

    // Try to extract structured recipe data (JSON-LD)
    const structuredData = this.extractJsonLd($);
    if (structuredData) {
      return {
        type: 'structured',
        source: finalUrl,
        hostname: finalHostname,
        data: structuredData,
      };
    }

    // Fall back to extracting page content for Claude to parse
    const pageContent = this.extractPageContent($, finalHostname);
    return {
      type: 'unstructured',
      source: finalUrl,
      hostname: finalHostname,
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

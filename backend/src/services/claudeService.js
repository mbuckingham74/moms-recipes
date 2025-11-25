// Default model - using Claude 3.5 Sonnet which is currently available
// See https://docs.anthropic.com/en/docs/models-overview for current model IDs
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

// Check if Claude API is available
const isClaudeAvailable = () => {
  return !!process.env.ANTHROPIC_API_KEY;
};

// Lazy initialization of Anthropic client
let anthropicClient = null;

const getClient = () => {
  if (!isClaudeAvailable()) {
    throw new Error('ANTHROPIC_API_KEY is not configured. AI features are unavailable.');
  }

  if (!anthropicClient) {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  return anthropicClient;
};

class ClaudeService {
  /**
   * Check if Claude AI features are available
   * @returns {boolean}
   */
  static isAvailable() {
    return isClaudeAvailable();
  }

  /**
   * Send a message to Claude and get response
   * @param {string} userMessage - The message/prompt to send
   * @param {string} systemPrompt - System prompt (optional)
   * @param {string} model - Claude model to use
   * @returns {Promise<string>} - Claude's response
   */
  static async sendMessage(userMessage, systemPrompt = '', model = DEFAULT_MODEL) {
    if (!isClaudeAvailable()) {
      throw new Error('Claude AI is not available. Please configure ANTHROPIC_API_KEY.');
    }

    try {
      const client = getClient();
      const params = {
        model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      };

      // Add system prompt if provided
      if (systemPrompt) {
        params.system = systemPrompt;
      }

      const message = await client.messages.create(params);

      // Extract text from response
      if (message.content && message.content.length > 0) {
        return message.content[0].text;
      }

      throw new Error('No response from Claude');
    } catch (error) {
      // Provide more helpful error messages
      if (error.status === 401) {
        throw new Error('Invalid ANTHROPIC_API_KEY. Please check your API key configuration.');
      }
      if (error.status === 400 && error.message.includes('model')) {
        throw new Error(`Invalid model "${model}". Please check Anthropic documentation for valid model IDs.`);
      }
      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  /**
   * Parse recipe from text using Claude
   * Returns structured recipe data
   * @param {string} recipeText - Raw recipe text from PDF
   * @returns {Promise<Object>} - Parsed recipe object
   */
  static async parseRecipe(recipeText) {
    if (!isClaudeAvailable()) {
      throw new Error('Recipe parsing requires Claude AI. Please configure ANTHROPIC_API_KEY.');
    }

    const systemPrompt = `You are a recipe parsing assistant. Your job is to extract structured recipe information from unstructured text.

IMPORTANT: You must respond with ONLY valid JSON. No markdown code blocks, no explanations, just pure JSON.

The JSON structure should be:
{
  "title": "Recipe name",
  "source": "Where the recipe came from (cookbook, website, person, etc.)",
  "category": "Recipe category (e.g., Appetizers, Main Courses, Desserts, Snacks, etc.)",
  "description": "Brief 1-2 sentence description of the recipe",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "amount (e.g., '2', '1/2', '1.5')",
      "unit": "unit of measurement (e.g., 'cups', 'tbsp', 'grams', 'whole')"
    }
  ],
  "instructions": "Step by step cooking instructions as a single text block",
  "tags": ["tag1", "tag2"]
}

Guidelines:
- Extract title from the recipe (often the first line or clearly labeled)
- Identify the source (cookbook name, website, "Mom's recipe", etc.)
- Extract or infer category (Appetizers, Main Courses, Desserts, Snacks, Soups & Salads, etc.)
- Create a brief description summarizing what the recipe is (1-2 sentences)
- Parse ingredients carefully:
  * Separate quantity, unit, and ingredient name
  * Use "whole" or "piece" for countable items without units
  * Keep fractions as strings: "1/2", "1/4", etc.
- Combine all instruction steps into a single text block with proper formatting
- Generate 3-5 relevant tags based on:
  * Meal type (breakfast, lunch, dinner, dessert, snack)
  * Cuisine type (italian, mexican, asian, etc.)
  * Main ingredient (chicken, beef, pasta, etc.)
  * Cooking method (baked, grilled, slow-cooker, etc.)
  * Dietary (vegetarian, vegan, gluten-free, etc.)
- If any field is unclear or missing, use reasonable defaults or null`;

    const userMessage = `Parse this recipe and return structured JSON:

${recipeText}`;

    try {
      const response = await this.sendMessage(userMessage, systemPrompt);

      // Try to extract JSON from response (in case Claude added markdown)
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      // Parse JSON
      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.title) {
        parsed.title = 'Untitled Recipe';
      }

      if (!parsed.category) {
        parsed.category = null;
      }

      if (!parsed.description) {
        parsed.description = null;
      }

      if (!Array.isArray(parsed.ingredients)) {
        parsed.ingredients = [];
      }

      if (!parsed.instructions) {
        parsed.instructions = '';
      }

      if (!Array.isArray(parsed.tags)) {
        parsed.tags = [];
      }

      return parsed;
    } catch (error) {
      throw new Error(`Recipe parsing failed: ${error.message}`);
    }
  }

  /**
   * Estimate calories for a recipe
   * @param {Object} recipe - Recipe with ingredients
   * @returns {Promise<Object>} - Calorie estimation with confidence
   */
  static async estimateCalories(recipe) {
    if (!isClaudeAvailable()) {
      throw new Error('Calorie estimation requires Claude AI. Please configure ANTHROPIC_API_KEY.');
    }

    const systemPrompt = `You are a nutrition expert. Estimate the total calories for a recipe based on its ingredients.

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "estimated_calories": <number>,
  "calories_confidence": "<low|medium|high>",
  "reasoning": "Brief explanation of your estimation"
}

Guidelines:
- estimated_calories should be per serving (or total if servings unknown)
- calories_confidence:
  * "high" - standard ingredients with well-known calorie counts
  * "medium" - some estimation required due to vague quantities
  * "low" - significant guesswork due to missing info
- Be conservative in your estimates`;

    const ingredientList = recipe.ingredients
      .map(i => `${i.quantity || ''} ${i.unit || ''} ${i.name}`.trim())
      .join('\n');

    const userMessage = `Estimate calories for this recipe:

Title: ${recipe.title}
Servings: ${recipe.servings || 'unknown'}

Ingredients:
${ingredientList}`;

    try {
      const response = await this.sendMessage(userMessage, systemPrompt);
      let jsonStr = response.trim();

      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      return JSON.parse(jsonStr);
    } catch (error) {
      throw new Error(`Calorie estimation failed: ${error.message}`);
    }
  }
}

module.exports = ClaudeService;

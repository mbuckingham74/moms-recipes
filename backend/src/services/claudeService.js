const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

class ClaudeService {
  /**
   * Send a message to Claude and get response
   * @param {string} userMessage - The message/prompt to send
   * @param {string} systemPrompt - System prompt (optional)
   * @param {string} model - Claude model to use
   * @returns {Promise<string>} - Claude's response
   */
  static async sendMessage(userMessage, systemPrompt = '', model = 'claude-sonnet-4-5-20250929') {
    try {
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

      const message = await anthropic.messages.create(params);

      // Extract text from response
      if (message.content && message.content.length > 0) {
        return message.content[0].text;
      }

      throw new Error('No response from Claude');
    } catch (error) {
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
    const systemPrompt = `You are a recipe parsing assistant. Your job is to extract structured recipe information from unstructured text.

IMPORTANT: You must respond with ONLY valid JSON. No markdown code blocks, no explanations, just pure JSON.

The JSON structure should be:
{
  "title": "Recipe name",
  "source": "Where the recipe came from (cookbook, website, person, etc.)",
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
}

module.exports = ClaudeService;

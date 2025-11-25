const SettingsModel = require('../models/settingsModel');

// Lazy-loaded provider clients
let anthropicClient = null;
let openaiClient = null;
let googleClient = null;

// Provider-specific client initialization
const getAnthropicClient = (apiKey) => {
  if (!anthropicClient || anthropicClient._apiKey !== apiKey) {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey });
    anthropicClient._apiKey = apiKey;
  }
  return anthropicClient;
};

const getOpenAIClient = (apiKey) => {
  if (!openaiClient || openaiClient._apiKey !== apiKey) {
    const OpenAI = require('openai');
    openaiClient = new OpenAI({ apiKey });
    openaiClient._apiKey = apiKey;
  }
  return openaiClient;
};

const getGoogleClient = (apiKey) => {
  if (!googleClient || googleClient._apiKey !== apiKey) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    googleClient = new GoogleGenerativeAI(apiKey);
    googleClient._apiKey = apiKey;
  }
  return googleClient;
};

class AIService {
  /**
   * Check if AI features are available
   */
  static async isAvailable() {
    const apiKey = await SettingsModel.getActiveApiKey();
    return !!apiKey;
  }

  /**
   * Get current AI configuration info
   */
  static async getConfig() {
    return await SettingsModel.getAIConfig();
  }

  /**
   * Send a message to the configured AI provider
   * @param {string} userMessage - The user message/prompt
   * @param {string} systemPrompt - System instructions
   * @returns {Promise<string>} - AI response text
   */
  static async sendMessage(userMessage, systemPrompt = '') {
    const config = await SettingsModel.getAIConfig();
    const apiKey = await SettingsModel.getActiveApiKey();

    if (!apiKey) {
      throw new Error('AI is not configured. Please set up an API key in Admin Settings.');
    }

    const { provider, model } = config;

    try {
      switch (provider) {
        case 'anthropic':
          return await this._sendAnthropicMessage(apiKey, model, userMessage, systemPrompt);
        case 'openai':
          return await this._sendOpenAIMessage(apiKey, model, userMessage, systemPrompt);
        case 'google':
          return await this._sendGoogleMessage(apiKey, model, userMessage, systemPrompt);
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (error) {
      // Provide helpful error messages
      if (error.status === 401 || error.message?.includes('401') || error.message?.includes('API key')) {
        throw new Error(`Invalid API key for ${config.providerName}. Please check your API key configuration.`);
      }
      if (error.status === 400 && error.message?.includes('model')) {
        throw new Error(`Invalid model "${model}". Please check available models for ${config.providerName}.`);
      }
      throw new Error(`AI error (${config.providerName}): ${error.message}`);
    }
  }

  /**
   * Send message via Anthropic Claude
   */
  static async _sendAnthropicMessage(apiKey, model, userMessage, systemPrompt) {
    const client = getAnthropicClient(apiKey);

    const params = {
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: userMessage }]
    };

    if (systemPrompt) {
      params.system = systemPrompt;
    }

    const response = await client.messages.create(params);

    if (response.content && response.content.length > 0) {
      return response.content[0].text;
    }

    throw new Error('No response from Claude');
  }

  /**
   * Send message via OpenAI
   */
  static async _sendOpenAIMessage(apiKey, model, userMessage, systemPrompt) {
    const client = getOpenAIClient(apiKey);

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userMessage });

    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 4096
    });

    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content;
    }

    throw new Error('No response from OpenAI');
  }

  /**
   * Send message via Google Gemini
   */
  static async _sendGoogleMessage(apiKey, model, userMessage, systemPrompt) {
    const client = getGoogleClient(apiKey);
    const genModel = client.getGenerativeModel({ model });

    // Combine system prompt and user message for Gemini
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n---\n\n${userMessage}`
      : userMessage;

    const result = await genModel.generateContent(fullPrompt);
    const response = await result.response;

    return response.text();
  }

  /**
   * Test AI connection with current settings
   */
  static async testConnection() {
    const config = await SettingsModel.getAIConfig();

    if (!config.hasApiKey) {
      throw new Error('No API key configured');
    }

    const response = await this.sendMessage(
      'Respond with exactly: "Connection successful"',
      'You are a test assistant. Follow instructions exactly.'
    );

    return {
      provider: config.providerName,
      model: config.modelName,
      response: response.trim()
    };
  }

  /**
   * Parse recipe from text using AI
   * @param {string} recipeText - Raw recipe text from PDF
   * @returns {Promise<Object>} - Parsed recipe object
   */
  static async parseRecipe(recipeText) {
    if (!(await this.isAvailable())) {
      throw new Error('Recipe parsing requires AI. Please configure an API key in Admin Settings.');
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
      return this._parseJsonResponse(response, 'Recipe parsing');
    } catch (error) {
      throw new Error(`Recipe parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse recipe from unstructured web page content
   * @param {Object} pageContent - Extracted page content
   * @param {string} sourceUrl - Original URL
   * @returns {Promise<Object>} - Parsed recipe object
   */
  static async parseRecipeFromWebPage(pageContent, sourceUrl) {
    if (!(await this.isAvailable())) {
      throw new Error('Recipe parsing requires AI. Please configure an API key in Admin Settings.');
    }

    const systemPrompt = `You are a recipe parsing assistant. Your job is to extract structured recipe information from web page content.

IMPORTANT: You must respond with ONLY valid JSON. No markdown code blocks, no explanations, just pure JSON.

The JSON structure should be:
{
  "title": "Recipe name",
  "source": "Website or author name",
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
  "tags": ["tag1", "tag2"],
  "servings": <number or null>
}

Guidelines:
- Extract the recipe title (look for heading patterns, recipe name mentions)
- Set source to the website name (from hostname) or author if mentioned
- Identify the category based on the dish type
- Create a brief description summarizing what the recipe is (1-2 sentences)
- Parse ingredients carefully:
  * Separate quantity, unit, and ingredient name
  * Use "whole" or "piece" for countable items without units
  * Keep fractions as strings: "1/2", "1/4", etc.
- Extract and format instructions as numbered steps
- Generate 3-5 relevant tags based on meal type, cuisine, main ingredients, cooking method, dietary restrictions
- Extract servings/yield if mentioned
- Ignore ads, comments, navigation, and non-recipe content
- If the page doesn't appear to contain a recipe, return: {"error": "No recipe found on this page"}`;

    const userMessage = `Extract the recipe from this web page content.

Source URL: ${sourceUrl}
Website: ${pageContent.hostname}
Page Title: ${pageContent.title}

Page Content:
${pageContent.content}`;

    try {
      const response = await this.sendMessage(userMessage, systemPrompt);
      const parsed = this._parseJsonResponse(response, 'Web recipe parsing');

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      // Apply defaults
      if (!parsed.title) parsed.title = pageContent.title || 'Untitled Recipe';
      if (!parsed.source) parsed.source = pageContent.hostname;
      if (!parsed.category) parsed.category = null;
      if (!parsed.description) parsed.description = null;
      if (!Array.isArray(parsed.ingredients)) parsed.ingredients = [];
      if (!parsed.instructions) parsed.instructions = '';
      if (!Array.isArray(parsed.tags)) parsed.tags = [];

      return parsed;
    } catch (error) {
      if (error.message.includes('No recipe found')) {
        throw error;
      }
      throw new Error(`Recipe parsing failed: ${error.message}`);
    }
  }

  /**
   * Estimate calories for a recipe
   * @param {Object} recipe - Recipe with ingredients
   * @returns {Promise<Object>} - Calorie estimation with confidence
   */
  static async estimateCalories(recipe) {
    if (!(await this.isAvailable())) {
      throw new Error('Calorie estimation requires AI. Please configure an API key in Admin Settings.');
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
      return this._parseJsonResponse(response, 'Calorie estimation');
    } catch (error) {
      throw new Error(`Calorie estimation failed: ${error.message}`);
    }
  }

  /**
   * Parse JSON from AI response, handling markdown code blocks
   */
  static _parseJsonResponse(response, context) {
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    try {
      const parsed = JSON.parse(jsonStr);

      // Apply common defaults for recipe parsing
      if (parsed.title === undefined) parsed.title = 'Untitled Recipe';
      if (!Array.isArray(parsed.ingredients)) parsed.ingredients = [];
      if (!parsed.instructions) parsed.instructions = '';
      if (!Array.isArray(parsed.tags)) parsed.tags = [];

      return parsed;
    } catch {
      throw new Error(`${context} returned invalid JSON`);
    }
  }
}

module.exports = AIService;

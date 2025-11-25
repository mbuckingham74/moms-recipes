const SettingsModel = require('../models/settingsModel');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

/**
 * Get AI configuration
 * GET /api/admin/settings/ai
 */
exports.getAISettings = asyncHandler(async (req, res) => {
  const config = await SettingsModel.getAIConfig();

  res.json({
    success: true,
    data: config
  });
});

/**
 * Update AI configuration
 * PUT /api/admin/settings/ai
 */
exports.updateAISettings = asyncHandler(async (req, res) => {
  const { provider, model, apiKey } = req.body;

  // Validate at least one field is being updated
  if (provider === undefined && model === undefined && apiKey === undefined) {
    throw new ApiError(400, 'At least one setting must be provided');
  }

  // Validate provider if provided
  const providers = SettingsModel.getProviders();
  if (provider && !providers[provider]) {
    throw new ApiError(400, `Invalid provider. Must be one of: ${Object.keys(providers).join(', ')}`);
  }

  // Validate model belongs to provider if both provided
  if (provider && model) {
    const providerModels = providers[provider].models.map(m => m.id);
    if (!providerModels.includes(model)) {
      throw new ApiError(400, `Invalid model for ${provider}. Available models: ${providerModels.join(', ')}`);
    }
  }

  await SettingsModel.setAIConfig(
    { provider, model, apiKey },
    req.user.id
  );

  // Fetch updated config
  const config = await SettingsModel.getAIConfig();

  res.json({
    success: true,
    message: 'AI settings updated successfully',
    data: config
  });
});

/**
 * Test AI connection with current settings
 * POST /api/admin/settings/ai/test
 */
exports.testAIConnection = asyncHandler(async (req, res) => {
  const AIService = require('../services/aiService');

  try {
    const result = await AIService.testConnection();
    res.json({
      success: true,
      message: 'AI connection successful',
      data: result
    });
  } catch (error) {
    throw new ApiError(400, `AI connection failed: ${error.message}`);
  }
});

/**
 * Clear stored API key (revert to environment variable)
 * DELETE /api/admin/settings/ai/api-key
 */
exports.clearApiKey = asyncHandler(async (req, res) => {
  await SettingsModel.delete(SettingsModel.KEYS.AI_API_KEY);

  const config = await SettingsModel.getAIConfig();

  res.json({
    success: true,
    message: 'API key cleared. Will use environment variable if available.',
    data: config
  });
});

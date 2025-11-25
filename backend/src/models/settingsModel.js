const crypto = require('crypto');
const db = require('../config/database');

// Encryption key derivation from environment
const getEncryptionKey = () => {
  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('No encryption key available. Set CSRF_SECRET or JWT_SECRET.');
  }
  // Derive a 32-byte key from the secret
  return crypto.scryptSync(secret, 'settings-salt', 32);
};

// Encrypt sensitive values
const encrypt = (text) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt sensitive values
const decrypt = (encryptedText) => {
  const key = getEncryptionKey();
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// AI Provider configurations
const AI_PROVIDERS = {
  anthropic: {
    name: 'Anthropic (Claude)',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (Recommended)' },
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' }
    ],
    envKey: 'ANTHROPIC_API_KEY'
  },
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (Recommended)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
    ],
    envKey: 'OPENAI_API_KEY'
  },
  google: {
    name: 'Google (Gemini)',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Recommended)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast)' }
    ],
    envKey: 'GOOGLE_API_KEY'
  }
};

// Setting keys
const SETTING_KEYS = {
  AI_PROVIDER: 'ai_provider',
  AI_MODEL: 'ai_model',
  AI_API_KEY: 'ai_api_key'
};

class SettingsModel {
  /**
   * Get a setting value by key
   * @param {string} key - Setting key
   * @returns {Promise<string|null>} - Setting value or null
   */
  static async get(key) {
    const stmt = db.prepare(`
      SELECT setting_value, encrypted FROM settings WHERE setting_key = ?
    `);
    const row = await stmt.get(key);

    if (!row) return null;

    if (row.encrypted && row.setting_value) {
      try {
        return decrypt(row.setting_value);
      } catch {
        return null;
      }
    }

    return row.setting_value;
  }

  /**
   * Set a setting value
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   * @param {boolean} encrypted - Whether to encrypt the value
   * @param {number} userId - User who made the change
   */
  static async set(key, value, encrypted = false, userId = null) {
    const timestamp = Math.floor(Date.now() / 1000);
    const storedValue = encrypted && value ? encrypt(value) : value;

    // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert
    const stmt = db.prepare(`
      INSERT INTO settings (setting_key, setting_value, encrypted, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        encrypted = VALUES(encrypted),
        updated_at = VALUES(updated_at),
        updated_by = VALUES(updated_by)
    `);

    await stmt.run(key, storedValue, encrypted ? 1 : 0, timestamp, userId);
  }

  /**
   * Delete a setting
   * @param {string} key - Setting key
   */
  static async delete(key) {
    const stmt = db.prepare(`DELETE FROM settings WHERE setting_key = ?`);
    await stmt.run(key);
  }

  /**
   * Get AI configuration
   * Returns the configured AI provider, model, and API key availability
   */
  static async getAIConfig() {
    const provider = await this.get(SETTING_KEYS.AI_PROVIDER) || 'anthropic';
    const model = await this.get(SETTING_KEYS.AI_MODEL);
    const hasDbKey = !!(await this.get(SETTING_KEYS.AI_API_KEY));

    const providerConfig = AI_PROVIDERS[provider] || AI_PROVIDERS.anthropic;
    const hasEnvKey = !!process.env[providerConfig.envKey];

    // Default model for provider if not set
    const defaultModel = providerConfig.models[0]?.id;
    const activeModel = model || defaultModel;

    // Find model name
    const modelInfo = providerConfig.models.find(m => m.id === activeModel);

    return {
      provider,
      providerName: providerConfig.name,
      model: activeModel,
      modelName: modelInfo?.name || activeModel,
      hasApiKey: hasDbKey || hasEnvKey,
      keySource: hasDbKey ? 'database' : (hasEnvKey ? 'environment' : 'none'),
      availableProviders: Object.entries(AI_PROVIDERS).map(([id, config]) => ({
        id,
        name: config.name,
        models: config.models,
        hasEnvKey: !!process.env[config.envKey]
      }))
    };
  }

  /**
   * Set AI configuration
   * @param {Object} config - AI configuration
   * @param {string} config.provider - Provider ID
   * @param {string} config.model - Model ID
   * @param {string} config.apiKey - API key (optional, will be encrypted)
   * @param {number} userId - User making the change
   */
  static async setAIConfig({ provider, model, apiKey }, userId) {
    if (provider && !AI_PROVIDERS[provider]) {
      throw new Error(`Invalid AI provider: ${provider}`);
    }

    if (provider) {
      await this.set(SETTING_KEYS.AI_PROVIDER, provider, false, userId);
    }

    if (model) {
      await this.set(SETTING_KEYS.AI_MODEL, model, false, userId);
    }

    // Only update API key if explicitly provided (even if empty to clear it)
    if (apiKey !== undefined) {
      if (apiKey) {
        await this.set(SETTING_KEYS.AI_API_KEY, apiKey, true, userId);
      } else {
        await this.delete(SETTING_KEYS.AI_API_KEY);
      }
    }
  }

  /**
   * Get the active API key for the configured provider
   * Checks database first, then falls back to environment variable
   */
  static async getActiveApiKey() {
    const provider = await this.get(SETTING_KEYS.AI_PROVIDER) || 'anthropic';
    const providerConfig = AI_PROVIDERS[provider];

    // Database key takes precedence
    const dbKey = await this.get(SETTING_KEYS.AI_API_KEY);
    if (dbKey) return dbKey;

    // Fall back to environment variable
    return process.env[providerConfig?.envKey] || null;
  }

  /**
   * Get available providers configuration
   */
  static getProviders() {
    return AI_PROVIDERS;
  }

  /**
   * Get setting keys constants
   */
  static get KEYS() {
    return SETTING_KEYS;
  }
}

module.exports = SettingsModel;

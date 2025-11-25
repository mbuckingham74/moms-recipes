import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import '../../styles/AISettings.css';

function AISettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState(null);

  // Form state
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Get CSRF token first
      await api.get('/csrf-token');

      const response = await api.get('/admin/settings/ai');
      const data = response.data.data;
      setConfig(data);
      setSelectedProvider(data.provider);
      setSelectedModel(data.model);
    } catch (err) {
      setError('Failed to load AI settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Get models for selected provider
  const getModelsForProvider = () => {
    if (!config?.availableProviders || !selectedProvider) return [];
    const provider = config.availableProviders.find(p => p.id === selectedProvider);
    return provider?.models || [];
  };

  // Handle provider change
  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    setSelectedProvider(newProvider);

    // Reset to first model of new provider
    const provider = config.availableProviders.find(p => p.id === newProvider);
    if (provider?.models?.length > 0) {
      setSelectedModel(provider.models[0].id);
    }

    // Clear API key when switching providers
    setApiKey('');
  };

  // Save settings
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      setTestResult(null);

      const payload = {
        provider: selectedProvider,
        model: selectedModel
      };

      // Only include API key if it was entered
      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      }

      await api.put('/admin/settings/ai', payload);

      setSuccess('AI settings saved successfully');
      setApiKey(''); // Clear the API key field after saving
      await loadConfig(); // Reload to get updated status
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setError('');
      setTestResult(null);

      const response = await api.post('/admin/settings/ai/test');
      setTestResult({
        success: true,
        ...response.data.data
      });
    } catch (err) {
      setTestResult({
        success: false,
        error: err.response?.data?.error || 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  // Clear stored API key
  const handleClearApiKey = async () => {
    if (!window.confirm('Clear the stored API key? The system will fall back to environment variables if configured.')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await api.delete('/admin/settings/ai/api-key');

      setSuccess('API key cleared successfully');
      await loadConfig();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clear API key');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading AI settings...</div>;
  }

  const models = getModelsForProvider();
  const currentProvider = config?.availableProviders?.find(p => p.id === selectedProvider);

  return (
    <div className="ai-settings-container">
      <div className="ai-settings-header">
        <h1>AI Settings</h1>
        <p className="subtitle">Configure the AI provider for recipe parsing and calorie estimation</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Current Status */}
      <div className="settings-panel status-panel">
        <h2 className="panel-title">Current Status</h2>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Provider</span>
            <span className="status-value">{config?.providerName}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Model</span>
            <span className="status-value">{config?.modelName}</span>
          </div>
          <div className="status-item">
            <span className="status-label">API Key Status</span>
            <span className={`status-value ${config?.hasApiKey ? 'status-ok' : 'status-warning'}`}>
              {config?.hasApiKey
                ? `Configured (${config.keySource})`
                : 'Not configured'}
            </span>
          </div>
        </div>

        {config?.hasApiKey && (
          <button
            type="button"
            className="btn btn-test"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        )}

        {testResult && (
          <div className={`test-result ${testResult.success ? 'test-success' : 'test-error'}`}>
            {testResult.success ? (
              <>
                <strong>Connection successful!</strong>
                <p>Provider: {testResult.provider}</p>
                <p>Model: {testResult.model}</p>
              </>
            ) : (
              <>
                <strong>Connection failed</strong>
                <p>{testResult.error}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="settings-panel">
        <h2 className="panel-title">Configuration</h2>

        <div className="form-group">
          <label htmlFor="provider">AI Provider</label>
          <select
            id="provider"
            value={selectedProvider}
            onChange={handleProviderChange}
            disabled={saving}
          >
            {config?.availableProviders?.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
                {provider.hasEnvKey ? ' (env key available)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="model">Model</label>
          <select
            id="model"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={saving}
          >
            {models.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <p className="form-help">
            Select the AI model to use. Faster models are cheaper but may be less accurate.
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="apiKey">
            API Key
            {currentProvider?.hasEnvKey && (
              <span className="env-badge">Environment variable available</span>
            )}
          </label>
          <div className="api-key-input">
            <input
              type={showApiKey ? 'text' : 'password'}
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.keySource === 'database'
                ? 'Enter new key to replace existing'
                : currentProvider?.hasEnvKey
                  ? 'Using environment variable (enter to override)'
                  : 'Enter API key'}
              disabled={saving}
            />
            <button
              type="button"
              className="btn-toggle-visibility"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="form-help">
            API keys are encrypted before storage. Leave blank to keep the existing key.
            {currentProvider?.hasEnvKey && config?.keySource !== 'database' && (
              <> Currently using the environment variable.</>
            )}
          </p>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {config?.keySource === 'database' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClearApiKey}
              disabled={saving}
            >
              Clear Stored API Key
            </button>
          )}
        </div>
      </form>

      {/* Help Section */}
      <div className="settings-panel help-panel">
        <h2 className="panel-title">Getting API Keys</h2>
        <div className="help-grid">
          <div className="help-item">
            <h3>Anthropic (Claude)</h3>
            <p>Get your API key from the <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic Console</a></p>
          </div>
          <div className="help-item">
            <h3>OpenAI</h3>
            <p>Get your API key from the <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></p>
          </div>
          <div className="help-item">
            <h3>Google (Gemini)</h3>
            <p>Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AISettings;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/UrlImport.css';

function UrlImport() {
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const isValidUrl = (string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!isValidUrl(url.trim())) {
      setError('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/admin/import-url', { url: url.trim() });

      if (response.data.success) {
        const extractionType = response.data.data.extractionType === 'structured'
          ? 'Found structured recipe data'
          : 'Parsed with AI';
        setSuccess(`Recipe imported successfully! (${extractionType})`);
        setUrl('');

        // Navigate to pending recipes after 2 seconds
        setTimeout(() => {
          navigate('/admin/pending');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import recipe. Please check the URL and try again.');
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin');
  };

  return (
    <div className="url-import-container">
      <div className="url-import-header">
        <h1>Import Recipe from URL</h1>
        <p className="subtitle">Paste a link to a recipe page and we'll automatically extract the recipe information</p>
      </div>

      <div className="import-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="url-input" className="url-label">Recipe URL</label>
            <div className="url-input-wrapper">
              <span className="url-icon">🔗</span>
              <input
                id="url-input"
                type="text"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://example.com/recipe/delicious-cookies"
                disabled={importing}
                className="url-input"
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <span className="success-icon">✓</span>
              {success}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={importing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!url.trim() || importing}
            >
              {importing ? (
                <>
                  <span className="spinner-small"></span>
                  Importing...
                </>
              ) : (
                'Import Recipe'
              )}
            </button>
          </div>
        </form>

        <div className="import-info">
          <h3>How it works:</h3>
          <ol>
            <li>Paste a URL to any recipe page</li>
            <li>Our system will fetch and analyze the page</li>
            <li>Recipe data is automatically extracted (works best with popular recipe sites)</li>
            <li>Review and approve the recipe before it appears in your collection</li>
          </ol>
          <div className="import-tips">
            <h4>Tips for best results:</h4>
            <ul>
              <li>Use direct links to individual recipe pages</li>
              <li>Most popular recipe sites (AllRecipes, Food Network, etc.) work great</li>
              <li>Sites with structured recipe data provide the most accurate results</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UrlImport;

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/PendingRecipeReview.css';

function PendingRecipeReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadPendingRecipe = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/admin/pending-recipes/${id}`);
      setRecipe(response.data?.data || null);
    } catch (err) {
      setError('Failed to load pending recipe');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPendingRecipe();
  }, [loadPendingRecipe]);

  const handleChange = (field, value) => {
    setRecipe(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      await api.put(`/admin/pending-recipes/${id}`, {
        title: recipe.title,
        category: recipe.category,
        description: recipe.description,
        ingredients_text: recipe.ingredients_text,
        instructions_text: recipe.instructions_text
      });

      alert('Changes saved successfully!');
    } catch (err) {
      setError('Failed to save changes');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this recipe? It will be added to the main collection.')) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await api.post(`/admin/pending-recipes/${id}/approve`);

      alert('Recipe approved and added to collection!');
      navigate('/admin/pending');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve recipe');
      console.error(err);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this pending recipe? This cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/admin/pending-recipes/${id}`);
      navigate('/admin/pending');
    } catch (err) {
      alert('Failed to delete recipe');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="review-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="review-container">
        <div className="error-state">
          <h2>Recipe Not Found</h2>
          <Link to="/admin/pending" className="btn btn-primary">
            Back to Pending Recipes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="review-container">
      <div className="review-header">
        <h1>Review Recipe</h1>
        <p className="subtitle">Review and edit the recipe before approving</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="review-content">
        <div className="source-info">
          <div className="info-label">Original PDF:</div>
          <div className="info-value">{recipe.original_name}</div>
        </div>

        <div className="form-section">
          <label className="form-label">
            Recipe Title *
            <input
              type="text"
              className="form-input"
              value={recipe.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter recipe title"
            />
          </label>
        </div>

        <div className="form-section">
          <label className="form-label">
            Category
            <input
              type="text"
              className="form-input"
              value={recipe.category || ''}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="e.g., Desserts, Main Courses, Appetizers"
            />
          </label>
        </div>

        <div className="form-section">
          <label className="form-label">
            Description
            <textarea
              className="form-textarea"
              value={recipe.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the recipe"
              rows="3"
            />
          </label>
        </div>

        <div className="form-section">
          <label className="form-label">
            Ingredients *
            <textarea
              className="form-textarea"
              value={recipe.ingredients_text || ''}
              onChange={(e) => handleChange('ingredients_text', e.target.value)}
              placeholder="One ingredient per line"
              rows="10"
            />
          </label>
          <p className="form-hint">Enter each ingredient on a separate line</p>
        </div>

        <div className="form-section">
          <label className="form-label">
            Instructions *
            <textarea
              className="form-textarea"
              value={recipe.instructions_text || ''}
              onChange={(e) => handleChange('instructions_text', e.target.value)}
              placeholder="One step per line"
              rows="10"
            />
          </label>
          <p className="form-hint">Enter each instruction step on a separate line</p>
        </div>

        <div className="action-buttons">
          <button
            onClick={handleDelete}
            className="btn btn-danger"
            disabled={saving}
          >
            Delete
          </button>
          <div className="action-buttons-right">
            <button
              onClick={handleSave}
              className="btn btn-outline"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleApprove}
              className="btn btn-success"
              disabled={saving || !recipe.title || !recipe.ingredients_text || !recipe.instructions_text}
            >
              {saving ? 'Approving...' : 'Approve & Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PendingRecipeReview;

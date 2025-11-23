import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/PendingRecipes.css';

function PendingRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPendingRecipes();
  }, []);

  const loadPendingRecipes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/pending-recipes');
      setRecipes(response.data?.data || []);
    } catch (err) {
      setError('Failed to load pending recipes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pending recipe?')) {
      return;
    }

    try {
      await api.delete(`/admin/pending-recipes/${id}`);
      setRecipes(recipes.filter(recipe => recipe.id !== id));
    } catch (err) {
      alert('Failed to delete recipe');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="pending-recipes-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading pending recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pending-recipes-container">
      <div className="pending-header">
        <div>
          <h1>Pending Recipes</h1>
          <p className="subtitle">Review and approve recipes before they appear in the collection</p>
        </div>
        <Link to="/admin" className="btn btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      {recipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h2>No Pending Recipes</h2>
          <p>Upload a PDF to start parsing recipes</p>
          <Link to="/admin/upload" className="btn btn-primary">
            Upload PDF
          </Link>
        </div>
      ) : (
        <div className="pending-grid">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="pending-card">
              <div className="pending-card-header">
                <h3>{recipe.title || 'Untitled Recipe'}</h3>
                <span className="recipe-badge">Pending</span>
              </div>

              <div className="pending-card-body">
                <div className="recipe-meta">
                  <div className="meta-item">
                    <span className="meta-label">Source:</span>
                    <span className="meta-value">{recipe.original_name}</span>
                  </div>
                  {recipe.category && (
                    <div className="meta-item">
                      <span className="meta-label">Category:</span>
                      <span className="meta-value">{recipe.category}</span>
                    </div>
                  )}
                  {recipe.ingredients_text && (
                    <div className="meta-item">
                      <span className="meta-label">Ingredients:</span>
                      <span className="meta-value">
                        {recipe.ingredients_text.split('\n').length} items
                      </span>
                    </div>
                  )}
                </div>

                {recipe.description && (
                  <p className="recipe-description">
                    {recipe.description.length > 150
                      ? `${recipe.description.substring(0, 150)}...`
                      : recipe.description}
                  </p>
                )}
              </div>

              <div className="pending-card-actions">
                <button
                  onClick={() => handleDelete(recipe.id)}
                  className="btn btn-danger btn-small"
                >
                  Delete
                </button>
                <Link
                  to={`/admin/pending/${recipe.id}`}
                  className="btn btn-primary btn-small"
                >
                  Review & Approve
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PendingRecipes;

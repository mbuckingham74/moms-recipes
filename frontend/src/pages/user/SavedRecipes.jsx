import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import RecipeCard from '../../components/RecipeCard';
import '../../styles/SavedRecipes.css';

function SavedRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 12,
    offset: 0,
    hasMore: false
  });

  const loadSavedRecipes = useCallback(async (offset = 0) => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/users/saved-recipes', {
        params: { limit: pagination.limit, offset }
      });

      setRecipes(response.data.recipes || []);
      setPagination({
        ...response.data.pagination,
        limit: pagination.limit
      });
    } catch (err) {
      setError('Failed to load saved recipes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    loadSavedRecipes();
  }, [loadSavedRecipes]);

  const handlePageChange = (newOffset) => {
    loadSavedRecipes(newOffset);
    window.scrollTo(0, 0);
  };

  const handleUnsave = async (recipeId, e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await api.delete(`/users/saved-recipes/${recipeId}`);
      // Remove from local state
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1
      }));
    } catch (err) {
      console.error('Failed to unsave recipe:', err);
    }
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading && recipes.length === 0) {
    return <div className="loading">Loading saved recipes...</div>;
  }

  return (
    <div className="saved-recipes-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Saved Recipes</h1>
          <p className="page-subtitle">Your collection of favorite recipes</p>
        </div>
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      {recipes.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-icon">💖</div>
          <h3>No Saved Recipes Yet</h3>
          <p>Browse recipes and click the heart icon to save your favorites here.</p>
          <Link to="/" className="btn btn-primary">Browse Recipes</Link>
        </div>
      ) : (
        <>
          <div className="recipes-count">
            {pagination.total} saved recipe{pagination.total !== 1 ? 's' : ''}
          </div>

          <div className="recipes-grid">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="saved-recipe-wrapper">
                <RecipeCard recipe={recipe} />
                <button
                  className="unsave-btn"
                  onClick={(e) => handleUnsave(recipe.id, e)}
                  title="Remove from saved"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(pagination.offset - pagination.limit)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="pagination-btn"
                disabled={!pagination.hasMore}
                onClick={() => handlePageChange(pagination.offset + pagination.limit)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SavedRecipes;

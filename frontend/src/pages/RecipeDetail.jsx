import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { recipeAPI } from '../services/api';
import { getTagClass, formatDate } from '../utils/recipeHelpers';
import './RecipeDetail.css';

function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadRecipe = useCallback(async (signal) => {
    try {
      setLoading(true);
      const response = await recipeAPI.getById(id, { signal });
      if (!signal?.aborted) {
        setRecipe(response.data.recipe);
        setError(null);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError('Recipe not found or failed to load.');
        console.error('Error loading recipe:', err);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    const abortController = new AbortController();
    loadRecipe(abortController.signal);
    return () => abortController.abort();
  }, [loadRecipe]);

  const handleDelete = async () => {
    try {
      await recipeAPI.delete(id);
      navigate('/');
    } catch (err) {
      setError('Failed to delete recipe. Please try again.');
      console.error('Error deleting recipe:', err);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container">
        <div className="error">
          <p>{error || 'Recipe not found'}</p>
          <Link to="/" className="btn btn-primary">
            Back to Recipes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-detail">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">← Back to all recipes</Link>
        </div>

        <div className="recipe-header">
          <div className="recipe-header-content">
            <h1>{recipe.title}</h1>
            {recipe.source && (
              <p className="recipe-source-detail">From: {recipe.source}</p>
            )}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="tags">
                {recipe.tags.map((tag, index) => (
                  <span key={index} className={`tag ${getTagClass(tag)}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {recipe.dateAdded && (
              <p className="recipe-date">📅 Added {formatDate(recipe.dateAdded, false)}</p>
            )}
          </div>
          <div className="recipe-actions">
            <Link to={`/edit/${recipe.id}`} className="btn btn-secondary">
              Edit Recipe
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-outline"
              style={{ borderColor: 'var(--terracotta)', color: 'var(--terracotta)' }}
            >
              Delete
            </button>
          </div>
        </div>

        {recipe.imagePath && (
          <div className="recipe-image-large">
            <img src={recipe.imagePath} alt={recipe.title} />
          </div>
        )}

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="recipe-section">
            <h2>Ingredients</h2>
            <ul className="ingredients-list">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index}>
                  {ingredient.quantity && <span className="quantity">{ingredient.quantity}</span>}
                  {ingredient.unit && <span className="unit">{ingredient.unit}</span>}
                  <span className="ingredient-name">{ingredient.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recipe.instructions && (
          <div className="recipe-section">
            <h2>Instructions</h2>
            <div className="instructions">
              {recipe.instructions}
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Recipe?</h3>
              <p>Are you sure you want to delete "{recipe.title}"? This action cannot be undone.</p>
              <div className="modal-actions">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="btn btn-primary"
                  style={{ background: 'var(--terracotta)' }}
                >
                  Delete Recipe
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipeDetail;

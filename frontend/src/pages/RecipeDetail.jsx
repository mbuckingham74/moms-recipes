import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { recipeAPI } from '../services/api';
import { getTagClass, formatDate } from '../utils/recipeHelpers';
import { useAuth } from '../contexts/AuthContext';
import './RecipeDetail.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [estimatingCalories, setEstimatingCalories] = useState(false);
  const [calorieError, setCalorieError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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

  // Check if recipe is saved by current user
  useEffect(() => {
    const checkSaved = async () => {
      if (user && !isAdmin()) {
        try {
          const response = await api.get(`/users/saved-recipes/${id}/check`);
          setIsSaved(response.data.isSaved);
        } catch (err) {
          console.error('Error checking saved status:', err);
        }
      }
    };
    checkSaved();
  }, [id, user, isAdmin]);

  const handleToggleSave = async () => {
    if (!user) return;

    try {
      setSavingRecipe(true);
      if (isSaved) {
        await api.delete(`/users/saved-recipes/${id}`);
        setIsSaved(false);
      } else {
        await api.post(`/users/saved-recipes/${id}`);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleDelete = async () => {
    // Guard against non-admin users
    if (!isAdmin()) {
      setError('You must be an admin to delete recipes.');
      setShowDeleteConfirm(false);
      return;
    }

    try {
      await recipeAPI.delete(id);
      navigate('/');
    } catch (err) {
      setError('Failed to delete recipe. Please try again.');
      console.error('Error deleting recipe:', err);
    }
  };

  const handleEstimateCalories = async () => {
    try {
      setEstimatingCalories(true);
      setCalorieError(null);
      await recipeAPI.estimateCalories(id);

      // Reload the recipe to get updated calorie data
      const updatedRecipe = await recipeAPI.getById(id);
      setRecipe(updatedRecipe.data.recipe);
    } catch (err) {
      setCalorieError(err.response?.data?.message || 'Failed to estimate calories');
      console.error('Error estimating calories:', err);
    } finally {
      setEstimatingCalories(false);
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
            {/* Save button for logged-in non-admin users */}
            {user && !isAdmin() && (
              <button
                onClick={handleToggleSave}
                disabled={savingRecipe}
                className={`btn btn-save ${isSaved ? 'saved' : ''}`}
              >
                {savingRecipe ? '...' : isSaved ? '♥ Saved' : '♡ Save'}
              </button>
            )}
            {/* Prompt to login for guests */}
            {!user && (
              <Link to="/register" className="btn btn-outline save-prompt">
                Sign up to save recipes
              </Link>
            )}
            {/* Admin actions */}
            {isAdmin() && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Recipe Images Section */}
        {(recipe.heroImage || recipe.imagePath || (recipe.images && recipe.images.length > 0)) && (
          <div className="recipe-images-section">
            {/* Hero Image */}
            <div className="recipe-image-large">
              {recipe.heroImage ? (
                <img src={`${API_BASE_URL}${recipe.heroImage}`} alt={recipe.title} />
              ) : recipe.imagePath ? (
                <img
                  src={recipe.imagePath.startsWith('http') ? recipe.imagePath : `${API_BASE_URL}${recipe.imagePath}`}
                  alt={recipe.title}
                />
              ) : recipe.images && recipe.images.length > 0 ? (
                <img
                  src={`${API_BASE_URL}/uploads/images/${recipe.images[0].filename}`}
                  alt={recipe.title}
                />
              ) : null}
            </div>

            {/* Image Gallery (if more than 1 image) */}
            {recipe.images && recipe.images.length > 1 && (
              <div className="recipe-gallery">
                {recipe.images.map((image) => (
                  <button
                    key={image.id}
                    className={`gallery-thumb ${image.isHero ? 'is-hero' : ''}`}
                    onClick={() => setSelectedImage(image)}
                    type="button"
                  >
                    <img
                      src={`${API_BASE_URL}/uploads/images/${image.filename}`}
                      alt={image.originalName}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Image Lightbox */}
        {selectedImage && (
          <div className="image-lightbox" onClick={() => setSelectedImage(null)}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="lightbox-close"
                onClick={() => setSelectedImage(null)}
                type="button"
              >
                ✕
              </button>
              <img
                src={`${API_BASE_URL}/uploads/images/${selectedImage.filename}`}
                alt={selectedImage.originalName}
              />
            </div>
          </div>
        )}

        {/* Calorie Information Section */}
        {(recipe.estimatedCalories || isAdmin()) && (
          <div className="recipe-section calorie-section">
            <h2>Nutritional Information</h2>
            {recipe.estimatedCalories ? (
              <div className="calorie-info">
                <div className="calorie-display">
                  <span className="calorie-value">~{recipe.estimatedCalories}</span>
                  <span className="calorie-label">calories per serving</span>
                  {recipe.caloriesConfidence && (
                    <span className={`confidence-badge confidence-${recipe.caloriesConfidence}`}>
                      {recipe.caloriesConfidence} confidence
                    </span>
                  )}
                </div>
                <p className="calorie-disclaimer">
                  ⓘ AI-estimated based on ingredients. Actual values may vary.
                </p>
                {isAdmin() && (
                  <button
                    onClick={handleEstimateCalories}
                    disabled={estimatingCalories}
                    className="btn btn-small btn-outline"
                  >
                    {estimatingCalories ? 'Re-estimating...' : 'Re-estimate Calories'}
                  </button>
                )}
              </div>
            ) : (
              isAdmin() && (
                <div className="calorie-estimate-prompt">
                  <p>No calorie information available for this recipe.</p>
                  <button
                    onClick={handleEstimateCalories}
                    disabled={estimatingCalories}
                    className="btn btn-primary"
                  >
                    {estimatingCalories ? 'Estimating...' : 'Estimate Calories with AI'}
                  </button>
                </div>
              )
            )}
            {calorieError && (
              <div className="error-message">{calorieError}</div>
            )}
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

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { recipeAPI } from '../services/api';
import './RecipeForm.css';

function RecipeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    source: '',
    instructions: '',
    imagePath: '',
    ingredients: [],
    tags: [],
  });

  const [ingredientInput, setIngredientInput] = useState({
    name: '',
    quantity: '',
    unit: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingRecipe, setLoadingRecipe] = useState(isEditMode);

  const loadRecipe = useCallback(async (signal) => {
    try {
      setLoadingRecipe(true);
      const response = await recipeAPI.getById(id, { signal });
      if (!signal?.aborted) {
        const recipe = response.data.recipe;
        setFormData({
          title: recipe.title || '',
          source: recipe.source || '',
          instructions: recipe.instructions || '',
          imagePath: recipe.imagePath || '',
          ingredients: recipe.ingredients || [],
          tags: recipe.tags || [],
        });
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError('Failed to load recipe. Please try again.');
        console.error('Error loading recipe:', err);
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingRecipe(false);
      }
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode) {
      const abortController = new AbortController();
      loadRecipe(abortController.signal);
      return () => abortController.abort();
    }
  }, [isEditMode, loadRecipe]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleIngredientChange = (e) => {
    const { name, value } = e.target;
    setIngredientInput((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addIngredient = () => {
    if (ingredientInput.name.trim()) {
      setFormData((prev) => ({
        ...prev,
        ingredients: [
          ...prev.ingredients,
          {
            name: ingredientInput.name.trim(),
            quantity: ingredientInput.quantity.trim(),
            unit: ingredientInput.unit.trim(),
          },
        ],
      }));
      setIngredientInput({ name: '', quantity: '', unit: '' });
    }
  };

  const removeIngredient = (index) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim().toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim().toLowerCase()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (index) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Recipe title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const recipeData = {
        ...formData,
        title: formData.title.trim(),
        source: formData.source.trim() || null,
        instructions: formData.instructions.trim() || null,
        imagePath: formData.imagePath.trim() || null,
      };

      if (isEditMode) {
        await recipeAPI.update(id, recipeData);
      } else {
        await recipeAPI.create(recipeData);
      }

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save recipe. Please try again.');
      console.error('Error saving recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loadingRecipe) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading recipe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-form-page">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">← Back to all recipes</Link>
        </div>

        <h1>{isEditMode ? 'Edit Recipe' : 'Add New Recipe'}</h1>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="recipe-form">
          <div className="form-section">
            <h2>Basic Information</h2>

            <div className="form-group">
              <label htmlFor="title">Recipe Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g., Chocolate Chip Cookies"
              />
            </div>

            <div className="form-group">
              <label htmlFor="source">Source</label>
              <input
                type="text"
                id="source"
                name="source"
                value={formData.source}
                onChange={handleChange}
                placeholder="e.g., Grandma's cookbook"
              />
            </div>

            <div className="form-group">
              <label htmlFor="imagePath">Image Path</label>
              <input
                type="text"
                id="imagePath"
                name="imagePath"
                value={formData.imagePath}
                onChange={handleChange}
                placeholder="/uploads/recipe.jpg"
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Ingredients</h2>
            <div className="ingredient-input-group">
              <input
                type="text"
                name="quantity"
                value={ingredientInput.quantity}
                onChange={handleIngredientChange}
                placeholder="Qty"
                className="ingredient-quantity"
              />
              <input
                type="text"
                name="unit"
                value={ingredientInput.unit}
                onChange={handleIngredientChange}
                placeholder="Unit"
                className="ingredient-unit"
              />
              <input
                type="text"
                name="name"
                value={ingredientInput.name}
                onChange={handleIngredientChange}
                placeholder="Ingredient name"
                className="ingredient-name"
              />
              <button
                type="button"
                onClick={addIngredient}
                className="btn btn-secondary btn-sm"
              >
                Add
              </button>
            </div>

            {formData.ingredients.length > 0 && (
              <ul className="items-list">
                {formData.ingredients.map((ingredient, index) => (
                  <li key={index}>
                    <span>
                      {ingredient.quantity && `${ingredient.quantity} `}
                      {ingredient.unit && `${ingredient.unit} `}
                      <strong>{ingredient.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="btn-remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-section">
            <h2>Tags</h2>
            <div className="tag-input-group">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="e.g., dessert, baking"
              />
              <button
                type="button"
                onClick={addTag}
                className="btn btn-secondary btn-sm"
              >
                Add Tag
              </button>
            </div>

            {formData.tags.length > 0 && (
              <div className="tags-display">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="tag tag-default">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="tag-remove"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-section">
            <h2>Instructions</h2>
            <div className="form-group">
              <textarea
                id="instructions"
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                placeholder="Enter cooking instructions..."
                rows="10"
              />
            </div>
          </div>

          <div className="form-actions">
            <Link to="/" className="btn btn-outline">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Recipe' : 'Add Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecipeForm;

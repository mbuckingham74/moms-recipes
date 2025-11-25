import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/SubmitRecipe.css';

function SubmitRecipe() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    source: '',
    instructions: '',
    servings: '',
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
  const [success, setSuccess] = useState(false);

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

      const submissionData = {
        title: formData.title.trim(),
        source: formData.source.trim() || null,
        instructions: formData.instructions.trim() || null,
        servings: formData.servings ? parseInt(formData.servings, 10) : null,
        ingredients: formData.ingredients,
        tags: formData.tags,
      };

      await api.post('/users/submissions', submissionData);
      setSuccess(true);

      // Redirect to submissions page after 2 seconds
      setTimeout(() => {
        navigate('/my-submissions');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit recipe. Please try again.');
      console.error('Error submitting recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="submit-recipe-page">
        <div className="container">
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>Recipe Submitted!</h2>
            <p>Your recipe has been submitted for review. An admin will review it shortly.</p>
            <p className="redirect-text">Redirecting to your submissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="submit-recipe-page">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/dashboard">← Back to Dashboard</Link>
        </div>

        <div className="page-intro">
          <h1>Submit a Recipe</h1>
          <p className="intro-text">
            Share your favorite recipe with the community! Once submitted, an admin will review
            your recipe before it&apos;s published to the main collection.
          </p>
        </div>

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
                placeholder="e.g., Grandma's Apple Pie"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="source">Source (optional)</label>
                <input
                  type="text"
                  id="source"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  placeholder="e.g., Family recipe, cookbook name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="servings">Servings (optional)</label>
                <input
                  type="number"
                  id="servings"
                  name="servings"
                  value={formData.servings}
                  onChange={handleChange}
                  placeholder="e.g., 4"
                  min="1"
                />
              </div>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addIngredient();
                  }
                }}
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
            <p className="section-hint">Add tags to help categorize your recipe (max 10)</p>
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
                placeholder="e.g., dessert, vegetarian"
                disabled={formData.tags.length >= 10}
              />
              <button
                type="button"
                onClick={addTag}
                className="btn btn-secondary btn-sm"
                disabled={formData.tags.length >= 10}
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
                placeholder="Enter cooking instructions step by step..."
                rows="10"
              />
            </div>
          </div>

          <div className="form-actions">
            <Link to="/dashboard" className="btn btn-outline">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Submitting...' : 'Submit Recipe for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SubmitRecipe;

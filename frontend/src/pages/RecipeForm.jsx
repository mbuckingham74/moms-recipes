import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { recipeAPI } from '../services/api';
import './RecipeForm.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function RecipeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const fileInputRef = useRef(null);

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

  // Image management state
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageError, setImageError] = useState(null);

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
        // Set images from recipe
        setImages(recipe.images || []);
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

  // Image upload handlers
  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Must be in edit mode to upload images
    if (!isEditMode) {
      setImageError('Please save the recipe first before adding images.');
      return;
    }

    setUploadingImages(true);
    setImageError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }
      // Set first image as hero if no images exist
      if (images.length === 0) {
        formData.append('isHero', 'true');
      }

      const response = await recipeAPI.uploadImages(id, formData);
      setImages((prev) => [...prev, ...response.data.images]);
    } catch (err) {
      setImageError(err.response?.data?.error || 'Failed to upload images');
      console.error('Error uploading images:', err);
    } finally {
      setUploadingImages(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSetHeroImage = async (imageId) => {
    try {
      await recipeAPI.setHeroImage(id, imageId);
      // Update local state
      setImages((prev) =>
        prev.map((img) => ({
          ...img,
          isHero: img.id === imageId,
        }))
      );
    } catch (err) {
      setImageError(err.response?.data?.error || 'Failed to set hero image');
      console.error('Error setting hero image:', err);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      await recipeAPI.deleteImage(id, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setImageError(err.response?.data?.error || 'Failed to delete image');
      console.error('Error deleting image:', err);
    }
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

  // Get image URL for display
  const getImageUrl = (image) => {
    return `${API_BASE_URL}/uploads/images/${image.filename}`;
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
          </div>

          {/* Recipe Images Section */}
          <div className="form-section">
            <h2>Recipe Images</h2>
            <p className="form-hint">
              {isEditMode
                ? 'Upload images for your recipe. The hero image will be displayed on recipe cards.'
                : 'Save the recipe first, then you can add images.'}
            </p>

            {imageError && (
              <div className="error-message" style={{ marginBottom: '1rem' }}>
                <p>{imageError}</p>
              </div>
            )}

            {isEditMode && (
              <>
                <div className="image-upload-area">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="imageUpload"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploadingImages}
                    className="file-input"
                  />
                  <label htmlFor="imageUpload" className="file-label">
                    {uploadingImages ? (
                      <>
                        <span className="spinner-small"></span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <span className="upload-icon">📷</span>
                        Click to upload images
                      </>
                    )}
                  </label>
                  <p className="file-hint">JPEG, PNG, GIF, or WebP (max 5MB each)</p>
                </div>

                {images.length > 0 && (
                  <div className="image-gallery">
                    {images.map((image) => (
                      <div
                        key={image.id}
                        className={`image-item ${image.isHero ? 'is-hero' : ''}`}
                      >
                        <img src={getImageUrl(image)} alt={image.originalName} />
                        <div className="image-overlay">
                          {image.isHero ? (
                            <span className="hero-badge">Hero</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetHeroImage(image.id)}
                              className="btn-image-action"
                              title="Set as hero image"
                            >
                              Set Hero
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(image.id)}
                            className="btn-image-delete"
                            title="Delete image"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
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

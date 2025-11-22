import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getTagClass, formatDate } from '../utils/recipeHelpers';
import './RecipeCard.css';

function RecipeCard({ recipe }) {

  return (
    <Link to={`/recipe/${recipe.id}`} className="recipe-card">
      <div className="recipe-image">
        {recipe.imagePath ? (
          <img src={recipe.imagePath} alt={recipe.title} />
        ) : (
          <div className="recipe-placeholder">🍽️</div>
        )}
      </div>
      <div className="recipe-content">
        <h3 className="recipe-title">{recipe.title}</h3>
        {recipe.source && (
          <p className="recipe-source">From: {recipe.source}</p>
        )}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="tags">
            {recipe.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className={`tag ${getTagClass(tag)}`}>
                {tag}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="tag tag-default">+{recipe.tags.length - 3}</span>
            )}
          </div>
        )}
        {recipe.dateAdded && (
          <p className="recipe-meta">📅 Added {formatDate(recipe.dateAdded)}</p>
        )}
      </div>
    </Link>
  );
}

RecipeCard.propTypes = {
  recipe: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string.isRequired,
    source: PropTypes.string,
    imagePath: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    dateAdded: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
};

export default RecipeCard;

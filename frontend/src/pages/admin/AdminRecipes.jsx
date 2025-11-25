import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/AdminRecipes.css';

function AdminRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0
  });
  const [sortBy, setSortBy] = useState('date_added');
  const [sortOrder, setSortOrder] = useState('DESC');

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/admin/recipes', {
        params: {
          limit: pagination.limit,
          offset: pagination.offset,
          sortBy,
          sortOrder
        }
      });

      setRecipes(response.data.recipes);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total
      }));
    } catch (err) {
      setError('Failed to load recipes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, sortBy, sortOrder]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSortIndicator = (column) => {
    if (sortBy !== column) return '';
    return sortOrder === 'ASC' ? ' \u2191' : ' \u2193';
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  const handlePageChange = (newPage) => {
    const newOffset = (newPage - 1) * pagination.limit;
    setPagination(prev => ({ ...prev, offset: newOffset }));
  };

  if (loading && recipes.length === 0) {
    return <div className="loading">Loading recipes...</div>;
  }

  return (
    <div className="admin-recipes-container">
      <div className="admin-recipes-header">
        <h1>All Recipes</h1>
        <p className="subtitle">{pagination.total} recipes total</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="recipes-table">
          <thead>
            <tr>
              <th
                className="sortable"
                onClick={() => handleSort('title')}
              >
                Name{getSortIndicator('title')}
              </th>
              <th>Category</th>
              <th>Main Ingredient</th>
              <th
                className="sortable"
                onClick={() => handleSort('estimated_calories')}
              >
                Calories/Serving{getSortIndicator('estimated_calories')}
              </th>
              <th
                className="sortable"
                onClick={() => handleSort('date_added')}
              >
                Date Added{getSortIndicator('date_added')}
              </th>
              <th
                className="sortable"
                onClick={() => handleSort('times_cooked')}
              >
                Times Cooked{getSortIndicator('times_cooked')}
              </th>
            </tr>
          </thead>
          <tbody>
            {recipes.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  No recipes found
                </td>
              </tr>
            ) : (
              recipes.map((recipe) => (
                <tr key={recipe.id}>
                  <td>
                    <Link to={`/recipe/${recipe.id}`} className="recipe-link">
                      {recipe.title}
                    </Link>
                  </td>
                  <td>{recipe.category || '-'}</td>
                  <td>{recipe.mainIngredient || '-'}</td>
                  <td>{recipe.estimatedCalories || '-'}</td>
                  <td>{formatDate(recipe.dateAdded)}</td>
                  <td>{recipe.timesCooked || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-small"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-small"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminRecipes;

import { useState, useEffect, useCallback, useRef } from 'react';
import { recipeAPI } from '../services/api';
import RecipeCard from '../components/RecipeCard';
import SearchBar from '../components/SearchBar';
import './Home.css';

function Home() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchMode, setSearchMode] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
  });

  // Track active search controller to abort on new search or unmount
  const searchControllerRef = useRef(null);
  // Track last search term for retry functionality
  const lastSearchTermRef = useRef('');

  const loadRecipes = useCallback(async (signal, offset = pagination.offset) => {
    try {
      setLoading(true);
      const response = await recipeAPI.getAll(
        {
          limit: pagination.limit,
          offset,
        },
        { signal }
      );
      if (!signal?.aborted) {
        setRecipes(response.data.recipes);
        setPagination((prev) => ({
          ...prev,
          offset,
          total: response.data.pagination.total,
        }));
        setError(null);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError('Failed to load recipes. Please try again.');
        console.error('Error loading recipes:', err);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [pagination.limit, pagination.offset]);

  useEffect(() => {
    if (!searchMode) {
      const abortController = new AbortController();
      loadRecipes(abortController.signal);
      return () => abortController.abort();
    }
  }, [searchMode, pagination.offset, loadRecipes]);

  const handleSearch = async (searchTerm) => {
    // Abort any existing search
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
    }

    if (!searchTerm) {
      // Clear search and reset to page 1
      searchControllerRef.current = null;
      lastSearchTermRef.current = '';
      setSearchMode(false);
      setPagination((prev) => ({ ...prev, offset: 0 }));
      // loadRecipes will be triggered by the effect when searchMode changes
      return;
    }

    const abortController = new AbortController();
    searchControllerRef.current = abortController;
    lastSearchTermRef.current = searchTerm;

    try {
      setLoading(true);
      setSearchMode(true);
      const response = await recipeAPI.search(
        {
          title: searchTerm,
          ingredient: searchTerm,
        },
        { signal: abortController.signal }
      );
      if (!abortController.signal.aborted) {
        setRecipes(response.data.recipes);
        setError(null);
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        setError('Search failed. Please try again.');
        console.error('Error searching recipes:', err);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  // Cleanup search controller on unmount
  useEffect(() => {
    return () => {
      if (searchControllerRef.current) {
        searchControllerRef.current.abort();
      }
    };
  }, []);

  const handleNextPage = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      setPagination((prev) => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
    }
  };

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      setPagination((prev) => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit),
      }));
    }
  };

  const handleRetry = () => {
    if (lastSearchTermRef.current) {
      // Retry the search
      handleSearch(lastSearchTermRef.current);
    } else {
      // Retry loading the recipe list
      loadRecipes(new AbortController().signal);
    }
  };

  return (
    <div className="home">
      <div className="hero">
        <h1>Mom's Family Recipes</h1>
        <p className="hero-subtitle">
          Search through {pagination.total} of Mom's Recipes
        </p>
        <SearchBar onSearch={handleSearch} />
      </div>

      <div className="container">
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading recipes...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={handleRetry} className="btn btn-primary">
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && recipes.length === 0 && (
          <div className="no-results">
            <p>No recipes found.</p>
            {searchMode && (
              <button
                onClick={() => handleSearch('')}
                className="btn btn-outline"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {!loading && !error && recipes.length > 0 && (
          <>
            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>

            {!searchMode && (
              <div className="pagination">
                <button
                  onClick={handlePrevPage}
                  disabled={pagination.offset === 0}
                  className="btn btn-outline"
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Showing {pagination.offset + 1} -{' '}
                  {Math.min(
                    pagination.offset + pagination.limit,
                    pagination.total
                  )}{' '}
                  of {pagination.total}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={
                    pagination.offset + pagination.limit >= pagination.total
                  }
                  className="btn btn-outline"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Home;

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../../styles/Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    totalRecipes: 0,
    pendingRecipes: 0
  });
  const [pendingRecipes, setPendingRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load recipes count
      const recipesResponse = await api.get('/recipes');
      const totalRecipes = recipesResponse.data?.recipes?.length || 0;

      // Load pending recipes
      const pendingResponse = await api.get('/admin/pending-recipes');
      const pending = pendingResponse.data?.data || [];

      setStats({
        totalRecipes,
        pendingRecipes: pending.length
      });

      setPendingRecipes(pending.slice(0, 5)); // Show only 5 most recent
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="welcome-text">Welcome, {user?.username}!</p>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>{stats.totalRecipes}</h3>
            <p>Total Recipes</p>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.pendingRecipes}</h3>
            <p>Pending Reviews</p>
          </div>
        </div>
      </div>

      <div className="actions-section">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/admin/upload" className="action-card">
            <div className="action-icon">📄</div>
            <div className="action-content">
              <h3>Upload PDF</h3>
              <p>Upload and parse recipe PDFs</p>
            </div>
          </Link>

          <Link to="/add" className="action-card">
            <div className="action-icon">✏️</div>
            <div className="action-content">
              <h3>Add Recipe</h3>
              <p>Manually create a new recipe</p>
            </div>
          </Link>

          <Link to="/admin/pending" className="action-card">
            <div className="action-icon">👁️</div>
            <div className="action-content">
              <h3>Review Pending</h3>
              <p>Review and approve parsed recipes</p>
            </div>
          </Link>
        </div>
      </div>

      {pendingRecipes.length > 0 && (
        <div className="recent-section">
          <div className="section-header">
            <h2>Recent Pending Recipes</h2>
            <Link to="/admin/pending" className="view-all-link">
              View All →
            </Link>
          </div>
          <div className="pending-list">
            {pendingRecipes.map((recipe) => (
              <div key={recipe.id} className="pending-item">
                <div className="pending-info">
                  <h3>{recipe.title || 'Untitled Recipe'}</h3>
                  <p className="pending-meta">
                    From: {recipe.original_name}
                  </p>
                </div>
                <Link
                  to={`/admin/pending/${recipe.id}`}
                  className="btn btn-small"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

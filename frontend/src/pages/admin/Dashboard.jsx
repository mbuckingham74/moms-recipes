import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../../styles/Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    totalRecipes: 0,
    pendingRecipes: 0,
    categoriesCount: 0,
    recentRecipes: 0,
    avgCalories: 0,
    recipesWithCalories: 0
  });
  const [pendingRecipes, setPendingRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Load dashboard statistics from backend
      const statsResponse = await api.get('/admin/stats');
      setStats(statsResponse.data);

      // Load pending recipes
      const pendingResponse = await api.get('/admin/pending-recipes');
      const pending = pendingResponse.data?.data || [];
      setPendingRecipes(pending.slice(0, 5)); // Show only 5 most recent
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

      <div className="metrics-panel">
        <h2 className="panel-title">Dashboard Metrics</h2>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-value">{stats.totalRecipes}</div>
            <div className="metric-label">Total Recipes</div>
          </div>

          <div className="metric-item highlight">
            <div className="metric-value">{stats.pendingRecipes}</div>
            <div className="metric-label">Pending Reviews</div>
          </div>

          <div className="metric-item">
            <div className="metric-value">{stats.categoriesCount}</div>
            <div className="metric-label">Categories</div>
          </div>

          <div className="metric-item">
            <div className="metric-value">{stats.recentRecipes}</div>
            <div className="metric-label">Added This Week</div>
          </div>

          <div className="metric-item">
            <div className="metric-value">
              {stats.avgCalories > 0 ? `~${Math.round(stats.avgCalories)}` : 'N/A'}
            </div>
            <div className="metric-label">Avg Calories/Serving</div>
          </div>

          <div className="metric-item">
            <div className="metric-value">
              {stats.totalRecipes > 0
                ? `${Math.round((stats.recipesWithCalories / stats.totalRecipes) * 100)}%`
                : '0%'
              }
            </div>
            <div className="metric-label">With Calorie Data</div>
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

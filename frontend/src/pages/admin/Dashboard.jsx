import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  const [aiConfig, setAiConfig] = useState(null);
  const [pendingRecipes, setPendingRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      // Load AI configuration
      try {
        const aiResponse = await api.get('/admin/settings/ai');
        setAiConfig(aiResponse.data.data);
      } catch {
        // AI settings may not be accessible, ignore
      }
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

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* AI Status Panel */}
      {aiConfig && (
        <div className="ai-status-panel">
          <div className="ai-status-content">
            <div className="ai-status-info">
              <span className="ai-status-label">AI Provider:</span>
              <span className="ai-status-value">{aiConfig.providerName}</span>
              <span className="ai-status-separator">|</span>
              <span className="ai-status-label">Model:</span>
              <span className="ai-status-value">{aiConfig.modelName}</span>
              <span className={`ai-status-badge ${aiConfig.hasApiKey ? 'status-active' : 'status-inactive'}`}>
                {aiConfig.hasApiKey ? 'Active' : 'Not Configured'}
              </span>
            </div>
            <Link to="/admin/settings/ai" className="ai-settings-link">
              Configure
            </Link>
          </div>
        </div>
      )}

      <div className="metrics-panel">
        <h2 className="panel-title">Dashboard Metrics</h2>
        <div className="metrics-grid">
          <Link to="/admin/recipes" className="metric-item clickable">
            <div className="metric-value">{stats.totalRecipes}</div>
            <div className="metric-label">Total Recipes</div>
          </Link>

          <Link to="/admin/pending" className="metric-item highlight clickable">
            <div className="metric-value">{stats.pendingRecipes}</div>
            <div className="metric-label">Pending Reviews</div>
          </Link>

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

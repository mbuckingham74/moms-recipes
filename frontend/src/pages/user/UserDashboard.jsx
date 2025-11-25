import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../../styles/UserDashboard.css';

function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    savedCount: 0,
    submissionsCount: 0,
    pendingCount: 0,
    approvedCount: 0
  });
  const [recentSaved, setRecentSaved] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Load all data in parallel
      const [savedResponse, submissionsResponse, countsResponse] = await Promise.all([
        api.get('/users/saved-recipes', { params: { limit: 5 } }),
        api.get('/users/submissions', { params: { limit: 5 } }),
        api.get('/users/submissions/counts')
      ]);

      setRecentSaved(savedResponse.data.recipes || []);
      setRecentSubmissions(submissionsResponse.data.submissions || []);

      // Use dedicated counts endpoint for accurate stats
      const counts = countsResponse.data.counts || {};
      setStats({
        savedCount: savedResponse.data.pagination?.total || 0,
        submissionsCount: counts.total || 0,
        pendingCount: counts.pending || 0,
        approvedCount: counts.approved || 0
      });
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

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected'
    };
    return badges[status] || 'badge-pending';
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="user-dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome, {user?.username}!</h1>
        <p className="dashboard-subtitle">Manage your saved recipes and submissions</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="metrics-panel">
        <h2 className="panel-title">Your Activity</h2>
        <div className="metrics-grid">
          <Link to="/saved-recipes" className="metric-item clickable">
            <div className="metric-value">{stats.savedCount}</div>
            <div className="metric-label">Saved Recipes</div>
          </Link>

          <Link to="/my-submissions" className="metric-item clickable">
            <div className="metric-value">{stats.submissionsCount}</div>
            <div className="metric-label">Total Submissions</div>
          </Link>

          <Link to="/my-submissions?status=pending" className="metric-item highlight clickable">
            <div className="metric-value">{stats.pendingCount}</div>
            <div className="metric-label">Pending Review</div>
          </Link>

          <Link to="/my-submissions?status=approved" className="metric-item success clickable">
            <div className="metric-value">{stats.approvedCount}</div>
            <div className="metric-label">Approved</div>
          </Link>
        </div>
      </div>

      <div className="dashboard-actions">
        <Link to="/submit-recipe" className="action-card">
          <div className="action-icon">📝</div>
          <div className="action-content">
            <h3>Submit a Recipe</h3>
            <p>Share your favorite recipe with the community</p>
          </div>
        </Link>
        <Link to="/" className="action-card">
          <div className="action-icon">🔍</div>
          <div className="action-content">
            <h3>Browse Recipes</h3>
            <p>Discover new recipes to try</p>
          </div>
        </Link>
      </div>

      {recentSaved.length > 0 && (
        <div className="recent-section">
          <div className="section-header">
            <h2>Recently Saved</h2>
            <Link to="/saved-recipes" className="view-all-link">
              View All →
            </Link>
          </div>
          <div className="saved-list">
            {recentSaved.map((recipe) => (
              <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="saved-item">
                <div className="saved-info">
                  <h3>{recipe.title}</h3>
                  {recipe.source && (
                    <p className="saved-meta">From: {recipe.source}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recentSubmissions.length > 0 && (
        <div className="recent-section">
          <div className="section-header">
            <h2>Recent Submissions</h2>
            <Link to="/my-submissions" className="view-all-link">
              View All →
            </Link>
          </div>
          <div className="submissions-list">
            {recentSubmissions.map((submission) => (
              <div key={submission.id} className="submission-item">
                <div className="submission-info">
                  <h3>{submission.title}</h3>
                  <span className={`status-badge ${getStatusBadge(submission.status)}`}>
                    {submission.status}
                  </span>
                </div>
                {submission.adminNotes && submission.status === 'rejected' && (
                  <p className="submission-notes">Note: {submission.adminNotes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {recentSaved.length === 0 && recentSubmissions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>Get Started!</h3>
          <p>Browse recipes and save your favorites, or submit your own recipe to share with the community.</p>
          <div className="empty-actions">
            <Link to="/" className="btn btn-primary">Browse Recipes</Link>
            <Link to="/submit-recipe" className="btn btn-secondary">Submit Recipe</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;

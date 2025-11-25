import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/MySubmissions.css';

function MySubmissions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false
  });

  const statusFilter = searchParams.get('status') || '';

  const loadSubmissions = useCallback(async (offset = 0) => {
    try {
      setLoading(true);
      setError('');

      const params = { limit: pagination.limit, offset };
      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await api.get('/users/submissions', { params });

      setSubmissions(response.data.submissions || []);
      setPagination({
        ...response.data.pagination,
        limit: pagination.limit
      });
    } catch (err) {
      setError('Failed to load submissions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, statusFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleStatusFilter = (status) => {
    if (status) {
      setSearchParams({ status });
    } else {
      setSearchParams({});
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this submission?')) {
      return;
    }

    try {
      await api.delete(`/users/submissions/${id}`);
      setSubmissions(prev => prev.filter(s => s.id !== id));
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1
      }));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
    } catch (err) {
      console.error('Failed to delete submission:', err);
      alert('Failed to delete submission. Only pending submissions can be deleted.');
    }
  };

  const viewDetails = async (id) => {
    try {
      const response = await api.get(`/users/submissions/${id}`);
      setSelectedSubmission(response.data.submission);
    } catch (err) {
      console.error('Failed to load submission details:', err);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected'
    };
    return badges[status] || 'badge-pending';
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading && submissions.length === 0) {
    return <div className="loading">Loading submissions...</div>;
  }

  return (
    <div className="my-submissions-container">
      <div className="page-header">
        <div className="header-content">
          <h1>My Submissions</h1>
          <p className="page-subtitle">Track the status of your submitted recipes</p>
        </div>
        <div className="header-actions">
          <Link to="/submit-recipe" className="btn btn-primary">
            + Submit New Recipe
          </Link>
        </div>
      </div>

      <div className="filters">
        <button
          className={`filter-btn ${!statusFilter ? 'active' : ''}`}
          onClick={() => handleStatusFilter('')}
        >
          All
        </button>
        <button
          className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => handleStatusFilter('pending')}
        >
          Pending
        </button>
        <button
          className={`filter-btn ${statusFilter === 'approved' ? 'active' : ''}`}
          onClick={() => handleStatusFilter('approved')}
        >
          Approved
        </button>
        <button
          className={`filter-btn ${statusFilter === 'rejected' ? 'active' : ''}`}
          onClick={() => handleStatusFilter('rejected')}
        >
          Rejected
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="submissions-layout">
        <div className="submissions-list-panel">
          {submissions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>No Submissions Yet</h3>
              <p>Submit your first recipe to see it here!</p>
              <Link to="/submit-recipe" className="btn btn-primary">
                Submit a Recipe
              </Link>
            </div>
          ) : (
            <>
              <div className="submissions-count">
                {pagination.total} submission{pagination.total !== 1 ? 's' : ''}
                {statusFilter && ` (${statusFilter})`}
              </div>

              <div className="submissions-list">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className={`submission-card ${selectedSubmission?.id === submission.id ? 'selected' : ''}`}
                    onClick={() => viewDetails(submission.id)}
                  >
                    <div className="submission-header">
                      <h3>{submission.title}</h3>
                      <span className={`status-badge ${getStatusBadge(submission.status)}`}>
                        {submission.status}
                      </span>
                    </div>
                    <div className="submission-meta">
                      <span>Submitted {formatDate(submission.createdAt)}</span>
                      {submission.source && <span>• {submission.source}</span>}
                    </div>
                    {submission.status === 'pending' && (
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(submission.id);
                        }}
                        title="Delete submission"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => loadSubmissions(pagination.offset - pagination.limit)}
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    disabled={!pagination.hasMore}
                    onClick={() => loadSubmissions(pagination.offset + pagination.limit)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {selectedSubmission && (
          <div className="submission-detail-panel">
            <div className="detail-header">
              <h2>{selectedSubmission.title}</h2>
              <span className={`status-badge ${getStatusBadge(selectedSubmission.status)}`}>
                {selectedSubmission.status}
              </span>
            </div>

            {selectedSubmission.source && (
              <p className="detail-source">Source: {selectedSubmission.source}</p>
            )}

            {selectedSubmission.servings && (
              <p className="detail-servings">Servings: {selectedSubmission.servings}</p>
            )}

            {selectedSubmission.adminNotes && (
              <div className={`admin-notes ${selectedSubmission.status === 'rejected' ? 'rejected' : ''}`}>
                <h4>Admin Notes:</h4>
                <p>{selectedSubmission.adminNotes}</p>
                {selectedSubmission.reviewerUsername && (
                  <span className="reviewer">
                    Reviewed by {selectedSubmission.reviewerUsername}
                  </span>
                )}
              </div>
            )}

            {selectedSubmission.ingredients && selectedSubmission.ingredients.length > 0 && (
              <div className="detail-section">
                <h4>Ingredients</h4>
                <ul className="ingredients-list">
                  {selectedSubmission.ingredients.map((ing, index) => (
                    <li key={index}>
                      {ing.quantity && `${ing.quantity} `}
                      {ing.unit && `${ing.unit} `}
                      {ing.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedSubmission.tags && selectedSubmission.tags.length > 0 && (
              <div className="detail-section">
                <h4>Tags</h4>
                <div className="tags-list">
                  {selectedSubmission.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedSubmission.instructions && (
              <div className="detail-section">
                <h4>Instructions</h4>
                <div className="instructions-text">
                  {selectedSubmission.instructions}
                </div>
              </div>
            )}

            <button
              className="close-detail-btn"
              onClick={() => setSelectedSubmission(null)}
            >
              Close
            </button>
          </div>
        )}
      </div>

      <div className="back-link-container">
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default MySubmissions;

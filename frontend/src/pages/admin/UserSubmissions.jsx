import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/UserSubmissions.css';

function UserSubmissions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
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

      const response = await api.get('/admin/submissions', { params });

      setSubmissions(response.data.submissions || []);
      setPagination({
        ...response.data.pagination,
        limit: pagination.limit
      });

      // Also get pending count
      const countResponse = await api.get('/admin/submissions/count');
      setPendingCount(countResponse.data.count);
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
    setSelectedSubmission(null);
  };

  const loadSubmissionDetail = async (id) => {
    try {
      setLoadingDetail(true);
      const response = await api.get(`/admin/submissions/${id}`);
      setSelectedSubmission(response.data.submission);
    } catch (err) {
      console.error('Failed to load submission details:', err);
      setError('Failed to load submission details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    try {
      setActionLoading(true);
      const response = await api.post(`/admin/submissions/${selectedSubmission.id}/approve`, {
        notes: approveNotes || null
      });

      // Show success and redirect info
      alert(`Recipe approved and published! Recipe ID: ${response.data.recipeId}`);

      // Reload submissions
      setSelectedSubmission(null);
      setApproveNotes('');
      loadSubmissions(pagination.offset);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve submission');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || !rejectNotes.trim()) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/submissions/${selectedSubmission.id}/reject`, {
        notes: rejectNotes
      });

      // Close modal and reload
      setShowRejectModal(false);
      setSelectedSubmission(null);
      setRejectNotes('');
      loadSubmissions(pagination.offset);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject submission');
      console.error(err);
    } finally {
      setActionLoading(false);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading && submissions.length === 0) {
    return <div className="loading">Loading submissions...</div>;
  }

  return (
    <div className="user-submissions-admin">
      <div className="page-header">
        <h1>User Submitted Recipes</h1>
        {pendingCount > 0 && (
          <span className="pending-badge">{pendingCount} pending review</span>
        )}
      </div>

      <div className="filters">
        <button
          className={`filter-btn ${!statusFilter ? 'active' : ''}`}
          onClick={() => handleStatusFilter('')}
        >
          All ({pagination.total})
        </button>
        <button
          className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => handleStatusFilter('pending')}
        >
          Pending ({pendingCount})
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
              <h3>No Submissions</h3>
              <p>
                {statusFilter
                  ? `No ${statusFilter} submissions found.`
                  : 'No recipe submissions yet.'}
              </p>
            </div>
          ) : (
            <>
              <div className="submissions-list">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className={`submission-card ${selectedSubmission?.id === submission.id ? 'selected' : ''}`}
                    onClick={() => loadSubmissionDetail(submission.id)}
                  >
                    <div className="submission-header">
                      <h3>{submission.title}</h3>
                      <span className={`status-badge ${getStatusBadge(submission.status)}`}>
                        {submission.status}
                      </span>
                    </div>
                    <div className="submission-meta">
                      <span>By: {submission.submitterUsername}</span>
                      <span>• {formatDate(submission.createdAt)}</span>
                    </div>
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

        <div className="submission-detail-panel">
          {loadingDetail ? (
            <div className="loading">Loading details...</div>
          ) : selectedSubmission ? (
            <>
              <div className="detail-header">
                <h2>{selectedSubmission.title}</h2>
                <span className={`status-badge ${getStatusBadge(selectedSubmission.status)}`}>
                  {selectedSubmission.status}
                </span>
              </div>

              <div className="detail-meta">
                <p><strong>Submitted by:</strong> {selectedSubmission.submitterUsername}</p>
                <p><strong>Submitted:</strong> {formatDate(selectedSubmission.createdAt)}</p>
                {selectedSubmission.source && (
                  <p><strong>Source:</strong> {selectedSubmission.source}</p>
                )}
                {selectedSubmission.servings && (
                  <p><strong>Servings:</strong> {selectedSubmission.servings}</p>
                )}
              </div>

              {selectedSubmission.reviewerUsername && (
                <div className="review-info">
                  <p>
                    <strong>Reviewed by:</strong> {selectedSubmission.reviewerUsername}
                    {selectedSubmission.reviewedAt && (
                      <span> on {formatDate(selectedSubmission.reviewedAt)}</span>
                    )}
                  </p>
                  {selectedSubmission.adminNotes && (
                    <p><strong>Notes:</strong> {selectedSubmission.adminNotes}</p>
                  )}
                </div>
              )}

              {selectedSubmission.ingredients && selectedSubmission.ingredients.length > 0 && (
                <div className="detail-section">
                  <h4>Ingredients ({selectedSubmission.ingredients.length})</h4>
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

              {selectedSubmission.status === 'pending' && (
                <div className="action-section">
                  <h4>Review Actions</h4>
                  <div className="approve-section">
                    <textarea
                      placeholder="Optional notes for approval..."
                      value={approveNotes}
                      onChange={(e) => setApproveNotes(e.target.value)}
                      rows={2}
                    />
                    <button
                      className="btn btn-approve"
                      onClick={handleApprove}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Processing...' : 'Approve & Publish'}
                    </button>
                  </div>
                  <button
                    className="btn btn-reject"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                  >
                    Reject Submission
                  </button>
                </div>
              )}

              {selectedSubmission.status === 'approved' && (
                <div className="approved-notice">
                  <p>This recipe has been approved and published to the collection.</p>
                  <Link to="/" className="btn btn-secondary">
                    View in Collection
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="select-prompt">
              <p>Select a submission to review</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Submission</h3>
            <p>Please provide a reason for rejecting this recipe submission:</p>
            <textarea
              placeholder="Rejection reason (required)..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNotes('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-reject"
                onClick={handleReject}
                disabled={actionLoading || !rejectNotes.trim()}
              >
                {actionLoading ? 'Rejecting...' : 'Reject Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSubmissions;

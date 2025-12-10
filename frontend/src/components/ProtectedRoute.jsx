import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, authCheckFailed, isAdmin, checkAuth } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
        fontSize: '1.2rem',
        color: '#7f8c8d'
      }}>
        Loading...
      </div>
    );
  }

  // If auth check failed due to transient error (not 401), show retry option
  // instead of redirecting to login
  if (!user && authCheckFailed) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
        gap: '1rem',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <p style={{ color: '#7f8c8d', fontSize: '1.1rem' }}>
          Unable to verify your session. This may be a temporary issue.
        </p>
        <button
          onClick={() => checkAuth()}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
        <a href="/login" style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>
          or go to login
        </a>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h1>Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <a href="/" style={{ color: '#3498db', textDecoration: 'none' }}>
          ← Back to Recipes
        </a>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;

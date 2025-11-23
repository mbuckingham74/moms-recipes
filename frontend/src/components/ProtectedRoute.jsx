import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, isAdmin } = useAuth();
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

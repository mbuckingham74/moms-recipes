import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AdminLayout.css';

function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
          <p className="welcome-text">Welcome, {user?.username}!</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">📊</span>
            <span className="sidebar-text">Dashboard</span>
          </NavLink>

          <div className="sidebar-section-title">Quick Actions</div>

          <NavLink
            to="/admin/upload"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">📄</span>
            <span className="sidebar-text">Upload PDF</span>
          </NavLink>

          <NavLink
            to="/admin/import-url"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">🔗</span>
            <span className="sidebar-text">Import from URL</span>
          </NavLink>

          <NavLink
            to="/add"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">✏️</span>
            <span className="sidebar-text">Add Recipe</span>
          </NavLink>

          <NavLink
            to="/admin/pending"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">👁️</span>
            <span className="sidebar-text">Review Pending</span>
          </NavLink>

          <div className="sidebar-section-title">Management</div>

          <NavLink
            to="/admin/recipes"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">📚</span>
            <span className="sidebar-text">All Recipes</span>
          </NavLink>

          <div className="sidebar-section-title">Settings</div>

          <NavLink
            to="/admin/settings/ai"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">🤖</span>
            <span className="sidebar-text">AI Settings</span>
          </NavLink>

          <NavLink
            to="/"
            className="sidebar-link"
          >
            <span className="sidebar-icon">🏠</span>
            <span className="sidebar-text">Home</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <span className="sidebar-icon">🚪</span>
            <span className="sidebar-text">Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;

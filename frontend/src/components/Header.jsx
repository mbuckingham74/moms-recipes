import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

function Header() {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  // Check if current page is admin dashboard or any admin page (including /add and /edit)
  const isOnAdminPage = location.pathname.startsWith('/admin') ||
    location.pathname === '/add' ||
    location.pathname.startsWith('/edit');

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="script">Mom's</span> Recipes
        </Link>
        <nav className="nav">
          <Link to="/">Browse</Link>
          {/* Only show Add Recipe to admins when NOT on admin pages (sidebar has it) */}
          {!loading && isAdmin() && !isOnAdminPage && <Link to="/add">Add Recipe</Link>}
          {/* Show login link when not logged in, or greeting when logged in */}
          {!loading && !user && <Link to="/login">Admin Login</Link>}
          {!loading && user && <span className="user-greeting">Hello, {user.username}!</span>}
          {/* Show admin dashboard link only when not loading and user is admin */}
          {!loading && isAdmin() && !isOnAdminPage && <Link to="/admin">Admin Dashboard</Link>}
        </nav>
      </div>
    </header>
  );
}

export default Header;

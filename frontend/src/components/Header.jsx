import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

function Header() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  // Check if current page is admin dashboard or any admin page
  const isOnAdminPage = location.pathname.startsWith('/admin');

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="script">Mom's</span> Recipes
        </Link>
        <nav className="nav">
          <Link to="/">Browse</Link>
          <Link to="/add">Add Recipe</Link>
          {!user && <Link to="/login">Admin Login</Link>}
          {isAdmin() && !isOnAdminPage && <Link to="/admin">Admin Dashboard</Link>}
        </nav>
      </div>
    </header>
  );
}

export default Header;

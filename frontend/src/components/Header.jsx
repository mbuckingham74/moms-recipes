import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

function Header() {
  const { user, loading, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Check if current page is admin dashboard or any admin page (including /add and /edit)
  const isOnAdminPage = location.pathname.startsWith('/admin') ||
    location.pathname === '/add' ||
    location.pathname.startsWith('/edit');

  // Check if on user pages
  const isOnUserPage = location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/saved-recipes') ||
    location.pathname.startsWith('/submit-recipe') ||
    location.pathname.startsWith('/my-submissions');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on route change - use the pathname as a key to reset the state
  const currentPath = location.pathname;
  useEffect(() => {
    // This effect runs when the path changes
    // Wrapping in setTimeout to avoid sync setState warning
    const timer = setTimeout(() => setShowUserMenu(false), 0);
    return () => clearTimeout(timer);
  }, [currentPath]);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

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

          {/* Show login/register links when not logged in */}
          {!loading && !user && (
            <>
              <Link to="/login">Sign In</Link>
              <Link to="/register" className="nav-btn-primary">Sign Up</Link>
            </>
          )}

          {/* Show user menu when logged in */}
          {!loading && user && (
            <div className="user-menu-container" ref={menuRef}>
              <button
                className="user-menu-trigger"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="user-avatar">{user.username.charAt(0).toUpperCase()}</span>
                <span className="user-name">{user.username}</span>
                <span className="dropdown-arrow">{showUserMenu ? '▲' : '▼'}</span>
              </button>

              {showUserMenu && (
                <div className="user-dropdown">
                  {!isAdmin() && (
                    <>
                      <Link to="/dashboard" className="dropdown-item">
                        My Dashboard
                      </Link>
                      <Link to="/saved-recipes" className="dropdown-item">
                        Saved Recipes
                      </Link>
                      <Link to="/submit-recipe" className="dropdown-item">
                        Submit Recipe
                      </Link>
                      <Link to="/my-submissions" className="dropdown-item">
                        My Submissions
                      </Link>
                      <div className="dropdown-divider"></div>
                    </>
                  )}
                  {isAdmin() && !isOnAdminPage && (
                    <>
                      <Link to="/admin" className="dropdown-item">
                        Admin Dashboard
                      </Link>
                      <div className="dropdown-divider"></div>
                    </>
                  )}
                  <button onClick={handleLogout} className="dropdown-item logout-btn">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick links for regular users when on user pages */}
          {!loading && user && !isAdmin() && isOnUserPage && (
            <Link to="/submit-recipe" className="nav-btn-secondary">+ Submit Recipe</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;

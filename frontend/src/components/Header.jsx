import { Link } from 'react-router-dom';
import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="script">Mom's</span> Recipes
        </Link>
        <nav className="nav">
          <Link to="/">Browse</Link>
          <Link to="/add">Add Recipe</Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;

import { Link, useLocation } from 'react-router-dom';
import { NAVIGATION } from '../../config/navigation.js';

function findLabel(path) {
  const match = NAVIGATION.find((item) => item.path === path);
  return match?.label ?? 'Page';
}

function Breadcrumb() {
  const location = useLocation();
  const currentLabel = findLabel(location.pathname);

  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb mb-0">
        <li className="breadcrumb-item">
          <Link to="/dashboard" className="text-decoration-none">
            Home
          </Link>
        </li>
        <li className="breadcrumb-item active" aria-current="page">
          {currentLabel}
        </li>
      </ol>
    </nav>
  );
}

export default Breadcrumb;

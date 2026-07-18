import { NavLink } from 'react-router-dom';
import { NAVIGATION } from '../../config/navigation.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';

// Renders recursively so a future item with a `children` array automatically gets a
// nested submenu - nothing in NAVIGATION populates one yet, but the component doesn't
// need changes when one does.
function SidebarMenu({ items = NAVIGATION }) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(ROLES.SYSTEM_ADMINISTRATOR);
  const visibleItems = items.filter((item) => !item.adminOnly || isAdmin);

  return (
    <ul className="nav flex-column">
      {visibleItems.map((item) => (
        <li className="nav-item" key={item.path}>
          <NavLink
            to={item.path}
            className={({ isActive }) =>
              `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded ${
                isActive ? 'active bg-primary text-white' : 'text-body'
              }`
            }
          >
            <i className={`bi ${item.icon} fs-5`} aria-hidden="true" />
            <span className="nav-label">{item.label}</span>
          </NavLink>

          {item.children && item.children.length > 0 && (
            <div className="ps-4">
              <SidebarMenu items={item.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default SidebarMenu;

import SidebarMenu from './SidebarMenu.jsx';

function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile }) {
  const collapsedClass = isCollapsed ? 'app-sidebar-collapsed' : '';
  const mobileOpenClass = isMobileOpen ? 'app-sidebar-mobile-open' : '';

  return (
    <>
      <aside className={`app-sidebar bg-primary-subtle border-end ${collapsedClass} ${mobileOpenClass}`}>
        <div className="p-3">
          <SidebarMenu />
        </div>
      </aside>

      {/* Mobile-only backdrop, closes the off-canvas sidebar on click */}
      <div
        className={`app-sidebar-backdrop ${isMobileOpen ? 'app-sidebar-backdrop-visible' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
    </>
  );
}

export default Sidebar;

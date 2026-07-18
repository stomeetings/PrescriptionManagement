import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopHeader from '../components/layout/TopHeader.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';

// The application shell. Rendered once as a React Router layout route (see
// AppRoutes.jsx) - every protected page renders inside <Outlet /> below, so the
// header/sidebar never re-mount or duplicate when navigating between pages.
function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  function toggleSidebar() {
    setIsSidebarCollapsed((collapsed) => !collapsed);
    setIsMobileSidebarOpen((open) => !open);
  }

  function closeMobileSidebar() {
    setIsMobileSidebarOpen(false);
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <TopHeader onToggleSidebar={toggleSidebar} />

      <div className="d-flex flex-grow-1">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />

        <main className="flex-grow-1 bg-light" style={{ minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;

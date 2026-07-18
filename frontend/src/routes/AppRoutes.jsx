import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login/LoginPage.jsx';
import DashboardPage from '../pages/Dashboard/DashboardPage.jsx';
import AccessDeniedPage from '../pages/AccessDenied/AccessDeniedPage.jsx';
import ComingSoonPage from '../pages/ComingSoon/ComingSoonPage.jsx';
import UserListPage from '../pages/UserManagement/UserListPage.jsx';
import CreateUserPage from '../pages/UserManagement/CreateUserPage.jsx';
import EditUserPage from '../pages/UserManagement/EditUserPage.jsx';
import UserDetailsPage from '../pages/UserManagement/UserDetailsPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RequireRole from './RequireRole.jsx';
import AppLayout from '../layouts/AppLayout.jsx';
import { ROLES } from '../auth/roles.js';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<ComingSoonPage title="Patients" />} />
          <Route path="/prescriptions" element={<ComingSoonPage title="Prescriptions" />} />
          <Route path="/medicines" element={<ComingSoonPage title="Medicines" />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          {/* Administrator-only: matches the sidebar's adminOnly items and the
              backend's actual role restrictions on these controllers. */}
          <Route element={<RequireRole allowedRoles={[ROLES.SYSTEM_ADMINISTRATOR]} />}>
            <Route path="/lookup-management" element={<ComingSoonPage title="Lookup Management" />} />
            <Route path="/user-management" element={<UserListPage />} />
            <Route path="/user-management/create" element={<CreateUserPage />} />
            <Route path="/user-management/:userAccountId/edit" element={<EditUserPage />} />
            <Route path="/user-management/:userAccountId" element={<UserDetailsPage />} />
            <Route path="/settings" element={<ComingSoonPage title="Settings" />} />
          </Route>

          <Route path="/reports" element={<ComingSoonPage title="Reports" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;

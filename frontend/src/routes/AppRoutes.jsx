import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login/LoginPage.jsx';
import DashboardPage from '../pages/Dashboard/DashboardPage.jsx';
import AccessDeniedPage from '../pages/AccessDenied/AccessDeniedPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;

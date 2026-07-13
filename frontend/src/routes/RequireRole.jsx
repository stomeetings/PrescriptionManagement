import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// Nest this inside <ProtectedRoute> for any future route that needs restricting to
// specific roles, e.g.:
//   <Route element={<ProtectedRoute />}>
//     <Route element={<RequireRole allowedRoles={[ROLES.DOCTOR]} />}>
//       <Route path="/prescriptions" element={<PrescriptionsPage />} />
//     </Route>
//   </Route>
// No route in the app uses this yet - no approved spec currently assigns a module to a
// specific role, so nothing is wired to it until one does.
function RequireRole({ allowedRoles }) {
  const { hasRole } = useAuth();
  const isAllowed = !allowedRoles || allowedRoles.length === 0 || hasRole(...allowedRoles);

  if (!isAllowed) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}

export default RequireRole;

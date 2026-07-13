import { useAuth } from '../../auth/AuthContext.jsx';

// Minimal redirect target only - the real Dashboard page is a separate,
// not-yet-built feature (explicitly out of scope for this step).
function DashboardPlaceholder() {
  const { user } = useAuth();

  return (
    <div className="container py-5">
      <h1>Welcome{user ? `, ${user.fullName}` : ''}</h1>
      <p className="text-muted">You are signed in.</p>
    </div>
  );
}

export default DashboardPlaceholder;

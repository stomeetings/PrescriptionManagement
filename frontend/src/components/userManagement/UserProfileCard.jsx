function getInitials(fullName) {
  if (!fullName) {
    return '?';
  }

  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || '?';
}

function UserProfileCard({ user }) {
  return (
    <div className="card border-0 shadow-sm rounded-3">
      <div className="card-body text-center py-4">
        <div
          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3"
          style={{ width: 80, height: 80, fontSize: '1.75rem', fontWeight: 600 }}
        >
          {getInitials(user.fullName)}
        </div>

        <h2 className="h5 mb-1">{user.fullName}</h2>
        <p className="text-muted mb-3">@{user.username}</p>

        <div className="d-flex justify-content-center gap-2">
          <span className="badge rounded-pill text-bg-primary">{user.role?.displayText}</span>
          <span className={`badge rounded-pill text-bg-${user.isActive ? 'success' : 'secondary'}`}>
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default UserProfileCard;

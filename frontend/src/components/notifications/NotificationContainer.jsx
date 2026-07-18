import { useNotification } from './NotificationContext.jsx';

// Bootstrap's .toast visuals, shown via the "show" class directly (React-driven, no
// bootstrap.bundle.js) - same approach already used for TopHeader's profile dropdown.
function NotificationContainer() {
  const { notifications, dismiss } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`toast show align-items-center text-bg-${notification.variant} border-0 mb-2`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="d-flex">
            <div className="toast-body">{notification.message}</div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              onClick={() => dismiss(notification.id)}
              aria-label="Close"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default NotificationContainer;

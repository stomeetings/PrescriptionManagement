import { createContext, useCallback, useContext, useState } from 'react';

const NotificationContext = createContext(undefined);

const AUTO_DISMISS_MS = 5000;
let nextNotificationId = 1;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const show = useCallback(
    (message, variant) => {
      const id = nextNotificationId++;
      setNotifications((current) => [...current, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const showSuccess = useCallback((message) => show(message, 'success'), [show]);
  const showError = useCallback((message) => show(message, 'danger'), [show]);
  const showWarning = useCallback((message) => show(message, 'warning'), [show]);

  const value = { notifications, showSuccess, showError, showWarning, dismiss };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification() {
  const context = useContext(NotificationContext);

  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }

  return context;
}

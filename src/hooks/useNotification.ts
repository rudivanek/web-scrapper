import { useState, useCallback } from 'react';

export interface NotificationState {
  type: 'success' | 'error';
  message: string;
}

export function useNotification() {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showSuccess = useCallback((message: string) => {
    setNotification({ type: 'success', message });
  }, []);

  const showError = useCallback((message: string) => {
    setNotification({ type: 'error', message });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showSuccess,
    showError,
    clearNotification,
  };
}

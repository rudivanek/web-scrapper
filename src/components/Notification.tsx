import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export interface NotificationProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Notification({ type, message, onClose, duration = 5000 }: NotificationProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="flex items-start space-x-3 p-4 shadow-lg border border-gray-300 bg-white max-w-md">
        <div className="flex-shrink-0">
          {type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-gray-600" />
          ) : (
            <XCircle className="w-5 h-5 text-gray-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 transition-colors hover:bg-gray-100 text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

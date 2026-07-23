import { X, Loader2 } from 'lucide-react';

interface LoadingModalProps {
  isOpen: boolean;
  onCancel: () => void;
  message?: string;
}

export function LoadingModal({ isOpen, onCancel, message = 'Processing...' }: LoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white border-4 border-gray-900 shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 animate-spin text-gray-600" />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-neutral-900">{message}</h3>
            <p className="text-sm text-neutral-600">This may take a few moments</p>
          </div>

          <button
            onClick={onCancel}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white  font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}

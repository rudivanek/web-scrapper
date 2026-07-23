import { useState } from 'react';
import { Key, Eye, EyeOff, X } from 'lucide-react';

interface ApiKeyModalProps {
  onKeyConfirmed: (key: string) => void;
  onSkip?: () => void;
}

export function ApiKeyModal({ onKeyConfirmed, onSkip }: ApiKeyModalProps) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      setError('Key must start with sk-ant-');
      return;
    }
    onKeyConfirmed(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white border-2 border-gray-900 shadow-2xl p-8 w-full max-w-md mx-4 relative">
        {onSkip && (
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            title="Skip and continue without API key"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-900 flex items-center justify-center flex-shrink-0">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div className="pr-8">
            <h2 className="text-xl font-bold text-gray-900">Enter Anthropic API Key</h2>
            <p className="text-sm text-gray-500 mt-0.5">Your key is only stored in memory and never saved.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={e => { setKey(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="sk-ant-..."
              autoFocus
              className="w-full px-4 py-3 pr-12 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleConfirm}
            disabled={!key.trim()}
            className="w-full py-3 bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Start Session
          </button>

          <p className="text-xs text-gray-400 text-center">
            The key is used only for AI audit calls and is discarded when you close this tab.
          </p>
        </div>
      </div>
    </div>
  );
}

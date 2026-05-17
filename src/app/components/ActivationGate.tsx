import { useState, useEffect, ReactNode } from 'react';
import { validateActivation, checkActivation, clearActivationCode, ValidationResult } from '../../utils/activation';
import { APP_VERSION } from '../../config/version';

interface ActivationGateProps {
  children: ReactNode;
}

export function ActivationGate({ children }: ActivationGateProps) {
  const [isValidated, setIsValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activationCode, setActivationCode] = useState('');
  const [error, setError] = useState('');
  const [requiresUpdate, setRequiresUpdate] = useState(false);
  const [minVersion, setMinVersion] = useState('');

  // Check for existing activation on mount
  useEffect(() => {
    async function checkExistingActivation() {
      setIsLoading(true);
      const result = await checkActivation();

      if (result.valid) {
        setIsValidated(true);
      } else if (result.requiresUpdate) {
        setRequiresUpdate(true);
        setMinVersion(result.minVersion || '');
        setError(result.error || 'Update required');
      } else {
        setError('');
      }

      setIsLoading(false);
    }

    checkExistingActivation();
  }, []);

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      setError('Please enter an activation code');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await validateActivation(activationCode.trim().toUpperCase());

    if (result.valid) {
      setIsValidated(true);
    } else if (result.requiresUpdate) {
      setRequiresUpdate(true);
      setMinVersion(result.minVersion || '');
      setError(result.error || 'Update required');
    } else {
      setError(result.error || 'Invalid activation code');
    }

    setIsLoading(false);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleClearCode = () => {
    clearActivationCode();
    setActivationCode('');
    setError('');
    setRequiresUpdate(false);
    setIsValidated(false);
  };

  // If validated, show the app
  if (isValidated) {
    return <>{children}</>;
  }

  // Show update required screen
  if (requiresUpdate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Update Required</h1>
            <p className="text-gray-600 mb-4">
              A new version of the app is available. Please close and reopen the app to update.
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-4 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Current Version:</span>
                <span className="font-mono font-semibold text-red-600">{APP_VERSION}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Required Version:</span>
                <span className="font-mono font-semibold text-green-600">{minVersion}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleReload}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Reload App
            </button>
            <p className="text-xs text-center text-gray-500">
              If installed on your home screen, close the app completely and reopen it
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show activation screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Offshore Fishing Prediction</h1>
          <p className="text-gray-600">Ocean City, MD</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Activation Code
          </label>
          <input
            type="text"
            value={activationCode}
            onChange={(e) => {
              setActivationCode(e.target.value.toUpperCase());
              setError('');
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleActivate();
              }
            }}
            placeholder="OCMD-XXXX-XXXX"
            maxLength={14}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider uppercase"
            disabled={isLoading}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <button
          onClick={handleActivate}
          disabled={isLoading || !activationCode.trim()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Validating...' : 'Activate'}
        </button>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500 mb-2">
            App Version: {APP_VERSION}
          </p>
          <p className="text-xs text-center text-gray-500">
            Contact your administrator for an activation code
          </p>
        </div>
      </div>
    </div>
  );
}
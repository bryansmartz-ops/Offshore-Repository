import { projectId, publicAnonKey } from '/utils/supabase/info';
import { APP_VERSION } from '../config/version';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8db09b0a`;

const STORAGE_KEYS = {
  ACTIVATION_CODE: 'ocmd_activation_code',
  DEVICE_ID: 'ocmd_device_id',
};

// Get or create device ID
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }

  return deviceId;
}

// Get stored activation code
export function getStoredActivationCode(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACTIVATION_CODE);
}

// Store activation code
export function storeActivationCode(code: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVATION_CODE, code);
}

// Clear activation code
export function clearActivationCode(): void {
  localStorage.removeItem(STORAGE_KEYS.ACTIVATION_CODE);
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  requiresUpdate?: boolean;
  minVersion?: string;
  currentVersion?: string;
}

// Validate activation code with backend
export async function validateActivation(activationCode: string): Promise<ValidationResult> {
  try {
    const deviceId = getDeviceId();

    const response = await fetch(`${SERVER_URL}/validate-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({
        activationCode,
        deviceId,
        appVersion: APP_VERSION
      })
    });

    const data = await response.json();

    if (data.valid) {
      // Store the code for future use
      storeActivationCode(activationCode);
    }

    return data;
  } catch (error) {
    console.error('Activation validation error:', error);
    return {
      valid: false,
      error: 'Network error - please check your connection and try again'
    };
  }
}

// Check if user has valid activation
export async function checkActivation(): Promise<ValidationResult> {
  const storedCode = getStoredActivationCode();

  if (!storedCode) {
    return {
      valid: false,
      error: 'No activation code found'
    };
  }

  return validateActivation(storedCode);
}
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Neutral storage key — no account or provider names.
const STORAGE_KEY = 'lbc-device-key';

function readStoredKey() {
  try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
}
function storeKey(key) {
  try { localStorage.setItem(STORAGE_KEY, key); } catch (_) {}
}
function clearStoredKey() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}
function generateKey() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
function getOrCreateKey() {
  const existing = readStoredKey();
  if (existing) return existing;
  const key = generateKey();
  storeKey(key);
  return key;
}

// Device verification — the browser keeps a random app-generated device key
// in local storage and the server verifies only its SHA-256 hash. All
// DeviceKey writes happen in the registerOrVerifyDevice function; this
// client never writes device records. A revoked key is dropped and this
// browser re-enrolls as a new device with a fresh key.
export function useDeviceVerification() {
  const [state, setState] = useState('checking'); // checking | verified | enrolled | error
  const [confirmationCode, setConfirmationCode] = useState(null);
  const [deviceName, setDeviceName] = useState(null);
  const [error, setError] = useState(null);

  const attempt = useCallback(async () => {
    setState('checking');
    setError(null);
    try {
      let key = getOrCreateKey();
      let res = await base44.functions.invoke('registerOrVerifyDevice', { action: 'verify', device_key: key });
      let data = res?.data || res || {};

      if (data.revoked) {
        // A revoked key can never re-verify — drop it and enroll this
        // browser as a new device with a fresh key.
        clearStoredKey();
        key = getOrCreateKey();
        res = await base44.functions.invoke('registerOrVerifyDevice', { action: 'verify', device_key: key });
        data = res?.data || res || {};
      }

      if (data.error) {
        setError(data.error);
        setState('error');
        return;
      }
      if (data.enrolled) {
        setConfirmationCode(data.confirmation_code || '');
        setDeviceName(data.device_name || 'This Device');
        setState('enrolled');
      } else if (data.verified) {
        setState('verified');
      } else {
        setError('This Device Could Not Be Verified.');
        setState('error');
      }
    } catch (err) {
      const serverError = err?.response?.data?.error || err?.data?.error || err?.error;
      setError(serverError || 'Device Verification Failed — Please Try Again.');
      setState('error');
    }
  }, []);

  useEffect(() => { attempt(); }, [attempt]);

  const dismiss = useCallback(() => setState('verified'), []);

  return { state, confirmationCode, deviceName, error, retry: attempt, dismiss };
}
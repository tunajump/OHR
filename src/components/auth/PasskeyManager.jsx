import React, { useState, useEffect, useCallback } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Smartphone, 
  Fingerprint 
} from 'lucide-react';
import { 
  getRegisteredPasskeys, 
  registerPasskey, 
  deletePasskey, 
  isPasskeySupported 
} from '../../services/passkeyService';

const PasskeyManager = () => {
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const supported = isPasskeySupported();

  const loadPasskeys = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getRegisteredPasskeys();
      setPasskeys(list || []);
    } catch (err) {
      console.warn('Could not load passkeys:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPasskeys();
  }, [loadPasskeys]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    setError('');
    setSuccess('');

    try {
      const defaultName = deviceName.trim() || (/iPhone|iPad|Mac/.test(navigator.userAgent) ? 'Apple Device (Face/Touch ID)' : /Windows/.test(navigator.userAgent) ? 'Windows Hello' : 'Biometric Security Key');
      const res = await registerPasskey(defaultName);
      setSuccess(res.message || 'Passkey registered successfully!');
      setDeviceName('');
      setShowAddModal(false);
      await loadPasskeys();
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.message || 'Passkey registration cancelled or failed.');
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this passkey?')) return;
    try {
      await deletePasskey(id);
      setSuccess('Passkey removed successfully.');
      await loadPasskeys();
    } catch (err) {
      setError('Failed to remove passkey.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">Passkeys & Biometric Security</h3>
              {passkeys.length > 0 && (
                <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                  Active ({passkeys.length})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sign in instantly using Face ID, Touch ID, Windows Hello, or hardware security keys without typing your password.
            </p>
          </div>
        </div>

        {supported && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary py-2 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs hover:shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Passkey</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {!supported && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Your current browser or device does not support WebAuthn Passkeys. Use Chrome, Safari, Edge, or Firefox on a modern device.</span>
        </div>
      )}

      {/* Passkeys List */}
      {loading ? (
        <div className="py-4 text-center text-xs text-slate-400">Loading passkeys...</div>
      ) : passkeys.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {passkeys.map((pk) => (
            <div
              key={pk.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-900">{pk.deviceName}</div>
                  <div className="text-[10px] text-slate-500">
                    Added: {new Date(pk.createdDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(pk.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                title="Remove passkey"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-500 space-y-2">
          <ShieldCheck className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="font-medium text-slate-700">No Passkeys registered yet</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Register your device to enable 1-click biometric login for maximum security.
          </p>
          {supported && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary py-1.5 px-3 text-xs font-semibold inline-flex items-center gap-1.5 mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register This Device Now</span>
            </button>
          )}
        </div>
      )}

      {/* Add Passkey Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Register New Passkey</h4>
                <p className="text-xs text-slate-500">Enable Touch ID, Face ID, Windows Hello, or Security Key</p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Device / Key Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. My iPhone / Work MacBook / YubiKey"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="input-field text-xs w-full py-2"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-blue-700" />
                  <span>What happens next:</span>
                </div>
                <p>
                  Your browser will prompt you to verify your identity with your biometric sensor (fingerprint, Face ID, or PIN).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs px-3.5 py-2"
                  disabled={registering}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="btn-primary text-xs px-4 py-2 font-semibold flex items-center gap-1.5 shadow-xs hover:shadow-sm"
                >
                  {registering ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Fingerprint className="w-4 h-4" />
                  )}
                  <span>{registering ? 'Waiting for Biometrics...' : 'Continue & Verify'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasskeyManager;

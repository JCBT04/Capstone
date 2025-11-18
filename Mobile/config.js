import Constants from 'expo-constants';

// Determine backend URL automatically when running Expo in dev mode.
// Tries a few manifest locations depending on Expo SDK/config.
function getBackendUrl() {
  try {
    const m1 = Constants.manifest && Constants.manifest.debuggerHost;
    const m2 = Constants.manifest2 && Constants.manifest2.debuggerHost;
    // expoConfig may be present in newer SDKs; some projects put extra values there
    const extraBackend = Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.BACKEND_URL;

    const debuggerHost = m1 || m2;
    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      return `http://${ip}:8000`;
    }
    if (extraBackend) return extraBackend;
  } catch (e) {
    // fallthrough to default
  }
  // Fallback - replace with your machine IP if needed
  return 'http://127.0.0.1:8000';
}

// For demo on your phone, use fixed machine IP (from your ipconfig)
// Replace this value if your PC IP changes.
export const BACKEND_URL = 'http://10.205.140.203:8000';
// Helpful debug output when running in Expo — shows in Metro/console logs
try { console.warn('[config] BACKEND_URL ->', BACKEND_URL); } catch (e) {}

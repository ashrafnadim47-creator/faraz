/* FORGE — Supabase free cloud media storage.
 * IMPORTANT: only the publishable key belongs in the app.
 * NEVER put a Supabase secret/service-role key in this file or any shipped app.
 */
export const SUPABASE_CONFIG = Object.freeze({
  url: 'https://srsnhpjsrckhhmusegak.supabase.co',
  anonKey: 'sb_publishable_JNelLm3XxjcMkwSyAvgHwA_Z_JS7hz-',
  bucket: 'forge-media',
});

function nativeAppRuntime() {
  const ua = String(globalThis.navigator?.userAgent || '');
  const electron = /Electron\//i.test(ua);
  const capacitor = Boolean(globalThis.Capacitor?.isNativePlatform?.());
  return electron || capacitor;
}

// Cloud media is intentionally disabled on ordinary browser/web pages.
// Local FORGE editing still works there; packaged/native FORGE can use cloud media.
export const SUPABASE_STORAGE_ENABLED = Boolean(
  SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey && nativeAppRuntime()
);

export function supabaseConfigured() { return SUPABASE_STORAGE_ENABLED; }
export function isNativeForgeRuntime() { return nativeAppRuntime(); }

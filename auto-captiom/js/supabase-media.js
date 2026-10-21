/* FORGE — free cloud media storage adapter.
 * Uses the existing Firebase account for authentication and a Supabase Edge
 * Function as a secure gateway. The Supabase service-role key never ships here.
 */
import { SUPABASE_CONFIG, SUPABASE_STORAGE_ENABLED, isNativeForgeRuntime } from './supabase-config.js';
import { firebaseCloud } from './firebase-cloud.js';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function endpoint(action, query = '') {
  const base = String(SUPABASE_CONFIG.url || '').replace(/\/+$/, '');
  return `${base}/functions/v1/forge-media?action=${encodeURIComponent(action)}${query}`;
}

async function request(action, options = {}, query = '') {
  if (!SUPABASE_STORAGE_ENABLED) return null;
  const token = await firebaseCloud.token();
  if (!token) throw new Error('Sign in to use cloud media storage.');
  const res = await fetch(endpoint(action, query), {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error || `Cloud storage error (${res.status})`);
  return data;
}

export const supabaseMedia = {
  enabled() { return SUPABASE_STORAGE_ENABLED && isNativeForgeRuntime(); },
  maxUploadBytes: MAX_UPLOAD_BYTES,
  async upload(file, mediaId) {
    if (!SUPABASE_STORAGE_ENABLED || !isNativeForgeRuntime()) return null;
    if (file.size > MAX_UPLOAD_BYTES) throw new Error('FREE_STORAGE_LIMIT');
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('mediaId', mediaId);
    form.append('name', file.name);
    return request('upload', { method: 'POST', body: form });
  },
  async download(path) {
    if (!SUPABASE_STORAGE_ENABLED || !isNativeForgeRuntime() || !path) return null;
    const data = await request('download', { method: 'GET' }, `&path=${encodeURIComponent(path)}`);
    if (!data?.url) return null;
    const res = await fetch(data.url);
    if (!res.ok) throw new Error(`Cloud media download failed (${res.status})`);
    return res.blob();
  },
  async remove(path) {
    if (!SUPABASE_STORAGE_ENABLED || !isNativeForgeRuntime() || !path) return false;
    await request('', { method: 'DELETE' }, `&path=${encodeURIComponent(path)}`);
    return true;
  },
};

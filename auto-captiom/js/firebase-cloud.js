/* FORGE — Firebase REST cloud layer.
 * Uses Firebase Auth + Firestore directly so the plain ES-module app does not need a bundler.
 * Media blobs remain local unless Firebase Storage is explicitly enabled/configured.
 */
import { firebaseConfig, FIREBASE_ENABLED, FIREBASE_AUTH_URL, FIREBASE_SECURE_TOKEN_URL, FIRESTORE_URL } from './firebase-config.js';

const TOKEN_KEY = 'forge.firebase.session';
const MAX_DOC_BYTES = 900 * 1024;
let session = null;

function loadSession() {
  try { session = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { session = null; }
  return session;
}
function saveSession(v) { session = v; localStorage.setItem(TOKEN_KEY, JSON.stringify(v)); }
function clearSession() { session = null; localStorage.removeItem(TOKEN_KEY); }
function isPermissionError(error) { return /permission|forbidden|403/i.test(String(error?.message || error || '')); }

function authError(data) {
  const code = data?.error?.message || data?.error?.status || 'Firebase request failed';
  const map = {
    EMAIL_EXISTS: 'An account with this email already exists.',
    EMAIL_NOT_FOUND: 'No FORGE account exists for this email.',
    INVALID_PASSWORD: 'Incorrect password.',
    INVALID_LOGIN_CREDENTIALS: 'Incorrect email or password.',
    WEAK_PASSWORD: 'Password must be at least 8 characters.',
    INVALID_EMAIL: 'Enter a valid email address.',
    USER_DISABLED: 'This account has been disabled.',
    TOKEN_EXPIRED: 'Session expired. Please sign in again.'
  };
  return new Error(map[code] || code.replaceAll('_', ' ').toLowerCase());
}
async function jsonFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw authError(data);
  return data;
}

export const firebaseCloud = {
  enabled() { return FIREBASE_ENABLED; },
  session() { return session || loadSession(); },
  async signup(email, password) {
    if (!FIREBASE_ENABLED) throw new Error('Firebase is not configured.');
    const data = await jsonFetch(`${FIREBASE_AUTH_URL}/accounts:signUp?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
      method: 'POST', body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    saveSession({ idToken: data.idToken, refreshToken: data.refreshToken, localId: data.localId, email: data.email, expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000 });
    return data;
  },
  async login(email, password) {
    if (!FIREBASE_ENABLED) throw new Error('Firebase is not configured.');
    const data = await jsonFetch(`${FIREBASE_AUTH_URL}/accounts:signInWithPassword?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
      method: 'POST', body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    saveSession({ idToken: data.idToken, refreshToken: data.refreshToken, localId: data.localId, email: data.email, expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000 });
    return data;
  },
  async refresh() {
    const s = loadSession();
    if (!s?.refreshToken) return false;
    try {
      const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: s.refreshToken });
      const res = await fetch(`${FIREBASE_SECURE_TOKEN_URL}?key=${encodeURIComponent(firebaseConfig.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      const data = await res.json();
      if (!res.ok) throw authError(data);
      saveSession({ ...s, idToken: data.id_token, refreshToken: data.refresh_token || s.refreshToken, localId: data.user_id || s.localId, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 });
      return true;
    } catch { clearSession(); return false; }
  },
  async token() {
    const s = loadSession();
    if (!s) return null;
    if (s.expiresAt && Date.now() < s.expiresAt - 60_000) return s.idToken;
    return (await this.refresh()) ? session.idToken : null;
  },
  async logout() { clearSession(); },
  async deleteAccount() {
    const token = await this.token();
    if (!token) { clearSession(); return; }
    await jsonFetch(`${FIREBASE_AUTH_URL}/accounts:delete?key=${encodeURIComponent(firebaseConfig.apiKey)}`, { method: 'POST', body: JSON.stringify({ idToken: token }) });
    clearSession();
  },
  async saveProfile(profile) {
    const token = await this.token(); if (!token || !session?.localId) return false;
    const fields = { name: { stringValue: String(profile.name || '') }, email: { stringValue: String(profile.email || '') }, updatedAt: { timestampValue: new Date().toISOString() } };
    try { await firestoreFetch(`/users/${encodeURIComponent(session.localId)}`, 'PATCH', { fields }, token); return true; }
    catch (e) { if (isPermissionError(e)) { console.warn('[forge] Firestore profile sync unavailable; local account remains active.'); return false; } throw e; }
  },
  async loadProfile(uid = session?.localId) {
    const token = await this.token(); if (!token || !uid) return null;
    try {
      const data = await firestoreFetch(`/users/${encodeURIComponent(uid)}`, 'GET', null, token);
      return { name: data?.fields?.name?.stringValue || '', email: data?.fields?.email?.stringValue || '' };
    } catch (e) { if (!/404/.test(String(e?.message || e))) console.warn('[forge] Firestore profile read skipped:', e.message); return null; }
  },
  async saveProject(project) {
    const token = await this.token(); if (!token || !session?.localId || !project?.id) return false;
    const payload = JSON.stringify(project);
    if (new TextEncoder().encode(payload).byteLength > MAX_DOC_BYTES) throw new Error('Project is too large for cloud database; media files remain local.');
    const path = `/users/${encodeURIComponent(session.localId)}/projects/${encodeURIComponent(project.id)}`;
    try { await firestoreFetch(path, 'PATCH', { fields: { payload: { stringValue: payload }, updatedAt: { timestampValue: project.updatedAt || new Date().toISOString() }, name: { stringValue: project.name || 'Untitled Project' } } }, token); return true; }
    catch (e) { if (isPermissionError(e)) return false; throw e; }
  },
  async listProjects() {
    const token = await this.token(); if (!token || !session?.localId) return [];
    const path = `/users/${encodeURIComponent(session.localId)}/projects?pageSize=100&orderBy=updatedAt%20desc`;
    try {
      const data = await firestoreFetch(path, 'GET', null, token);
      return (data?.documents || []).map(d => {
        const payload = d.fields?.payload?.stringValue; if (!payload) return null;
        try { return JSON.parse(payload); } catch { return null; }
      }).filter(Boolean);
    } catch { return []; }
  },
  async deleteProject(id) {
    const token = await this.token(); if (!token || !session?.localId || !id) return false;
    try { await firestoreFetch(`/users/${encodeURIComponent(session.localId)}/projects/${encodeURIComponent(id)}`, 'DELETE', null, token); return true; } catch { return false; }
  }
};

async function firestoreFetch(path, method, body, token) {
  const url = FIRESTORE_URL + path;
  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) {
    const refreshed = await firebaseCloud.refresh();
    if (refreshed) return firestoreFetch(path, method, body, session.idToken);
  }
  if (!res.ok) { let d = null; try { d = await res.json(); } catch {} throw new Error(d?.error?.message || `Firestore ${res.status}`); }
  if (res.status === 204) return null;
  return res.json();
}

loadSession();

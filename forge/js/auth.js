/* FORGE — Firebase-backed account system with local/offline profile fallback. */
import { idbPut, idbGet, idbGetAll, idbDelete } from './idb.js';
import { bus } from './state.js';
import { firebaseCloud } from './firebase-cloud.js';

let currentUser = null;
const PROFILE_PREFIX = 'profile:';
const text = v => String(v ?? '').trim();
const normalizeEmail = v => text(v).toLowerCase();
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

export const auth = {
  async init() {
    try {
      const s = firebaseCloud.session();
      if (s?.localId && s?.idToken) {
        const localProfile = await idbGet('users', s.localId).catch(() => null);
        const profile = localProfile || { name: s.email?.split('@')[0] || 'FORGE User', email: s.email || '' };
        currentUser = sanitize({ id: s.localId, name: profile?.name || s.email?.split('@')[0] || 'FORGE User', email: s.email || profile?.email || '' });
        bus.emit('auth:changed', currentUser);
        return currentUser;
      }
    } catch {}
    currentUser = null;
    bus.emit('auth:changed', null);
    return null;
  },
  user() { return currentUser; },
  isSignedIn() { return Boolean(currentUser); },
  async signup({ name, email, password, acceptedTerms }) {
    name = text(name); email = normalizeEmail(email); password = String(password || '');
    if (name.length < 2) throw new Error('Enter your name.');
    if (!validEmail(email)) throw new Error('Enter a valid email address.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (!acceptedTerms) throw new Error('Please accept the Terms of Service and Privacy Policy.');
    if (!firebaseCloud.enabled()) throw new Error('Firebase is not configured.');
    const data = await firebaseCloud.signup(email, password);
    currentUser = sanitize({ id: data.localId, name, email: data.email || email, createdAt: new Date().toISOString(), acceptedTermsAt: new Date().toISOString() });
    try { await firebaseCloud.saveProfile(currentUser); } catch (e) { console.warn('[forge] cloud profile save skipped:', e.message); }
    await idbPut('users', currentUser.id, { ...currentUser, localProfile: true });
    bus.emit('auth:changed', currentUser);
    return currentUser;
  },
  async login({ email, password }) {
    email = normalizeEmail(email); password = String(password || '');
    if (!validEmail(email)) throw new Error('Enter a valid email address.');
    if (!password) throw new Error('Enter your password.');
    const data = await firebaseCloud.login(email, password);
    const profile = await firebaseCloud.loadProfile(data.localId);
    currentUser = sanitize({ id: data.localId, name: profile?.name || email.split('@')[0], email: data.email || email, createdAt: profile?.createdAt, acceptedTermsAt: profile?.acceptedTermsAt });
    await idbPut('users', currentUser.id, { ...currentUser, localProfile: true });
    bus.emit('auth:changed', currentUser);
    return currentUser;
  },
  async logout() {
    await firebaseCloud.logout();
    currentUser = null;
    bus.emit('auth:changed', null);
  },
  async deleteAccount() {
    if (!currentUser) return;
    const uid = currentUser.id;
    const projects = await idbGetAll('projects');
    for (const p of projects) if (p.ownerId === uid) await idbDelete('projects', p.id);
    await firebaseCloud.deleteAccount();
    await idbDelete('users', uid);
    currentUser = null;
    bus.emit('auth:changed', null);
  }
};

function sanitize(u) {
  return u ? { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, acceptedTermsAt: u.acceptedTermsAt } : null;
}

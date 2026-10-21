/* FORGE — project mutations, persistence (IndexedDB), autosave */
import { store, bus, createEmptyProject, ensureDefaultTracks } from './state.js';
import { deepClone, debounce } from './utils.js';
import * as history from './history.js';
import { auth } from './auth.js';
import { platform } from '../platform/runtime.js';
import { idbPut, idbGet, idbGetAll, idbDelete } from './idb.js';
import { firebaseCloud } from './firebase-cloud.js';

let autosaveTimer = null;
const LOCAL_API = 'http://127.0.0.1:8787/api';

async function backendRequest(path, options = {}) {
  if (!platform.desktop) return null;
  const owner = auth.user()?.id || 'guest';
  try {
    const res = await fetch(LOCAL_API + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'X-FORGE-OWNER': owner, ...(options.headers || {}) },
    });
    if (!res.ok) return null;
    return res.status === 204 ? null : await res.json();
  } catch { return null; }
}


/**
 * Central mutation wrapper: history checkpoint + mutation + dirty flag + bus event.
 * opts: { label, event, history:false }
 */
export function commit(mutator, opts = {}) {
  const { label = 'Edit', event = 'clips:changed', useHistory = true } = opts;
  const cap = useHistory ? history.begin(label) : null;
  mutator(store.project);
  store.project.updatedAt = new Date().toISOString();
  if (cap) history.end(cap);
  markDirty();
  bus.emit(event);
}

export function markDirty() {
  setSaveState('unsaved');
  quickSave();
}

const quickSave = debounce(() => { if (store.saveState === 'unsaved' && store.project) saveProject(); }, 3500);

export function setSaveState(s) {
  if (store.saveState === s) return;
  store.saveState = s;
  bus.emit('save-state');
}

export async function saveProject() {
  if (!store.project) return;
  // A project deleted from Home must never be resurrected by autosave/debounce.
  try {
    const deleted = JSON.parse(localStorage.getItem('forge.deletedProjects') || '{}');
    if (deleted[store.project.id]) return;
  } catch {}
  setSaveState('saving');
  try {
    store.project.ownerId = auth.user()?.id || store.project.ownerId || 'guest';
    const snapshot = deepClone(store.project);
    await idbPut('projects', store.project.id, snapshot);
    // Desktop keeps a second durable copy in SQLite. IndexedDB remains the primary
    // store so Android/browser builds never depend on a Python service.
    await backendRequest('/projects/' + encodeURIComponent(store.project.id), { method: 'PUT', body: JSON.stringify({ project: snapshot }) });
    if (auth.isSignedIn() && firebaseCloud.enabled()) {
      try { await firebaseCloud.saveProject(snapshot); }
      catch (cloudError) { console.warn('[forge] cloud save skipped:', cloudError.message); bus.emit('cloud-sync-error', cloudError.message); }
    }
    setSaveState('saved');
  } catch (e) {
    console.error('[forge] save failed', e);
    setSaveState('unsaved');
    bus.emit('save-error', String(e));
  }
}

export async function listProjects() {
  try {
    const deleted = JSON.parse(localStorage.getItem('forge.deletedProjects') || '{}');
    const all = (await idbGetAll('projects')).filter(p => !deleted[p.id]);
    const uid = auth.user()?.id || 'guest';
    const remote = await backendRequest('/projects');
    if (auth.isSignedIn() && firebaseCloud.enabled()) {
      try {
        const cloud = await firebaseCloud.listProjects();
        for (const rp of cloud) {
          if (rp?.id && rp.ownerId === uid && !deleted[rp.id]) {
            const local = all.find(p => p.id === rp.id);
            if (!local || String(rp.updatedAt || '') > String(local.updatedAt || '')) await idbPut('projects', rp.id, rp);
          }
        }
      } catch (cloudError) { console.warn('[forge] cloud list skipped:', cloudError.message); }
    }
    if (Array.isArray(remote)) {
      for (const row of remote) {
        const rp = row.project;
        if (rp?.id && rp.ownerId === uid && !deleted[rp.id]) {
          const local = all.find(p => p.id === rp.id);
          if (!local || String(rp.updatedAt || '') > String(local.updatedAt || '')) {
            await idbPut('projects', rp.id, rp);
          }
        }
      }
    }
    const merged = (await idbGetAll('projects')).filter(p => !deleted[p.id]);
    // Legacy projects without an owner are claimed by the first signed-in local account.
    for (const p of merged) if (!p.ownerId) { p.ownerId = uid; await idbPut('projects', p.id, p); }
    return merged.filter(p => p.ownerId === uid).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  } catch (e) { return []; }
}

export async function loadProjectById(id) {
  const doc = await idbGet('projects', id);
  if (!doc || !doc.clips) throw new Error('invalid-project');
  store.project = doc;
  ensureDefaultTracks(store.project);
  bus.emit('project:loaded', { restore: true });
  await saveProject();
  return doc;
}

export async function deleteProjectById(id) {
  const doc = await idbGet('projects', id);
  // IndexedDB projects belong to this browser/device. Backend/cloud ownership is still enforced server-side.
  const tombstones = JSON.parse(localStorage.getItem('forge.deletedProjects') || '{}');
  tombstones[id] = Date.now();
  localStorage.setItem('forge.deletedProjects', JSON.stringify(tombstones));
  await idbDelete('projects', id);
  // If Home deleted the currently loaded project, detach it from the editor
  // so an already scheduled autosave cannot recreate it.
  if (store.project?.id === id) {
    store.project = null;
    store.saveState = 'saved';
    bus.emit('project:deleted', { id });
  }
  try { await backendRequest('/projects/' + encodeURIComponent(id), { method: 'DELETE' }); }
  catch (e) { console.warn('[forge] local project deleted; backend delete skipped:', e.message); }
  if (auth.isSignedIn() && firebaseCloud.enabled()) {
    try { await firebaseCloud.deleteProject(id); }
    catch (e) { console.warn('[forge] local project deleted; cloud delete skipped:', e.message); }
  }
}

export function newProject(name) {
  store.project = createEmptyProject(name || 'Untitled Project');
  ensureDefaultTracks(store.project);
  bus.emit('project:loaded', { fresh: true });
  saveProject();
  return store.project;
}

/** Create an in-memory project for the Home screen boot. It is not persisted until the user starts editing/saves. */
export function createDraftProject(name) {
  store.project = createEmptyProject(name || 'Untitled Project');
  ensureDefaultTracks(store.project);
  return store.project;
}

export function startAutosave() {
  if (autosaveTimer) clearInterval(autosaveTimer);
  const sec = Math.max(5, Number(store.ui.settings.autosaveInterval) || 15);
  autosaveTimer = setInterval(() => { if (store.saveState === 'unsaved') saveProject(); }, sec * 1000);
}

window.addEventListener('beforeunload', () => { if (store.saveState === 'unsaved' && store.project) saveProject(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && store.saveState === 'unsaved') saveProject(); });

export const RESOLUTION_PRESETS = [
  { label: '1920 × 1080 — Landscape HD', w: 1920, h: 1080, aspect: '16:9' },
  { label: '1280 × 720 — Landscape', w: 1280, h: 720, aspect: '16:9' },
  { label: '1080 × 1920 — Portrait', w: 1080, h: 1920, aspect: '9:16' },
  { label: '1080 × 1080 — Square', w: 1080, h: 1080, aspect: '1:1' },
  { label: '1080 × 1350 — Portrait 4:5', w: 1080, h: 1350, aspect: '4:5' },
];
export const FPS_OPTIONS = [24, 25, 30, 50, 60];
export const ASPECTS = ['16:9', '9:16', '1:1', '4:5'];

export function applyProjectSettings(w, h, fps, aspect) {
  commit(p => {
    p.settings.width = Math.round(w);
    p.settings.height = Math.round(h);
    if (fps) p.settings.fps = fps;
    if (aspect) p.settings.aspect = aspect;
  }, { label: 'Project settings', event: 'project:settings' });
}

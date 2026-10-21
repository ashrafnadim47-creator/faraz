/* FORGE — central store, project data model, model helpers */
import { Emitter, uid, clamp } from './utils.js';

export const bus = new Emitter();

export const store = {
  project: null,
  ui: {
    pxPerSec: 60,
    snap: true,
    activeTab: 'media',
    selection: [],            // array of clip ids
    selectedTransitionClip: null, // clip id whose transitionIn is being inspected
    playbackRate: 1,
    previewZoom: 'fit',
    previewVolume: 1,
    currentTime: 0,
    activeTrackId: null,
    panels: { left: 300, right: 320, timeline: 300 },
    panelsCollapsed: false,
    settings: { theme: 'forge-dark', autosaveInterval: 15, previewQuality: '1', tooltips: true, exportFormat: 'auto', exportQuality: 'high' },
  },
  saveState: 'unsaved',
};

export function createEmptyProject(name = 'Untitled Project') {
  return {
    id: uid(), ownerId: 'guest', name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    settings: { width: 1920, height: 1080, fps: 30, aspect: '16:9', background: '#000000' },
    media: [], tracks: [], clips: [], markers: [], bins: [{ id: 'root', name: 'Project', parentId: null }], sequences: [], groups: [], compounds: [], adjustmentLayers: [], inOut: { in: null, out: null }, renderQueue: [], mediaSettings: { proxyEnabled: false, proxyDirectory: '', cacheDirectory: '' }, version: 2,
  };
}
export function createTrack(kind, name) {
  return { id: uid(), kind, name: name || (kind === 'video' ? 'Video' : 'Audio'), height: kind === 'video' ? 72 : 56, locked: false, hidden: false, muted: false, solo: false, volume: 1, targeted: false };
}
export function defaultTransform() { return { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }; }
export function defaultFilters() { return { brightness: 100, contrast: 100, saturation: 100, exposure: 100, blur: 0, grayscale: 0, sepia: 0, hue: 0 }; }
export function defaultText() {
  return {
    content: 'Your Text', family: 'Arial', size: 72, bold: true, italic: false, underline: false,
    align: 'center', color: '#FFFFFF', background: 'transparent', strokeWidth: 0, strokeColor: '#000000',
    shadow: false, letterSpacing: 0, lineHeight: 1.2,
  };
}
export function createClip(partial = {}) {
  return {
    id: uid(), trackId: null, mediaId: null, type: 'video', name: 'Clip',
    start: 0, duration: 5, sourceStart: 0, sourceDuration: 5, speed: 1,
    transform: defaultTransform(), crop: { l: 0, t: 0, r: 0, b: 0 },
    filters: defaultFilters(), effects: [], keyframes: {},
    volume: 1, muted: false, fadeIn: 0, fadeOut: 0, audioEffects: [], audioAutomation: [], audioDucking: null, separation: null,
    text: null, sticker: null, caption: false, missing: false,
    transitionIn: null, groupId: null, linkGroupId: null, compoundId: null, sequenceId: null, adjustment: false, mask: null, chromaKey: null, proxyMediaId: null,
    ...partial,
  };
}

/* ---------- lookups ---------- */
export const getProject = () => store.project;
export const getClip = id => store.project?.clips.find(c => c.id === id) || null;
export const getTrack = id => store.project?.tracks.find(t => t.id === id) || null;
export const getMedia = id => store.project?.media.find(m => m.id === id) || null;
export const trackClips = trackId => store.project ? store.project.clips.filter(c => c.trackId === trackId).sort((a, b) => a.start - b.start) : [];
export const selectedClips = () => store.ui.selection.map(getClip).filter(Boolean);
export const clipsAtPlayhead = (time = store.ui.currentTime || 0) => (store.project?.clips || []).filter(c => activeAt(c, time));
export function bestClipTarget({ includeAudio = false, time = store.ui.currentTime || 0 } = {}) {
  const selected = selectedClips().filter(c => includeAudio || c.type !== 'audio');
  if (selected.length) return selected[0];
  const active = clipsAtPlayhead(time).filter(c => includeAudio || c.type !== 'audio');
  if (active.length) return active[0];
  return (store.project?.clips || []).find(c => includeAudio || c.type !== 'audio') || null;
}
export const videoTracks = () => store.project ? store.project.tracks.filter(t => t.kind === 'video') : [];
export const audioTracks = () => store.project ? store.project.tracks.filter(t => t.kind === 'audio') : [];
export const totalDuration = () => store.project ? store.project.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0) : 0;
export const activeAt = (clip, t) => t >= clip.start - 1e-4 && t < clip.start + clip.duration;

export function ensureDefaultTracks(p) {
  if (!p.tracks.some(t => t.kind === 'video')) p.tracks.push(createTrack('video', 'Video 1'));
  if (!p.tracks.some(t => t.kind === 'audio')) p.tracks.push(createTrack('audio', 'Audio 1'));
}

/** Effective audio volume of a clip at absolute time t (clip volume × fades × track). */
export function volumeAt(clip, t) {
  const local = t - clip.start;
  let v = clip.muted ? 0 : clip.volume;
  if (clip.fadeIn > 0 && local < clip.fadeIn) v *= clamp(local / clip.fadeIn, 0, 1);
  if (clip.fadeOut > 0 && local > clip.duration - clip.fadeOut) v *= clamp((clip.duration - local) / clip.fadeOut, 0, 1);
  const p = store.project;
  if (p) {
    const tr = p.tracks.find(x => x.id === clip.trackId);
    if (tr) {
      const anySolo = p.tracks.some(x => x.solo);
      if (anySolo && !tr.solo) v = 0;
      else {
        if (tr.muted) v = 0;
        v *= (tr.volume ?? 1);
      }
    }
  }
  return clamp(v, 0, 1);
}

/* ---------- settings persistence ---------- */
const SETTINGS_KEY = 'forge.settings';
export function loadUISettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) Object.assign(store.ui.settings, JSON.parse(raw));
  } catch (e) { /* corrupt settings — keep defaults */ }
}
export function saveUISettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(store.ui.settings)); } catch (e) { /* ignore */ }
  bus.emit('settings:changed');
}
export const SELECTION = {
  set(ids) { store.ui.selection = (ids || []).slice(); store.ui.selectedTransitionClip = null; bus.emit('selection:changed'); },
  add(id) { if (!store.ui.selection.includes(id)) store.ui.selection.push(id); bus.emit('selection:changed'); },
  toggle(id) {
    const i = store.ui.selection.indexOf(id);
    if (i >= 0) store.ui.selection.splice(i, 1); else store.ui.selection.push(id);
    bus.emit('selection:changed');
  },
  clear() { if (store.ui.selection.length || store.ui.selectedTransitionClip) { store.ui.selection = []; store.ui.selectedTransitionClip = null; bus.emit('selection:changed'); } },
};

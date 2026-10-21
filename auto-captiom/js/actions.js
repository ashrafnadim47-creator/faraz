/* FORGE — shared editing actions: split, delete, duplicate, clipboard, detach audio, markers */
import { store, bus, getClip, getTrack, trackClips, createClip, createTrack, selectedClips, videoTracks, audioTracks } from './state.js';
import { deepClone, uid, clamp } from './utils.js';
import { commit, markDirty } from './project.js';
import { ui } from './ui.js';

let clipboardClips = [];

function removeClipFrom(p, clipId) {
  p.clips = p.clips.filter(c => c.id !== clipId);
  // Clean up transitions that pointed at a boundary no longer adjacent
  for (const c of p.clips) {
    if (c.transitionIn) {
      const hasA = p.clips.some(o => o.trackId === c.trackId && Math.abs(o.start + o.duration - c.start) < 0.03);
      if (!hasA) c.transitionIn = null;
    }
  }
}

function ensureOverlayTrack(p) {
  let track = p.tracks.find(tr => tr.kind === 'video' && tr.isOverlay && !tr.locked);
  if (!track) {
    track = createTrack('video', 'Overlays');
    track.isOverlay = true;
    track.height = 68;
    const lastVideo = (() => {
      let idx = -1;
      p.tracks.forEach((tr, i) => { if (tr.kind === 'video') idx = i; });
      return idx;
    })();
    const firstAudio = p.tracks.findIndex(tr => tr.kind === 'audio');
    const insertAt = firstAudio >= 0 ? firstAudio : lastVideo + 1;
    p.tracks.splice(Math.max(0, insertAt), 0, track);
  }
  return track;
}

function activeCompatibleTrack(p, wantKind) {
  const active = p.tracks.find(tr => tr.id === store.ui.activeTrackId && tr.kind === wantKind && !tr.locked);
  if (active) return active;
  return p.tracks.find(tr => tr.kind === wantKind && !tr.locked) || null;
}

export const actions = {
  /* ---------- playback passthroughs (bound in app.js) ---------- */
  _preview: null,
  _exporter: null,
  _projectsModal: null,
  bind({ preview, exporter, projectsModal }) { this._preview = preview; this._exporter = exporter; this._projectsModal = projectsModal; },

  togglePlay() { this._preview?.toggle(); },
  seek(t) { this._preview?.seek(t); },
  time() { return this._preview ? this._preview.time : 0; },
  getActiveTrackId(kind = null) {
    const p = store.project; if (!p) return null;
    const tr = activeCompatibleTrack(p, kind || 'video');
    return tr?.id || null;
  },
  setActiveTrack(trackId) {
    const tr = getTrack(trackId);
    if (!tr) return;
    store.ui.activeTrackId = tr.id;
    bus.emit('track:active', tr);
  },

  /* ---------- clipboard ---------- */
  copy() {
    const sel = selectedClips();
    if (!sel.length) return ui.toast('Nothing selected to copy.', 'warn');
    clipboardClips = sel.map(deepClone);
    ui.toast(`Copied ${sel.length} clip${sel.length > 1 ? 's' : ''}`, 'success', 1600);
  },
  cut() {
    const sel = selectedClips();
    if (!sel.length) return ui.toast('Nothing selected to cut.', 'warn');
    clipboardClips = sel.map(deepClone);
    commit(p => { sel.forEach(c => removeClipFrom(p, c.id)); }, { label: 'Cut clips' });
  },
  paste() {
    if (!clipboardClips.length) return ui.toast('Clipboard is empty.', 'warn');
    const t = this.time();
    const base = Math.min(...clipboardClips.map(c => c.start));
    const newIds = [];
    commit(p => {
      for (const src of clipboardClips) {
        let track = p.tracks.find(tr => tr.id === src.trackId && tr.kind === (src.type === 'audio' ? 'audio' : 'video'));
        if (!track) track = p.tracks.find(tr => tr.kind === (src.type === 'audio' ? 'audio' : 'video'));
        if (!track) continue;
        const clip = createClip({ ...deepClone(src), id: uid(), trackId: track.id, start: Math.max(0, t + (src.start - base)) });
        p.clips.push(clip);
        newIds.push(clip.id);
      }
    }, { label: 'Paste clips' });
    if (newIds.length) { SELECTION_SET(newIds); ui.toast('Pasted', 'success', 1400); }
  },
  duplicate() {
    const sel = selectedClips();
    if (!sel.length) return ui.toast('Nothing selected to duplicate.', 'warn');
    const newIds = [];
    commit(p => {
      for (const src of sel) {
        const clip = createClip({ ...deepClone(src), id: uid(), start: src.start + src.duration });
        p.clips.push(clip);
        newIds.push(clip.id);
      }
    }, { label: 'Duplicate clips' });
    SELECTION_SET(newIds);
  },

  /* ---------- structural ops ---------- */
  split() {
    const t = this.time();
    let targets = selectedClips().filter(c => t > c.start + 0.02 && t < c.start + c.duration - 0.02 && !getTrack(c.trackId)?.locked);
    if (!targets.length) {
      targets = store.project.clips.filter(c => t > c.start + 0.02 && t < c.start + c.duration - 0.02 && !getTrack(c.trackId)?.locked);
    }
    if (!targets.length) return ui.toast('Nothing to split at the playhead. Put the playhead over a clip and press S.', 'warn', 3200);
    const newIds = [];
    commit(p => {
      for (const src of targets) {
        const c = p.clips.find(x => x.id === src.id);
        const local = t - c.start;
        const right = createClip({
          ...deepClone({ ...c, transitionIn: c.transitionIn, keyframes: c.keyframes }), id: uid(),
          start: t, duration: c.duration - local,
          sourceStart: c.sourceStart + local * c.speed,
          sourceDuration: c.sourceDuration - local * c.speed,
          transitionIn: c.transitionIn, keyframes: shiftKeys(deepClone(c.keyframes || {}), -local),
        });
        c.transitionIn = null;
        c.duration = local;
        c.sourceDuration = local * c.speed;
        p.clips.push(right);
        newIds.push(right.id);
      }
    }, { label: 'Split clips' });
    SELECTION_SET(newIds);
    ui.toast(`Split ${newIds.length} clip${newIds.length > 1 ? 's' : ''}`, 'success', 1600);
  },

  deleteSelection() {
    const sel = selectedClips();
    if (!sel.length) return;
    commit(p => { sel.forEach(c => removeClipFrom(p, c.id)); }, { label: 'Delete clips' });
    SELECTION_SET([]);
  },

  rollEdit(direction = 1) {
    const sel=selectedClips(); if(sel.length!==1) return ui.toast('Select one clip at a cut for a roll edit.', 'warn');
    const c=sel[0], tr=getTrack(c.trackId); if(!tr) return;
    const clips=trackClips(c.trackId), idx=clips.findIndex(x=>x.id===c.id), next=clips[idx+1];
    if(!next) return ui.toast('No adjacent clip to roll.', 'warn');
    const delta=clamp(direction, -Math.min(c.duration-.05, .25), Math.min(next.duration-.05,.25));
    commit(p=>{ const a=p.clips.find(x=>x.id===c.id), b=p.clips.find(x=>x.id===next.id); a.duration+=delta; a.sourceDuration+=delta*a.speed; b.start+=delta; b.sourceStart+=delta*b.speed; },{label:'Roll edit'});
  },
  slideEdit(direction = 1) {
    const sel=selectedClips(); if(sel.length!==1) return ui.toast('Select one clip for a slide edit.', 'warn');
    const c=sel[0], clips=trackClips(c.trackId), idx=clips.findIndex(x=>x.id===c.id), left=clips[idx-1], right=clips[idx+1];
    if(!left || !right) return ui.toast('Slide edit needs clips on both sides.', 'warn');
    const delta=clamp(direction*.25, -Math.min(c.sourceStart,.25), Math.min((getMediaSafe(c.mediaId)?.duration||c.sourceDuration)-c.sourceStart-c.sourceDuration,.25));
    commit(p=>{const x=p.clips.find(z=>z.id===c.id); const l=p.clips.find(z=>z.id===left.id); const r=p.clips.find(z=>z.id===right.id); x.sourceStart+=delta*x.speed; l.duration+=delta; r.start+=delta;},{label:'Slide edit'});
  },
  slipEdit(direction = 1) {
    const sel=selectedClips(); if(sel.length!==1) return ui.toast('Select one clip for a slip edit.', 'warn');
    const c=sel[0], m=getMediaSafe(c.mediaId); if(!m) return;
    const maxStart=Math.max(0,(m.duration||c.sourceDuration)-c.sourceDuration);
    const delta=clamp(direction*.25, -c.sourceStart, maxStart-c.sourceStart);
    commit(p=>{const x=p.clips.find(z=>z.id===c.id); x.sourceStart+=delta;},{label:'Slip edit'});
  },

  rippleDelete() {
    const sel = selectedClips();
    if (!sel.length) return ui.toast('Select a clip to ripple delete.', 'warn');
    commit(p => {
      for (const src of sel) {
        const c = p.clips.find(x => x.id === src.id);
        if (!c) continue;
        const end = c.start + c.duration;
        p.clips.filter(x => x.trackId === c.trackId && x.start >= end - 0.001)
          .forEach(x => { x.start = Math.max(0, x.start - c.duration); });
        removeClipFrom(p, c.id);
      }
    }, { label: 'Ripple delete' });
    SELECTION_SET([]);
  },

  /* ---------- clip helpers ---------- */
  setSpeed(clipId, speed) {
    speed = clamp(speed, 0.25, 8);
    commit(p => {
      const c = p.clips.find(x => x.id === clipId);
      c.speed = speed;
      c.duration = c.sourceDuration / speed;
    }, { label: 'Change speed' });
  },

  detachAudio(clipId) {
    const clip = getClip(clipId);
    if (!clip || clip.type !== 'video') return ui.toast('Detach audio works on video clips.', 'warn');
    if (!getMediaSafe(clip.mediaId)) return ui.toast('Media missing for this clip.', 'error');
    commit(p => {
      let audioTrack = p.tracks.find(tr => tr.kind === 'audio');
      if (!audioTrack) { audioTrack = createTrack('audio', `Audio ${p.tracks.filter(t => t.kind === 'audio').length + 1}`); p.tracks.push(audioTrack); }
      const a = createClip({
        trackId: audioTrack.id, mediaId: clip.mediaId, type: 'audio',
        name: `${clip.name} audio`, start: clip.start, duration: clip.duration,
        sourceStart: clip.sourceStart, sourceDuration: clip.sourceDuration, speed: clip.speed,
        volume: clip.volume, fadeIn: clip.fadeIn, fadeOut: clip.fadeOut,
      });
      p.clips.push(a);
      const v = p.clips.find(x => x.id === clipId);
      v.muted = true;
      v.volume = 0;
    }, { label: 'Detach audio' });
    ui.toast('Audio detached to a new audio clip (video muted)', 'success');
  },

  replaceClipMedia(clipId, newMediaId) {
    const mediaItem = getMediaSafe(newMediaId);
    if (!mediaItem) return;
    commit(p => {
      const c = p.clips.find(x => x.id === clipId);
      c.mediaId = newMediaId;
      c.missing = false;
      c.type = mediaItem.type;
      c.name = mediaItem.name;
      const maxSource = mediaItem.duration || c.duration;
      c.sourceStart = clamp(c.sourceStart, 0, Math.max(0, maxSource - 0.1));
      c.sourceDuration = Math.min(c.sourceDuration, Math.max(0.1, maxSource - c.sourceStart));
      c.duration = c.sourceDuration / (c.speed || 1);
    }, { label: 'Replace media' });
    ui.toast('Clip media replaced', 'success');
  },

  /* ---------- tracks & markers ---------- */
  addTrack(kind) {
    let id = null;
    commit(p => {
      const n = p.tracks.filter(t => t.kind === kind).length + 1;
      const tr = createTrack(kind, `${kind === 'video' ? 'Video' : 'Audio'} ${n}`);
      p.tracks.push(tr); id = tr.id;
    }, { label: 'Add track', event: 'tracks:changed' });
    store.ui.activeTrackId = id;
    bus.emit('track:active');
    return id;
  },
  deleteTrack(trackId) {
    const tracks = store.project.tracks.filter(t => t.kind === getTrack(trackId)?.kind);
    if (tracks.length <= 1) return ui.toast(`Keep at least one ${getTrack(trackId)?.kind} track.`, 'warn');
    commit(p => {
      p.tracks = p.tracks.filter(t => t.id !== trackId);
      p.clips = p.clips.filter(c => c.trackId !== trackId);
    }, { label: 'Delete track', event: 'tracks:changed' });
    SELECTION_SET([]);
  },
  renameTrack(trackId, name) {
    commit(p => { p.tracks.find(t => t.id === trackId).name = name; }, { label: 'Rename track', event: 'tracks:changed', useHistory: false });
  },
  patchTrack(trackId, patch, label) {
    commit(p => { Object.assign(p.tracks.find(t => t.id === trackId), patch); }, { label: label || 'Track change', event: 'tracks:changed' });
  },
  setTrackHeight(trackId, height) {
    commit(p => { p.tracks.find(t => t.id === trackId).height = Math.round(height); }, { label: 'Track height', event: 'tracks:changed', useHistory: false });
    markDirty();
  },

  addMarkerAt(time, label) {
    const colors = ['#f5a524', '#ff5c67', '#2ecc71', '#4c8dff', '#b96cff'];
    let m = null;
    commit(p => {
      m = { id: uid(), time: Math.max(0, time), label: label || `Marker ${p.markers.length + 1}`, color: colors[p.markers.length % colors.length] };
      p.markers.push(m);
      p.markers.sort((a, b) => a.time - b.time);
    }, { label: 'Add marker', event: 'markers:changed' });
    return m;
  },
  updateMarker(id, patch) {
    commit(p => { Object.assign(p.markers.find(m => m.id === id), patch); }, { label: 'Edit marker', event: 'markers:changed' });
  },
  deleteMarker(id) {
    commit(p => { p.markers = p.markers.filter(m => m.id !== id); }, { label: 'Delete marker', event: 'markers:changed' });
  },

  /* ---------- text & stickers ---------- */
  addTextClip(preset = {}) {
    const t = this.time();
    let newId = null;
    commit(p => {
      const track = ensureOverlayTrack(p);
      if (!track) return;
      const clip = createClip({
        trackId: track.id, type: 'text', name: preset.name || 'Text',
        start: t, duration: preset.duration || 4,
        text: preset.text,
        sticker: null,
      });
      p.clips.push(clip);
      newId = clip.id;
    }, { label: 'Add text' });
    if (newId) { SELECTION_SET([newId]); ui.toast(`${preset.name || 'Text'} added at playhead — edit it in the Inspector`, 'success'); }
    return newId;
  },

  addStickerClip(shape, color, trackId, time, meta = null) {
    let newId = null;
    commit(p => {
      let track = trackId ? p.tracks.find(tr => tr.id === trackId) : null;
      if (!track || track.kind !== 'video' || track.locked) track = ensureOverlayTrack(p);
      if (!track) return;
      const clip = createClip({
        trackId: track.id, type: 'sticker', name: `Sticker (${shape})`,
        start: Math.max(0, time ?? this.time()), duration: 4,
        sticker: { shape, color, kind: meta?.kind || 'shape', emoji: meta?.emoji || null },
      });
      p.clips.push(clip);
      newId = clip.id;
    }, { label: 'Add sticker' });
    if (newId) SELECTION_SET([newId]);
  },

  selectAll() { SELECTION_SET(store.project.clips.filter(c => !getTrack(c.trackId)?.locked).map(c => c.id)); },
  deselect() { SELECTION_SET([]); },
};

function SELECTION_SET(ids) {
  import('./state.js').then(({ SELECTION }) => SELECTION.set(ids));
  // immediate synchronous set for responsiveness
  store.ui.selection = ids.slice();
  store.ui.selectedTransitionClip = null;
  bus.emit('selection:changed');
}

function shiftKeys(keyframesObj, dt) {
  const out = {};
  for (const [path, keys] of Object.entries(keyframesObj || {})) {
    out[path] = keys.map(k => ({ t: Math.max(0, k.t + dt), v: k.v })).sort((a, b) => a.t - b.t);
  }
  return out;
}

function getMediaSafe(id) { return store.project?.media.find(m => m.id === id) || null; }

/* FORGE — media library: import, probe, thumbnails, waveforms, blobs, drag to timeline */
import { store, bus, getMedia, createClip, SELECTION } from './state.js';
import { el, $, uid, clamp, formatDur, debounce, svgIcon, downloadBlob } from './utils.js';
import { idbPut, idbGet, idbDelete } from './idb.js';
import { commit, markDirty } from './project.js';
import { ui } from './ui.js';
import { timeline } from './timeline.js';
import { supabaseMedia } from './supabase-media.js';

const VIDEO_EXT = ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', 'ogv'];
const AUDIO_EXT = ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac', 'opus'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp'];

const urlCache = new Map();     // mediaId -> object URL
const thumbCache = new Map();   // mediaId -> dataURL
const peaksCache = new Map();   // mediaId -> Float32Array | null
let sortMode = 'date';
let searchQuery = '';

export const media = {
  init,
  importFiles,
  getBlobUrl,
  getBlob,
  getThumb: id => thumbCache.get(id) || null,
  getPeaks,
  hydrateBlobUrl,
  hydrateThumbs,
  addMediaToTimeline,
  beginMediaDrag,
  generateSample,
  syncPendingCloudMedia,
  renderLibrary,
  get searchQuery() { return searchQuery; },
};

export function typeOf(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (VIDEO_EXT.includes(ext) || (file.type.startsWith('video/') && ext !== 'avi')) return 'video';
  if (AUDIO_EXT.includes(ext) || file.type.startsWith('audio/')) return 'audio';
  if (IMAGE_EXT.includes(ext) || file.type.startsWith('image/')) return 'image';
  return null;
}

/* ---------------- import & probe ---------------- */

export async function importFiles(files) {
  const list = Array.from(files);
  if (!list.length) return;
  ui.showBusy(list.length > 1 ? `Importing ${list.length} files…` : `Importing ${list[0].name}…`);
  let ok = 0, fail = 0;
  for (const file of list) {
    try { await importOne(file); ok++; }
    catch (e) {
      console.error('[forge] import failed', file.name, e);
      fail++;
      ui.toast(`Could not import “${file.name}”: ${e.message || 'unsupported or corrupted file'}`, 'error', 6000);
    }
  }
  ui.hideBusy();
  if (ok) ui.toast(`Imported ${ok} file${ok > 1 ? 's' : ''}`, 'success');
  if (fail) ui.toast(`${fail} file${fail > 1 ? 's' : ''} could not be imported. Browsers support MP4/WebM/MOV(H.264), MP3/WAV/OGG/M4A and PNG/JPG/WebP/SVG.`, 'warn', 7000);
}

async function importOne(file) {
  const type = typeOf(file);
  if (!type) throw new Error('unsupported format');
  const url = URL.createObjectURL(file);

  let probe;
  if (type === 'video') probe = await probeVideo(url);
  else if (type === 'audio') probe = await probeAudio(url);
  else probe = await probeImage(url);
  if (!probe) throw new Error('decoder rejected this file');

  const item = {
    id: uid(), name: file.name.replace(/\.[^.]+$/, ''), type, mime: file.type || type,
    ext: (file.name.split('.').pop() || '').toLowerCase(), size: file.size,
    duration: probe.duration || 0, width: probe.width || 0, height: probe.height || 0,
    createdAt: new Date().toISOString(),
  };

  const buf = await file.arrayBuffer();
  await idbPut('blobs', item.id, { mime: file.type || type, buffer: buf });
  urlCache.set(item.id, url);

  if (probe.thumb) { thumbCache.set(item.id, probe.thumb); await idbPut('thumbs', item.id, probe.thumb); }

  // Local-first: the editor is immediately usable even when cloud storage is not configured.
  // If free Supabase storage is configured, upload the original media in the background.
  commit(p => { p.media.push(item); }, { label: 'Import media', event: 'media:changed' });
  if (supabaseMedia.enabled()) {
    if (file.size <= supabaseMedia.maxUploadBytes) {
      void supabaseMedia.upload(file, item.id).then(cloud => {
        if (cloud?.path) {
          item.cloud = { provider: 'supabase', path: cloud.path, syncedAt: new Date().toISOString() };
          commit(() => {}, { label: 'Cloud media sync', event: 'media:changed', useHistory: false });
        }
      }).catch(e => {
        console.warn('[forge] cloud media upload skipped:', e.message);
        bus.emit('cloud-media-error', e.message);
      });
    } else {
      bus.emit('cloud-media-error', 'FREE_STORAGE_LIMIT');
    }
  }

  // Audio waveform (async, non-blocking; works for audio files and video soundtracks)
  if (type === 'audio' || type === 'video') {
    computePeaks(item.id, buf).then(hasAudio => {
      if (hasAudio) { item.hasAudio = true; bus.emit('media:changed'); }
    });
  }
  return item;
}

function probeVideo(url) {
  return new Promise(res => {
    const v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true; v.playsInline = true; v.src = url;
    let settled = false, seekTimer = null;
    const finish = info => { if (!settled) { settled = true; clearTimeout(seekTimer); res(info); try { v.removeAttribute('src'); v.load(); } catch (_) {} } };
    v.onerror = () => finish(null);
    setTimeout(() => finish(null), 20000);
    v.onloadedmetadata = () => {
      if (!isFinite(v.duration) || v.duration <= 0 || !v.videoWidth || !v.videoHeight) return;
      const duration = v.duration;
      const w = v.videoWidth, h = v.videoHeight;
      const capture = () => {
        try {
          const c = document.createElement('canvas');
          c.width = 192; c.height = 108;
          const ctx = c.getContext('2d');
          const scale = Math.max(192 / (w || 192), 108 / (h || 108));
          const dw = (w || 192) * scale, dh = (h || 108) * scale;
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 192, 108);
          ctx.drawImage(v, (192 - dw) / 2, (108 - dh) / 2, dw, dh);
          finish({ duration, width: w, height: h, thumb: c.toDataURL('image/jpeg', 0.62) });
        } catch (e) { finish({ duration, width: w, height: h }); }
      };
      setTimeout(() => finish({ duration, width: w, height: h }), 3000);
    };
  });
}

function probeAudio(url) {
  return new Promise(res => {
    const a = new Audio();
    a.preload = 'metadata'; a.src = url;
    let settled = false;
    const finish = info => { if (!settled) { settled = true; res(info); } };
    a.onerror = () => finish(null);
    setTimeout(() => finish(null), 12000);
    a.onloadedmetadata = () => finish({ duration: isFinite(a.duration) ? a.duration : 0 });
  });
}

function probeImage(url) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      let thumb = null;
      try {
        const c = document.createElement('canvas'); c.width = 192; c.height = 108;
        const ctx = c.getContext('2d');
        const scale = Math.max(192 / img.naturalWidth, 108 / img.naturalHeight);
        const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
        ctx.drawImage(img, (192 - dw) / 2, (108 - dh) / 2, dw, dh);
        thumb = c.toDataURL('image/jpeg', 0.62);
      } catch (e) { /* tainted canvas (svg) — ignore */ }
      res({ duration: 0, width: img.naturalWidth, height: img.naturalHeight, thumb });
    };
    img.onerror = () => res(null);
    img.src = url;
  });
}

/* ---------------- waveforms ---------------- */

function getWorker() {
  try { return new Worker('js/waveform.worker.js'); }
  catch (e) { return null; }
}

export async function computePeaks(mediaId, arrayBuffer) {
  try {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuf = await actx.decodeAudioData(arrayBuffer.slice(0));
    actx.close?.();
    const ch = audioBuf.getChannelData(0);
    const buckets = Math.min(4000, Math.max(400, Math.floor(audioBuf.duration * 40)));
    const peaks = await new Promise(res => {
      const w = getWorker();
      if (!w) {
        // main-thread fallback
        const out = new Float32Array(buckets);
        const block = ch.length / buckets;
        for (let i = 0; i < buckets; i++) {
          let m = 0;
          for (let j = Math.floor(i * block); j < Math.min(ch.length, (i + 1) * block); j += 64) m = Math.max(m, Math.abs(ch[j]));
          out[i] = m;
        }
        return res(out);
      }
      w.onmessage = ev => { res(ev.data.peaks ? new Float32Array(ev.data.peaks) : null); w.terminate(); };
      w.onerror = () => { res(null); w.terminate(); };
      w.postMessage({ channelData: ch, buckets }, [ch.buffer]);
    });
    peaksCache.set(mediaId, peaks);
    if (peaks) await idbPut('peaks', mediaId, peaks);
    return !!peaks;
  } catch (e) {
    peaksCache.set(mediaId, null);
    return false;
  }
}

export function getPeaks(mediaId) {
  if (peaksCache.has(mediaId)) return peaksCache.get(mediaId);
  peaksCache.set(mediaId, null); // placeholder while loading
  idbGet('peaks', mediaId).then(v => {
    const p = v ? new Float32Array(v) : null;
    peaksCache.set(mediaId, p);
    if (p) bus.emit('media:changed');
  }).catch(() => {});
  return null;
}

/* ---------------- blob urls ---------------- */

export async function hydrateBlobUrl(item) {
  if (urlCache.has(item.id)) return urlCache.get(item.id);
  const rec = await idbGet('blobs', item.id).catch(() => null);
  if (rec?.buffer) {
    const blob = new Blob([rec.buffer], { type: rec.mime || item.mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    urlCache.set(item.id, url);
    return url;
  }
  // Cross-device restore: if the local cache is empty, pull the original from cloud storage.
  if (item.cloud?.provider === 'supabase' && item.cloud.path && supabaseMedia.enabled()) {
    try {
      const blob = await supabaseMedia.download(item.cloud.path);
      if (!blob) return null;
      const buffer = await blob.arrayBuffer();
      await idbPut('blobs', item.id, { mime: blob.type || item.mime || 'application/octet-stream', buffer });
      const url = URL.createObjectURL(blob);
      urlCache.set(item.id, url);
      return url;
    } catch (e) {
      console.warn('[forge] cloud media restore failed:', e.message);
    }
  }
  return null;
}

export function getBlobUrl(mediaId) { return urlCache.get(mediaId) || null; }

export async function getBlob(mediaId) {
  const rec = await idbGet('blobs', mediaId).catch(() => null);
  if (!rec?.buffer) return null;
  return new Blob([rec.buffer], { type: rec.mime || 'application/octet-stream' });
}

/** Re-attach persisted thumbnails after a project load (then refresh UI). */
export async function hydrateThumbs() {
  for (const item of store.project?.media || []) {
    if (thumbCache.has(item.id)) continue;
    try { const t = await idbGet('thumbs', item.id); if (t) thumbCache.set(item.id, t); } catch (e) { /* ignore */ }
  }
  bus.emit('media:changed');
}


/** Upload local media that belongs to the current project but has not yet been
 * mirrored to the optional free cloud storage provider. */
export async function syncPendingCloudMedia() {
  if (!supabaseMedia.enabled() || !store.project?.media?.length) return;
  for (const item of store.project.media) {
    if (item.cloud?.provider === 'supabase' || !item.id) continue;
    try {
      const blob = await getBlob(item.id);
      if (!blob || blob.size > supabaseMedia.maxUploadBytes) continue;
      const file = new File([blob], `${item.name || item.id}.${item.ext || 'bin'}`, { type: blob.type || item.mime || 'application/octet-stream' });
      const cloud = await supabaseMedia.upload(file, item.id);
      if (cloud?.path) {
        item.cloud = { provider: 'supabase', path: cloud.path, syncedAt: new Date().toISOString() };
        bus.emit('media:changed');
      }
    } catch (e) {
      console.warn('[forge] pending cloud media sync skipped:', item.name, e.message);
    }
  }
}

/* ---------------- library UI ---------------- */

function init() {
  buildPane($('#pane-media'), null);
  buildPane($('#pane-audio'), 'audio');
  bus.on('media:changed', debouncedRender);
  bus.on('project:loaded', debouncedRender);
  bus.on('project:loaded', () => { void syncPendingCloudMedia(); });
}

const debouncedRender = debounce(() => renderLibrary(), 60);

function buildPane(root, typeFilter) {
  root.innerHTML = '';
  const input = $('#file-input');
  root.appendChild(el('button', {
    class: 'btn primary import-cta', 'data-testid': typeFilter === 'audio' ? 'import-audio-btn' : 'import-media-btn',
    html: `${svgIcon('upload', 15)}<span>Import ${typeFilter === 'audio' ? 'audio' : 'media'}</span>`,
    onclick: () => input.click(),
  }));

  const search = el('input', { type: 'search', placeholder: 'Search by filename…', 'data-testid': typeFilter === 'audio' ? 'audio-search-input' : 'media-search-input' });
  search.addEventListener('input', debounce(() => { searchQuery = search.value; renderLibrary(); }, 120));
  const sort = el('select', { class: 'sel', 'data-testid': typeFilter === 'audio' ? 'audio-sort-select' : 'media-sort-select' },
    el('option', { value: 'date', text: 'Newest' }), el('option', { value: 'name', text: 'Name' }),
    el('option', { value: 'type', text: 'Type' }), el('option', { value: 'duration', text: 'Duration' }));
  sort.value = sortMode;
  sort.addEventListener('change', () => { sortMode = sort.value; renderLibrary(); });
  root.appendChild(el('div', { class: 'pane-toolbar' }, search, sort));

  root.appendChild(el('div', { class: 'media-grid', 'data-testid': typeFilter === 'audio' ? 'audio-grid' : 'media-grid' }));
  root.appendChild(el('div', { class: 'pane-hint', html: 'Drag items onto the timeline, or right-click for more actions.<br>Tip: generate sample media to try FORGE instantly.' }));

  const row = el('div', { class: 'sample-row' },
    el('button', { class: 'btn', text: '＋ Video', 'data-testid': typeFilter === 'audio' ? 'sample-video-btn-audio-pane' : 'sample-video-btn', onclick: () => generateSample('video') }),
    el('button', { class: 'btn', text: '＋ Audio', 'data-testid': typeFilter === 'audio' ? 'sample-audio-btn-audio-pane' : 'sample-audio-btn', onclick: () => generateSample('audio') }),
    el('button', { class: 'btn', text: '＋ Image', 'data-testid': typeFilter === 'audio' ? 'sample-image-btn-audio-pane' : 'sample-image-btn', onclick: () => generateSample('image') }));
  root.appendChild(row);
}

export function renderLibrary() {
  const tabs = [['pane-media', null], ['pane-audio', 'audio']];
  for (const [paneId, typeFilter] of tabs) {
    const grid = $(`#${paneId} .media-grid`);
    if (!grid) continue;
    grid.innerHTML = '';
    let items = (store.project?.media || []).filter(m => !typeFilter || m.type === typeFilter);
    if (searchQuery) items = items.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    items.sort((a, b) => {
      switch (sortMode) {
        case 'name': return a.name.localeCompare(b.name);
        case 'type': return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
        case 'duration': return (b.duration || 0) - (a.duration || 0);
        default: return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
    });
    if (!items.length) {
      grid.appendChild(el('div', { class: 'media-empty', 'data-testid': typeFilter === 'audio' ? 'audio-empty-state' : 'media-empty-state' },
        `No ${typeFilter || 'media'} yet.`, el('br'), 'Click “Import”, or drop files anywhere in the window.'));
      continue;
    }
    for (const item of items) grid.appendChild(mediaItemEl(item));
  }
}

function mediaItemEl(item) {
  const thumb = el('div', { class: 'thumb' });
  const t = thumbCache.get(item.id);
  if (t) thumb.appendChild(el('img', { src: t, alt: item.name, draggable: 'false' }));
  else thumb.appendChild(el('span', { html: svgIcon(item.type === 'audio' ? 'music' : item.type === 'image' ? 'image' : 'film', 22) }));
  thumb.appendChild(el('span', { class: 'thumb-type', text: item.ext.toUpperCase() }));

  const meta = item.type === 'image'
    ? `${item.width}×${item.height} · Image`
    : `${formatDur(item.duration)}${item.width ? ` · ${item.width}×${item.height}` : ''} · ${item.type}`;

  const node = el('div', {
    class: 'media-item', 'data-testid': 'media-item', 'data-media-id': item.id, title: item.name,
    onpointerdown: e => { if (e.button === 0) beginMediaDrag(e, item); },
    oncontextmenu: e => { e.preventDefault(); mediaContextMenu(e, item); },
  }, thumb, el('div', { class: 'mi-body' },
    el('div', { class: 'mi-name', text: item.name }),
    el('div', { class: 'mi-meta', text: meta })));
  node.addEventListener('dblclick', () => libraryPreview(item));
  return node;
}

function mediaContextMenu(e, item) {
  ui.openContextMenu(e.clientX, e.clientY, [
    { label: 'Add to timeline', icon: 'plus', action: () => addMediaToTimeline(item, null, null) },
    { label: 'Preview', icon: 'play', action: () => libraryPreview(item) },
    { separator: true },
    { label: 'Rename', icon: 'type', action: async () => {
      const name = await ui.prompt({ title: 'Rename media', fields: [{ label: 'Name', value: item.name }], confirmLabel: 'Rename' });
      if (name?.[0]) commit(p => { p.media.find(m => m.id === item.id).name = name[0]; }, { label: 'Rename media', event: 'media:changed' });
    } },
    { label: 'Reveal information', icon: 'info', action: () => revealInfo(item) },
    { separator: true },
    { label: 'Delete from library', icon: 'trash', danger: true, action: () => deleteMedia(item) },
  ]);
}

function revealInfo(item) {
  ui.showModal('Media information', el('div', {},
    el('div', { class: 'readonly-meta', style: 'flex-direction:column;gap:6px;font-size:12px' },
      el('div', {}, `Name: ${item.name}.${item.ext}`),
      el('div', {}, `Type: ${item.type} (${item.mime || '—'})`),
      el('div', {}, `Duration: ${formatDur(item.duration)} (${(item.duration || 0).toFixed(3)} s)`),
      el('div', {}, `Resolution: ${item.width || '—'} × ${item.height || '—'}`),
      el('div', {}, `Size: ${(item.size / 1024 / 1024).toFixed(2)} MB`),
      el('div', {}, `Imported: ${new Date(item.createdAt).toLocaleString()}`))), { width: 420 });
}

export function libraryPreview(item) {
  import('./preview.js').then(({ preview }) => preview.setLibraryPreview(item));
}

async function deleteMedia(item) {
  const used = store.project.clips.filter(c => c.mediaId === item.id).length;
  const msg = used ? `“${item.name}” is used by ${used} clip${used > 1 ? 's' : ''}. They will go offline.` : `Delete “${item.name}” from the library?`;
  const ok = await ui.confirm({ title: 'Delete media', message: msg, confirmLabel: 'Delete', danger: true });
  if (!ok) return;
  commit(p => { p.media = p.media.filter(m => m.id !== item.id); }, { label: 'Delete media', event: 'media:changed' });
  await idbDelete('blobs', item.id).catch(() => {});
  await idbDelete('thumbs', item.id).catch(() => {});
  if (item.cloud?.provider === 'supabase' && item.cloud.path && supabaseMedia.enabled()) {
    supabaseMedia.remove(item.cloud.path).catch(e => console.warn('[forge] cloud media delete skipped:', e.message));
  }
  await idbDelete('peaks', item.id).catch(() => {});
  const url = urlCache.get(item.id);
  if (url) { URL.revokeObjectURL(url); urlCache.delete(item.id); }
  thumbCache.delete(item.id); peaksCache.delete(item.id);
}

/* ---------------- drag from library to timeline ---------------- */

export function beginMediaDrag(e, item) {
  const thumbEl = thumbCache.get(item.id);
  timeline.beginLibraryDrag(e, {
    kind: 'media', mediaId: item.id, media: item,
    duration: item.type === 'image' ? 5 : (item.duration || 5), label: item.name, thumb: thumbEl,
  }, {
    onTimelineDrop: (trackId, time) => addMediaToTimeline(item, trackId, time),
  });
}

export function addMediaToTimeline(item, trackId, time) {
  const p = store.project;
  const wantKind = item.type === 'audio' ? 'audio' : 'video';
  let track = trackId ? p.tracks.find(t => t.id === trackId) : null;
  if (!track || track.kind !== wantKind || track.locked) {
    track = p.tracks.find(t => t.id === store.ui.activeTrackId && t.kind === wantKind && !t.locked) ||
      p.tracks.find(t => t.kind === wantKind && !t.locked) || null;
    if (!track) {
      import('./actions.js').then(({ actions }) => {
        const newId = actions.addTrack(wantKind);
        setTimeout(() => addMediaToTimeline(item, newId, time), 0);
      });
      return;
    }
  }
  if (!track || track.kind !== wantKind) return ui.toast(`“${item.name}” is ${item.type} — it needs a ${wantKind} track.`, 'warn');
  const duration = item.type === 'image' ? 5 : (item.duration || 5);
  let newClipId = null;
  commit(pr => {
    const clip = {
      trackId: track.id, mediaId: item.id, type: item.type, name: item.name,
      start: Math.max(0, time ?? 0), duration, sourceStart: 0, sourceDuration: item.duration || duration,
    };
    const c = createClip(clip);
    pr.clips.push(c);
    newClipId = c.id;
  }, { label: `Add ${item.name}` });
  SELECTION.set([newClipId]);
}



/* ---------------- sample media generators ---------------- */

export async function generateSample(kind) {
  try {
    if (kind === 'image') {
      const c = document.createElement('canvas'); c.width = 1600; c.height = 900;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 1600, 900);
      g.addColorStop(0, '#1a2340'); g.addColorStop(1, '#4a2a10');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1600, 900);
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 1600, Math.random() * 900, 10 + Math.random() * 70, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,165,36,${0.05 + Math.random() * 0.12})`; ctx.fill();
      }
      ctx.fillStyle = '#f5a524'; ctx.font = '900 150px Arial'; ctx.textAlign = 'center';
      ctx.fillText('FORGE', 800, 430);
      ctx.fillStyle = '#e8ebf4'; ctx.font = '500 44px Arial';
      ctx.fillText('Sample Image · 1600 × 900', 800, 510);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      await importFiles([new File([blob], 'forge-sample-image.png', { type: 'image/png' })]);
    } else if (kind === 'audio') {
      ui.showBusy('Generating sample audio…');
      const blob = await renderSampleWav();
      ui.hideBusy();
      await importFiles([new File([blob], 'forge-sample-music.wav', { type: 'audio/wav' })]);
    } else if (kind === 'video') {
      ui.showBusy('Loading FORGE sample video…');
      try {
        const r = await fetch('assets/forge-sample-video.mp4', { cache: 'no-store' });
        if (!r.ok) throw new Error(`sample asset ${r.status}`);
        const blob = await r.blob();
        await importFiles([new File([blob], 'forge-sample-video.mp4', { type: 'video/mp4' })]);
      } catch (assetError) {
        console.warn('[forge] bundled sample unavailable, falling back to MediaRecorder:', assetError);
        const sample = await recordSampleVideo();
        if (!sample?.blob) ui.toast('Sample video codec is unavailable in this runtime.', 'warn');
        else {
          const ext = sample.mime.includes('mp4') ? 'mp4' : 'webm';
          await importFiles([new File([sample.blob], `forge-sample-video.${ext}`, { type: sample.mime })]);
        }
      } finally { ui.hideBusy(); }
    }
  } catch (e) {
    ui.hideBusy();
    console.error('[forge] sample generation failed', e);
    ui.toast(`Sample generation failed: ${e.message || e}`, 'error');
  }
}

async function renderSampleWav() {
  const sr = 44100, len = 8 * sr;
  const off = new OfflineAudioContext(2, len, sr);
  const notes = [261.6, 329.6, 392.0, 523.3, 392.0, 329.6, 261.6, 196.0];
  notes.forEach((f, i) => {
    const osc = off.createOscillator(); osc.type = 'triangle'; osc.frequency.value = f;
    const gain = off.createGain();
    const t0 = i;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.32, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.95);
    osc.connect(gain); gain.connect(off.destination);
    osc.start(t0); osc.stop(t0 + 1);
  });
  for (let b = 0; b < 16; b++) {
    const osc = off.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(120, b * 0.5);
    osc.frequency.exponentialRampToValueAtTime(40, b * 0.5 + 0.12);
    const gain = off.createGain();
    gain.gain.setValueAtTime(0.5, b * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, b * 0.5 + 0.2);
    osc.connect(gain); gain.connect(off.destination);
    osc.start(b * 0.5); osc.stop(b * 0.5 + 0.25);
  }
  const rendered = await off.startRendering();
  return audioBufferToWav(rendered);
}

function audioBufferToWav(buffer) {
  const numCh = buffer.numberOfChannels, sr = buffer.sampleRate, len = buffer.length;
  const bytes = 44 + len * numCh * 2;
  const ab = new ArrayBuffer(bytes);
  const view = new DataView(ab);
  const wstr = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  wstr(0, 'RIFF'); view.setUint32(4, bytes - 8, true); wstr(8, 'WAVE');
  wstr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true); view.setUint32(24, sr, true);
  view.setUint32(28, sr * numCh * 2, true); view.setUint16(32, numCh * 2, true); view.setUint16(34, 16, true);
  wstr(36, 'data'); view.setUint32(40, len * numCh * 2, true);
  let off = 44;
  const chans = [];
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

function recordSampleVideo() {
  return new Promise(res => {
    try {
      const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
      const ctx = c.getContext('2d');
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
      if (!mime) return res(null);
      const stream = c.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3500000 });
      const chunks = [];
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => res({ blob: new Blob(chunks, { type: mime }), mime });
      rec.onerror = () => res(null);
      const t0 = performance.now();
      (function frame() {
        const t = (performance.now() - t0) / 1000;
        if (t > 5) { rec.stop(); return; }
        const g = ctx.createLinearGradient(0, 0, 1280, 720);
        g.addColorStop(0, `hsl(${(t * 40 + 220) % 360}, 60%, 16%)`);
        g.addColorStop(1, `hsl(${(t * 40 + 30) % 360}, 65%, 22%)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        for (let i = 0; i < 1280; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 720); ctx.stroke(); }
        const bx = 640 + Math.sin(t * 2.2) * 420, by = 360 + Math.cos(t * 3.1) * 220;
        ctx.beginPath(); ctx.arc(bx, by, 70 + Math.sin(t * 5) * 12, 0, Math.PI * 2);
        ctx.fillStyle = '#f5a524'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '900 110px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`FORGE  ${(t).toFixed(1)}s`, 640, 660);
        requestAnimationFrame(frame);
      })();
      rec.start(250);
    } catch (e) { res(null); }
  });
}

/* FORGE — timeline: ruler, tracks, clips, drag/trim/split, snapping, markers, zoom, drop targets */
import { store, bus, getClip, getTrack, getMedia, trackClips, totalDuration, SELECTION } from './state.js';
import { $, el, clamp, formatDur, formatTC, deepClone, svgIcon } from './utils.js';
import * as history from './history.js';
import { markDirty } from './project.js';
import { actions } from './actions.js';
import { ui } from './ui.js';
import { media } from './media.js';
import { preview } from './preview.js';
import { transitionSource, TRANSITION_CATALOG } from './transitions.js';
import { keyframes, KEY_PATHS } from './keyframes.js';

const MARKER_COLORS = ['#f5a524', '#ff5c67', '#2ecc71', '#4c8dff', '#b96cff'];

class Timeline {
  constructor() {
    this.laneEls = new Map();
    this.clipCanvasCache = new Map();
    this.thumbImgs = new Map();
    this.dragState = null;
  }

  init() {
    this.scroll = $('#tl-scroll');
    this.inner = $('#tl-inner');
    this.tracksEl = $('#tracks');
    this.headersList = $('#track-headers-list');
    this.ruler = $('#ruler-canvas');
    this.rulerWrap = $('#ruler-wrap');
    this.playheadEl = $('#playhead');
    this.dropInd = $('#drop-indicator');

    this._bindToolbar();
    this._bindPointer();

    this.scroll.addEventListener('scroll', () => { this.drawRuler(); this._updatePlayheadPos(); this._scheduleVirtual(); }, { passive: true });
    window.addEventListener('resize', () => { try { this.layout(); this.drawRuler(); this.renderClips(); } catch (e) { console.error('[forge] timeline resize', e); } });
    this.rulerWrap.addEventListener('contextmenu', e => this._rulerContextMenu(e));
    this.playheadEl.querySelector('#playhead-handle').addEventListener('pointerdown', e => { e.stopPropagation(); this._beginScrub(e); });
  }

  /* ============ layout & rendering ============ */

  layout() {
    const p = store.project;
    if (!p) return;
    const pps = store.ui.pxPerSec;
    const contentW = Math.ceil(Math.max(totalDuration() + 15, 30) * pps) + 240;
    this.inner.style.width = contentW + 'px';
    let h = 0;
    for (const tr of p.tracks) h += tr.height + 1;
    this.tracksEl.style.height = h + 'px';
  }

  renderTracks() {
    const p = store.project;
    if (!p) return;
    if (!store.ui.activeTrackId || !p.tracks.some(t => t.id === store.ui.activeTrackId && !t.locked)) {
      store.ui.activeTrackId = p.tracks.find(t => !t.locked)?.id || p.tracks[0]?.id || null;
    }
    this.tracksEl.innerHTML = '';
    this.headersList.innerHTML = '';
    this.laneEls.clear();
    for (const tr of p.tracks) {
      const lane = el('div', { class: 'lane', 'data-testid': 'track-lane' });
      const trackDiv = el('div', { class: `track ${tr.kind}${store.ui.activeTrackId === tr.id ? ' active' : ''}`, dataset: { trackId: tr.id } }, lane);
      trackDiv.style.height = tr.height + 'px';
      this.tracksEl.appendChild(trackDiv);
      this.laneEls.set(tr.id, { el: lane, track: tr, trackDiv });
      this.headersList.appendChild(this._headEl(tr, trackDiv));
    }
    this.layout();
    this.renderClips();
  }

  _headEl(tr, trackDiv) {
    const nameEl = el('div', { class: 'tr-name', text: tr.name, title: tr.name });
    nameEl.addEventListener('dblclick', async () => {
      const name = await ui.prompt({ title: 'Rename track', fields: [{ label: 'Name', value: tr.name }], confirmLabel: 'Rename' });
      if (name?.[0]) actions.renameTrack(tr.id, name[0]);
    });
    const btn = (icon, tip, on, cls, fn) => el('button', {
      class: `tr-btn ${on ? 'on' : ''} ${cls || ''}`, html: svgIcon(icon, 12), 'data-tip': tip,
      'data-testid': `track-${tip.toLowerCase().replace(/\s+/g, '-')}-${tr.id.slice(0, 4)}`,
      onclick: fn,
    });
    const btns = el('div', { class: 'tr-btns' });
    btns.appendChild(btn(tr.locked ? 'lock' : 'unlock', 'Lock', tr.locked, '', () => actions.patchTrack(tr.id, { locked: !tr.locked }, 'Lock track')));
    if (tr.kind === 'video') btns.appendChild(btn(tr.hidden ? 'eyeOff' : 'eye', 'Visibility', tr.hidden, tr.hidden ? 'warn' : '', () => actions.patchTrack(tr.id, { hidden: !tr.hidden }, 'Toggle track visibility')));
    else {
      btns.appendChild(btn(tr.muted ? 'volumeX' : 'volume', 'Mute', tr.muted, tr.muted ? 'warn' : '', () => actions.patchTrack(tr.id, { muted: !tr.muted }, 'Mute track')));
      const solo = el('button', { class: `tr-btn ${tr.solo ? 'on' : ''}`, text: 'S', 'data-tip': 'Solo', 'data-testid': `track-solo-${tr.id.slice(0, 4)}`, onclick: () => actions.patchTrack(tr.id, { solo: !tr.solo }, 'Solo track') });
      btns.appendChild(solo);
    }
    const head = el('div', { class: `tr-head${store.ui.activeTrackId === tr.id ? ' active' : ''}${tr.locked ? ' locked' : ''}`, style: `height:${tr.height}px`, dataset: { trackId: tr.id } },
      el('div', {}, el('div', { class: 'tr-kind', text: tr.kind }), nameEl), btns);
    head.addEventListener('click', e => {
      if (e.target.closest('.tr-btn') || e.target.closest('.tr-resize')) return;
      actions.setActiveTrack?.(tr.id);
      this.renderTracks();
    });
    head.addEventListener('contextmenu', e => {
      e.preventDefault();
      ui.openContextMenu(e.clientX, e.clientY, [
        { label: 'Rename track', icon: 'type', action: async () => {
          const name = await ui.prompt({ title: 'Rename track', fields: [{ label: 'Name', value: tr.name }], confirmLabel: 'Rename' });
          if (name?.[0]) actions.renameTrack(tr.id, name[0]);
        } },
        { separator: true },
        { label: 'Delete track', icon: 'trash', danger: true, action: () => actions.deleteTrack(tr.id) },
      ]);
    });
    const rz = el('div', { class: 'tr-resize', title: 'Drag to resize track' });
    rz.addEventListener('pointerdown', e => {
      e.preventDefault();
      const startY = e.clientY, startH = tr.height;
      const move = ev => actions.setTrackHeight(tr.id, clamp(startH + ev.clientY - startY, 40, 240));
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
    head.appendChild(rz);
    return head;
  }

  renderClips() {
    const p = store.project;
    if (!p) return;
    const pps = store.ui.pxPerSec;
    const viewL = this.scroll.scrollLeft / pps - 40;
    const viewR = (this.scroll.scrollLeft + this.scroll.clientWidth) / pps + 40;
    for (const laneInfo of this.laneEls.values()) laneInfo.el.innerHTML = '';
    for (const clip of p.clips) {
      if (clip.start + clip.duration < viewL || clip.start > viewR) continue;
      const laneInfo = this.laneEls.get(clip.trackId);
      if (!laneInfo) continue;
      laneInfo.el.appendChild(this._clipEl(clip, pps));
    }
    this._updatePlayheadPos();
  }

  _scheduleVirtual() {
    if (this._vt) return;
    this._vt = requestAnimationFrame(() => { this._vt = null; this.renderClips(); });
  }

  _clipEl(clip, pps) {
    const selected = store.ui.selection.includes(clip.id);
    const div = el('div', {
      class: `clip type-${clip.type}${clip.missing ? ' missing' : ''}${selected ? ' selected' : ''}`,
      dataset: { clipId: clip.id }, testid: 'timeline-clip',
    });
    div.style.left = clip.start * pps + 'px';
    div.style.width = Math.max(8, clip.duration * pps) + 'px';
    const icon = clip.type === 'audio' ? 'music' : clip.type === 'text' ? 'type' : clip.type === 'sticker' ? 'star' : 'film';
    const label = clip.type === 'text' ? (clip.text?.content || 'Text').slice(0, 42) : clip.name;
    div.appendChild(el('div', { class: 'clip-label' },
      el('span', { class: 'clip-type-icon', html: svgIcon(icon, 10) }),
      el('span', { text: label, style: 'overflow:hidden;white-space:nowrap;text-overflow:ellipsis' }),
      el('span', { class: 'clip-dur', text: formatDur(clip.duration) })));
    const canvas = el('canvas');
    div.appendChild(canvas);
    requestAnimationFrame(() => this._drawClipCanvas(clip, canvas, div));

    if (clip.missing) div.appendChild(el('div', { class: 'missing-label', text: 'Media offline' }));

    const tr = getTrack(clip.trackId);
    if (!tr?.locked) {
      div.appendChild(el('div', { class: 'trim-handle left', title: 'Trim start', testid: 'trim-left-handle' }));
      div.appendChild(el('div', { class: 'trim-handle right', title: 'Trim end', testid: 'trim-right-handle' }));
    }

    // Always expose a tiny transition target at the left cut so users can add/edit transitions without drag-and-drop.
    const prev = transitionSource(clip);
    if (prev) {
      const target = el('button', {
        class: `transition-target${clip.transitionIn ? ' has-transition' : ''}${store.ui.selectedTransitionClip === clip.id ? ' active' : ''}`,
        title: clip.transitionIn ? `Edit ${clip.transitionIn.type} transition` : 'Add transition',
        type: 'button', testid: 'transition-target',
        text: clip.transitionIn ? '◆' : '+',
        onclick: async e => {
          e.stopPropagation();
          SELECTION.clear();
          store.ui.selectedTransitionClip = clip.id;
          bus.emit('selection:changed');
          if (!clip.transitionIn) {
            const { addTransition } = await import('./transitions.js');
            addTransition(clip.id, 'dissolve', 0.6);
          }
        },
      });
      div.appendChild(target);
    }

    if (clip.transitionIn) {
      const badge = el('div', {
        class: 'transition-badge', title: `${clip.transitionIn.type} transition (${clip.transitionIn.duration.toFixed(2)}s) — click to edit`,
        html: svgIcon('transition', 10), testid: 'transition-badge',
        onclick: e => { e.stopPropagation(); SELECTION.clear(); store.ui.selectedTransitionClip = clip.id; bus.emit('selection:changed'); },
      });
      div.appendChild(badge);
    }

    // keyframe diamonds
    if (clip.keyframes) {
      for (const [path, keys] of Object.entries(clip.keyframes)) {
        for (const k of keys) {
          const d = el('div', { class: 'kf-diamond', title: `${path} @ ${k.t.toFixed(2)}s`, dataset: { path, t: k.t }, testid: 'keyframe-diamond' });
          d.style.left = (k.t * pps - 4) + 'px';
          div.appendChild(d);
        }
      }
    }

    div.addEventListener('dblclick', async e => {
      if (e.target.closest('.trim-handle') || e.target.closest('.kf-diamond') || e.target.closest('.transition-badge')) return;
      const name = await ui.prompt({ title: 'Rename clip', fields: [{ label: 'Name', value: clip.name }], confirmLabel: 'Rename' });
      if (name?.[0]) {
        const c = getClip(clip.id);
        if (c) { commitLite(c, () => { c.name = name[0]; }, 'Rename clip'); }
      }
    });
    div.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); this._clipContextMenu(e, clip.id); });
    return div;
  }

  addKeyframesAtPlayhead() {
    const ids = Array.isArray(store.ui.selection) ? store.ui.selection : [];
    const clip = ids.length === 1 ? getClip(ids[0]) : null;
    if (!clip || clip.type === 'audio') { ui.toast('Select one video, image, text or sticker clip first.', 'warn'); return; }
    const local = clamp(Number(store.ui.currentTime || 0) - Number(clip.start || 0), 0, Number(clip.duration || 0));
    const cap = history.begin('Add keyframes');
    for (const kp of KEY_PATHS.filter(k => k.path !== 'volume')) keyframes.setKey(clip, kp.path, local, keyframes.resolve(clip, kp.path, local));
    history.end(cap); markDirty(); bus.emit('clips:changed'); preview.requestDrawPublic();
    ui.toast(`Keyframes added at ${local.toFixed(2)}s`, 'success', 1200);
    this.render();
  }

  _drawClipCanvas(clip, canvas, div) {
    if (!div.isConnected) return;
    const w = Math.max(2, Math.floor(div.clientWidth)), h = Math.max(2, Math.floor(div.clientHeight));
    if (canvas.clientWidth === 0) { requestAnimationFrame(() => this._drawClipCanvas(clip, canvas, div)); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * dpr; canvas.height = h * dpr;
    const key = `${clip.id}|${w}x${h}|${clip.sourceStart.toFixed(3)}|${clip.duration.toFixed(3)}|${clip.speed}|${clip.mediaId}`;
    const cached = this.clipCanvasCache.get(key);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    if (cached) { ctx.drawImage(cached, 0, 0, w, h); return; }
    const oc = document.createElement('canvas');
    oc.width = w; oc.height = h;
    const octx = oc.getContext('2d');
    if (clip.type === 'video' || clip.type === 'image') this._paintThumbTiles(clip, octx, w, h);
    else if (clip.type === 'audio') this._paintWaveform(clip, octx, w, h);
    else if (clip.type === 'sticker') {
      octx.fillStyle = '#1b241f'; octx.fillRect(0, 0, w, h);
      octx.textAlign = 'center'; octx.textBaseline = 'middle';
      octx.font = `${Math.max(18, Math.min(h * 0.72, 46))}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      octx.fillText(clip.sticker?.emoji || '★', w / 2, h / 2);
    } else if (clip.type === 'text') {
      octx.fillStyle = '#2a2114'; octx.fillRect(0, 0, w, h);
      octx.fillStyle = '#f5a524'; octx.font = `700 ${Math.max(10, Math.min(h * 0.45, 28))}px Arial`;
      octx.textAlign = 'center'; octx.textBaseline = 'middle';
      octx.fillText((clip.text?.content || 'TEXT').split('\n')[0].slice(0, 24), w / 2, h / 2);
    }
    if (this.clipCanvasCache.size > 400) this.clipCanvasCache.clear();
    this.clipCanvasCache.set(key, oc);
    ctx.drawImage(oc, 0, 0);
  }

  _thumbImg(dataUrl) {
    let img = this.thumbImgs.get(dataUrl);
    if (!img) { img = new Image(); img.src = dataUrl; this.thumbImgs.set(dataUrl, img); }
    return img;
  }

  _paintThumbTiles(clip, ctx, w, h) {
    const m = getMedia(clip.mediaId);
    ctx.fillStyle = clip.type === 'image' ? '#22304a' : '#1b2334';
    ctx.fillRect(0, 0, w, h);
    const thumb = m ? media.getThumb(m.id) : null;
    if (!thumb) return;
    const img = this._thumbImg(thumb);
    if (!img.complete || !img.naturalWidth) { img.onload = () => this.renderClips(); return; }
    const tileW = h * 16 / 9;
    for (let x = 0; x < w; x += tileW) ctx.drawImage(img, x, 0, tileW, h);
  }

  _paintWaveform(clip, ctx, w, h) {
    const m = getMedia(clip.mediaId);
    ctx.fillStyle = 'rgba(76,141,255,0.07)';
    ctx.fillRect(0, 0, w, h);
    if (!m || !m.duration) return;
    const peaks = media.getPeaks(m.id);
    if (!peaks) {
      ctx.fillStyle = '#5e6a84'; ctx.font = '600 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText('waveform…', w / 2, h / 2);
      return;
    }
    ctx.fillStyle = 'rgba(96,156,255,0.85)';
    const t0 = clamp(clip.sourceStart / m.duration, 0, 1);
    const t1 = clamp((clip.sourceStart + clip.duration * clip.speed) / m.duration, 0, 1);
    const total = peaks.length;
    for (let x = 0; x < w; x++) {
      const idx = Math.floor((t0 + (x / w) * (t1 - t0)) * total);
      const v = peaks[clamp(idx, 0, total - 1)] || 0;
      const bh = Math.max(1, v * (h - 10));
      ctx.fillRect(x, (h - bh) / 2, 1, bh);
    }
  }

  _redrawClipCanvas(div, clip) {
    const canvas = div.querySelector('canvas');
    if (canvas) this._drawClipCanvas(clip, canvas, div);
  }

  _bindToolbar() {
    $('#btn-keyframe')?.addEventListener('click', () => this.addKeyframesAtPlayhead());
    $('#btn-split').addEventListener('click', () => actions.split());
    $('#btn-delete-clip').addEventListener('click', () => actions.deleteSelection());
    $('#btn-ripple-delete').addEventListener('click', () => actions.rippleDelete());
    $('#btn-duplicate').addEventListener('click', () => actions.duplicate());
    $('#btn-copy-clip').addEventListener('click', () => actions.copy());
    $('#btn-paste-clip').addEventListener('click', () => actions.paste());
    $('#btn-add-marker').addEventListener('click', () => actions.addMarkerAt(preview.time));
    const snapBtn = $('#btn-toggle-snap');
    snapBtn.classList.toggle('active', store.ui.snap);
    snapBtn.addEventListener('click', () => {
      store.ui.snap = !store.ui.snap;
      snapBtn.classList.toggle('active', store.ui.snap);
      ui.toast(`Snapping ${store.ui.snap ? 'on' : 'off'}`, 'info', 1200);
    });
    $('#btn-zoom-out').addEventListener('click', () => this.zoomTo(store.ui.pxPerSec / 1.3));
    $('#btn-zoom-in').addEventListener('click', () => this.zoomTo(store.ui.pxPerSec * 1.3));
    $('#btn-zoom-fit').addEventListener('click', () => this.fitZoom());
    $('#timeline-zoom-slider').addEventListener('input', e => this.zoomTo(Number(e.target.value)));
    $('#btn-add-video-track').addEventListener('click', () => actions.addTrack('video'));
    $('#btn-add-audio-track').addEventListener('click', () => actions.addTrack('audio'));
  }

  /* ============ pointer interactions ============ */

  _bindPointer() {
    this.tracksEl.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const kf = e.target.closest('.kf-diamond');
      if (kf) { this._kfDrag(kf, e); return; }
      const clipEl = e.target.closest('.clip');
      if (clipEl) this._clipPointerDown(clipEl, e);
      else if (e.target.closest('.lane')) {
        SELECTION.clear();
        this._beginScrub(e);
      }
    });
    this.rulerWrap.addEventListener('pointerdown', e => { if (e.button === 0) this._beginScrub(e); });
  }

  _beginScrub(e) {
    e.preventDefault();
    this._scrubTo(e);
    const move = ev => this._scrubTo(ev);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  _scrubTo(e) {
    const rect = this.rulerWrap.getBoundingClientRect();
    const t = Math.max(0, (e.clientX - rect.left + this.scroll.scrollLeft) / store.ui.pxPerSec);
    preview.seek(t);
  }

  _kfDrag(kfEl, e) {
    e.preventDefault(); e.stopPropagation();
    const clipEl = kfEl.closest('.clip');
    const clip = getClip(clipEl?.dataset.clipId);
    if (!clip) return;
    const path = kfEl.dataset.path;
    const key = clip.keyframes[path]?.find(k => Math.abs(k.t - Number(kfEl.dataset.t)) < 0.03);
    if (!key) return;
    const cap = history.begin('Move keyframe');
    const laneRect = clipEl.getBoundingClientRect();
    const pps = store.ui.pxPerSec;
    const move = ev => {
      let t = clamp((ev.clientX - laneRect.left) / pps, 0, clip.duration);
      key.t = t;
      kfEl.style.left = (t * pps - 4) + 'px';
      preview.requestRedraw();
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      history.end(cap); markDirty(); this.renderClips();
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    kfEl.addEventListener('contextmenu', ev => {
      ev.preventDefault(); ev.stopPropagation();
      ui.openContextMenu(ev.clientX, ev.clientY, [
        { label: 'Delete keyframe', icon: 'trash', danger: true, action: () => {
          const c = getClip(clip.id);
          if (c) { commitLite(c, () => keyframesRemove(c, path, key.t), 'Delete keyframe'); }
        } },
      ]);
    });
  }

  _clipPointerDown(clipEl, e) {
    const clip = getClip(clipEl.dataset.clipId);
    if (!clip) return;
    const track = getTrack(clip.trackId);
    if (e.shiftKey) SELECTION.toggle(clip.id);
    else if (!store.ui.selection.includes(clip.id)) SELECTION.set([clip.id]);
    if (track?.locked) return;

    const isTrimL = e.target.classList.contains('trim-handle') && e.target.classList.contains('left');
    const isTrimR = e.target.classList.contains('trim-handle') && e.target.classList.contains('right');
    const mode = isTrimL ? 'trim-l' : isTrimR ? 'trim-r' : 'move';
    const pps = store.ui.pxPerSec;
    const startX = e.clientX, startY = e.clientY;
    const orig = {
      start: clip.start, duration: clip.duration, sourceStart: clip.sourceStart,
      sourceDuration: clip.sourceDuration, trackId: clip.trackId,
      keyframes: deepClone(clip.keyframes || {}),
    };
    const m = getMedia(clip.mediaId);
    const isMediaBased = clip.type === 'video' || clip.type === 'audio';
    const mediaDur = m && m.duration ? m.duration : Infinity;
    const lanes = [...this.laneEls.values()].map(l => {
      const r = l.trackDiv.getBoundingClientRect();
      return { id: l.track.id, kind: l.track.kind, locked: l.track.locked, top: r.top, bottom: r.bottom, el: l.el, trackDiv: l.trackDiv };
    });
    let cap = null, moved = false, targetTrackId = orig.trackId;

    const onMove = ev => {
      const dxT = (ev.clientX - startX) / pps;
      if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 4) {
        moved = true;
        cap = history.begin(mode === 'move' ? 'Move clip' : 'Trim clip');
        clipEl.classList.add('dragging');
      }
      if (!moved) return;
      if (mode === 'move') {
        let ns = this._snap(orig.start + dxT, orig.duration, clip.id);
        clip.start = Math.max(0, ns);
        const lane = lanes.find(l => ev.clientY >= l.top && ev.clientY < l.bottom);
        const wantKind = clip.type === 'audio' ? 'audio' : 'video';
        if (lane && !lane.locked && lane.kind === wantKind && lane.id !== orig.trackId) targetTrackId = lane.id;
        else if (lane && lane.id === orig.trackId) targetTrackId = orig.trackId;
        if (targetTrackId !== clip.trackId) {
          const tl = this.laneEls.get(targetTrackId);
          if (tl) { tl.el.appendChild(clipEl); clip.trackId = targetTrackId; }
        }
      } else if (mode === 'trim-l') {
        let ns = orig.start + dxT;
        const minS = isMediaBased ? orig.start - orig.sourceStart / clip.speed : 0;
        ns = clamp(ns, Math.max(0, minS), orig.start + orig.duration - 0.05);
        const dt = ns - orig.start;
        clip.start = ns;
        clip.duration = orig.duration - dt;
        if (isMediaBased) { clip.sourceStart = orig.sourceStart + dt * clip.speed; clip.sourceDuration = orig.sourceDuration - dt * clip.speed; }
        clip.keyframes = shiftKeysLocal(orig.keyframes, dt);
      } else {
        let ne = orig.start + orig.duration + dxT;
        const maxD = isMediaBased ? (mediaDur - orig.sourceStart) / clip.speed : Infinity;
        ne = clamp(ne, orig.start + 0.05, orig.start + maxD);
        clip.duration = ne - orig.start;
        if (isMediaBased) clip.sourceDuration = clip.duration * clip.speed;
      }
      clipEl.style.left = clip.start * pps + 'px';
      clipEl.style.width = Math.max(8, clip.duration * pps) + 'px';
      const lbl = clipEl.querySelector('.clip-dur');
      if (lbl) lbl.textContent = formatDur(clip.duration);
      this._redrawClipCanvas(clipEl, clip);
      preview.requestRedraw();
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      clipEl.classList.remove('dragging');
      if (moved) {
        history.end(cap);
        markDirty();
        this.renderClips();
        this.layout();
        bus.emit('clips:changed');
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  _snap(start, duration, excludeId) {
    if (!store.ui.snap) return start;
    const pps = store.ui.pxPerSec;
    const thr = 9 / pps;
    const targets = [0, preview.time, ...store.project.markers.map(mk => mk.time)];
    for (const c of store.project.clips) {
      if (c.id === excludeId) continue;
      targets.push(c.start, c.start + c.duration);
    }
    let best = null, bestD = thr;
    for (const t of targets) {
      const d1 = Math.abs(start - t);
      if (d1 < bestD) { bestD = d1; best = t; }
      const d2 = Math.abs(start + duration - t);
      if (d2 < bestD) { bestD = d2; best = t - duration; }
    }
    return best ?? start;
  }

  /* ============ drag & drop from panels ============ */

  beginLibraryDrag(e, payload, handlers) {
    if (e.button !== 0) return;
    e.preventDefault();
    const pps = store.ui.pxPerSec;
    let active = false, ghost = null, hover = null, junction = null, clipHover = null;
    const onMove = ev => {
      if (!active && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 5) {
        active = true;
        ghost = el('div', { id: 'drag-ghost' });
        if (payload.thumb) ghost.appendChild(el('img', { src: payload.thumb, alt: '' }));
        ghost.appendChild(el('div', { class: 'ghost-label', text: payload.label || '' }));
        document.body.appendChild(ghost);
      }
      if (!active) return;
      ghost.style.left = ev.clientX + 12 + 'px';
      ghost.style.top = ev.clientY + 10 + 'px';
      this._clearDropHints();
      const rect = this.scroll.getBoundingClientRect();
      const inTl = ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
      if (!inTl) return;
      const time = Math.max(0, (ev.clientX - rect.left + this.scroll.scrollLeft) / pps);
      const lane = [...this.laneEls.values()].find(l => {
        const r = l.trackDiv.getBoundingClientRect();
        return ev.clientY >= r.top && ev.clientY < r.bottom;
      });
      if (payload.kind === 'media' || payload.kind === 'sticker') {
        if (!lane) return;
        const wantKind = payload.kind === 'sticker' ? 'video' : (payload.media?.type === 'audio' ? 'audio' : 'video');
        const ok = lane.track.kind === wantKind && !lane.track.locked;
        lane.trackDiv.classList.add(ok ? 'drop-ok' : 'drop-bad');
        this._showIndicator(lane, time, false);
        hover = { lane, time, ok, wantKind };
      } else if (payload.kind === 'effect') {
        const ce = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.clip');
        if (ce) { ce.classList.add('drop-target'); clipHover = ce.dataset.clipId; }
      } else if (payload.kind === 'transition') {
        if (!lane || lane.track.locked) return;
        for (const c of trackClips(lane.track.id)) {
          if (Math.abs(c.start - time) < 14 / pps) {
            junction = { trackId: lane.track.id, boundary: c.start };
            this._showIndicator(lane, c.start, true);
            break;
          }
        }
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this._clearDropHints();
      ghost?.remove();
      if (!active) return;
      if ((payload.kind === 'media' || payload.kind === 'sticker')) {
        if (hover?.ok) handlers.onTimelineDrop?.(hover.lane.id, hover.time);
        else if (hover && !hover.ok) handlers.onTimelineDrop?.(null, hover.time, hover.wantKind);
      } else if (payload.kind === 'effect') {
        if (clipHover) handlers.onClipDrop?.(clipHover);
      } else if (payload.kind === 'transition') {
        if (junction) handlers.onJunctionDrop?.(junction.trackId, junction.boundary);
        else ui.toast('Drop onto the cut point between two adjacent clips.', 'info');
      }
      hover = null; junction = null; clipHover = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  _showIndicator(lane, time, isJunction) {
    const tlRight = this.rulerWrap.parentElement.getBoundingClientRect();
    const tr = lane.trackDiv.getBoundingClientRect();
    this.dropInd.classList.add('on');
    this.dropInd.classList.toggle('junction', !!isJunction);
    this.dropInd.style.left = time * store.ui.pxPerSec - this.scroll.scrollLeft - tlRight.left + 'px';
    this.dropInd.style.top = tr.top - tlRight.top + 'px';
    this.dropInd.style.height = tr.height + 'px';
  }

  _clearDropHints() {
    this.dropInd.classList.remove('on', 'junction');
    for (const l of this.laneEls.values()) l.trackDiv.classList.remove('drop-ok', 'drop-bad');
    document.querySelectorAll('.clip.drop-target').forEach(c => c.classList.remove('drop-target'));
  }

  /* ============ context menus ============ */

  _clipContextMenu(e, clipId) {
    const clip = getClip(clipId);
    if (!clip) return;
    if (!store.ui.selection.includes(clipId)) SELECTION.set([clipId]);
    const items = [];
    if (clip.type === 'video') items.push({ label: 'Detach audio', icon: 'music', action: () => actions.detachAudio(clip.id) });
    items.push(
      { label: 'Split at playhead', icon: 'scissors', shortcut: 'S', action: () => actions.split() },
      { label: 'Roll edit +', icon: 'shuffle', action: () => actions.rollEdit(1) },
      { label: 'Roll edit −', icon: 'shuffle', action: () => actions.rollEdit(-1) },
      { label: 'Slide edit', icon: 'shuffle', action: () => actions.slideEdit(1) },
      { label: 'Slip edit', icon: 'shuffle', action: () => actions.slipEdit(1) },
      { separator: true },
      { label: 'Copy', icon: 'copy', shortcut: 'Ctrl+C', action: () => actions.copy() },
      { label: 'Cut', shortcut: 'Ctrl+X', action: () => actions.cut() },
      { label: 'Duplicate', shortcut: 'Ctrl+D', action: () => actions.duplicate() },
      { label: 'Paste', shortcut: 'Ctrl+V', disabled: !actions.hasClipboard(), action: () => actions.paste() },
      { separator: true },
      { label: 'Rename', icon: 'type', action: async () => {
        const name = await ui.prompt({ title: 'Rename clip', fields: [{ label: 'Name', value: clip.name }], confirmLabel: 'Rename' });
        if (name?.[0]) { const c = getClip(clip.id); if (c) commitLite(c, () => { c.name = name[0]; }, 'Rename clip'); }
      } },
    );
    if (clip.type === 'video' || clip.type === 'image' || clip.type === 'audio') {
      items.push({ label: 'Replace media…', icon: 'shuffle', action: async () => {
        const mediaId = await ui.pickMedia('Replace clip media');
        if (mediaId) actions.replaceClipMedia(clip.id, mediaId);
      } });
    }
    items.push(
      { separator: true },
      { label: 'Ripple delete', icon: 'ripple', action: () => actions.rippleDelete() },
      { label: 'Delete', icon: 'trash', shortcut: 'Del', danger: true, action: () => actions.deleteSelection() },
    );
    ui.openContextMenu(e.clientX, e.clientY, items);
  }

  _rulerContextMenu(e) {
    e.preventDefault();
    const rect = this.rulerWrap.getBoundingClientRect();
    const time = Math.max(0, (e.clientX - rect.left + this.scroll.scrollLeft) / store.ui.pxPerSec);
    const marker = store.project.markers.find(mk => Math.abs(mk.time - time) < 10 / store.ui.pxPerSec);
    if (marker) {
      ui.openContextMenu(e.clientX, e.clientY, [
        { label: `Jump to ${formatTC(marker.time)}`, icon: 'play', action: () => preview.seek(marker.time) },
        { label: 'Rename marker', icon: 'type', action: async () => {
          const name = await ui.prompt({ title: 'Rename marker', fields: [{ label: 'Label', value: marker.label }], confirmLabel: 'Rename' });
          if (name?.[0]) actions.updateMarker(marker.id, { label: name[0] });
        } },
        { label: 'Change color', icon: 'star', action: () => {
          const idx = MARKER_COLORS.indexOf(marker.color);
          actions.updateMarker(marker.id, { color: MARKER_COLORS[(idx + 1) % MARKER_COLORS.length] });
        } },
        { separator: true },
        { label: 'Delete marker', icon: 'trash', danger: true, action: () => actions.deleteMarker(marker.id) },
      ]);
    } else {
      ui.openContextMenu(e.clientX, e.clientY, [
        { label: `Add marker at ${formatTC(time)}`, icon: 'flag', action: () => actions.addMarkerAt(time) },
      ]);
    }
  }

  /* ============ playhead / zoom ============ */

  updatePlayhead() { this._updatePlayheadPos(); }

  _updatePlayheadPos() {
    if (!store.project) return;
    const x = preview.time * store.ui.pxPerSec - this.scroll.scrollLeft;
    this.playheadEl.style.left = x + 'px';
    this.playheadEl.classList.add('on');
  }

  ensureVisible(t) {
    const x = t * store.ui.pxPerSec;
    const vl = this.scroll.scrollLeft, vr = vl + this.scroll.clientWidth;
    if (x < vl + 80 || x > vr - 80) this.scroll.scrollLeft = Math.max(0, x - this.scroll.clientWidth / 2);
    this._updatePlayheadPos();
  }

  zoomTo(pps, focusT) {
    pps = clamp(pps, 4, 400);
    const prev = store.ui.pxPerSec;
    if (focusT == null) focusT = preview.time;
    const screenX = focusT * prev - this.scroll.scrollLeft;
    store.ui.pxPerSec = pps;
    $('#timeline-zoom-slider').value = String(pps);
    this.scroll.scrollLeft = Math.max(0, focusT * pps - screenX);
    this.layout();
    this.renderClips();
    this.drawRuler();
  }

  fitZoom() {
    const pps = (this.scroll.clientWidth - 80) / Math.max(totalDuration(), 1);
    this.zoomTo(pps, 0);
  }

  drawRuler() {
    const p = store.project;
    if (!p) return;
    const wrap = this.rulerWrap;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const vw = wrap.clientWidth, vh = 32;
    this.ruler.width = vw * dpr; this.ruler.height = vh * dpr;
    this.ruler.style.width = vw + 'px'; this.ruler.style.height = vh + 'px';
    const ctx = this.ruler.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    const pps = store.ui.pxPerSec;
    const scrollLeft = this.scroll.scrollLeft;
    const t0 = scrollLeft / pps, t1 = (scrollLeft + vw) / pps;
    const steps = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    const step = steps.find(s => s * pps >= 72) || 600;
    ctx.fillStyle = '#5e6a84';
    ctx.strokeStyle = '#333e58';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.beginPath();
    for (let tt = Math.floor(t0 / step) * step; tt <= t1 + step; tt += step) {
      const x = Math.round(tt * pps - scrollLeft) + 0.5;
      ctx.moveTo(x, 18); ctx.lineTo(x, 32);
      ctx.fillText(timeline.stepLabel(tt, step), x + 4, 3);
      for (let i = 1; i < 4; i++) {
        const mx = Math.round((tt + (step * i) / 4) * pps - scrollLeft) + 0.5;
        ctx.moveTo(mx, 26); ctx.lineTo(mx, 32);
      }
    }
    ctx.stroke();
    // markers
    for (const mk of p.markers) {
      const x = mk.time * pps - scrollLeft;
      if (x < -20 || x > vw + 20) continue;
      ctx.fillStyle = mk.color || '#f5a524';
      ctx.beginPath();
      ctx.moveTo(x, 32); ctx.lineTo(x + 4, 24); ctx.lineTo(x + 30, 24); ctx.lineTo(x + 30, 14); ctx.lineTo(x - 0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0a0c10';
      ctx.font = '700 9px Arial';
      ctx.fillText(mk.label.slice(0, 6), x + 2, 16);
    }
  }
}

function p_stepLabel(tt, step) {
  if (step >= 1) return formatDur(tt);
  return tt.toFixed(2) + 's';
}

function shiftKeysLocal(keyframesObj, dt) {
  const out = {};
  for (const [path, keys] of Object.entries(keyframesObj || {})) {
    out[path] = keys.map(k => ({ t: Math.max(0, k.t + dt), v: k.v })).sort((a, b) => a.t - b.t);
  }
  return out;
}

function keyframesRemove(clip, path, t) {
  const ks = clip.keyframes?.[path];
  if (!ks) return;
  const i = ks.findIndex(k => Math.abs(k.t - t) < 0.03);
  if (i >= 0) ks.splice(i, 1);
}

/** Mutate a clip through the history system without a full clips:changed re-render. */
function commitLite(clip, fn, label) {
  const cap = history.begin(label);
  fn(clip);
  history.end(cap);
  markDirty();
  bus.emit('clip:updated');
  bus.emit('clips:changed');
}

export const timeline = new Timeline();
Object.defineProperty(timeline, 'stepLabel', { value: p_stepLabel });

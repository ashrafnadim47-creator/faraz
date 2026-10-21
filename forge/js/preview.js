/* FORGE — preview engine: real canvas compositor, playback clock, audio sync, transform handles */
import { store, bus, getTrack, getMedia, trackClips, totalDuration, volumeAt, activeAt } from './state.js';
import { $, el, clamp, formatTC, escapeHtml, deepClone } from './utils.js';
import { audioEngine } from './audio.js';
import { filterString, evalEffects, drawStickerShape } from './effects.js';
import { keyframes } from './keyframes.js';
import * as history from './history.js';
import { markDirty } from './project.js';
import { ui } from './ui.js';
import { media } from './media.js';
import { transitionSource, transitionPairs } from './transitions.js';

class Preview {
  constructor() {
    this.canvas = null; this.ctx = null; this.layer = null; this.stage = null; this.stageWrap = null;
    this.time = 0; this.playing = false; this.dirty = true;
    this.quality = Number(store.ui.settings.previewQuality) || 1;
    this.lastTs = 0;
    this.els = new Map();   // mediaId -> HTMLVideoElement/Audio
    this.imgs = new Map();  // mediaId -> HTMLImageElement
    this.thumbImgs = new Map();
    this.libPreview = null; this.libEl = null;
    this._loop = this._loop.bind(this);
  }

  init() {
    this.canvas = $('#preview-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.layer = $('#transform-layer');
    this.stage = $('#preview-stage');
    this.stageWrap = $('#preview-stage-wrap');
    this.banner = el('div', { id: 'lib-preview-banner', 'data-testid': 'lib-preview-banner' });
    this.stageWrap.appendChild(this.banner);
    this._bindTransport();
    window.addEventListener('resize', () => this.applyZoom());
    this.onProjectSettings();
    requestAnimationFrame(this._loop);
  }

  onProjectLoaded() {
    this.time = 0;
    store.ui.currentTime = 0;
    this.clearLibPreview(true);
    this.dirty = true;
    this.syncMedia();
  }

  requestRedraw() {
    this.dirty = true;
  }

  /** Open a safe preview of a library item without turning it into a timeline clip. */
  setLibraryPreview(item) {
    this.clearLibPreview(true);
    if (!item) return false;
    this.libPreview = item;
    if (item.type === 'video' || item.type === 'audio') {
      const url = media.getBlobUrl(item.id);
      if (url) {
        this.libEl = document.createElement(item.type === 'audio' ? 'audio' : 'video');
        this.libEl.src = url;
        this.libEl.preload = 'auto';
        this.libEl.muted = item.type !== 'audio';
        this.libEl.addEventListener('loadeddata', () => this.requestRedraw(), { once: true });
        this.libEl.addEventListener('ended', () => { if (this.libPreview === item) this.clearLibPreview(false); });
        this.libEl.addEventListener('error', () => ui.toast(`Preview failed: ${item.name || 'media'}`, 'warn', 2500));
        this.libEl.load();
      }
    }
    if (this.banner) {
      this.banner.textContent = `Library preview · ${item.name || 'Media'} · Esc to close`;
      this.banner.classList.add('visible');
    }
    this.dirty = true;
    if (this.libEl) {
      audioEngine.ensureContext();
      audioEngine.attach(this.libEl);
      this.libEl.play().catch(() => {});
    }
    return true;
  }

  clearLibPreview(redraw = true) {
    if (this.libEl) {
      try { this.libEl.pause(); } catch (_) {}
      try { this.libEl.removeAttribute('src'); this.libEl.load(); } catch (_) {}
      this.libEl = null;
    }
    this.libPreview = null;
    if (this.banner) this.banner.classList.remove('visible');
    if (redraw) { this.dirty = true; if (!this.playing) this.draw(); }
    return true;
  }

  // Public compatibility API used by inspector/effect controls.
  setPlaybackRate(rate) {
    const r = Number(rate) || 1;
    store.ui.playbackRate = clamp(r, -4, 16);
    this.syncMedia();
    this.requestRedraw();
    bus.emit('playback-rate', store.ui.playbackRate);
    return store.ui.playbackRate;
  }

  requestDrawPublic() {
    this.requestRedraw();
    if (!this.playing) this.draw();
  }

  /* ---------- canvas sizing ---------- */
  onProjectSettings() {
    const p = store.project;
    if (!p) return;
    this.canvas.width = Math.round(p.settings.width * this.quality);
    this.canvas.height = Math.round(p.settings.height * this.quality);
    this.applyZoom();
    this.dirty = true;
  }

  setQuality(q) {
    this.quality = q;
    this.onProjectSettings();
    this.syncMedia(); this.draw();
  }

  applyZoom() {
    if (!this.canvas || !store.project) return;
    const { width: W, height: H } = store.project.settings;
    const mode = store.ui.previewZoom;
    let scale;
    if (mode === 'fit') {
      const availW = Math.max(120, this.stageWrap.clientWidth - 48);
      const availH = Math.max(80, this.stageWrap.clientHeight - 48);
      scale = Math.min(availW / W, availH / H, 3);
    } else if (mode === '50%') scale = 0.5;
    else scale = 1;
    this.canvas.style.width = Math.round(W * scale) + 'px';
    this.canvas.style.height = Math.round(H * scale) + 'px';
    this.updateHandles();
  }

  /* ---------- transport ---------- */
  play() {
    if (!store.project) return;
    if (this.libPreview) this.clearLibPreview();
    if (this.time >= totalDuration() - 0.005) this.time = 0;
    audioEngine.ensureContext();
    this.els.forEach(elm => audioEngine.attach(elm));
    this.playing = true;
    this.lastTs = performance.now();
    $('#btn-play')?.classList.add('playing');
    bus.emit('transport');
  }

  pause() {
    this.playing = false;
    this.syncMedia();
    this.draw();
    $('#btn-play')?.classList.remove('playing');
    bus.emit('transport');
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  seek(t) {
    if (this.libPreview) this.clearLibPreview();
    this.time = clamp(t, 0, Math.max(totalDuration(), 0));
    store.ui.currentTime = this.time;
    this.syncMedia();
    this.draw();
    bus.emit('playhead');
    this.updateHandles();
  }

  /* ---------- element pools ---------- */
  getEl(m) {
    let elv = this.els.get(m.id);
    if (!elv) {
      const url = media.getBlobUrl(m.id);
      if (!url) return null;
      elv = document.createElement(m.type === 'audio' ? 'audio' : 'video');
      elv.src = url; elv.preload = 'auto';
      elv.load();
      elv.addEventListener('seeked', () => { this.dirty = true; });
      elv.addEventListener('error', () => { clipMissing(m.id); });
      this.els.set(m.id, elv);
      if (audioEngine.hasContext()) audioEngine.attach(elv);
    }
    return elv;
  }

  getImg(m) {
    let img = this.imgs.get(m.id);
    if (!img) {
      const url = media.getBlobUrl(m.id);
      if (!url) return null;
      img = new Image();
      img.onload = () => { this.dirty = true; };
      img.src = url;
      this.imgs.set(m.id, img);
    }
    return img;
  }

  trackHidden(clip) { const tr = getTrack(clip.trackId); return tr ? !!tr.hidden : false; }

  /* ---------- media sync (clock discipline) ---------- */
  syncMedia() {
    const p = store.project;
    if (!p) return;
    const t = this.time;
    const pairs = transitionPairs(p);
    for (const clip of p.clips) {
      if (clip.type !== 'video' && clip.type !== 'audio') continue;
      const m = getMedia(clip.mediaId);
      if (!m || clip.missing) continue;
      const inRange = activeAt(clip, t);
      const transitionForClip = pairs.find(pr => pr.B.id === clip.id || pr.A?.id === clip.id);
      let inTrans = false;
      let frozenTime = null;
      if (transitionForClip) {
        const { A, B, trans } = transitionForClip;
        const boundary = B.start, d = trans.duration;
        inTrans = t >= boundary - d / 2 && t < boundary + d / 2;
        if (inTrans) {
          if (clip.id === B.id && t < boundary) frozenTime = B.start;
          if (A && clip.id === A.id && t >= boundary) frozenTime = A.start + A.duration;
        }
      }
      if (!inRange && !inTrans && !this.els.has(m.id)) continue;
      const elv = this.getEl(m);
      if (!elv) continue;
      const baseLocal = Math.max(0, t - clip.start);
      const desired = clamp(clip.sourceStart + baseLocal * clip.speed, 0, Math.max(0, (m.duration || 1e9) - 0.05));
      const frozenDesired = frozenTime == null ? desired : clamp(clip.sourceStart + Math.max(0, frozenTime - clip.start) * clip.speed, 0, Math.max(0, (m.duration || 1e9) - 0.05));
      const isTransitionA = !!transitionForClip?.A && transitionForClip.A.id === clip.id;
      const isTransitionB = transitionForClip?.B?.id === clip.id;
      const transitionBoundary = transitionForClip?.B?.start ?? 0;
      // During a video transition both source clips must be alive at once.
      // Premiere-style transitions are an overlap in time even when the timeline
      // clips themselves remain butt-cut. The compositor samples the outgoing
      // last frame and incoming first/current frame while audio crossfades.
      const requestedRate = Number(store.ui.playbackRate || 1);
      const shouldPlay = this.playing && !this.trackHidden(clip) && requestedRate >= 0 && (inRange || inTrans);
      if (shouldPlay) {
        const rate = clamp(clip.speed * requestedRate, 0.1, 16);
        if (elv.playbackRate !== rate) elv.playbackRate = rate;
        const target = inTrans ? frozenDesired : desired;
        if (elv.paused) { try { elv.currentTime = target; } catch (e) {} elv.play().catch(() => {}); }
        else if (Math.abs(elv.currentTime - target) > 0.2) { try { elv.currentTime = target; } catch (e) {} }
      } else {
        if (!elv.paused) elv.pause();
        const target = inRange || inTrans ? (inTrans ? frozenDesired : desired) : desired;
        if ((inRange || inTrans) && Math.abs(elv.currentTime - target) > 0.05) { try { elv.currentTime = target; } catch (e) {} }
      }
      let gain = 0;
      if (inTrans && transitionForClip) {
        const tp = clamp((t - (transitionBoundary - transitionForClip.trans.duration / 2)) / transitionForClip.trans.duration, 0, 1);
        if (isTransitionA) gain = 1 - tp;
        else if (isTransitionB) gain = tp;
      } else if (inRange) {
        gain = 1;
      }
      audioEngine.setAudioEffects?.(elv, clip.audioEffects || []);
      audioEngine.setGain(elv, gain > 0 ? volumeAt(clip, t) * gain : 0);
    }
    if (this.libEl) audioEngine.setGain(this.libEl, 1);
  }

  /* ---------- main loop ---------- */
  _loop(ts) {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.25, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    if (this.playing) {
      this.time += dt * clamp(store.ui.playbackRate, 0.1, 16);
      store.ui.currentTime = this.time;
      const dur = totalDuration();
      if (this.time >= dur) { this.time = dur; this.pause(); }
      this.syncMedia();
      this.draw();
      bus.emit('playhead');
      this.updateHandles();
    } else if (this.libPreview) {
      this.syncLib(); this.draw();
    } else if (this.dirty) {
      this.syncMedia();
      this.draw();
    }
    this.dirty = false;
  }

  syncLib() {
    if (this.libEl && this.libEl.paused && this.libEl.currentTime < (this.libEl.duration || 1e9)) {
      this.libEl.play().catch(() => {});
    }
  }

  /* ---------- drawing ---------- */
  draw() {
    const p = store.project;
    if (!p || !this.ctx) return;
    const W = p.settings.width, H = p.settings.height;
    const ctx = this.ctx;
    ctx.setTransform(this.quality, 0, 0, this.quality, 0, 0);
    ctx.fillStyle = p.settings.background || '#000000';
    ctx.fillRect(0, 0, W, H);
    if (this.libPreview) return this._drawLibPreview(W, H);

    let flash = 0, glitch = 0;
    const bottomUp = [...p.tracks].reverse().filter(tr => tr.kind === 'video' && !tr.hidden);
    const activeTransitions = transitionPairs(p).filter(pr => {
      const b = pr.B.start, d = pr.trans.duration;
      return this.time >= b - d / 2 && this.time < b + d / 2;
    });
    const transitionClipIds = new Set();
    for (const pr of activeTransitions) {
      transitionClipIds.add(pr.B.id);
      if (pr.A) transitionClipIds.add(pr.A.id);
    }

    for (const tr of bottomUp) {
      for (const clip of trackClips(tr.id)) {
        if (clip.type === 'text' || clip.type === 'sticker') continue;
        if (transitionClipIds.has(clip.id)) continue;
        if (clip.missing && activeAt(clip, this.time)) { this._drawOffline(clip, W, H); continue; }
        if (activeAt(clip, this.time)) {
          const local = Math.max(0, this.time - clip.start);
          const fx = evalEffects(clip, local);
          flash = Math.max(flash, fx.flash);
          glitch = Math.max(glitch, fx.glitch);
          this.drawClip(clip, {});
        }
      }
    }

    for (const pr of activeTransitions) this._drawTransition(pr.B, pr.trans, W, H);

    const overlays = p.clips
      .filter(c => (c.type === 'text' || c.type === 'sticker') && !getTrack(c.trackId)?.hidden)
      .sort((a, b) => (a.start - b.start) || String(a.trackId).localeCompare(String(b.trackId)));
    for (const clip of overlays) {
      if (!activeAt(clip, this.time)) continue;
      const local = Math.max(0, this.time - clip.start);
      const fx = evalEffects(clip, local);
      flash = Math.max(flash, fx.flash);
      glitch = Math.max(glitch, fx.glitch);
      this.drawClip(clip, {});
    }

    if (glitch > 0.02) this._glitchPost(W, H, glitch);
    if (flash > 0.003) {
      ctx.save(); ctx.globalAlpha = clamp(flash, 0, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  _T(clip, local) {
    const l = Math.max(0, local);
    return {
      x: keyframes.resolve(clip, 'transform.x', l),
      y: keyframes.resolve(clip, 'transform.y', l),
      scale: keyframes.resolve(clip, 'transform.scale', l),
      rotation: keyframes.resolve(clip, 'transform.rotation', l),
      opacity: keyframes.resolve(clip, 'transform.opacity', l),
    };
  }

  drawClip(clip, opts) {
    const p = store.project;
    const W = p.settings.width, H = p.settings.height;
    const local = (opts.time ?? this.time) - clip.start;
    const fx = evalEffects(clip, Math.max(0, local));
    const T = this._T(clip, local);
    const alpha = clamp(T.opacity * fx.alpha * (opts.alpha ?? 1), 0, 1);
    if (alpha <= 0.002) return;
    const dx = (opts.dx || 0) + fx.dx, dy = (opts.dy || 0) + fx.dy;
    const scaleMul = (opts.scaleMul || 1) * fx.scaleMul;
    const rot = T.rotation + (fx.rot || 0) + (opts.rot || 0);
    const ctx = this.ctx;
    ctx.save();
    if (opts.wipe != null && opts.wipe < 1) {
      const wp = clamp(opts.wipe, 0, 1);
      const dir = opts.wipeDirection || 'left';
      ctx.beginPath();
      if (dir === 'right') ctx.rect(W * (1 - wp), 0, W * wp, H);
      else if (dir === 'up') ctx.rect(0, 0, W, H * wp);
      else if (dir === 'down') ctx.rect(0, H * (1 - wp), W, H * wp);
      else ctx.rect(0, 0, W * wp, H);
      ctx.clip();
    }
    const f = filterString(clip.filters, fx.extraBlur);
    if (f) ctx.filter = f;
    ctx.translate(W / 2 + T.x + dx, H / 2 + T.y + dy);
    ctx.rotate(rot * Math.PI / 180);
    const sc = Math.max(0.001, T.scale * scaleMul);
    ctx.scale(sc, sc);
    ctx.globalAlpha = alpha;
    let drawn = false;
    if (clip.type === 'video' || clip.type === 'image') {
      const m = getMedia(clip.mediaId);
      if (m && !clip.missing) {
        let source = null, sw = 0, sh = 0;
        if (clip.type === 'video') {
          const elv = this.getEl(m);
          if (elv && elv.readyState >= 2) { source = elv; sw = m.width || elv.videoWidth; sh = m.height || elv.videoHeight; }
        } else {
          const img = this.getImg(m);
          if (img && img.complete && img.naturalWidth) { source = img; sw = img.naturalWidth; sh = img.naturalHeight; }
        }
        if (source && sw > 0 && sh > 0) {
          const crop = clip.crop || { l: 0, t: 0, r: 0, b: 0 };
          const sx = sw * crop.l, sy = sh * crop.t;
          const csw = sw * (1 - crop.l - crop.r), csh = sh * (1 - crop.t - crop.b);
          if (csw > 1 && csh > 1) {
            const bs = Math.min(W / csw, H / csh);
            const bw = csw * bs, bh = csh * bs;
            try { ctx.drawImage(source, sx, sy, csw, csh, -bw / 2, -bh / 2, bw, bh); drawn = true; } catch (e) { /* transient */ }
          }
        }
      }
      if (!drawn) {
        const thumb = clip.mediaId ? media.getThumb(clip.mediaId) : null;
        if (thumb) {
          const tImg = this._thumbImg(thumb);
          if (tImg) { ctx.drawImage(tImg, -480, -270, 960, 540); drawn = true; }
        }
        if (!drawn) { ctx.fillStyle = '#151a24'; ctx.fillRect(-640, -360, 1280, 720); ctx.fillStyle = '#5e6a84'; ctx.font = '600 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(clip.name, 0, 0); }
      }
    } else if (clip.type === 'text') {
      this._drawText(ctx, clip);
    } else if (clip.type === 'sticker') {
      if (clip.sticker?.kind === 'emoji' && clip.sticker?.emoji) this._drawStickerEmoji(ctx, clip.sticker.emoji, Math.min(W, H) * 0.38);
      else drawStickerShape(ctx, clip.sticker?.shape || 'star', Math.min(W, H) * 0.4, clip.sticker?.color || '#f5a524');
    }
    ctx.restore();
    if (fx.chromatic > 0.001) {
      ctx.save();
      ctx.globalAlpha = clamp(fx.chromatic * 0.1, 0, 0.15);
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(this.canvas, -3 * fx.chromatic, 0, W, H);
      ctx.restore();
    }
    if (fx.vignette > 0.001) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.22, W / 2, H / 2, Math.max(W, H) * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${clamp(fx.vignette * 0.8, 0, 0.75)})`);
      ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  }

  _drawStickerEmoji(ctx, emoji, size) {
    ctx.save();
    ctx.font = `${Math.max(24, Math.round(size))}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = Math.max(4, size * .05);
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }

  _thumbImg(dataUrl) {
    let img = this.thumbImgs.get(dataUrl);
    if (!img) { img = new Image(); img.src = dataUrl; this.thumbImgs.set(dataUrl, img); }
    return img.complete && img.naturalWidth ? img : null;
  }

  _drawText(ctx, clip) {
    const tx = clip.text;
    if (!tx) return;
    const lines = String(tx.content ?? '').split('\n');
    const fs = Math.max(4, tx.size || 48);
    ctx.font = `${tx.italic ? 'italic ' : ''}${tx.bold ? '700' : '400'} ${fs}px ${tx.family || 'Arial'}, sans-serif`;
    try { ctx.letterSpacing = `${tx.letterSpacing || 0}px`; } catch (e) {}
    ctx.textAlign = tx.align || 'center';
    ctx.textBaseline = 'middle';
    const lh = fs * (tx.lineHeight || 1.2);
    const blockH = lines.length * lh;
    let maxW = 0;
    for (const line of lines) maxW = Math.max(maxW, ctx.measureText(line).width);
    if (tx.background && tx.background !== 'transparent') {
      ctx.save();
      ctx.fillStyle = tx.background;
      const padX = fs * 0.35, padY = fs * 0.2;
      const x = -maxW / 2 - padX, y = -blockH / 2 - padY, w = maxW + padX * 2, h = blockH + padY * 2, r = Math.min(14, fs * 0.2);
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
      ctx.fill();
      ctx.restore();
    }
    lines.forEach((line, i) => {
      const y = -blockH / 2 + lh / 2 + i * lh;
      const wpx = ctx.measureText(line).width;
      const ax = tx.align === 'left' ? -maxW / 2 : tx.align === 'right' ? maxW / 2 : 0;
      if (tx.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.78)'; ctx.shadowBlur = fs * 0.14; ctx.shadowOffsetY = fs * 0.05; }
      if ((tx.strokeWidth || 0) > 0) { ctx.lineWidth = tx.strokeWidth; ctx.strokeStyle = tx.strokeColor || '#000'; ctx.lineJoin = 'round'; ctx.strokeText(line, ax, y); }
      ctx.fillStyle = tx.color || '#fff';
      ctx.fillText(line, ax, y);
      if (tx.underline) {
        const ux = tx.align === 'left' ? -maxW / 2 : tx.align === 'right' ? maxW / 2 - wpx : -wpx / 2;
        ctx.fillRect(ux, y + fs * 0.42, wpx, Math.max(1.5, fs * 0.045));
      }
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    });
  }

  _measureText(tx) {
    const lines = String(tx?.content ?? '').split('\n');
    const fs = Math.max(4, tx?.size || 48);
    this.ctx.save();
    this.ctx.font = `${tx?.italic ? 'italic ' : ''}${tx?.bold ? '700' : '400'} ${fs}px ${tx?.family || 'Arial'}, sans-serif`;
    let maxW = 0;
    for (const line of lines) maxW = Math.max(maxW, this.ctx.measureText(line).width);
    this.ctx.restore();
    return { w: maxW, h: lines.length * fs * (tx?.lineHeight || 1.2) };
  }

  _drawOffline(clip, W, H) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(20,24,34,0.92)';
    ctx.fillRect(W * 0.2, H * 0.2, W * 0.6, H * 0.6);
    ctx.strokeStyle = 'rgba(239,68,68,0.8)'; ctx.lineWidth = 4;
    ctx.strokeRect(W * 0.2, H * 0.2, W * 0.6, H * 0.6);
    ctx.fillStyle = '#ef4444'; ctx.font = '700 42px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`Media offline — ${clip.name}`, W / 2, H / 2);
    ctx.restore();
  }

  _drawTransition(clipB, trans, W, H) {
    const boundary = Number(clipB.start || 0);
    const d = clamp(Number(trans?.duration) || 0.6, 0.1, 2);
    const p = clamp((this.time - (boundary - d / 2)) / d, 0, 1);
    const A = transitionSource(clipB);
    if (!A) return;

    // Sample both sides of the edit. This is the important difference from
    // simply drawing clip B over clip A: both clips are visible during the
    // transition window, exactly like an edit-point transition.
    const aTime = Math.min(Math.max(this.time, A.start), A.start + A.duration - 0.001);
    const bTime = Math.max(clipB.start, Math.min(this.time, clipB.start + clipB.duration - 0.001));
    const drawA = (opts = {}) => this.drawClip(A, { ...opts, time: aTime });
    const drawB = (opts = {}) => this.drawClip(clipB, { ...opts, time: bTime });

    switch (trans.type) {
      case 'fade':
        drawA({ alpha: 1 - p });
        drawB({ alpha: p });
        this._transitionOverlay(W, H, 'black', Math.sin(Math.PI * p) * 0.78);
        break;
      case 'dissolve':
        drawA({ alpha: 1 }); drawB({ alpha: p }); break;
      case 'flash':
        drawA({ alpha: 1 - p }); drawB({ alpha: p });
        this._transitionOverlay(W, H, 'white', Math.sin(Math.PI * p) * 0.92);
        break;
      case 'slide': case 'slideRight': case 'slideUp': case 'slideDown': {
        const sign = trans.type === 'slideRight' ? -1 : trans.type === 'slideUp' ? 0 : trans.type === 'slideDown' ? 0 : 1;
        const dx = trans.type === 'slideUp' || trans.type === 'slideDown' ? 0 : (1-p)*W*sign;
        const dy = trans.type === 'slideUp' ? (1-p)*H : trans.type === 'slideDown' ? -(1-p)*H : 0;
        drawA({ dx: -dx*0.22, dy: -dy*0.22 }); drawB({ dx, dy });
        break;
      }
      case 'push': case 'pushRight': case 'pushUp': case 'pushDown': {
        const sign = trans.type === 'pushRight' ? -1 : trans.type === 'pushUp' ? 0 : trans.type === 'pushDown' ? 0 : 1;
        const dx = trans.type === 'pushUp' || trans.type === 'pushDown' ? 0 : (1-p)*W*sign;
        const dy = trans.type === 'pushUp' ? (1-p)*H : trans.type === 'pushDown' ? -(1-p)*H : 0;
        drawA({ dx: -dx, dy: -dy }); drawB({ dx, dy });
        break;
      }
      case 'split':
        drawA({ alpha: 1 });
        this.ctx.save();
        this.ctx.beginPath(); this.ctx.rect(0,0,W*p/2,H); this.ctx.rect(W*(1-p/2),0,W*p/2,H); this.ctx.clip(); drawB({}); this.ctx.restore();
        break;
      case 'zoom':
        drawA({ scaleMul: 1 + p * 0.16, alpha: 1 - p * 0.35 });
        drawB({ alpha: p, scaleMul: 0.72 + 0.28 * p });
        break;
      case 'wipe': case 'wipeRight': case 'wipeUp': case 'wipeDown':
        drawA({ alpha: 1 }); drawB({ wipe: p, wipeDirection: trans.type === 'wipeRight' ? 'right' : trans.type === 'wipeUp' ? 'up' : trans.type === 'wipeDown' ? 'down' : 'left' }); break;
      case 'circle': case 'diamond': case 'box': case 'star': case 'heart':
      case 'radial': case 'clock': {
        drawA({ alpha: 1 });
        this.ctx.save();
        const r=Math.max(W,H)*Math.max(0.01,p)*0.82, cx=W/2, cy=H/2;
        if(trans.type==='diamond'){ this.ctx.moveTo(cx,cy-r); this.ctx.lineTo(cx+r,cy); this.ctx.lineTo(cx,cy+r); this.ctx.lineTo(cx-r,cy); this.ctx.closePath(); }
        else if(trans.type==='box'){ this.ctx.rect(cx-r,cy-r,cx?Math.min(W,2*r):2*r,Math.min(H,2*r)); }
        else if(trans.type==='star'||trans.type==='heart'){ for(let i=0;i<10;i++){const rr=i%2===0?r:r*.45,a=i*Math.PI/5-Math.PI/2,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;i?this.ctx.lineTo(x,y):this.ctx.moveTo(x,y);} this.ctx.closePath(); }
        else if(trans.type==='clock'){ this.ctx.moveTo(cx,cy); this.ctx.arc(cx,cy,Math.max(W,H),-Math.PI/2,-Math.PI/2+Math.PI*2*p); this.ctx.closePath(); }
        else { this.ctx.arc(cx,cy,r,0,Math.PI*2); }
        this.ctx.clip();
        drawB({});
        this.ctx.restore();
        break;
      }
      case 'additive':
        drawA({ alpha: 1-p }); drawB({ alpha: p }); this.ctx.save(); this.ctx.globalCompositeOperation='screen'; this._transitionOverlay(W,H,'white',p*0.16); this.ctx.restore(); break;
      case 'film':
        drawA({ alpha: 1-p*0.8, scaleMul:1+p*0.02 }); drawB({ alpha:p, scaleMul:1.02-p*0.02 }); this._transitionOverlay(W,H,'#6b5a43',Math.sin(Math.PI*p)*0.18); break;
      case 'dipwhite':
        drawA({alpha:1-p}); drawB({alpha:p}); this._transitionOverlay(W,H,'white',Math.sin(Math.PI*p)*0.85); break;
      case 'spin': case 'roll':
        drawA({alpha:1-p,rot:-p*35,scaleMul:1+p*.12}); drawB({alpha:p,rot:(1-p)*35,scaleMul:.78+p*.22}); break;
      case 'flip':
        drawA({alpha:1-p,scaleMul:Math.max(.08,Math.cos(p*Math.PI/2))}); drawB({alpha:p,scaleMul:Math.max(.08,Math.sin(p*Math.PI/2))}); break;
      case 'spring':
        { const q=1-Math.pow(1-p,3); drawA({alpha:1-p*.15,scaleMul:1+p*.08}); drawB({alpha:p,scaleMul:.75+.25*q}); } break;
      case 'stretch':
        drawA({alpha:1-p,scaleMul:1+p*.18}); drawB({alpha:p,scaleMul:.78+p*.22}); break;
      case 'zoomblur':
        drawA({alpha:1-p,scaleMul:1+p*.45}); drawB({alpha:p,scaleMul:1.45-p*.45}); this._transitionOverlay(W,H,'#ffffff',Math.sin(Math.PI*p)*.12); break;
      case 'rgb':
        drawA({alpha:1-p}); drawB({alpha:p}); this._glitchPost(W,H,Math.sin(Math.PI*p)*.55); break;
      case 'mosaic': case 'checker': case 'venetian': case 'pinwheel': case 'page': case 'mirror': case 'burn': case 'light': case 'vapor': case 'wave': case 'slice': case 'whip':
        drawA({alpha:1-p,scaleMul:1+p*.05,dx:trans.type==='whip'?(p-.5)*W*.22:0}); drawB({alpha:p,scaleMul:.9+p*.1,dx:trans.type==='whip'?(1-p)*W*.2:0}); this._transitionOverlay(W,H,trans.type==='burn'?'#ff6a00':trans.type==='light'?'#ffe9a8':'#111827',Math.sin(Math.PI*p)*.12); break;
      case 'blur':
        drawA({ alpha: 1 - p, scaleMul: 1 + p * 0.03 });
        drawB({ alpha: p, scaleMul: 1.03 - p * 0.03 });
        break;
      case 'rotate':
        drawA({ alpha: 1 - p * 0.2, rot: -p * 10, scaleMul: 1 + p * 0.05 });
        drawB({ alpha: p, rot: (1 - p) * 12, scaleMul: 0.82 + p * 0.18 });
        break;
      case 'color':
        drawA({ alpha: 1 - p }); drawB({ alpha: p });
        this._transitionOverlay(W, H, '#101522', Math.sin(Math.PI * p) * 0.9);
        break;
      case 'crosszoom':
        drawA({ alpha: 1 - p, scaleMul: 1 + p * 0.75 });
        drawB({ alpha: p, scaleMul: 1.55 - p * 0.55 });
        break;
      case 'glitch': {
        const jitter = Math.sin(this.time * 100) * (1 - Math.abs(p - 0.5) * 2) * 20;
        drawA({ alpha: 1 - p, dx: -jitter });
        drawB({ alpha: p, dx: jitter });
        this._glitchPost(W, H, (1 - Math.abs(p - 0.5) * 2) * 0.85);
        break;
      }
      default:
        drawA({ alpha: 1 - p }); drawB({ alpha: p });
        break;
    }
  }

  _transitionOverlay(W, H, color, alpha) {
    if (alpha <= 0.001) return;
    this.ctx.save();
    this.ctx.globalAlpha = clamp(alpha, 0, 1);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, W, H);
    this.ctx.restore();
  }

  _drawLibPreview(W, H) {
    const ctx = this.ctx, item = this.libPreview;
    if (!item) return;
    let drawn = false;
    // Never pass arbitrary media objects/requests into CanvasRenderingContext2D.drawImage.
    // Library previews can hydrate asynchronously, so validate the actual DOM media element.
    if (this.libEl && item.type === 'video') {
      const elv = this.libEl;
      const isVideo = typeof HTMLVideoElement !== 'undefined' && elv instanceof HTMLVideoElement;
      if (isVideo && elv.readyState >= 2 && elv.videoWidth > 0 && elv.videoHeight > 0) {
        const sw = elv.videoWidth, sh = elv.videoHeight;
        const bs = Math.min(W / sw, H / sh);
        ctx.drawImage(elv, (W - sw * bs) / 2, (H - sh * bs) / 2, sw * bs, sh * bs);
        drawn = true;
      }
    }
    if (!drawn && item.type === 'image') {
      const img = this.getImg(item);
      const isImage = typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement;
      if (isImage && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const bs = Math.min(W / img.naturalWidth, H / img.naturalHeight);
        ctx.drawImage(img, (W - img.naturalWidth * bs) / 2, (H - img.naturalHeight * bs) / 2, img.naturalWidth * bs, img.naturalHeight * bs);
        drawn = true;
      }
    }
    if (!drawn) {
      if (item.type === 'audio') {
        const peaks = media.getPeaks(item.id);
        if (peaks) {
          ctx.fillStyle = '#4c8dff';
          const bw = W / peaks.length;
          for (let i = 0; i < peaks.length; i++) {
            const h2 = peaks[i] * H * 0.7;
            ctx.fillRect(i * bw, (H - h2) / 2, Math.max(1, bw * 0.8), h2);
          }
        }
      } else {
        ctx.fillStyle = '#5e6a84'; ctx.font = '600 40px Arial'; ctx.textAlign = 'center';
        ctx.fillText(item.name, W / 2, H / 2);
      }
    }
  }

  /* ---------- transform handles ---------- */
  clipBounds(clip, t) {
    const p = store.project;
    const W = p.settings.width, H = p.settings.height;
    const local = Math.max(0, t - clip.start);
    const T = this._T(clip, local);
    let bw, bh;
    if (clip.type === 'text') {
      const meas = this._measureText(clip.text);
      bw = meas.w + (clip.text?.size || 48) * 0.7;
      bh = meas.h + (clip.text?.size || 48) * 0.44;
    } else if (clip.type === 'sticker') {
      bw = bh = Math.min(W, H) * 0.4;
    } else {
      const m = getMedia(clip.mediaId);
      if (!m || !m.width || clip.missing) return null;
      const crop = clip.crop || { l: 0, t: 0, r: 0, b: 0 };
      const sw = m.width * (1 - crop.l - crop.r), sh = m.height * (1 - crop.t - crop.b);
      if (sw <= 0 || sh <= 0) return null;
      const bs = Math.min(W / sw, H / sh);
      bw = sw * bs; bh = sh * bs;
    }
    return { cx: W / 2 + T.x, cy: H / 2 + T.y, w: bw * T.scale, h: bh * T.scale, rot: T.rotation, T };
  }

  updateHandles() {
    const layer = this.layer;
    if (!layer) return;
    const sel = store.ui.selection.map(id => getClipSilent(id)).filter(Boolean);
    if (sel.length !== 1 || sel[0].type === 'audio' || this.playing || this.libPreview || !activeAt(sel[0], this.time)) {
      if (layer.innerHTML) layer.innerHTML = '';
      return;
    }
    const clip = sel[0];
    const b = this.clipBounds(clip, this.time);
    if (!b) { layer.innerHTML = ''; return; }
    const W = store.project.settings.width;
    const k = this.canvas.clientWidth / W;
    layer.innerHTML = '';
    const box = el('div', { class: 'tf-box', 'data-testid': 'transform-box' });
    box.style.left = (b.cx - b.w / 2) * k + 'px';
    box.style.top = (b.cy - b.h / 2) * k + 'px';
    box.style.width = b.w * k + 'px';
    box.style.height = b.h * k + 'px';
    box.style.transform = `rotate(${b.rot}deg)`;
    box.appendChild(el('div', { class: 'tf-label', text: clip.name }));
    for (const corner of ['nw', 'ne', 'sw', 'se']) {
      box.appendChild(el('div', { class: `tf-handle ${corner}`, onpointerdown: e => this._startHandle(clip, corner, e, b) }));
    }
    box.appendChild(el('div', { class: 'tf-rotate', title: 'Rotate', onpointerdown: e => this._startHandle(clip, 'rotate', e, b) }));
    box.addEventListener('pointerdown', e => { if (e.target === box) this._startHandle(clip, 'body', e, b); });
    layer.appendChild(box);
  }

  _startHandle(clip, mode, e, b) {
    e.preventDefault(); e.stopPropagation();
    const W = store.project.settings.width;
    const k = this.canvas.clientWidth / W;
    const rect = this.canvas.getBoundingClientRect();
    const toCanvas = (cx, cy) => ({ x: (cx - rect.left) / k, y: (cy - rect.top) / k });
    const cap = history.begin('Transform clip');
    const startT = { ...clip.transform };
    const start = toCanvas(e.clientX, e.clientY);
    const center = { x: b.cx, y: b.cy };
    const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const startDist = Math.max(4, Math.hypot(start.x - center.x, start.y - center.y));
    const onMove = ev => {
      const p = toCanvas(ev.clientX, ev.clientY);
      if (mode === 'body') {
        let nx = startT.x + (p.x - start.x), ny = startT.y + (p.y - start.y);
        if (Math.abs(nx) < 8) nx = 0;
        if (Math.abs(ny) < 8) ny = 0;
        clip.transform.x = nx; clip.transform.y = ny;
      } else if (mode === 'rotate') {
        const a = Math.atan2(p.y - center.y, p.x - center.x);
        let deg = startT.rotation + (a - startAngle) * 180 / Math.PI;
        if (Math.abs(((deg % 90) + 90) % 90) < 4 || Math.abs(((deg % 90) + 90) % 90) > 86) deg = Math.round(deg / 90) * 90;
        clip.transform.rotation = deg;
      } else {
        const d = Math.hypot(p.x - center.x, p.y - center.y);
        clip.transform.scale = clamp(startT.scale * (d / startDist), 0.02, 20);
      }
      this.dirty = true;
      this.draw();
      this.updateHandles();
      bus.emit('clip:updated');
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      history.end(cap);
      markDirty();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  /* ---------- transport bindings ---------- */
  _bindTransport() {
    $('#btn-play').addEventListener('click', () => this.toggle());
    $('#btn-prev-frame').addEventListener('click', () => this.seek(this.time - 1 / (store.project?.settings.fps || 30)));
    $('#btn-next-frame').addEventListener('click', () => this.seek(this.time + 1 / (store.project?.settings.fps || 30)));
    $('#playback-speed').addEventListener('change', e => { store.ui.playbackRate = clamp(Number(e.target.value) || 1, 0.1, 16); this.syncMedia(); this.requestRedraw(); });
    $('#preview-volume').addEventListener('input', e => {
      store.ui.previewVolume = Number(e.target.value) / 100;
      audioEngine.setMasterVolume(store.ui.previewVolume);
    });
    $('#preview-quality').addEventListener('change', e => this.setQuality(Number(e.target.value)));
    $('#preview-zoom').addEventListener('change', e => { store.ui.previewZoom = e.target.value; this.applyZoom(); });
    $('#btn-fullscreen-preview').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else this.stageWrap.requestFullscreen?.().catch(() => ui.toast('Fullscreen is not available here.', 'warn'));
    });
  }
}

function getClipSilent(id) { return store.project?.clips.find(c => c.id === id) || null; }
function clipMissing(mediaId) {
  const p = store.project;
  if (!p) return;
  let changed = false;
  for (const c of p.clips) if (c.mediaId === mediaId && !c.missing) { c.missing = true; changed = true; }
  if (changed) { bus.emit('clips:changed'); ui.toast('Some media failed to decode and is marked offline.', 'error'); }
}

export const preview = new Preview();

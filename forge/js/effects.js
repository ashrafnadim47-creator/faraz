/* FORGE — effects & filters: catalog, evaluation for the renderer, panel builders */
import { store, bus, getClip, selectedClips, bestClipTarget, SELECTION } from './state.js';
import { el, $, clamp, uid } from './utils.js';
import { commit } from './project.js';
import { ui } from './ui.js';
import { timeline } from './timeline.js';

export const EFFECT_CATALOG = [
  { id: 'zoom', name: 'Zoom In', icon: 'zoomFit', desc: 'Slowly scales the clip up', defaults: { duration: 2, intensity: 0.35 } },
  { id: 'shake', name: 'Shake', icon: 'wand', desc: 'Handheld camera shake', defaults: { duration: 2, intensity: 0.4 } },
  { id: 'fade', name: 'Fade In', icon: 'play', desc: 'Fades up from black', defaults: { duration: 1, intensity: 1 } },
  { id: 'flash', name: 'Flash', icon: 'star', desc: 'White flash at start', defaults: { duration: 0.5, intensity: 0.8 } },
  { id: 'blur', name: 'Blur In', icon: 'monitor', desc: 'Starts blurred, sharpens', defaults: { duration: 1.5, intensity: 0.6 } },
  { id: 'glitch', name: 'Glitch', icon: 'wand', desc: 'Digital glitch slices', defaults: { duration: 1, intensity: 0.5 } },
  { id: 'slide', name: 'Slide In', icon: 'shuffle', desc: 'Slides in from the left', defaults: { duration: 1, intensity: 0.5 } },
  { id: 'bounce', name: 'Bounce', icon: 'star', desc: 'Springy scale pop', defaults: { duration: 1.2, intensity: 0.3 } },
  { id: 'pulse', name: 'Pulse', icon: 'star', desc: 'Rhythmic scale pulse', defaults: { duration: 1.4, intensity: 0.22 } },
  { id: 'tilt', name: 'Tilt', icon: 'shuffle', desc: 'Dynamic camera tilt', defaults: { duration: 1.6, intensity: 0.45 } },
  { id: 'chromatic', name: 'Chromatic', icon: 'wand', desc: 'Subtle RGB split feel', defaults: { duration: 1, intensity: 0.35 } },
  { id: 'lift', name: 'Lift', icon: 'arrowUp', desc: 'Slide upward with fade', defaults: { duration: 1, intensity: 0.5 } },
  { id: 'vignette', name: 'Vignette', icon: 'monitor', desc: 'Cinematic edge darkening', defaults: { duration: 3, intensity: 0.35 } },
  { id: 'film', name: 'Film', icon: 'film', desc: 'Film-like subtle movement', defaults: { duration: 3, intensity: 0.25 } },
];

export const FILTER_KEYS = [
  { key: 'brightness', label: 'Brightness', min: 0, max: 200, unit: '%' },
  { key: 'contrast', label: 'Contrast', min: 0, max: 200, unit: '%' },
  { key: 'saturation', label: 'Saturation', min: 0, max: 300, unit: '%' },
  { key: 'exposure', label: 'Exposure', min: 20, max: 200, unit: '%' },
  { key: 'blur', label: 'Blur', min: 0, max: 20, unit: ' px' },
  { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, unit: '%' },
  { key: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%' },
  { key: 'hue', label: 'Hue', min: -180, max: 180, unit: '°' },
];

export const FILTER_PRESETS = [
  { id: 'none', name: 'None', values: {} },
  { id: 'warm', name: 'Warm', values: { hue: -12, sepia: 18, saturation: 112, brightness: 102 } },
  { id: 'cool', name: 'Cool', values: { hue: 16, saturation: 106, brightness: 102, contrast: 104 } },
  { id: 'mono', name: 'Mono', values: { grayscale: 100 } },
  { id: 'vintage', name: 'Vintage', values: { sepia: 42, contrast: 88, brightness: 106, saturation: 88 } },
  { id: 'vivid', name: 'Vivid', values: { saturation: 145, contrast: 112 } },
  { id: 'noir', name: 'Noir', values: { grayscale: 100, contrast: 135, brightness: 96 } },
  { id: 'dreamy', name: 'Dreamy', values: { blur: 1.2, brightness: 108, saturation: 120 } },
];

export function filterString(filters, extraBlur = 0) {
  const f = filters || {};
  const parts = [];
  const exposure = (f.exposure ?? 100) / 100;
  const brightness = ((f.brightness ?? 100) / 100) * exposure;
  if (Math.abs(brightness - 1) > 0.001) parts.push(`brightness(${brightness.toFixed(3)})`);
  if ((f.contrast ?? 100) !== 100) parts.push(`contrast(${(f.contrast ?? 100) / 100})`);
  if ((f.saturation ?? 100) !== 100) parts.push(`saturate(${(f.saturation ?? 100) / 100})`);
  const blur = (f.blur ?? 0) + extraBlur;
  if (blur > 0.01) parts.push(`blur(${blur.toFixed(2)}px)`);
  if ((f.grayscale ?? 0) > 0) parts.push(`grayscale(${f.grayscale / 100})`);
  if ((f.sepia ?? 0) > 0) parts.push(`sepia(${f.sepia / 100})`);
  if ((f.hue ?? 0) !== 0) parts.push(`hue-rotate(${f.hue}deg)`);
  return parts.join(' ');
}

/** Evaluate all effects of a clip at local time (seconds from clip start). */
export function evalEffects(clip, localT) {
  const st = { alpha: 1, dx: 0, dy: 0, scaleMul: 1, extraBlur: 0, flash: 0, glitch: 0, rot: 0, vignette: 0, chromatic: 0, film: 0 };
  for (const fx of clip.effects || []) {
    const d = Math.max(0.05, fx.duration || 1);
    const raw = clamp(localT / d, 0, 1);
    const p = 1 - Math.pow(1 - raw, 3); // ease-out
    const i = fx.intensity ?? 0.5;
    switch (fx.type) {
      case 'zoom': st.scaleMul *= 1 + i * p; break;
      case 'shake': {
        const decay = 1 - raw;
        st.dx += Math.sin(localT * 41) * i * 34 * decay;
        st.dy += Math.cos(localT * 57) * i * 22 * decay;
        st.rot += Math.sin(localT * 33) * i * 1.6 * decay;
        break;
      }
      case 'fade': st.alpha *= raw; break;
      case 'flash': st.flash = Math.max(st.flash, Math.max(0, 1 - raw * 2) * i); break;
      case 'blur': st.extraBlur += i * 14 * (1 - raw); break;
      case 'glitch': st.glitch = Math.max(st.glitch, (1 - raw) * i); break;
      case 'slide': st.dx += (1 - p) * 900 * i; break;
      case 'bounce': st.scaleMul *= 1 + i * Math.sin(raw * Math.PI * 3) * (1 - raw); break;
      case 'pulse': st.scaleMul *= 1 + i * Math.sin(raw * Math.PI * 2.5) * (1 - raw * 0.35); break;
      case 'tilt': st.rot += Math.sin(raw * Math.PI * 2) * i * 6 * (1 - raw * 0.4); break;
      case 'chromatic': st.chromatic = Math.max(st.chromatic, i * (1 - raw)); break;
      case 'lift': st.dy -= (1 - p) * 260 * i; st.alpha *= Math.min(1, raw * 1.5); break;
      case 'vignette': st.vignette = Math.max(st.vignette, i); break;
      case 'film': st.dx += Math.sin(localT * 12) * i * 2; st.dy += Math.cos(localT * 17) * i * 2; break;
    }
  }
  return st;
}

export function applyEffect(clipId, type) {
  const def = EFFECT_CATALOG.find(e => e.id === type);
  const clip = getClip(clipId);
  if (!def || !clip) return;
  commit(p => {
    const c = p.clips.find(x => x.id === clipId);
    c.effects.push({ id: uid(), type, duration: def.defaults.duration, intensity: def.defaults.intensity });
  }, { label: `Add ${def.name} effect` });
  ui.toast(`${def.name} added to “${clip.name}”`, 'success');
}

export function removeEffect(clipId, effectId) {
  commit(p => {
    const c = p.clips.find(x => x.id === clipId);
    c.effects = c.effects.filter(f => f.id !== effectId);
  }, { label: 'Remove effect' });
}

export function applyFilterPreset(clipId, preset) {
  commit(p => {
    const c = p.clips.find(x => x.id === clipId);
    c.filters = { brightness: 100, contrast: 100, saturation: 100, exposure: 100, blur: 0, grayscale: 0, sepia: 0, hue: 0, ...(preset.values || {}) };
  }, { label: `Filter: ${preset.name}` });
}

/* ---------------- Panels ---------------- */

export function buildEffectsPane(root) {
  root.appendChild(el('div', { class: 'pane-hint' }, 'Click to apply to the selected clip, or drag an effect directly onto a clip in the timeline.'));
  const grid = el('div', { class: 'card-grid', 'data-testid': 'effects-grid' });
  for (const fx of EFFECT_CATALOG) {
    const card = el('div', {
      class: 'fx-card', 'data-testid': `effect-card-${fx.id}`,
      onpointerdown: e => timeline.beginLibraryDrag(e, { kind: 'effect', effectType: fx.id, label: fx.name }, {
        onClipDrop: clipId => applyEffect(clipId, fx.id),
      }),
      onclick: () => {
        const sel = selectedClips();
        const targets = sel.length ? sel : [bestClipTarget()].filter(Boolean);
        if (!targets.length) return ui.toast('Import or select a clip first.', 'warn');
        if (!sel.length && targets[0]) SELECTION.set([targets[0].id]);
        targets.forEach(c => { if (c.type === 'video' || c.type === 'image' || c.type === 'sticker' || c.type === 'text') applyEffect(c.id, fx.id); });
      },
    },
      el('div', { class: 'fx-icon', html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>` }),
      el('div', {}, el('div', { class: 'fx-name', text: fx.name }), el('div', { class: 'fx-desc', text: fx.desc })),
    );
    grid.appendChild(card);
  }
  root.appendChild(grid);
}

export function buildFiltersPane(root) {
  root.appendChild(el('div', { class: 'pane-hint' }, 'Click a look to apply it to the selected clip. Fine-tune below — everything is live in the preview.'));
  const presetRow = el('div', { class: 'chip-row', 'data-testid': 'filter-presets' });
  for (const preset of FILTER_PRESETS) {
    presetRow.appendChild(el('button', {
      class: 'chip', text: preset.name, 'data-testid': `filter-preset-${preset.id}`,
      onclick: () => {
        const sel = selectedClips();
        const targets = sel.length ? sel : [bestClipTarget()].filter(Boolean);
        if (!targets.length) return ui.toast('Import or select a clip first.', 'warn');
        if (!sel.length && targets[0]) SELECTION.set([targets[0].id]);
        targets.forEach(c => { if (c.type !== 'audio') applyFilterPreset(c.id, preset); });
      },
    }));
  }
  root.appendChild(presetRow);

  const sliders = el('div', { class: 'filter-sliders', 'data-testid': 'filter-sliders' });
  const selected = selectedClips();
  const selectedClip = selected[0];
  for (const fk of FILTER_KEYS) {
    const val = selectedClip ? (selectedClip.filters[fk.key] ?? (fk.key === 'blur' || fk.key === 'grayscale' || fk.key === 'sepia' || fk.key === 'hue' ? 0 : 100)) : 0;
    const range = el('input', { type: 'range', min: fk.min, max: fk.max, step: 1, value: val, 'data-testid': `filter-${fk.key}-range` });
    const num = el('input', { type: 'number', min: fk.min, max: fk.max, step: 1, value: val, class: 'num-sm', 'data-testid': `filter-${fk.key}-num` });
    const apply = v => {
      const c = selectedClip || bestClipTarget();
      if (!c) return;
      commit(p => { p.clips.find(x => x.id === c.id).filters[fk.key] = v; }, { label: 'Adjust filter', event: 'clip:updated', useHistory: false });
      bus.emit('clip:updated');
    };
    range.addEventListener('pointerdown', () => bus.emit('clip:updated'));
    range.addEventListener('input', () => { num.value = range.value; apply(Number(range.value)); });
    num.addEventListener('change', () => { range.value = num.value; apply(Number(num.value)); });
    sliders.appendChild(el('div', { class: 'frow' },
      el('label', { text: fk.label }), range, num, el('span', { class: 'frow-val', text: fk.unit.trim() })));
  }
  root.appendChild(sliders);

  root.appendChild(el('div', { class: 'btn-row' },
    el('button', {
      class: 'btn', text: 'Reset filters', 'data-testid': 'filter-reset-btn',
      onclick: () => {
        const sel = selectedClips();
        const targets = sel.length ? sel : [bestClipTarget()].filter(Boolean);
        if (!targets.length) return ui.toast('Put the playhead on a video/image clip first.', 'warn');
        targets.forEach(c => applyFilterPreset(c.id, FILTER_PRESETS[0]));
        bus.emit('filters:reset');
      },
    })));
}


function defaultMemeText() {
  return { content:'MEME', family:'Impact', size:92, bold:true, italic:false, underline:false, align:'center', color:'#FFFFFF', background:'transparent', strokeWidth:8, strokeColor:'#000000', shadow:true, letterSpacing:0, lineHeight:1.0 };
}

export function buildStickersPane(root) {
  root.appendChild(el('div', { class: 'pane-hint' }, 'Click or drag a sticker onto the timeline. Stickers are vector overlays — move, scale and rotate them like images.'));
  const SHAPES = [
    { id: 'star', name: 'Star', kind: 'shape' }, { id: 'heart', name: 'Heart', kind: 'shape' },
    { id: 'circle', name: 'Circle', kind: 'shape' }, { id: 'square', name: 'Box', kind: 'shape' },
    { id: 'arrow', name: 'Arrow', kind: 'shape' }, { id: 'bubble', name: 'Bubble', kind: 'shape' },
    { id: 'fire', name: 'Fire', kind: 'emoji', emoji: '🔥' }, { id: 'love', name: 'Love', kind: 'emoji', emoji: '❤️' },
    { id: 'laugh', name: 'Laugh', kind: 'emoji', emoji: '😂' }, { id: 'wow', name: 'Wow', kind: 'emoji', emoji: '🤯' },
    { id: 'cool', name: 'Cool', kind: 'emoji', emoji: '😎' }, { id: 'party', name: 'Party', kind: 'emoji', emoji: '🥳' },
    { id: '100', name: '100', kind: 'emoji', emoji: '💯' }, { id: 'check', name: 'Check', kind: 'emoji', emoji: '✅' },
    { id: 'sparkles', name: 'Sparkles', kind: 'emoji', emoji: '✨' }, { id: 'rocket', name: 'Rocket', kind: 'emoji', emoji: '🚀' },
    { id: 'crown', name: 'Crown', kind: 'emoji', emoji: '👑' }, { id: 'money', name: 'Money', kind: 'emoji', emoji: '💸' },
    { id: 'warning', name: 'Warning', kind: 'emoji', emoji: '⚠️' }, { id: 'clap', name: 'Clap', kind: 'emoji', emoji: '👏' },
    { id: 'thumb', name: 'Like', kind: 'emoji', emoji: '👍' }, { id: 'mind', name: 'Mind blown', kind: 'emoji', emoji: '🤯' },
  ];
  const memeTitle = el('div', { class:'pane-section-title', text:'Meme presets' });
  const memeGrid = el('div', { class:'card-grid', 'data-meme-grid':'' });
  const MEMES = [
    ['bruh','BRUH'], ['lol','LOL'], ['wow','WOW'], ['nope','NOPE'], ['sus','SUS'], ['nice','NICE'],
    ['top','TOP TEXT'], ['bottom','BOTTOM TEXT'], ['reaction','WHEN YOU REALIZE…'], ['fail','EPIC FAIL']
  ];
  MEMES.forEach(([id,label]) => memeGrid.appendChild(el('div',{class:'fx-card meme-card','data-testid':`meme-card-${id}`,onclick:()=>{
    import('./actions.js').then(({actions})=>actions.addTextClip({name:`Meme · ${label}`, text:{...defaultMemeText(), content:label}}));
  }}, el('div',{class:'meme-preview',text:label}), el('div',{},el('div',{class:'fx-name',text:label}),el('div',{class:'fx-desc',text:'Editable meme text overlay'})))));
  root.appendChild(memeTitle);
  root.appendChild(memeGrid);

  const COLORS = ['#F5A524', '#FF5C67', '#2ECC71', '#4C8DFF', '#FFFFFF'];
  let color = COLORS[0];
  const grid = el('div', { class: 'card-grid' });
  for (const s of SHAPES) {
    grid.appendChild(el('div', {
      class: 'fx-card', 'data-testid': `sticker-card-${s.id}`,
      onpointerdown: e => timeline.beginLibraryDrag(e, { kind: 'sticker', shape: s.id, color, label: s.name }, {
        onTimelineDrop: (trackId, time) => addStickerClip(s.id, color, trackId, time, s),
      }),
      onclick: () => addStickerClip(s.id, color, null, null, s),
    },
      el('div', { class: 'fx-icon' }, s.kind === 'emoji' ? el('span', { class: 'sticker-emoji-preview', text: s.emoji }) : stickerPreview(s.id, color)),
      el('div', {}, el('div', { class: 'fx-name', text: s.name }), el('div', { class: 'fx-desc', text: 'Overlay sticker' }))));
  }
  root.appendChild(grid);
  const colorRow = el('div', { class: 'chip-row', style: 'margin-top:10px' });
  for (const c of COLORS) {
    colorRow.appendChild(el('button', {
      class: 'chip' + (c === color ? ' active' : ''), style: `background:${c}22;border-color:${c};color:${c}`,
      text: c === color ? '● ' + c : c, onclick: e => { color = c; buildStickersPaneInto(root); },
    }));
  }
  root.appendChild(colorRow);
}
function buildStickersPaneInto(root) { root.innerHTML = ''; buildStickersPane(root); }

function stickerPreview(shape, color) {
  const c = el('canvas', { width: 40, height: 40 });
  drawStickerShape(c.getContext('2d'), shape, 40, color);
  return c;
}

export function drawStickerShape(ctx, shape, size, color) {
  const s = size, c = s / 2;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.beginPath();
  switch (shape) {
    case 'circle': ctx.arc(c, c, s * 0.42, 0, Math.PI * 2); ctx.fill(); break;
    case 'square': {
      const r = s * 0.12; const x = s * 0.08, y = s * 0.08, w = s * 0.84;
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + w, r); ctx.arcTo(x + w, y + w, x, y + w, r);
      ctx.arcTo(x, y + w, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.fill(); break;
    }
    case 'star': {
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s * 0.46 : s * 0.2;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); break;
    }
    case 'heart': {
      ctx.moveTo(c, s * 0.82);
      ctx.bezierCurveTo(s * 0.05, s * 0.55, s * 0.12, s * 0.18, c, s * 0.34);
      ctx.bezierCurveTo(s * 0.88, s * 0.18, s * 0.95, s * 0.55, c, s * 0.82);
      ctx.fill(); break;
    }
    case 'arrow': {
      ctx.moveTo(s * 0.06, s * 0.4); ctx.lineTo(s * 0.6, s * 0.4); ctx.lineTo(s * 0.6, s * 0.2);
      ctx.lineTo(s * 0.96, s * 0.5); ctx.lineTo(s * 0.6, s * 0.8); ctx.lineTo(s * 0.6, s * 0.6);
      ctx.lineTo(s * 0.06, s * 0.6); ctx.closePath(); ctx.fill(); break;
    }
    case 'bubble': {
      const r = s * 0.1, x = s * 0.08, y = s * 0.1, w = s * 0.84, h = s * 0.6;
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.lineTo(s * 0.35, y + h); ctx.lineTo(s * 0.25, s * 0.92); ctx.lineTo(s * 0.3, y + h);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
      ctx.fill(); break;
    }
  }
  ctx.restore();
}

function addStickerClip(shape, color, trackId, time, meta = null) {
  import('./actions.js').then(({ actions }) => actions.addStickerClip(shape, color, trackId, time, meta));
}

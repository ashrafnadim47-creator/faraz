/* FORGE — inspector: properties panel bound to real project state */
import { store, bus, getClip, getTrack, getMedia, selectedClips, totalDuration, SELECTION } from './state.js';
import { $, el, clamp, formatTC, svgIcon, deepClone } from './utils.js';
import * as history from './history.js';
import { commit, markDirty, RESOLUTION_PRESETS } from './project.js';
import { actions } from './actions.js';
import { EFFECT_CATALOG, FILTER_KEYS, FILTER_PRESETS, filterString, applyEffect, removeEffect, applyFilterPreset } from './effects.js';
import { keyframes, KEY_PATHS } from './keyframes.js';
import { TRANSITION_CATALOG, removeTransition, setTransitionDuration } from './transitions.js';
import { preview } from './preview.js';
import { ui } from './ui.js';

const TYPE_ICONS = { video: 'film', audio: 'music', image: 'image', text: 'type', sticker: 'star' };

export const inspector = {
  init() {
    this.body = $('#inspector-body');
    this.subtitle = $('#inspector-subtitle');
    bus.on('selection:changed', () => this.refresh());
    bus.on('clips:changed', () => this.refresh());
    bus.on('project:loaded', () => this.refresh());
    bus.on('project:settings', () => this.refresh());
    this.refresh();
  },

  refresh() {
    if (!this.body || !store.project) return;
    const tid = store.ui.selectedTransitionClip;
    const tClip = tid ? getClip(tid) : null;
    if (tClip && tClip.transitionIn) return this.renderTransition(tClip);
    const sel = selectedClips();
    if (sel.length === 0) return this.renderProject();
    if (sel.length === 1) return this.renderClip(sel[0]);
    return this.renderMulti(sel);
  },

  /* ---------- shared builders ---------- */
  _section(title, ...children) {
    return el('div', { class: 'insp-section' }, el('div', { class: 'insp-title', text: title }), ...children);
  },

  _live(input, label, onLive) {
    let cap = null;
    const begin = () => { if (!cap) cap = history.begin(label); };
    input.addEventListener('focus', begin);
    input.addEventListener('pointerdown', begin);
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (Number.isFinite(v)) onLive(v);
    });
    const end = () => { if (cap) { history.end(cap); cap = null; } };
    input.addEventListener('change', end);
    input.addEventListener('pointerup', end);
    input.addEventListener('blur', end);
    return input;
  },

  _num(label, value, opts, onLive, testid) {
    const input = el('input', {
      type: 'number', step: opts.step ?? 1,
      ...(opts.min != null ? { min: opts.min } : {}), ...(opts.max != null ? { max: opts.max } : {}),
      value: Math.round(value * 1000) / 1000, testid: testid || `inspector-${label.toLowerCase().replace(/\s+/g, '-')}-input`,
    });
    this._live(input, opts.label || label, v => onLive(clamp(v, opts.min ?? -1e9, opts.max ?? 1e9)));
    return el('div', { class: 'frow' }, el('label', { text: label }), input, ...(opts.suffix ? [el('span', { class: 'frow-val', text: opts.suffix })] : []));
  },

  _sliderNum(label, value, opts, onLive) {
    const range = el('input', { type: 'range', min: opts.min, max: opts.max, step: opts.step ?? 1, value, testid: `inspector-${label.toLowerCase().replace(/\s+/g, '-')}-range` });
    const num = el('input', { type: 'number', min: opts.min, max: opts.max, step: opts.step ?? 1, value: Math.round(value * 1000) / 1000, class: 'num-sm', testid: `inspector-${label.toLowerCase().replace(/\s+/g, '-')}-num` });
    const setV = v => { onLive(clamp(v, opts.min, opts.max)); };
    this._live(range, opts.label || label, v => { num.value = Math.round(v * 100) / 100; setV(v); });
    this._live(num, opts.label || label, v => { range.value = v; setV(v); });
    return el('div', { class: 'frow' }, el('label', { text: label }), range, num, el('span', { class: 'frow-val', text: opts.suffix || '' }));
  },

  _touch(clipId) { markDirty(); bus.emit('clip:updated'); preview.requestRedraw?.(); },

  _clipMutation(clipId) {
    return fn => {
      const c = getClip(clipId);
      if (c) { fn(c); this._touch(clipId); }
    };
  },

  /* ---------- views ---------- */
  renderProject() {
    const p = store.project;
    this.subtitle.textContent = 'Project';
    this.body.innerHTML = '';
    this.body.appendChild(this._section('Project',
      el('div', { class: 'readonly-meta', style: 'flex-direction:column;gap:5px' },
        el('div', {}, `Resolution: ${p.settings.width} × ${p.settings.height}`),
        el('div', {}, `Frame rate: ${p.settings.fps} fps · Aspect ${p.settings.aspect}`),
        el('div', {}, `Duration: ${formatTC(totalDuration())}`),
        el('div', {}, `${p.clips.length} clips · ${p.media.length} media · ${p.tracks.length} tracks`)),
      el('div', { class: 'btn-row', style: 'margin-top:10px' },
        el('button', { class: 'btn', text: 'Project settings', testid: 'open-project-settings-btn', onclick: () => ui.openProjectSettings() }))));
    this.body.appendChild(this._section('Quick start',
      el('div', { class: 'mini-note', html:
        '1. Import media in the left panel (or generate samples).<br>' +
        '2. Drag clips onto the timeline.<br>' +
        '3. Select a clip to edit its properties here.<br>' +
        '4. Space plays · S splits · Ctrl+Z undoes.' })));
    this.body.appendChild(this._section('Keyframes & effects',
      el('div', { class: 'mini-note', html:
        'Select a clip, then add keyframes for position, scale, rotation, opacity and volume. Drag effects from the Effects tab straight onto clips. Drop transitions on the cut between two clips.' })));
  },

  renderMulti(sel) {
    this.subtitle.textContent = `${sel.length} clips selected`;
    this.body.innerHTML = '';
    this.body.appendChild(this._section('Multiple selection',
      el('div', { class: 'readonly-meta' }, `${sel.length} clips · combined ${formatTC(Math.max(...sel.map(c => c.start + c.duration)) - Math.min(...sel.map(c => c.start)))}`),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn', text: 'Copy', testid: 'multi-copy-btn', onclick: () => actions.copy() }),
        el('button', { class: 'btn', text: 'Duplicate', testid: 'multi-duplicate-btn', onclick: () => actions.duplicate() }),
        el('button', { class: 'btn danger', text: 'Delete', testid: 'multi-delete-btn', onclick: () => actions.deleteSelection() }))));
  },

  renderTransition(clip) {
    const tr = clip.transitionIn;
    this.subtitle.textContent = 'Transition';
    this.body.innerHTML = '';
    const sec = this._section('Transition',
      el('div', { class: 'chip-row' },
        ...TRANSITION_CATALOG.map(t => el('button', {
          class: 'chip' + (tr.type === t.id ? ' active' : ''), text: t.name, testid: `transition-type-${t.id}`,
          onclick: () => {
            if (t.id === 'cut') removeTransition(clip.id);
            else commit(p => { p.clips.find(x => x.id === clip.id).transitionIn.type = t.id; }, { label: 'Change transition' });
            this.refresh();
          },
        }))),
      this._sliderNum('Duration', tr.duration, { min: 0.1, max: 2, step: 0.05, suffix: 's', label: 'Transition duration' },
        v => setTransitionDuration(clip.id, v)),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn danger', text: 'Remove transition', testid: 'transition-remove-btn', onclick: () => { removeTransition(clip.id); SELECTION.clear(); } })));
    sec.appendChild(el('div', { class: 'mini-note', text: `Applies on the cut before “${clip.name}”.` }));
    this.body.appendChild(sec);
  },

  renderClip(clip) {
    const p = store.project;
    this.subtitle.textContent = clip.type + ' clip';
    this.body.innerHTML = '';
    const mut = this._clipMutation(clip.id);

    /* --- header --- */
    const nameInput = el('input', { type: 'text', value: clip.name, testid: 'inspector-clip-name-input' });
    let nameCap = null;
    nameInput.addEventListener('focus', () => { nameCap = history.begin('Rename clip'); });
    nameInput.addEventListener('input', () => { const c = getClip(clip.id); if (c) { c.name = nameInput.value; markDirty(); } });
    nameInput.addEventListener('change', () => { if (nameCap) { history.end(nameCap); nameCap = null; } });
    this.body.appendChild(this._section('Clip',
      el('div', { class: 'insp-name-row' },
        el('div', { class: 'type-badge', html: svgIcon(TYPE_ICONS[clip.type] || 'film', 14) }),
        nameInput),
      el('div', { class: 'readonly-meta', style: 'margin-top:8px' },
        el('span', { text: `Track: ${getTrack(clip.trackId)?.name || '—'}` }),
        ...(clip.mediaId ? [el('span', { text: `Media: ${getMedia(clip.mediaId)?.name || 'missing'}` })] : []))));

    /* --- timing --- */
    this.body.appendChild(this._section('Timing',
      this._num('Start', clip.start, { min: 0, step: 0.01, suffix: 's', label: 'Clip start' }, v => mut(c => { c.start = v; }), 'inspector-start-input'),
      this._num('Duration', clip.duration, { min: 0.05, step: 0.01, suffix: 's', label: 'Clip duration' }, v => {
        mut(c => {
          const maxD = (c.type === 'video' || c.type === 'audio') && getMedia(c.mediaId)
            ? (getMedia(c.mediaId).duration - c.sourceStart) / c.speed : Infinity;
          c.duration = Math.min(v, Math.max(0.05, maxD));
          c.sourceDuration = c.duration * c.speed;
        });
      }, 'inspector-duration-input'),
      el('div', { class: 'readonly-meta' }, el('span', { text: `End: ${formatTC(clip.start + clip.duration)}` })),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn', text: 'Split at playhead (S)', testid: 'inspector-split-btn', onclick: () => actions.split() }))));

    /* --- speed --- */
    if (clip.type === 'video' || clip.type === 'audio') {
      const chips = el('div', { class: 'chip-row' });
      for (const s of [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4]) {
        chips.appendChild(el('button', {
          class: 'chip' + (Math.abs(clip.speed - s) < 0.001 ? ' active' : ''), text: `${s}×`, testid: `speed-${s}x`,
          onclick: () => { actions.setSpeed(clip.id, s); this.refresh(); },
        }));
      }
      this.body.appendChild(this._section('Speed',
        chips,
        this._num('Custom', clip.speed, { min: 0.25, max: 8, step: 0.05, suffix: '×', label: 'Clip speed' }, v => { actions.setSpeed(clip.id, v); }, 'inspector-speed-input'),
        el('div', { class: 'mini-note', text: 'Changing speed keeps the source range and updates the clip length on the timeline.' })));
    }

    /* --- transform --- */
    if (clip.type !== 'audio') {
      const tf = clip.transform;
      this.body.appendChild(this._section('Transform',
        this._num('X', tf.x, { step: 1, suffix: 'px', label: 'Position X' }, v => mut(c => { c.transform.x = v; }), 'inspector-x-input'),
        this._num('Y', tf.y, { step: 1, suffix: 'px', label: 'Position Y' }, v => mut(c => { c.transform.y = v; }), 'inspector-y-input'),
        this._sliderNum('Scale', tf.scale, { min: 0.02, max: 4, step: 0.01, suffix: '×', label: 'Scale' }, v => mut(c => { c.transform.scale = v; })),
        this._sliderNum('Rotation', tf.rotation, { min: -180, max: 180, step: 1, suffix: '°', label: 'Rotation' }, v => mut(c => { c.transform.rotation = v; })),
        this._sliderNum('Opacity', tf.opacity, { min: 0, max: 1, step: 0.01, suffix: '%', label: 'Opacity' }, v => mut(c => { c.transform.opacity = v; })),
        el('div', { class: 'btn-row' },
          el('button', { class: 'btn', text: 'Center H', testid: 'center-h-btn', onclick: () => mut(c => { c.transform.x = 0; }) }),
          el('button', { class: 'btn', text: 'Center V', testid: 'center-v-btn', onclick: () => mut(c => { c.transform.y = 0; }) }),
          el('button', { class: 'btn', text: 'Fit', testid: 'fit-btn', onclick: () => mut(c => { c.transform.scale = 1; }) }),
          el('button', { class: 'btn', text: 'Fill', testid: 'fill-btn', onclick: () => mut(c => { c.transform.scale = this._fillScale(c); }) }),
          el('button', { class: 'btn', text: 'Reset', testid: 'reset-transform-btn', onclick: () => mut(c => { c.transform = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }; }) }))));
    }

    /* --- sticker --- */
    if (clip.type === 'sticker' && clip.sticker) {
      this.body.appendChild(this._section('Sticker',
        el('div', { class: 'sticker-inspector-preview' }, clip.sticker.kind === 'emoji' ? (clip.sticker.emoji || '✨') : '★'),
        el('div', { class: 'readonly-meta' }, `Preset: ${clip.sticker.emoji || clip.sticker.shape || 'custom'}`),
        ...(clip.sticker.kind !== 'emoji' ? [el('div', { class: 'frow' },
          el('label', { text: 'Color' }),
          el('input', { type: 'color', value: /^#/.test(clip.sticker.color || '') ? clip.sticker.color : '#f5a524', onchange: e => mut(c => { c.sticker.color = e.target.value; }) }))] : []),
        el('div', { class: 'btn-row' },
          el('button', { class: 'btn', text: 'Reset look', onclick: () => { mut(c => { c.transform = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }; }); this.refresh(); } }))));
    }

    /* --- crop --- */
    if (clip.type === 'video' || clip.type === 'image') {
      const cropRow = key => this._sliderNum(key.toUpperCase(), clip.crop[key] * 100, { min: 0, max: 45, step: 0.5, suffix: '%', label: `Crop ${key.toUpperCase()}` }, v => mut(c => { c.crop[key] = v / 100; }));
      this.body.appendChild(this._section('Crop',
        el('div', { class: 'crop-presets' },
          ...['Free', '16:9', '9:16', '1:1', '4:5'].map(pr => el('button', {
            class: 'chip', text: pr, testid: `crop-preset-${pr.replace(':', '')}`,
            onclick: () => { mut(c => this._applyAspectCrop(c, pr)); this.refresh(); },
          }))),
        cropRow('l'), cropRow('t'), cropRow('r'), cropRow('b')));
    }

    /* --- filters --- */
    if (clip.type === 'video' || clip.type === 'image') {
      const rows = FILTER_KEYS.map(fk => this._sliderNum(fk.label, clip.filters[fk.key] ?? (fk.unit.includes('px') || fk.unit === '%' && ['grayscale', 'sepia'].includes(fk.key) ? 0 : fk.key === 'hue' ? 0 : fk.key === 'blur' ? 0 : 100), { min: fk.min, max: fk.max, step: 1, suffix: fk.unit.trim(), label: `Filter ${fk.label}` }, v => mut(c => { c.filters[fk.key] = v; })));
      this.body.appendChild(this._section('Filters', ...rows,
        el('div', { class: 'btn-row' }, el('button', { class: 'btn', text: 'Reset filters', testid: 'inspector-filter-reset-btn', onclick: () => { applyFilterPreset(clip.id, FILTER_PRESETS[0]); this.refresh(); } }))));
    }

    /* --- effects --- */
    if (clip.type !== 'audio') {
      const rows = (clip.effects || []).map(fx => {
        const def = EFFECT_CATALOG.find(d => d.id === fx.type);
        return el('div', { class: 'fx-selected-row', 'data-testid': 'inspector-effect-row' },
          el('span', { text: def?.name || fx.type }),
          el('input', { type: 'number', min: 0.1, max: 20, step: 0.1, value: fx.duration, style: 'width:56px', title: 'Duration (s)', testid: 'effect-duration-input' }),
          el('input', { type: 'range', min: 0.05, max: 1, step: 0.05, value: fx.intensity, style: 'flex:1', title: 'Intensity', testid: 'effect-intensity-range' }),
          el('button', { class: 'fx-remove', html: svgIcon('x', 12), title: 'Remove effect', testid: 'effect-remove-btn', onclick: () => { removeEffect(clip.id, fx.id); this.refresh(); } }));
      });
      const sec = this._section('Effects', ...(rows.length ? rows : [el('div', { class: 'mini-note', text: 'No effects yet — drag one from the Effects tab, or add below.' })]));
      const add = el('select', { class: 'sel', testid: 'inspector-add-effect-select' }, el('option', { value: '', text: 'Add effect…' }),
        ...EFFECT_CATALOG.map(d => el('option', { value: d.id, text: d.name })));
      add.addEventListener('change', () => { if (add.value) { applyEffect(clip.id, add.value); this.refresh(); } });
      sec.appendChild(el('div', { class: 'frow' }, el('label', { text: 'Add' }), add));
      this.body.appendChild(sec);
    }

    /* --- audio --- */
    if (clip.type === 'video' || clip.type === 'audio') {
      this.body.appendChild(this._section('Audio',
        this._sliderNum('Volume', clip.volume, { min: 0, max: 1, step: 0.01, suffix: '%', label: 'Clip volume' }, v => mut(c => { c.volume = v; })),
        el('div', { class: 'frow' },
          el('label', { text: 'Mute' }),
          el('input', { type: 'checkbox', checked: clip.muted, testid: 'inspector-mute-checkbox', onchange: e => { mut(c => { c.muted = e.target.checked; }); } })),
        this._num('Fade in', clip.fadeIn, { min: 0, max: 30, step: 0.1, suffix: 's', label: 'Fade in' }, v => mut(c => { c.fadeIn = v; }), 'inspector-fadein-input'),
        this._num('Fade out', clip.fadeOut, { min: 0, max: 30, step: 0.1, suffix: 's', label: 'Fade out' }, v => mut(c => { c.fadeOut = v; }), 'inspector-fadeout-input'),
        ...(clip.type === 'video' ? [el('div', { class: 'btn-row' }, el('button', { class: 'btn', text: 'Detach audio', testid: 'inspector-detach-audio-btn', onclick: () => actions.detachAudio(clip.id) }))] : [])));
    }

    /* --- text --- */
    if (clip.type === 'text' && clip.text) {
      const tx = clip.text;
      const colorRow = (label, key, testid) => el('div', { class: 'frow' },
        el('label', { text: label }),
        el('input', { type: 'color', value: /^#/.test(tx[key]) ? tx[key] : '#ffffff', testid, oninput: e => mut(c => { c.text[key] = e.target.value; }) }));
      this.body.appendChild(this._section('Text',
        el('textarea', { rows: 3, testid: 'inspector-text-content', style: 'width:100%;resize:vertical', oninput: e => mut(c => { c.text.content = e.target.value; }) }, tx.content),
        el('div', { class: 'frow' }, el('label', { text: 'Font' }),
          el('select', { class: 'sel', testid: 'inspector-font-select', onchange: e => mut(c => { c.text.family = e.target.value; }) },
            ...['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Impact'].map(f => el('option', { value: f, text: f, selected: tx.family === f }))),
          el('input', { type: 'number', min: 8, max: 400, value: tx.size, style: 'width:70px', testid: 'inspector-font-size', oninput: e => mut(c => { c.text.size = Number(e.target.value) || 48; }) })),
        el('div', { class: 'chip-row', style: 'margin-bottom:7px' },
          ...[['Bold', 'bold'], ['Italic', 'italic'], ['Underline', 'underline']].map(([lab, key]) => el('button', {
            class: 'chip' + (tx[key] ? ' active' : ''), text: lab, testid: `text-${key}-chip`,
            onclick: e => { mut(c => { c.text[key] = !c.text[key]; }); e.target.classList.toggle('active'); preview.requestDrawPublic(); },
          })),
          ...['left', 'center', 'right'].map(a => el('button', {
            class: 'chip' + (tx.align === a ? ' active' : ''), text: a, testid: `text-align-${a}`,
            onclick: () => { mut(c => { c.text.align = a; }); this.refresh(); },
          }))),
        colorRow('Color', 'color', 'inspector-text-color'),
        colorRow('Stroke', 'strokeColor', 'inspector-stroke-color'),
        this._sliderNum('Stroke W', tx.strokeWidth || 0, { min: 0, max: 20, step: 0.5, suffix: 'px', label: 'Stroke width' }, v => mut(c => { c.text.strokeWidth = v; })),
        el('div', { class: 'frow' },
          el('label', { text: 'Background' }),
          el('input', { type: 'color', value: tx.background && /^#/.test(tx.background) ? tx.background : '#000000', testid: 'inspector-bg-color', oninput: e => mut(c => { c.text.background = e.target.value; }) }),
          el('button', { class: 'chip', text: 'Transparent', testid: 'text-bg-transparent', onclick: () => { mut(c => { c.text.background = 'transparent'; }); this.refresh(); } })),
        el('div', { class: 'frow' },
          el('label', { text: 'Shadow' }),
          el('input', { type: 'checkbox', checked: !!tx.shadow, testid: 'inspector-text-shadow', onchange: e => mut(c => { c.text.shadow = e.target.checked; }) })),
        this._num('Letter sp.', tx.letterSpacing || 0, { min: -10, max: 40, step: 0.5, suffix: 'px', label: 'Letter spacing' }, v => mut(c => { c.text.letterSpacing = v; }), 'inspector-letter-spacing'),
        this._num('Line height', tx.lineHeight || 1.2, { min: 0.6, max: 3, step: 0.05, suffix: '×', label: 'Line height' }, v => mut(c => { c.text.lineHeight = v; }), 'inspector-line-height'),
        el('div', { class: 'pane-section-title', text: 'Text Styles' }),
        el('div', { class: 'chip-row text-style-row' },
          ...[
            ['Clean', { family:'Arial', bold:false, italic:false, color:'#ffffff', strokeWidth:0, background:'transparent', shadow:false }],
            ['Bold', { family:'Arial', bold:true, italic:false, color:'#ffffff', strokeWidth:2, strokeColor:'#000000', background:'transparent', shadow:true }],
            ['Neon', { family:'Trebuchet MS', bold:true, color:'#7dd3fc', strokeWidth:2, strokeColor:'#082f49', background:'#0f172acc', shadow:true }],
            ['Meme', { family:'Impact', bold:true, color:'#ffffff', strokeWidth:8, strokeColor:'#000000', background:'transparent', shadow:true, lineHeight:1 }],
            ['Caption', { family:'Verdana', bold:true, color:'#ffffff', strokeWidth:3, strokeColor:'#000000', background:'#000000b8', shadow:true }]
          ].map(([label,style]) => el('button', { class:'chip', text:label, onclick:() => { mut(c => { c.text = { ...c.text, ...style }; }); this.refresh(); } }))
        )));
    }

    /* --- keyframes --- */
    if (clip.type !== 'audio') {
      const rows = KEY_PATHS.map(kp => {
        const keys = clip.keyframes?.[kp.path] || [];
        return el('div', { class: 'kf-row' },
          el('span', { class: 'kf-name', text: kp.label }),
          el('span', { class: 'kf-count', text: keys.length ? `${keys.length}◆` : '—' }),
          el('button', { class: 'btn', text: '◆ Add', title: `Add ${kp.label} keyframe at playhead`, testid: `kf-add-${kp.path.replace(/\./g, '-')}`,
            onclick: () => {
              const c = getClip(clip.id);
              if (!c) return;
              const local = clamp(preview.time - c.start, 0, c.duration);
              const cap = history.begin('Add keyframe');
              keyframes.setKey(c, kp.path, local, keyframes.resolve(c, kp.path, local));
              history.end(cap);
              markDirty(); bus.emit('clips:changed');
              this.refresh();
            } }),
          ...(keys.length ? [el('button', { class: 'btn', text: 'Clear', testid: `kf-clear-${kp.path.replace(/\./g, '-')}`,
            onclick: () => {
              const c = getClip(clip.id);
              if (!c) return;
              const cap = history.begin('Clear keyframes');
              keyframes.clearPath(c, kp.path);
              history.end(cap);
              markDirty(); bus.emit('clips:changed');
              this.refresh();
            } })] : []));
      });
      this.body.appendChild(this._section('Keyframes', ...rows,
        el('div', { class: 'mini-note', text: 'Keyframes interpolate linearly between values. Diamonds appear on the clip — drag them to retime, right-click to delete.' })));
    }

    /* --- danger --- */
    this.body.appendChild(this._section('Actions',
      el('div', { class: 'insp-danger-zone' },
        el('button', { class: 'btn', text: 'Duplicate', testid: 'inspector-duplicate-btn', onclick: () => actions.duplicate() }),
        el('button', { class: 'btn danger', text: 'Delete clip', testid: 'inspector-delete-btn', onclick: () => actions.deleteSelection() }))));
  },

  _fillScale(clip) {
    const p = store.project;
    const m = getMedia(clip.mediaId);
    if (!m || !m.width) return clip.transform.scale;
    const crop = clip.crop;
    const sw = m.width * (1 - crop.l - crop.r), sh = m.height * (1 - crop.t - crop.b);
    if (!sw || !sh) return clip.transform.scale;
    const bs = Math.min(p.settings.width / sw, p.settings.height / sh);
    const fs = Math.max(p.settings.width / sw, p.settings.height / sh);
    return fs / bs;
  },

  _applyAspectCrop(clip, preset) {
    if (preset === 'Free') { clip.crop = { l: 0, t: 0, r: 0, b: 0 }; return; }
    const m = getMedia(clip.mediaId);
    if (!m || !m.width || !m.height) return;
    const [aw, ah] = preset.split(':').map(Number);
    const ta = aw / ah, sa = m.width / m.height;
    if (ta > sa) { const keep = sa / ta; clip.crop = { l: 0, r: 0, t: (1 - keep) / 2, b: (1 - keep) / 2 }; }
    else { const keep = ta / sa; clip.crop = { l: (1 - keep) / 2, r: (1 - keep) / 2, t: 0, b: 0 }; }
  },
};

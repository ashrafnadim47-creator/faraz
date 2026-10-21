/* FORGE — text & captions panel */
import { store, bus } from './state.js';
import { $, el, formatTC, formatDur } from './utils.js';
import { commit } from './project.js';
import { actions } from './actions.js';
import { defaultText } from './state.js';

const PRESETS = [
  { id: 'title', name: 'Title', sample: '24px', duration: 4, text: { size: 120, bold: true, align: 'center' } },
  { id: 'mrbeast', name: '⚡ MrBeast Viral Yellow', sample: '20px', duration: 3, text: { size: 84, bold: true, align: 'center', color: '#FFE600', strokeWidth: 12, strokeColor: '#000000', shadow: true }, caption: true, position: 'bottom' },
  { id: 'neon', name: '✨ Cyberpunk Neon Glow', sample: '18px', duration: 3, text: { size: 72, bold: true, align: 'center', color: '#00F2FE', strokeWidth: 4, strokeColor: '#00F2FE', shadow: true }, caption: true, position: 'bottom' },
  { id: 'pop', name: '🔥 Pop Glitch Magenta', sample: '18px', duration: 3, text: { size: 72, bold: true, align: 'center', color: '#FF007F', strokeWidth: 6, strokeColor: '#000000', shadow: true }, caption: true, position: 'bottom' },
  { id: 'box', name: '🎬 Clean Subtitle Box', sample: '16px', duration: 3, text: { size: 54, bold: true, align: 'center', color: '#000000', background: '#FFFFFF', shadow: false }, caption: true, position: 'bottom' },
  { id: 'subtitle', name: 'Subtitle', sample: '18px', duration: 4, text: { size: 64, bold: false, align: 'center', shadow: true } },
  { id: 'body', name: 'Body text', sample: '14px', duration: 5, text: { size: 48, bold: false, align: 'left' } },
  { id: 'caption', name: 'Caption (bottom)', sample: '13px', duration: 3, text: { size: 48, bold: true, align: 'center', background: 'rgba(0,0,0,0.65)', shadow: false }, caption: true, position: 'bottom' },
];

export const textPanel = {
  init() {
    this.root = $('#pane-text');
    this.build();
    bus.on('clips:changed', () => this.refreshCaptions());
    bus.on('project:loaded', () => this.refreshCaptions());
  },

  build() {
    this.root.innerHTML = '';
    this.root.appendChild(el('div', { class: 'pane-section-title', text: 'Add text' }));
    for (const p of PRESETS) {
      this.root.appendChild(el('div', {
        class: 'text-preset', 'data-testid': `text-preset-${p.id}`,
        onclick: () => this.addTextPreset(p),
      },
        el('span', { class: 'tp-sample', text: 'Aa', style: `font-size:${p.sample};${p.text.bold ? 'font-weight:800' : ''}` }),
        el('span', {}, el('div', { class: 'tp-label', text: p.name }), el('div', { style: 'font-size:10px;color:var(--text-faint)' }, 'at playhead'))));
    }
    this.root.appendChild(el('div', { class: 'pane-section-title', text: 'Captions' }));
    this.root.appendChild(el('button', {
      class: 'btn primary import-cta', text: 'Add caption at playhead', 'data-testid': 'add-caption-btn',
      onclick: () => this.addTextPreset(PRESETS[3]),
    }));
    this.captionsList = el('div', { 'data-testid': 'captions-list' });
    this.root.appendChild(this.captionsList);
    this.root.appendChild(el('div', { class: 'pane-hint', text: 'Captions are timed text clips — style them in the Inspector. The system is structured so automatic speech-to-text can be connected later.' }));
    this.refreshCaptions();
  },

  addTextPreset(p) {
    const id = actions.addTextClip({ name: p.name, duration: p.duration, text: { ...defaultText(), ...p.text } });
    if (id && p.position === 'bottom') {
      const H = store.project.settings.height;
      commit(pr => { const c = pr.clips.find(x => x.id === id); if (c) c.transform.y = Math.round(H * 0.33); }, { label: 'Caption position', event: 'clip:updated', useHistory: false });
    }
  },

  refreshCaptions() {
    if (!this.captionsList || !store.project) return;
    this.captionsList.innerHTML = '';
    const caps = store.project.clips.filter(c => c.type === 'text' && c.caption).sort((a, b) => a.start - b.start);
    if (!caps.length) {
      this.captionsList.appendChild(el('div', { class: 'pane-hint', text: 'No captions yet.' }));
      return;
    }
    for (const c of caps) {
      this.captionsList.appendChild(el('div', { class: 'caption-row', 'data-testid': 'caption-row' },
        el('span', { class: 'cap-time', text: `${formatTC(c.start).slice(3)} → ${formatTC(c.start + c.duration).slice(3)}` }),
        el('span', { class: 'cap-text', text: c.text?.content || '' }),
        el('button', { class: 'cap-btn', html: '▶', title: 'Jump to caption', 'data-testid': 'caption-jump-btn', onclick: () => import('./preview.js').then(({ preview }) => preview.seek(c.start)) }),
        el('button', { class: 'cap-btn', html: '✎', title: 'Edit caption (selects clip)', 'data-testid': 'caption-edit-btn', onclick: () => import('./state.js').then(({ SELECTION }) => SELECTION.set([c.id])) })));
    }
  },
};

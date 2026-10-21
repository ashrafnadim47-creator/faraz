/* FORGE — UI shell: tabs, tooltips, context menus, modals, toasts, resizable panels, settings */
import { store, bus, SELECTION, saveUISettings } from './state.js';
import { $, $$, el, clamp, svgIcon, escapeHtml, formatTC, injectIcons } from './utils.js';
import * as project from './project.js';

const modalStack = [];
let ctxOpen = false;
let tooltipTimer = null;
let currentTipEl = null;

function closeContextMenu() {
  const menu = $('#ctx-menu');
  menu.classList.remove('open');
  menu.innerHTML = '';
  ctxOpen = false;
  window.removeEventListener('pointerdown', outsideClose, true);
  window.removeEventListener('keydown', escCloseMenu, true);
}
function outsideClose(e) { if (!$('#ctx-menu').contains(e.target)) closeContextMenu(); }
function escCloseMenu(e) { if (e.key === 'Escape') { e.stopPropagation(); closeContextMenu(); } }

export const ui = {
  init() {
    injectIcons();
    this._tabs();
    this._tooltips();
    this._gutters();
    this._dropOverlay();
    this.applyTheme();
    this._restorePanels();
  },

  applyTheme() {
    document.documentElement.dataset.theme = store.ui.settings.theme || 'forge-dark';
  },

  _tabs() {
    $$('#left-tabs .ltab').forEach(btn => btn.addEventListener('click', () => {
      $$('#left-tabs .ltab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      store.ui.activeTab = tab;
      $$('#left-panes .tab-pane').forEach(pn => pn.classList.toggle('active', pn.dataset.pane === tab));
    }));
  },

  _tooltips() {
    const tip = $('#tooltip');
    document.addEventListener('mouseover', e => {
      const t = e.target?.closest?.('[data-tip]');
      if (t === currentTipEl) return;
      currentTipEl = t;
      clearTimeout(tooltipTimer);
      tip.classList.remove('on');
      if (!t || !store.ui.settings.tooltips) return;
      tooltipTimer = setTimeout(() => {
        if (currentTipEl !== t) return;
        tip.innerHTML = `${escapeHtml(t.dataset.tip)}${t.dataset.tipKey ? `<span class="tip-key">${escapeHtml(t.dataset.tipKey)}</span>` : ''}`;
        tip.classList.add('on');
        const r = t.getBoundingClientRect();
        let x = clamp(r.left + r.width / 2 - tip.offsetWidth / 2, 6, window.innerWidth - tip.offsetWidth - 6);
        let y = r.bottom + 8;
        if (y + tip.offsetHeight > window.innerHeight - 8) y = r.top - tip.offsetHeight - 8;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
      }, 350);
    });
    document.addEventListener('mousedown', () => tip.classList.remove('on'));
  },

  _gutters() {
    const persist = () => localStorage.setItem('forge.panels', JSON.stringify(store.ui.panels));
    const bindV = (gEl, panelEl, side) => {
      gEl.addEventListener('pointerdown', e => {
        e.preventDefault();
        gEl.classList.add('dragging');
        const startX = e.clientX, startW = panelEl.getBoundingClientRect().width;
        const move = ev => {
          const w = clamp(side === 'left' ? startW + (ev.clientX - startX) : startW - (ev.clientX - startX), 200, Math.min(560, window.innerWidth * 0.45));
          panelEl.style.width = w + 'px';
          window.dispatchEvent(new Event('resize'));
        };
        const up = () => {
          gEl.classList.remove('dragging');
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          store.ui.panels[side] = parseInt(panelEl.style.width) || store.ui.panels[side];
          persist();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
    };
    bindV($('#gutter-left'), $('#left-panel'), 'left');
    bindV($('#gutter-right'), $('#right-panel'), 'right');
    const gt = $('#gutter-timeline');
    gt.addEventListener('pointerdown', e => {
      e.preventDefault();
      gt.classList.add('dragging');
      const startY = e.clientY, startH = $('#timeline-area').getBoundingClientRect().height;
      const move = ev => {
        const h = clamp(startH - (ev.clientY - startY), 140, window.innerHeight * 0.6);
        $('#timeline-area').style.height = h + 'px';
        window.dispatchEvent(new Event('resize'));
      };
      const up = () => {
        gt.classList.remove('dragging');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        store.ui.panels.timeline = parseInt($('#timeline-area').style.height) || store.ui.panels.timeline;
        persist();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  },

  _restorePanels() {
    try {
      const raw = localStorage.getItem('forge.panels');
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.left) $('#left-panel').style.width = clamp(p.left, 200, 560) + 'px';
      if (p.right) $('#right-panel').style.width = clamp(p.right, 220, 560) + 'px';
      if (p.timeline) $('#timeline-area').style.height = clamp(p.timeline, 140, window.innerHeight * 0.6) + 'px';
      Object.assign(store.ui.panels, p);
    } catch (e) { /* ignore corrupt layout */ }
  },

  _dropOverlay() {
    let depth = 0;
    window.addEventListener('dragenter', e => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes('Files')) { depth++; $('#drop-overlay').classList.add('active'); }
    });
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) $('#drop-overlay').classList.remove('active'); });
    window.addEventListener('drop', e => {
      e.preventDefault();
      depth = 0;
      $('#drop-overlay').classList.remove('active');
      if (e.dataTransfer?.files?.length) import('./media.js').then(m => m.media.importFiles(e.dataTransfer.files));
    });
  },

  openWorkspaceMenu(anchor) {
    const presets = [
      { id: 'editing', name: 'Editing', left: 300, right: 320, timeline: 300 },
      { id: 'wide-preview', name: 'Wide Preview', left: 240, right: 280, timeline: 260 },
      { id: 'audio', name: 'Audio', left: 340, right: 360, timeline: 360 },
      { id: 'graphics', name: 'Graphics', left: 360, right: 400, timeline: 280 },
      { id: 'minimal', name: 'Minimal', left: 230, right: 250, timeline: 240 },
    ];
    const rect = anchor.getBoundingClientRect();
    const menu = el('div', { class: 'workspace-menu', 'data-testid': 'workspace-menu' });
    menu.appendChild(el('div', { class: 'workspace-menu-title', text: 'Workspace' }));
    menu.appendChild(el('div', { class: 'workspace-menu-note', text: 'Resize the four editor areas with the dividers, then save a layout.' }));
    for (const preset of presets) {
      menu.appendChild(el('button', { class: 'workspace-menu-item', text: preset.name, onclick: () => {
        $('#left-panel').style.width = preset.left + 'px';
        $('#right-panel').style.width = preset.right + 'px';
        $('#timeline-area').style.height = preset.timeline + 'px';
        Object.assign(store.ui.panels, { left: preset.left, right: preset.right, timeline: preset.timeline });
        localStorage.setItem('forge.panels', JSON.stringify(store.ui.panels));
        window.dispatchEvent(new Event('resize'));
        menu.remove();
      } }));
    }
    menu.appendChild(el('button', { class: 'workspace-menu-item', text: 'Customize panels…', onclick: () => {
      menu.remove();
      const body = el('div', { class: 'workspace-editor' });
      const row = (label, id, min, max, value, suffix='px') => el('label', { class:'workspace-control' },
        el('span', { text: label }),
        el('input', { id, type:'range', min, max, value, oninput:e => {
          const v=Number(e.target.value);
          if(id==='ws-left') $('#left-panel').style.width=v+'px';
          if(id==='ws-right') $('#right-panel').style.width=v+'px';
          if(id==='ws-timeline') $('#timeline-area').style.height=v+'px';
          window.dispatchEvent(new Event('resize'));
        }}),
        el('output', { id:id+'-out', text:`${value}${suffix}` })
      );
      body.appendChild(el('div',{class:'pane-hint',text:'Live layout controls — drag the sliders and the editor changes immediately.'}));
      body.appendChild(row('Left panel','ws-left',200,560,Math.round($('#left-panel').getBoundingClientRect().width)));
      body.appendChild(row('Right inspector','ws-right',200,560,Math.round($('#right-panel').getBoundingClientRect().width)));
      body.appendChild(row('Timeline height','ws-timeline',160,700,Math.round($('#timeline-area').getBoundingClientRect().height)));
      body.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',()=>{ const out=body.querySelector('#'+inp.id+'-out'); if(out) out.value=inp.value+'px'; }));
      body.appendChild(el('div',{class:'btn-row'},el('button',{class:'btn primary',text:'Save layout',onclick:()=>{const panels={left:$('#left-panel').getBoundingClientRect().width,right:$('#right-panel').getBoundingClientRect().width,timeline:$('#timeline-area').getBoundingClientRect().height};Object.assign(store.ui.panels,panels);localStorage.setItem('forge.panels',JSON.stringify(store.ui.panels));this.toast('Workspace layout saved','success',1400);this.escapeTop();}})));
      this.showModal('Customize Workspace', body, {width:520});
    }}));
    menu.appendChild(el('button', { class: 'workspace-menu-item accent', text: 'Save current layout', onclick: () => {
      const panels = {
        left: $('#left-panel').getBoundingClientRect().width,
        right: $('#right-panel').getBoundingClientRect().width,
        timeline: $('#timeline-area').getBoundingClientRect().height
      };
      Object.assign(store.ui.panels, panels);
      localStorage.setItem('forge.panels', JSON.stringify(store.ui.panels));
      menu.remove();
      this.toast('Workspace layout saved', 'success', 1400);
    } }));
    document.body.appendChild(menu);
    const x = clamp(rect.right - menu.offsetWidth, 8, window.innerWidth - menu.offsetWidth - 8);
    const y = rect.bottom + 8;
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
    const close = e => { if (!menu.contains(e.target) && e.target !== anchor) { menu.remove(); document.removeEventListener('pointerdown', close, true); } };
    setTimeout(() => document.addEventListener('pointerdown', close, true), 0);
  },

  /* ---------- toasts / busy ---------- */
  toast(msg, type = 'info', ms = 3500) {
    const t = el('div', { class: `toast ${type}`, text: msg, testid: 'toast' });
    $('#toast-root').appendChild(t);
    const kill = () => { t.classList.add('hide'); setTimeout(() => t.remove(), 300); };
    setTimeout(kill, ms);
    t.addEventListener('click', kill);
  },

  showBusy(text) {
    $('#busy-text').textContent = text || 'Working…';
    $('#busy-overlay').hidden = false;
  },
  hideBusy() { $('#busy-overlay').hidden = true; },

  /* ---------- context menu ---------- */
  openContextMenu(x, y, items) {
    closeContextMenu();
    const menu = $('#ctx-menu');
    for (const item of items) {
      if (!item) continue;
      if (item.separator) { menu.appendChild(el('div', { class: 'ctx-sep' })); continue; }
      if (item.title) { menu.appendChild(el('div', { class: 'ctx-title', text: item.title })); continue; }
      menu.appendChild(el('div', {
        class: `ctx-item${item.danger ? ' danger' : ''}${item.disabled ? ' disabled' : ''}`,
        'data-testid': `ctx-${item.label.toLowerCase().replace(/[^\w]+/g, '-')}`,
        onclick: () => { closeContextMenu(); item.action?.(); },
      },
        item.icon ? el('span', { class: 'ctx-icon', html: svgIcon(item.icon, 13) }) : null,
        el('span', { text: item.label }),
        item.shortcut ? el('span', { class: 'ctx-shortcut', text: item.shortcut }) : null));
    }
    menu.classList.add('open');
    menu.style.left = '0px'; menu.style.top = '0px';
    menu.style.left = clamp(x, 6, window.innerWidth - menu.offsetWidth - 6) + 'px';
    menu.style.top = clamp(y, 6, window.innerHeight - menu.offsetHeight - 6) + 'px';
    ctxOpen = true;
    setTimeout(() => {
      window.addEventListener('pointerdown', outsideClose, true);
      window.addEventListener('keydown', escCloseMenu, true);
    }, 0);
  },

  /* ---------- modals ---------- */
  showModal(title, contentEl, opts = {}) {
    const root = $('#modal-root');
    const backdrop = el('div', { class: 'modal-backdrop', 'data-testid': 'modal-backdrop' });
    const modal = el('div', { class: 'modal', style: opts.width ? `width:${opts.width}px` : '' });
    modal.appendChild(el('div', { class: 'modal-header' },
      el('span', { text: title }),
      opts.noClose ? null : el('button', { class: 'modal-close', html: svgIcon('x', 14), 'data-testid': 'modal-close-btn', onclick: () => this.closeModal(backdrop) })));
    const body = el('div', { class: 'modal-body' }, contentEl);
    modal.appendChild(body);
    const footer = el('div', { class: 'modal-footer' });
    if (opts.footer !== false) modal.appendChild(footer);
    backdrop.appendChild(modal);
    if (!opts.noClose) backdrop.addEventListener('pointerdown', e => { if (e.target === backdrop) this.closeModal(backdrop); });
    root.appendChild(backdrop);
    modalStack.push(backdrop);
    return { close: () => this.closeModal(backdrop), modal, body, footer };
  },

  closeModal(bd) {
    const i = modalStack.indexOf(bd);
    if (i >= 0) modalStack.splice(i, 1);
    bd.remove();
  },

  closeTopModal() {
    const bd = modalStack[modalStack.length - 1];
    if (bd) this.closeModal(bd);
  },

  confirm({ title, message, confirmLabel = 'Confirm', danger = false }) {
    return new Promise(res => {
      const body = el('div', {}, el('p', { text: message, style: 'margin:0;line-height:1.6' }));
      const m = this.showModal(title, body);
      m.footer.appendChild(el('button', { class: 'btn', text: 'Cancel', 'data-testid': 'confirm-cancel-btn', onclick: () => { m.close(); res(false); } }));
      m.footer.appendChild(el('button', { class: `btn ${danger ? 'danger' : 'primary'}`, text: confirmLabel, 'data-testid': 'confirm-ok-btn', onclick: () => { m.close(); res(true); } }));
    });
  },

  prompt({ title, fields = [], confirmLabel = 'OK' }) {
    return new Promise(res => {
      const inputs = fields.map(f => {
        const inp = el('input', { type: 'text', value: f.value || '', placeholder: f.placeholder || '', 'data-testid': 'prompt-input' });
        return el('div', { class: 'form-row' }, el('label', { text: f.label || '' }), inp);
      });
      const body = el('div', {}, ...inputs);
      const m = this.showModal(title, body);
      const submit = () => { const vals = inputs.map(r => r.querySelector('input').value.trim()); m.close(); res(vals); };
      m.footer.appendChild(el('button', { class: 'btn', text: 'Cancel', 'data-testid': 'prompt-cancel-btn', onclick: () => { m.close(); res(null); } }));
      m.footer.appendChild(el('button', { class: 'btn primary', text: confirmLabel, 'data-testid': 'prompt-ok-btn', onclick: submit }));
      setTimeout(() => inputs[0]?.querySelector('input').focus(), 60);
      body.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    });
  },

  pickMedia(title) {
    return new Promise(res => {
      const grid = el('div', { class: 'media-grid', 'data-testid': 'pick-media-grid' });
      const items = store.project?.media || [];
      if (!items.length) grid.appendChild(el('div', { class: 'media-empty', text: 'No media in this project. Import some first.' }));
      const m = this.showModal(title, grid);
      for (const item of items) {
        grid.appendChild(el('div', {
          class: 'fx-card', 'data-testid': `pick-media-${item.id}`,
          onclick: () => { m.close(); res(item.id); },
        },
          el('div', { class: 'fx-name', text: `${item.name}.${item.ext}` }),
          el('div', { class: 'fx-desc', text: `${item.type} · ${formatTC(item.duration) || (item.width ? `${item.width}×${item.height}` : '')}` })));
      }
      m.footer.appendChild(el('button', { class: 'btn', text: 'Cancel', onclick: () => { m.close(); res(null); } }));
    });
  },

  /* ---------- settings ---------- */
  openSettings() {
    const s = store.ui.settings;
    const body = el('div', { 'data-testid': 'settings-modal' });

    const themeRow = el('div', { class: 'chip-row' },
      ...[['forge-dark', 'Forge Dark'], ['graphite', 'Graphite'], ['midnight', 'Midnight']].map(([id, label]) => el('button', {
        class: 'chip' + (s.theme === id ? ' active' : ''), text: label, 'data-testid': `theme-${id}`,
        onclick: e => { s.theme = id; saveUISettings(); this.applyTheme(); themeRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active')); e.target.classList.add('active'); },
      })));
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Theme' }), themeRow));

    const autosave = el('input', { type: 'number', min: 5, max: 120, value: s.autosaveInterval, 'data-testid': 'settings-autosave-input' });
    autosave.addEventListener('change', () => { s.autosaveInterval = clamp(parseInt(autosave.value) || 15, 5, 120); saveUISettings(); project.startAutosave(); });
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Autosave interval (s)' }), autosave));

    const tooltips = el('input', { type: 'checkbox', checked: !!s.tooltips, 'data-testid': 'settings-tooltips-checkbox' });
    tooltips.addEventListener('change', () => { s.tooltips = tooltips.checked; saveUISettings(); });
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Show tooltips' }), tooltips));

    const snap = el('input', { type: 'checkbox', checked: store.ui.snap, 'data-testid': 'settings-snap-checkbox' });
    snap.addEventListener('change', () => { store.ui.snap = snap.checked; });
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Snapping (N)' }), snap));

    const quality = el('select', { class: 'sel', 'data-testid': 'settings-quality-select' },
      el('option', { value: '1', text: 'Full resolution', selected: s.previewQuality === '1' }),
      el('option', { value: '0.5', text: 'Half (faster)', selected: s.previewQuality === '0.5' }));
    quality.addEventListener('change', () => { s.previewQuality = quality.value; saveUISettings(); import('./preview.js').then(({ preview }) => preview.setQuality(Number(quality.value))); });
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Playback quality' }), quality));

    const cacheBtn = el('button', { class: 'btn', text: 'Clear thumbnail & waveform cache', 'data-testid': 'settings-clear-cache-btn' });
    cacheBtn.addEventListener('click', async () => {
      try {
        const { idbClear } = await import('./idb.js');
        await idbClear('thumbs'); await idbClear('peaks');
        this.toast('Caches cleared. They rebuild automatically as you work.', 'success');
      } catch (e) { this.toast(`Cache clear failed: ${e.message}`, 'error'); }
    });
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Cache' }), cacheBtn));

    body.appendChild(el('div', { class: 'form-hint', text: 'Default export settings live in the Export dialog. Projects and media are stored locally in IndexedDB.' }));

    const m = this.showModal('Settings', body, { width: 520 });
    m.footer.appendChild(el('button', { class: 'btn primary', text: 'Done', onclick: () => m.close() }));
  },

  openProjectSettings() {
    const p = store.project;
    const st = p.settings;
    const body = el('div', { 'data-testid': 'project-settings-modal' });

    let w = st.width, h = st.height, fps = st.fps, aspect = st.aspect;
    const wIn = el('input', { type: 'number', value: w, min: 64, 'data-testid': 'project-width-input' });
    const hIn = el('input', { type: 'number', value: h, min: 64, 'data-testid': 'project-height-input' });
    wIn.addEventListener('input', () => { w = parseInt(wIn.value) || w; });
    hIn.addEventListener('input', () => { h = parseInt(hIn.value) || h; });

    const resSel = el('select', { class: 'sel', 'data-testid': 'project-resolution-select' },
      el('option', { value: 'custom', text: 'Custom' }),
      ...project.RESOLUTION_PRESETS.map((r, i) => el('option', { value: String(i), text: r.label })));
    resSel.addEventListener('change', () => {
      if (resSel.value === 'custom') return;
      const r = project.RESOLUTION_PRESETS[Number(resSel.value)];
      wIn.value = r.w; hIn.value = r.h; w = r.w; h = r.h; aspect = r.aspect;
    });

    const fpsSel = el('select', { class: 'sel', 'data-testid': 'project-fps-select' },
      ...project.FPS_OPTIONS.map(f => el('option', { value: String(f), text: `${f} fps`, selected: f === fps })));
    fpsSel.addEventListener('change', () => { fps = Number(fpsSel.value); });

    const aspectRow = el('div', { class: 'chip-row' },
      ...project.ASPECTS.map(a => el('button', {
        class: 'chip' + (a === aspect ? ' active' : ''), text: a, 'data-testid': `project-aspect-${a.replace(':', '')}`,
        onclick: e => { aspect = a; aspectRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active')); e.target.classList.add('active'); },
      })));

    const bg = el('input', { type: 'color', value: st.background || '#000000', 'data-testid': 'project-bg-color' });
    bg.addEventListener('input', () => { st.background = bg.value; import('./preview.js').then(({ preview }) => { preview.dirty = true; }); });

    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Resolution' }), resSel));
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Custom size' }), wIn, el('span', { text: '×' }), hIn));
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Frame rate' }), fpsSel));
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Aspect ratio' }), aspectRow));
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Background' }), bg));

    const m = this.showModal('Project settings', body, { width: 540 });
    m.footer.appendChild(el('button', { class: 'btn', text: 'Cancel', onclick: () => m.close() }));
    m.footer.appendChild(el('button', {
      class: 'btn primary', text: 'Apply', 'data-testid': 'project-settings-apply-btn',
      onclick: () => {
        project.applyProjectSettings(w, h, fps, aspect);
        m.close();
        this.toast('Project settings applied', 'success', 1600);
      },
    }));
  },

  async openProjectsModal() {
    const body = el('div', { 'data-testid': 'projects-modal' });
    const m = this.showModal('Projects', body, { width: 560 });
    const list = el('div', {});
    body.appendChild(el('div', { class: 'btn-row', style: 'margin-bottom:10px' },
      el('button', {
        class: 'btn primary', text: '＋ New project', 'data-testid': 'new-project-btn',
        onclick: async () => {
          const name = await this.prompt({ title: 'New project', fields: [{ label: 'Name', value: 'Untitled Project' }], confirmLabel: 'Create' });
          if (name?.[0]) {
            project.newProject(name[0]);
            m.close();
            this.toast(`Created “${name[0]}”`, 'success');
          }
        },
      })));
    body.appendChild(list);
    const projects = await project.listProjects();
    if (!projects.length) list.appendChild(el('div', { class: 'media-empty', text: 'No saved projects yet.' }));
    for (const pr of projects) {
      const current = pr.id === store.project?.id;
      list.appendChild(el('div', { class: 'fx-selected-row', style: 'padding:9px 10px', 'data-testid': 'project-row' },
        el('div', { style: 'flex:1;min-width:0' },
          el('div', { style: 'font-weight:600;font-size:12px', text: `${pr.name}${current ? '  (current)' : ''}` }),
          el('div', { style: 'font-size:10px;color:var(--text-faint)', text: `Updated ${new Date(pr.updatedAt).toLocaleString()} · ${pr.clips?.length || 0} clips` })),
        ...(current ? [] : [el('button', { class: 'btn', text: 'Open', 'data-testid': 'open-project-btn', onclick: async () => {
          try { await project.loadProjectById(pr.id); m.close(); this.toast(`Opened “${pr.name}”`, 'success'); }
          catch (e) { this.toast('This project could not be opened (corrupted).', 'error'); }
        } })]),
        el('button', { class: 'btn danger', text: 'Delete', 'data-testid': 'delete-project-btn', onclick: async () => {
          const ok = await this.confirm({ title: 'Delete project', message: `Delete “${pr.name}”? Media files stay in the library.`, confirmLabel: 'Delete', danger: true });
          if (ok) { await project.deleteProjectById(pr.id); m.close(); this.openProjectsModal(); }
        } })));
    }
  },

  openShortcuts() {
    const rows = [
      ['Space', 'Play / Pause'], ['S', 'Split at playhead'], ['Delete', 'Delete selection'],
      ['Ctrl+Z', 'Undo'], ['Ctrl+Shift+Z / Ctrl+Y', 'Redo'], ['Ctrl+C', 'Copy'], ['Ctrl+X', 'Cut'],
      ['Ctrl+V', 'Paste'], ['Ctrl+D', 'Duplicate'], ['Ctrl+A', 'Select all'],
      ['Ctrl+S', 'Save project'], ['Ctrl+O', 'Projects'], ['Ctrl+E', 'Export'],
      ['N', 'Toggle snapping'], ['← / →', 'Previous / next frame'], ['Shift + ← / →', 'Jump 10 frames'],
      ['Home / End', 'Jump to start / end'], ['Esc', 'Close menu · deselect'],
    ];
    const body = el('div', { 'data-testid': 'shortcuts-modal' });
    for (const [k, d] of rows) {
      body.appendChild(el('div', { class: 'frow' },
        el('label', { text: k, style: 'font-family:var(--mono);font-size:11px' }),
        el('span', { text: d, style: 'font-size:12px' })));
    }
    const m = this.showModal('Keyboard shortcuts', body, { width: 460 });
    m.footer.appendChild(el('button', { class: 'btn primary', text: 'Done', onclick: () => m.close() }));
  },

  escapeTop() {
    if (modalStack.length) return this.closeTopModal();
    if (ctxOpen) return closeContextMenu();
    import('./preview.js').then(({ preview }) => preview.clearLibPreview?.());
    SELECTION.clear();
  },
};

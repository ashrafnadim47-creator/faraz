/* FORGE — Pro editing tools: groups, compounds, sequences, local .forge projects, in/out, attributes, masks and render queue metadata. */
import { store, bus, selectedClips, getClip, getTrack, trackClips, createClip, createTrack, SELECTION, totalDuration } from './state.js';
import { commit, markDirty } from './project.js';
import { deepClone, uid, clamp, el, $ } from './utils.js';
import { ui } from './ui.js';

const CLIPBOARD_ATTR_KEY = 'forge.clipAttributes';
let attrClipboard = null;

function ensureProjectSchema(p) {
  p.bins ||= [{ id: 'root', name: 'Project', parentId: null }];
  p.sequences ||= [{ id: p.id, name: p.name || 'Main Sequence', start: 0, duration: 0, root: true }];
  p.groups ||= [];
  p.compounds ||= [];
  p.adjustmentLayers ||= [];
  p.projectMarkers ||= p.markers || [];
  p.inOut ||= { in: null, out: null };
  p.renderQueue ||= [];
  p.mediaSettings ||= { proxyEnabled: false, proxyDirectory: '', cacheDirectory: '' };
  p.settings ||= {};
  p.settings.proxyEnabled ??= false;
  p.settings.colorSpace ??= 'Rec.709';
  p.settings.lut ??= null;
  return p;
}

export function ensureProSchema() { if (store.project) ensureProjectSchema(store.project); return store.project; }

function selectedIds() { return selectedClips().filter(c => !getTrack(c.trackId)?.locked).map(c => c.id); }
function activeVideoTrack() { return store.project?.tracks.find(t => t.id === store.ui.activeTrackId && t.kind === 'video' && !t.locked) || store.project?.tracks.find(t => t.kind === 'video' && !t.locked); }

export const proTools = {
  init() { ensureProSchema(); },

  setInPoint() {
    ensureProSchema();
    const t = Math.max(0, store.ui.currentTime || 0);
    commit(p => { ensureProjectSchema(p); p.inOut.in = t; if (p.inOut.out != null && p.inOut.out < t) p.inOut.out = null; }, { label: 'Set In point' });
    ui.toast(`In ${t.toFixed(2)}s`, 'info', 1000);
  },
  setOutPoint() {
    ensureProSchema();
    const t = Math.max(0, store.ui.currentTime || 0);
    commit(p => { ensureProjectSchema(p); p.inOut.out = t; if (p.inOut.in != null && p.inOut.in > t) p.inOut.in = null; }, { label: 'Set Out point' });
    ui.toast(`Out ${t.toFixed(2)}s`, 'info', 1000);
  },
  clearInOut() { commit(p => { ensureProjectSchema(p); p.inOut = { in: null, out: null }; }, { label: 'Clear In/Out' }); },
  range() { ensureProSchema(); const io = store.project.inOut || {}; return io.in != null && io.out != null && io.out > io.in ? { start: io.in, end: io.out } : null; },

  group() {
    const ids = selectedIds(); if (ids.length < 2) return ui.toast('Select at least two clips to group.', 'warn');
    const group = { id: uid(), name: `Group ${store.project.groups.length + 1}`, clipIds: ids, linked: false };
    commit(p => { ensureProjectSchema(p); p.groups.push(group); p.clips.filter(c => ids.includes(c.id)).forEach(c => c.groupId = group.id); }, { label: 'Group clips' });
    ui.toast('Clips grouped', 'success', 1200);
  },
  ungroup() {
    const ids = selectedIds();
    commit(p => {
      ensureProjectSchema(p);
      const gids = new Set(p.clips.filter(c => ids.includes(c.id) && c.groupId).map(c => c.groupId));
      p.clips.forEach(c => { if (gids.has(c.groupId)) delete c.groupId; });
      p.groups = p.groups.filter(g => !gids.has(g.id));
    }, { label: 'Ungroup clips' });
  },
  linkSelected() {
    const ids = selectedIds(); if (ids.length < 2) return ui.toast('Select clips to link.', 'warn');
    const linkId = uid();
    commit(p => { p.clips.filter(c => ids.includes(c.id)).forEach(c => c.linkGroupId = linkId); }, { label: 'Link clips' });
    ui.toast('Clips linked', 'success', 1200);
  },
  unlinkSelected() {
    const ids = selectedIds();
    commit(p => { p.clips.filter(c => ids.includes(c.id)).forEach(c => delete c.linkGroupId); }, { label: 'Unlink clips' });
  },

  compound() {
    const ids = selectedIds(); if (ids.length < 2) return ui.toast('Select two or more clips for a compound clip.', 'warn');
    const clips = store.project.clips.filter(c => ids.includes(c.id));
    const start = Math.min(...clips.map(c => c.start));
    const end = Math.max(...clips.map(c => c.start + c.duration));
    const id = uid();
    commit(p => {
      ensureProjectSchema(p);
      p.compounds.push({ id, name: `Compound ${p.compounds.length + 1}`, clipIds: ids.slice(), start, duration: end - start });
      p.clips.filter(c => ids.includes(c.id)).forEach(c => c.compoundId = id);
    }, { label: 'Create compound clip' });
    ui.toast('Compound clip created', 'success', 1400);
    return id;
  },

  createNestedSequence() {
    const ids = selectedIds(); if (!ids.length) return ui.toast('Select clips for a nested sequence.', 'warn');
    const clips = store.project.clips.filter(c => ids.includes(c.id));
    const start = Math.min(...clips.map(c => c.start));
    const end = Math.max(...clips.map(c => c.start + c.duration));
    const id = uid();
    commit(p => { ensureProjectSchema(p); p.sequences.push({ id, name: `Sequence ${p.sequences.length + 1}`, clipIds: ids.slice(), start, duration: end - start, nested: true }); p.clips.filter(c => ids.includes(c.id)).forEach(c => c.sequenceId = id); }, { label: 'Create nested sequence' });
    ui.toast('Nested sequence created', 'success', 1400);
    return id;
  },

  addAdjustmentLayer() {
    const track = activeVideoTrack(); if (!track) return ui.toast('Add a video track first.', 'warn');
    const t = store.ui.currentTime || 0;
    let id;
    commit(p => {
      const c = createClip({ id: uid(), trackId: track.id, type: 'adjustment', name: 'Adjustment Layer', start: t, duration: 5, mediaId: null, adjustment: true, filters: { brightness:100, contrast:100, saturation:100, exposure:100, blur:0, grayscale:0, sepia:0, hue:0 }, effects: [], keyframes: {} });
      p.clips.push(c); id = c.id; ensureProjectSchema(p); p.adjustmentLayers.push({ id, clipId: id });
    }, { label: 'Add adjustment layer' });
    if (id) SELECTION.set([id]);
    ui.toast('Adjustment layer added', 'success', 1400);
    return id;
  },

  addBin(name = 'Bin') {
    let id;
    commit(p => { ensureProjectSchema(p); id = uid(); p.bins.push({ id, name: name || 'Bin', parentId: 'root' }); }, { label: 'Create bin' });
    return id;
  },

  copyAttributes() {
    const c = selectedClips()[0]; if (!c) return ui.toast('Select a source clip first.', 'warn');
    attrClipboard = { filters: deepClone(c.filters), effects: deepClone(c.effects || []), transform: deepClone(c.transform), crop: deepClone(c.crop), audioEffects: deepClone(c.audioEffects || []), text: deepClone(c.text) };
    try { localStorage.setItem(CLIPBOARD_ATTR_KEY, JSON.stringify(attrClipboard)); } catch {}
    ui.toast('Attributes copied', 'success', 1200);
  },
  pasteAttributes() {
    if (!attrClipboard) { try { attrClipboard = JSON.parse(localStorage.getItem(CLIPBOARD_ATTR_KEY) || 'null'); } catch {} }
    const ids = selectedIds(); if (!attrClipboard || !ids.length) return ui.toast('Copy attributes first, then select target clips.', 'warn');
    commit(p => { p.clips.filter(c => ids.includes(c.id)).forEach(c => { c.filters=deepClone(attrClipboard.filters); c.effects=deepClone(attrClipboard.effects); c.transform=deepClone(attrClipboard.transform); c.crop=deepClone(attrClipboard.crop); c.audioEffects=deepClone(attrClipboard.audioEffects); if (attrClipboard.text && c.text) c.text=deepClone(attrClipboard.text); }); }, { label: 'Paste attributes' });
    ui.toast(`Attributes pasted to ${ids.length} clip${ids.length > 1 ? 's' : ''}`, 'success', 1400);
  },

  setTrackTarget(trackId, enabled = true) {
    commit(p => p.tracks.forEach(t => { if (t.kind === p.tracks.find(x => x.id === trackId)?.kind) t.targeted = false; if (t.id === trackId) t.targeted = enabled; }), { label: 'Track targeting', event: 'tracks:changed', useHistory: false });
  },

  setProxyEnabled(enabled) { commit(p => { ensureProjectSchema(p); p.settings.proxyEnabled = !!enabled; p.mediaSettings.proxyEnabled = !!enabled; }, { label: 'Proxy workflow' }); ui.toast(enabled ? 'Proxy workflow enabled' : 'Proxy workflow disabled', 'info', 1400); },
  setColorSettings(colorSpace, lut) { commit(p => { p.settings.colorSpace = colorSpace || p.settings.colorSpace; p.settings.lut = lut || null; }, { label: 'Color settings' }); },

  addRenderJob(settings = {}) {
    let job;
    commit(p => { ensureProjectSchema(p); job = { id: uid(), status: 'queued', createdAt: new Date().toISOString(), range: this.range(), settings: { format: 'mp4', codec: 'h264', quality: 'high', ...settings } }; p.renderQueue.push(job); }, { label: 'Queue render' });
    ui.toast('Render queued', 'success', 1200); return job;
  },

  async saveForgeFile() {
    ensureProSchema();
    const snapshot = JSON.stringify(store.project, null, 2);
    if (globalThis.forgeDesktop?.saveProjectFile) {
      const result = await globalThis.forgeDesktop.saveProjectFile(store.project.name || 'Untitled Project', snapshot);
      if (!result?.canceled) ui.toast('Project .forge saved', 'success', 1800);
      return result;
    }
    const blob = new Blob([snapshot], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${(store.project.name || 'Untitled Project').replace(/[^\w\- ]+/g, '_')}.forge`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ui.toast('Project .forge downloaded', 'success', 1800);
  },
  async openForgeFile() {
    let text = null;
    if (globalThis.forgeDesktop?.openProjectFile) {
      const result = await globalThis.forgeDesktop.openProjectFile();
      if (result?.canceled || !result?.text) return;
      text = result.text;
    } else {
      const input = el('input', { type: 'file', accept: '.forge,.json', hidden: true }); document.body.appendChild(input);
      input.onchange = async () => { try { const f=input.files?.[0]; if(f) await this._loadForgeText(await f.text()); } catch(e) { ui.toast(`Open project failed: ${e.message}`, 'error'); } input.remove(); };
      input.click(); return;
    }
    await this._loadForgeText(text);
  },
  async _loadForgeText(text) {
    const parsed = JSON.parse(text); if (!parsed?.clips || !parsed?.tracks) throw new Error('Invalid FORGE project file');
    store.project = parsed; ensureProSchema(); bus.emit('project:loaded', { fromFile: true }); ui.toast('Project opened', 'success', 1600);
  },

  backupSnapshot() {
    ensureProSchema();
    const backups = JSON.parse(localStorage.getItem('forge.backups') || '[]');
    backups.unshift({ at: new Date().toISOString(), project: deepClone(store.project) });
    localStorage.setItem('forge.backups', JSON.stringify(backups.slice(0, 10)));
  },

  openProPanel() {
    ensureProSchema();
    const p = store.project;
    const io = p.inOut || {};
    const body = el('div', { class: 'pro-tools-modal', 'data-testid': 'pro-tools-modal' });
    const section = (title, ...children) => { const s = el('section', { class: 'pro-tool-section' }, el('div', { class: 'pro-tool-title', text: title })); children.forEach(c => s.appendChild(c)); body.appendChild(s); return s; };
    const btn = (text, fn, cls='btn') => el('button', { class: cls, text, onclick: fn });

    section('Edit', el('div', { class: 'btn-grid' },
      btn('Ripple delete', () => window.dispatchEvent(new CustomEvent('forge:action', { detail: 'rippleDelete' }))),
      btn('Roll edit −', () => window.dispatchEvent(new CustomEvent('forge:action', { detail: 'rollMinus' }))),
      btn('Roll edit +', () => window.dispatchEvent(new CustomEvent('forge:action', { detail: 'rollPlus' }))),
      btn('Slip −', () => window.dispatchEvent(new CustomEvent('forge:action', { detail: 'slipMinus' }))),
      btn('Slip +', () => window.dispatchEvent(new CustomEvent('forge:action', { detail: 'slipPlus' }))),
      btn('Slide +', () => window.dispatchEvent(new CustomEvent('forge:action', { detail: 'slidePlus' }))),
      btn('Group', () => this.group()), btn('Ungroup', () => this.ungroup()), btn('Link', () => this.linkSelected()), btn('Unlink', () => this.unlinkSelected()),
      btn('Compound', () => this.compound()), btn('Nested sequence', () => this.createNestedSequence()), btn('Adjustment layer', () => this.addAdjustmentLayer()),
      btn('Copy attributes', () => this.copyAttributes()), btn('Paste attributes', () => this.pasteAttributes())
    ));
    section('Range & playback', el('div', { class: 'btn-grid' }, btn('Set In [', () => this.setInPoint()), btn('Set Out ]', () => this.setOutPoint()), btn('Clear In/Out', () => this.clearInOut()), btn('J / K / L help', () => ui.toast('J reverse · K stop · L forward · repeat L for faster playback', 'info', 3000))));
    section('Project', el('div', { class: 'btn-grid' }, btn('Save .forge', () => this.saveForgeFile()), btn('Open .forge', () => this.openForgeFile()), btn('Create Bin', () => this.addBin()), btn('Queue Render', () => this.addRenderJob())));
    section('Video / color',
      el('div', { class: 'form-row' }, el('label', { text: 'Color space' }), el('select', { class: 'sel', value: p.settings.colorSpace || 'Rec.709', onchange: e => this.setColorSettings(e.target.value, p.settings.lut) }, el('option', { value:'Rec.709', text:'Rec.709' }), el('option', { value:'sRGB', text:'sRGB' }), el('option', { value:'Display P3', text:'Display P3' }))),
      el('div', { class: 'btn-row' }, btn(p.settings.proxyEnabled ? 'Disable proxies' : 'Enable proxies', () => { this.setProxyEnabled(!p.settings.proxyEnabled); ui.closeTopModal(); }))
    );
    section('Render queue', el('div', { class: 'readonly-meta', text: `${p.renderQueue.length} queued job${p.renderQueue.length === 1 ? '' : 's'}. Browser export remains available; desktop FFmpeg can be connected to this queue without changing the project model.` }));
    ui.showModal('FORGE Pro Tools', body, { width: 720 });
  }
};

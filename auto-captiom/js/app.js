/* FORGE — application bootstrap: wires every module to the shared state */
import { store, bus, loadUISettings, SELECTION, totalDuration } from './state.js';
import { $, $$, el, formatTC, injectIcons } from './utils.js';
import * as project from './project.js';
import { saveProject } from './project.js';
import * as history from './history.js';
import { ui } from './ui.js';
import { media } from './media.js';
import { timeline } from './timeline.js';
import { preview } from './preview.js';
import { inspector } from './inspector.js';
import { textPanel } from './text.js';
import { buildEffectsPane, buildFiltersPane, buildStickersPane } from './effects.js';
import { buildTransitionsPane } from './transitions.js';
import { buildCaptionsPane } from './captions.js';
import { initKeyboard } from './keyboard.js';
import { exporter } from './export.js';
import { actions } from './actions.js';
import { ForgeCore, exposeCore } from '../core/index.js';
import { applyPlatformAttributes, platform } from '../platform/runtime.js';
import { initMobileUI } from '../platform/mobile-ui.js';
import { home } from './home.js';
import { createDraftProject } from './project.js';
import { initVoiceOver, buildSoundEffectsPane } from './audio.js';
import { auth } from './auth.js';
import { accountUI } from './account-ui.js';


function updateTotal() {
  const el2 = $('#tc-total');
  if (el2) el2.textContent = formatTC(totalDuration());
}

function wireBus() {
  bus.on('project:loaded', () => {
    store.ui.selection = [];
    store.ui.selectedTransitionClip = null;
    store.ui.activeTrackId = store.project?.tracks?.find(t => !t.locked)?.id || store.project?.tracks?.[0]?.id || null;
    $('#project-name-input').value = store.project?.name || '';
    document.title = `${store.project?.name || 'FORGE'} — FORGE`;
    media.renderLibrary();
    timeline.renderTracks();
    preview.onProjectLoaded();
    inspector.refresh();
    updateTotal();
  });
  bus.on('clips:changed', () => { timeline.renderClips(); timeline.layout(); updateTotal(); preview.dirty = true; });
  bus.on('media:changed', () => { media.renderLibrary(); timeline.renderClips(); preview.dirty = true; });
  bus.on('tracks:changed', () => { timeline.renderTracks(); preview.dirty = true; });
  bus.on('track:active', () => { timeline.renderTracks(); });
  bus.on('markers:changed', () => timeline.drawRuler());
  bus.on('selection:changed', () => {
    preview.updateHandles();
    // Rebuild the context-sensitive filter controls so they always target the current clip.
    // Filter controls are now clip-context controls in the Inspector; no duplicate left tab.
  });
  bus.on('clip:updated', () => { preview.dirty = true; updateTotal(); });
  bus.on('history:changed', () => {
    $('#btn-undo').disabled = !history.canUndo();
    $('#btn-redo').disabled = !history.canRedo();
  });
  bus.on('save-state', () => {
    const label = $('#save-state-label');
    const s = store.saveState;
    label.textContent = s === 'saved' ? 'Saved' : s === 'saving' ? 'Saving…' : 'Unsaved changes';
    label.className = `save-state ${s}`;
  });
  bus.on('save-error', msg => ui.toast(`Autosave failed: ${msg}`, 'error'));
  bus.on('cloud-media-error', msg => {
    if (msg === 'FREE_STORAGE_LIMIT') ui.toast('Cloud media limit: files over 50 MB stay local.', 'warn', 5000);
    else ui.toast(`Cloud media sync: ${msg}`, 'warn', 5000);
  });
  bus.on('playhead', () => {
    $('#tc-current').textContent = formatTC(preview.time);
    timeline.updatePlayhead();
    if (preview.playing) timeline.ensureVisible(preview.time);
  });
  bus.on('transport', () => {
    const btn = $('#btn-play');
    if (btn) btn.innerHTML = preview.playing ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.4" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/></svg>';
  });
  bus.on('project:settings', () => { preview.onProjectSettings(); updateTotal(); });
  window.addEventListener('forge:auth-ready', () => home.refreshProjects());
  window.addEventListener('forge:voiceover-ready', async e => {
    try {
      const blob = e.detail?.blob;
      if (!blob || !blob.size) throw new Error('The recording was empty.');
      const ext = (blob.type || '').includes('ogg') ? 'ogg' : (blob.type || '').includes('mp4') ? 'm4a' : 'webm';
      const file = new File([blob], `Voice Over ${new Date().toLocaleTimeString().replace(/[:\s]/g, '-')}.${ext}`, { type: blob.type || 'audio/webm' });
      await media.importFiles([file]);
      const item = store.project.media[store.project.media.length - 1];
      if (item?.type === 'audio') {
        media.addMediaToTimeline(item, store.ui.activeTrackId, preview.time);
        ui.toast('Voice-over added to timeline', 'success', 2500);
      } else {
        ui.toast('Voice-over was recorded but could not be added as audio.', 'error', 5000);
      }
    } catch (err) { console.error('[forge] voice-over import failed', err); ui.toast(`Voice-over failed: ${err.message || err}`, 'error', 5000); }
  });
  window.addEventListener('forge:voiceover-error', e => ui.toast(`Voice-over: ${e.detail || 'Microphone unavailable'}`, 'error', 5000));
  window.__FORGE_GET_SELECTED_AUDIO__ = () => store.ui.selection.map(id => store.project?.clips?.find(c => c.id === id)).find(c => c?.type === 'audio')?.id || null;
  window.addEventListener('forge:audio-fx', e => {
    const clipId=e.detail?.clipId || window.__FORGE_GET_SELECTED_AUDIO__?.();
    const fx=e.detail?.id;
    if(!clipId || !fx) return ui.toast('Select an audio clip first.', 'info');
    project.commit?.(p => { const c=p.clips.find(x=>x.id===clipId); if(!c) return; c.audioEffects=Array.isArray(c.audioEffects)?c.audioEffects:[]; if(fx==='clean') c.audioEffects=[]; else if(!c.audioEffects.includes(fx)) c.audioEffects.push(fx); }, {label:`Audio FX: ${fx}`});
    preview.els?.forEach?.((elv, mediaId) => { const c=store.project?.clips?.find(x=>x.mediaId===mediaId && x.id===clipId); if(c) window.dispatchEvent(new CustomEvent('forge:audio-fx-apply',{detail:{elv,effects:c.audioEffects}})); });
    ui.toast(`${fx} added`, 'success', 1200);
  });
  window.addEventListener('forge:audio-fx-apply', e => {});
  window.addEventListener('forge:sfx-error', e => ui.toast(`Sound effect failed: ${e.detail || 'unknown error'}`, 'error', 4500));
  window.addEventListener('forge:action', e => { const a=e.detail; if(a==='rippleDelete') actions.rippleDelete(); else if(a==='rollPlus') actions.rollEdit(1); else if(a==='rollMinus') actions.rollEdit(-1); else if(a==='slipPlus') actions.slipEdit(1); else if(a==='slipMinus') actions.slipEdit(-1); else if(a==='slidePlus') actions.slideEdit(1); });
}

function showHomeScreen() {
  $('#forge-image-editor')?.setAttribute('hidden','hidden');
  $('#app')?.classList.add('home-mode');
  $('#forge-home')?.removeAttribute('hidden');
  $('#btn-home')?.classList.add('active');
  $('#btn-editor')?.classList.remove('active');
  home.refreshProjects();
}

function showEditorScreen() {
  $('#forge-home')?.setAttribute('hidden','hidden');
  $('#forge-image-editor')?.setAttribute('hidden','hidden');
  $('#app')?.classList.remove('home-mode');
  $('#btn-editor')?.classList.add('active');
  $('#btn-home')?.classList.remove('active');
}

function bindTopbar() {
  $('#btn-home')?.addEventListener('click', showHomeScreen);
  $('#btn-editor')?.addEventListener('click', showEditorScreen);
  $('#btn-import').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', e => {
    if (e.target.files.length) media.importFiles(e.target.files);
    e.target.value = '';
  });
  $('#btn-undo').addEventListener('click', () => history.undo());
  $('#btn-redo').addEventListener('click', () => history.redo());
  $('#btn-save').addEventListener('click', () => saveProject().then(() => ui.toast('Project saved', 'success', 1500)));
  $('#btn-projects').addEventListener('click', () => ui.openProjectsModal());
  $('#btn-export').addEventListener('click', () => exporter.open());
  $('#btn-settings').addEventListener('click', () => ui.openSettings());
  $('#btn-shortcuts').addEventListener('click', () => ui.openShortcuts());
  $('#btn-panels').addEventListener('click', () => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      $('#app').classList.toggle('panels-collapsed');
    } else {
      ui.toast('Side panels stay visible on desktop. Resize them with the dividers.', 'info', 1800);
    }
    window.dispatchEvent(new Event('resize'));
  });
  $('#btn-fullscreen-app').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  const nameInput = $('#project-name-input');
  nameInput.addEventListener('change', () => {
    const name = nameInput.value.trim() || 'Untitled Project';
    project.commit(p => { p.name = name; }, { label: 'Rename project', event: 'media:changed', useHistory: false });
    document.title = `${name} — FORGE`;
    saveProject();
  });
}

async function boot() {
  applyPlatformAttributes();
  await auth.init();
  await accountUI.init();
  exposeCore();
  loadUISettings();
  injectIcons();
  ui.init();
  if (platform.mobile) initMobileUI();

  let errCount = 0;
  window.addEventListener('error', e => { if (++errCount <= 4) ui.toast(`Error: ${e.message}`, 'error', 5000); });
  window.addEventListener('unhandledrejection', e => {
    if (++errCount <= 4) ui.toast(`Something went wrong: ${e.reason?.message || e.reason}`, 'error', 5000);
  });

  // Start on the FORGE Home screen. Keep a non-persisted draft project behind it
  // so editor modules can initialize safely without auto-opening the latest project.
  createDraftProject('Untitled Project');

  media.init();
  initVoiceOver($('#pane-audio'));
  buildSoundEffectsPane($('#pane-audio'), () => preview.time);
  timeline.init();
  preview.init();
  inspector.init();
  textPanel.init();
  buildEffectsPane($('#pane-effects'));
  buildCaptionsPane($('#pane-captions'));
  buildStickersPane($('#pane-stickers'));
  buildTransitionsPane($('#pane-transitions'));
  initKeyboard();
  exporter.init();
  actions.bind({ preview, exporter, projectsModal: () => ui.openProjectsModal() });
  window.__FORGE_NAV = { showHome: showHomeScreen, showEditor: showEditorScreen };

  await media.hydrateThumbs();
  // Restore persisted media URLs before the first project render. Previously this
  // happened in the background, so the timeline/preview could render empty until
  // another interaction forced a redraw.
  await Promise.all((store.project.media || []).map(item => media.hydrateBlobUrl(item)));
  preview.dirty = true;
  project.startAutosave();

  wireBus();
  bindTopbar();
  bus.emit('history:changed');
  bus.emit('save-state');
  updateTotal();

  bus.emit('project:loaded', { initial: true });
  document.title = 'FORGE — Home';
  await home.init();
  // Debug/testing hook: live read access to app state
  window.__FORGE = { get project() { return store.project; }, store, core: ForgeCore, platform };
  document.documentElement.dataset.forgeReady = '1';
  $('#boot-splash')?.remove();
}

boot().catch(e => {
  console.error('[forge] boot failed', e);
  const splash = $('#boot-status');
  if (splash) splash.textContent = 'FORGE failed to start — check the console for details.';
});

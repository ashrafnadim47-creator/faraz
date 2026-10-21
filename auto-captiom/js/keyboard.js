/* FORGE — keyboard shortcuts */
import { $, clamp } from './utils.js';
import { store } from './state.js';
import * as history from './history.js';
import { actions } from './actions.js';
import { preview } from './preview.js';
import { totalDuration } from './state.js';
import { saveProject } from './project.js';
import { ui } from './ui.js';

export function initKeyboard() {
  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();

    if (e.key === 'Escape') { e.preventDefault(); ui.escapeTop(); return; }

    if (typing) {
      if (mod && k === 's') { e.preventDefault(); saveProject().then(() => ui.toast('Project saved', 'success', 1500)); }
      return;
    }

    // During export only allow Escape (handled above via ui)
    if (mod) {
      switch (k) {
        case 'z': e.preventDefault(); e.shiftKey ? history.redo() : history.undo(); return;
        case 'y': e.preventDefault(); history.redo(); return;
        case 'c': e.preventDefault(); actions.copy(); return;
        case 'x': e.preventDefault(); actions.cut(); return;
        case 'v': e.preventDefault(); actions.paste(); return;
        case 'd': e.preventDefault(); actions.duplicate(); return;
        case 'a': e.preventDefault(); actions.selectAll(); return;
        case 's': e.preventDefault(); saveProject().then(() => ui.toast('Project saved', 'success', 1500)); return;
        case 'o': e.preventDefault(); ui.openProjectsModal(); return;
        case 'e': e.preventDefault(); import('./export.js').then(({ exporter }) => exporter.open()); return;
      }
      return;
    }

    switch (e.key) {
      case ' ': e.preventDefault(); actions.togglePlay(); break;
      case 'j': case 'J': e.preventDefault(); preview.setPlaybackRate?.(-1); if (!preview.playing) preview.play(); break;
      case 'k': case 'K': e.preventDefault(); preview.pause(); break;
      case 'l': case 'L': e.preventDefault(); { const current = Number(store.ui.playbackRate || 1); preview.setPlaybackRate?.(current < 0 ? 1 : Math.min(4, Math.max(1, current * 2))); preview.play(); } break;
      case '[': e.preventDefault(); window.dispatchEvent(new CustomEvent('forge:set-in')); break;
      case ']': e.preventDefault(); window.dispatchEvent(new CustomEvent('forge:set-out')); break;
      case 's': case 'S': actions.split(); break;
      case 'n': case 'N': {
        store.ui.snap = !store.ui.snap;
        const btn = $('#btn-toggle-snap');
        if (btn) btn.classList.toggle('active', store.ui.snap);
        ui.toast(`Snapping ${store.ui.snap ? 'on' : 'off'}`, 'info', 1200);
        break;
      }
      case 'Delete': case 'Backspace': e.preventDefault(); actions.deleteSelection(); break;
      case 'ArrowLeft': case 'ArrowRight': {
        e.preventDefault();
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        const frames = e.shiftKey ? 10 : 1;
        preview.seek(preview.time + (dir * frames) / (store.project?.settings.fps || 30));
        break;
      }
      case 'Home': e.preventDefault(); preview.seek(0); break;
      case 'End': e.preventDefault(); preview.seek(totalDuration()); break;
    }
  });
}

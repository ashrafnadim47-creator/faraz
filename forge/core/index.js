/* FORGE — shared editor core facade.
 * Existing editor modules remain where they are; this facade gives every platform
 * (desktop, Android, future web) one stable entry point instead of duplicating logic.
 */
import { store, bus, createEmptyProject, createTrack, createClip, defaultTransform, defaultFilters, defaultText, totalDuration } from '../js/state.js';
import * as project from '../js/project.js';
import { media } from '../js/media.js';
import { timeline } from '../js/timeline.js';
import { preview } from '../js/preview.js';
import * as history from '../js/history.js';
import { actions } from '../js/actions.js';
import { exporter } from '../js/export.js';

export const ForgeCore = Object.freeze({
  store,
  bus,
  project,
  media,
  timeline,
  preview,
  history,
  actions,
  exporter,
  model: Object.freeze({
    createEmptyProject,
    createTrack,
    createClip,
    defaultTransform,
    defaultFilters,
    defaultText,
    totalDuration,
  }),
  version: '1.0-core',
});

export function exposeCore() {
  // Deliberately expose a small stable API for platform shells and future plugins.
  // Internal modules can keep evolving without changing Android/Desktop integration.
  window.FORGE_CORE = ForgeCore;
  return ForgeCore;
}

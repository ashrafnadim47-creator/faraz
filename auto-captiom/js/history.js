/* FORGE — undo/redo history (snapshot based) */
import { deepClone } from './utils.js';
import { store, bus } from './state.js';

const MAX = 60;
let undoStack = [];
let redoStack = [];

/** Capture the current project state before a mutation. Mutate freely, then call end(cap). */
export function begin(label) { return { label, state: deepClone(store.project) }; }

/** Commit a previously begun capture to the undo stack (skips no-op changes). */
export function end(cap) {
  if (!cap || !cap.state) return;
  if (JSON.stringify(cap.state) === JSON.stringify(store.project)) return;
  undoStack.push(cap);
  if (undoStack.length > MAX) undoStack.shift();
  redoStack = [];
  bus.emit('history:changed');
}

export function cancel() { /* captured state simply discarded */ }

export function undo() {
  const e = undoStack.pop();
  if (!e) return;
  redoStack.push({ label: e.label, state: deepClone(store.project) });
  store.project = e.state;
  bus.emit('project:loaded', { restore: true });
  bus.emit('history:changed');
}

export function redo() {
  const e = redoStack.pop();
  if (!e) return;
  undoStack.push({ label: e.label, state: deepClone(store.project) });
  store.project = e.state;
  bus.emit('project:loaded', { restore: true });
  bus.emit('history:changed');
}

export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;
export function clear() { undoStack = []; redoStack = []; bus.emit('history:changed'); }

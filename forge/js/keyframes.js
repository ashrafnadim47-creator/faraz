/* FORGE — keyframe system: per-clip property keyframes with linear interpolation */
import { clamp } from './utils.js';

export const KEY_PATHS = [
  { path: 'transform.x', label: 'Position X', get: c => c.transform.x, step: 1, fmt: v => `${Math.round(v)} px` },
  { path: 'transform.y', label: 'Position Y', get: c => c.transform.y, step: 1, fmt: v => `${Math.round(v)} px` },
  { path: 'transform.scale', label: 'Scale', get: c => c.transform.scale, step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
  { path: 'transform.rotation', label: 'Rotation', get: c => c.transform.rotation, step: 1, fmt: v => `${Math.round(v)}°` },
  { path: 'transform.opacity', label: 'Opacity', get: c => c.transform.opacity, step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
  { path: 'volume', label: 'Volume', get: c => c.volume, step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
];

function arr(clip, path) { return (clip.keyframes && clip.keyframes[path]) || null; }

export const keyframes = {
  /** Interpolated value at local time, or null when the property has no keys. */
  valueAt(clip, path, localT) {
    const ks = arr(clip, path);
    if (!ks || !ks.length) return null;
    if (localT <= ks[0].t) return ks[0].v;
    if (localT >= ks[ks.length - 1].t) return ks[ks.length - 1].v;
    for (let i = 0; i < ks.length - 1; i++) {
      const a = ks[i], b = ks[i + 1];
      if (localT >= a.t && localT <= b.t) {
        const p = b.t === a.t ? 0 : (localT - a.t) / (b.t - a.t);
        return a.v + (b.v - a.v) * p;
      }
    }
    return ks[0].v;
  },
  /** Base value (what the property would be without keyframes). */
  baseAt(clip, path) {
    const def = KEY_PATHS.find(k => k.path === path);
    return def ? def.get(clip) : 0;
  },
  /** Resolved property value: keyframe interpolation if keys exist, else base value. */
  resolve(clip, path, localT) {
    const v = this.valueAt(clip, path, localT);
    return v === null ? this.baseAt(clip, path) : v;
  },
  setKey(clip, path, localT, v) {
    clip.keyframes = clip.keyframes || {};
    const list = (clip.keyframes[path] = clip.keyframes[path] || []);
    const eps = 0.02;
    const existing = list.find(k => Math.abs(k.t - localT) < eps);
    if (existing) existing.v = v;
    else { list.push({ t: Math.max(0, localT), v }); list.sort((a, b) => a.t - b.t); }
  },
  removeKey(clip, path, t) {
    const ks = arr(clip, path);
    if (!ks) return;
    const i = ks.findIndex(k => Math.abs(k.t - t) < 0.03);
    if (i >= 0) ks.splice(i, 1);
    if (!ks.length) delete clip.keyframes[path];
  },
  clearPath(clip, path) { if (clip.keyframes) delete clip.keyframes[path]; },
  count(clip) { return clip.keyframes ? Object.values(clip.keyframes).reduce((m, a) => m + a.length, 0) : 0; },
  /** Shift all keys by dt (used when trimming from the left edge). */
  shift(clip, dt) {
    if (!clip.keyframes) return;
    for (const path of Object.keys(clip.keyframes)) {
      clip.keyframes[path] = clip.keyframes[path]
        .map(k => ({ t: clamp(k.t + dt, 0, 1e9), v: k.v }))
        .filter(k => k.t >= -0.001)
        .sort((a, b) => a.t - b.t);
      if (!clip.keyframes[path].length) delete clip.keyframes[path];
    }
  },
};

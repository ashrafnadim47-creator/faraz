/* FORGE — transitions between adjacent clips */
import { store, bus, getClip, getTrack, trackClips, bestClipTarget, SELECTION } from './state.js';
import { el, clamp } from './utils.js';
import { commit } from './project.js';
import { ui } from './ui.js';
import { timeline } from './timeline.js';

export const TRANSITION_CATALOG = [
  // Dissolves / fades
  { id: 'dissolve', name: 'Cross Dissolve', category: 'Dissolve', desc: 'Smooth cross-fade' },
  { id: 'additive', name: 'Additive Dissolve', category: 'Dissolve', desc: 'Bright additive blend' },
  { id: 'film', name: 'Film Dissolve', category: 'Dissolve', desc: 'Soft film-style dissolve' },
  { id: 'fade', name: 'Dip to Black', category: 'Dissolve', desc: 'Dip through black' },
  { id: 'dipwhite', name: 'Dip to White', category: 'Dissolve', desc: 'Dip through white' },
  { id: 'flash', name: 'Flash', category: 'Dissolve', desc: 'Bright camera flash' },
  { id: 'blur', name: 'Blur Dissolve', category: 'Dissolve', desc: 'Dreamy blur blend' },
  { id: 'color', name: 'Color Dip', category: 'Dissolve', desc: 'Dip through a dark color' },

  // Slide / push
  { id: 'slide', name: 'Slide Left', category: 'Slide & Push', desc: 'Next clip slides in' },
  { id: 'slideRight', name: 'Slide Right', category: 'Slide & Push', desc: 'Next clip slides from right' },
  { id: 'slideUp', name: 'Slide Up', category: 'Slide & Push', desc: 'Next clip slides upward' },
  { id: 'slideDown', name: 'Slide Down', category: 'Slide & Push', desc: 'Next clip slides downward' },
  { id: 'push', name: 'Push Left', category: 'Slide & Push', desc: 'Next clip pushes current' },
  { id: 'pushRight', name: 'Push Right', category: 'Slide & Push', desc: 'Next clip pushes from right' },
  { id: 'pushUp', name: 'Push Up', category: 'Slide & Push', desc: 'Next clip pushes upward' },
  { id: 'pushDown', name: 'Push Down', category: 'Slide & Push', desc: 'Next clip pushes downward' },
  { id: 'split', name: 'Split', category: 'Slide & Push', desc: 'Split reveal from center' },
  { id: 'whip', name: 'Whip Pan', category: 'Slide & Push', desc: 'Fast motion whip' },

  // Wipes / geometry
  { id: 'wipe', name: 'Linear Wipe', category: 'Wipe', desc: 'Clean edge reveal' },
  { id: 'wipeRight', name: 'Wipe Right', category: 'Wipe', desc: 'Reveal from right' },
  { id: 'wipeUp', name: 'Wipe Up', category: 'Wipe', desc: 'Reveal from bottom' },
  { id: 'wipeDown', name: 'Wipe Down', category: 'Wipe', desc: 'Reveal from top' },
  { id: 'circle', name: 'Circle Iris', category: 'Shape', desc: 'Circular reveal' },
  { id: 'diamond', name: 'Diamond Iris', category: 'Shape', desc: 'Diamond reveal' },
  { id: 'box', name: 'Box Iris', category: 'Shape', desc: 'Box reveal' },
  { id: 'star', name: 'Star Iris', category: 'Shape', desc: 'Star-shaped reveal' },
  { id: 'heart', name: 'Heart Iris', category: 'Shape', desc: 'Heart-shaped reveal' },
  { id: 'radial', name: 'Radial Wipe', category: 'Wipe', desc: 'Radial reveal' },
  { id: 'clock', name: 'Clock Wipe', category: 'Wipe', desc: 'Clock-hand reveal' },
  { id: 'venetian', name: 'Venetian Blinds', category: 'Wipe', desc: 'Striped reveal' },
  { id: 'checker', name: 'Checkerboard', category: 'Wipe', desc: 'Checker reveal' },
  { id: 'pinwheel', name: 'Pinwheel', category: 'Wipe', desc: 'Spinning wedge reveal' },

  // Motion / zoom / 3D
  { id: 'zoom', name: 'Zoom', category: 'Motion', desc: 'Cinematic zoom blend' },
  { id: 'crosszoom', name: 'Cross Zoom', category: 'Motion', desc: 'Fast zoom-through blend' },
  { id: 'zoomblur', name: 'Zoom Blur', category: 'Motion', desc: 'Speed-blurred zoom' },
  { id: 'rotate', name: 'Rotate', category: 'Motion', desc: 'Spin into next clip' },
  { id: 'spin', name: 'Spin', category: 'Motion', desc: 'Fast 360° spin' },
  { id: 'flip', name: '3D Flip', category: 'Motion', desc: 'Flip into next clip' },
  { id: 'roll', name: '3D Roll', category: 'Motion', desc: 'Roll into next clip' },
  { id: 'spring', name: 'Spring', category: 'Motion', desc: 'Elastic transition' },
  { id: 'stretch', name: 'Stretch', category: 'Motion', desc: 'Elastic stretch blend' },

  // Stylized
  { id: 'glitch', name: 'Glitch', category: 'Stylized', desc: 'Digital snap cut' },
  { id: 'rgb', name: 'RGB Split', category: 'Stylized', desc: 'Chromatic channel split' },
  { id: 'mosaic', name: 'Mosaic', category: 'Stylized', desc: 'Pixelated transition' },
  { id: 'mirror', name: 'Mirror', category: 'Stylized', desc: 'Mirror split reveal' },
  { id: 'burn', name: 'Burn', category: 'Stylized', desc: 'Hot film-burn reveal' },
  { id: 'light', name: 'Light Leak', category: 'Stylized', desc: 'Cinematic light leak' },
  { id: 'vapor', name: 'Vapor', category: 'Stylized', desc: 'Soft vapor reveal' },
  { id: 'wave', name: 'Wave', category: 'Stylized', desc: 'Liquid wave distortion' },
  { id: 'slice', name: 'Slice', category: 'Stylized', desc: 'Layered slice reveal' },
  { id: 'page', name: 'Page Peel', category: 'Stylized', desc: 'Page-turn reveal' },

  { id: 'cut', name: 'Cut', category: 'Basic', desc: 'Remove transition' },
];

/** Find the clip that ends where clipB starts (same track, tolerant to small gaps). */
export function transitionSource(clipB) {
  if (!clipB) return null;
  const track = getTrack(clipB.trackId);
  if (!track) return null;
  let best = null, bestD = 0.5;
  for (const c of trackClips(clipB.trackId)) {
    if (c.id === clipB.id) continue;
    const d = Math.abs(c.start + c.duration - clipB.start);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

/** All transition pairs [{A, B, trans}] for the project (A may be null when detached). */
export function transitionPairs(p) {
  const pairs = [];
  for (const clipB of p.clips) {
    if (clipB.transitionIn && clipB.transitionIn.type !== 'cut') {
      pairs.push({ A: transitionSource(clipB), B: clipB, trans: clipB.transitionIn });
    }
  }
  return pairs;
}

export function addTransition(clipBId, type = 'dissolve', duration = 0.6) {
  const clipB = getClip(clipBId);
  if (!clipB) return ui.toast('Drop transitions on the boundary between two clips.', 'warn');
  const clipA = trackClips(clipB.trackId).find(c => c.id !== clipBId && Math.abs(c.start + c.duration - clipB.start) < 0.03);
  if (!clipA) return ui.toast('Transitions need two adjacent clips on the same track.', 'warn');
  if (type === 'cut') return removeTransition(clipBId);
  const maxD = Math.min(2, clipA.duration, clipB.duration);
  commit(p => {
    const c = p.clips.find(x => x.id === clipBId);
    c.transitionIn = { type, duration: clamp(duration, 0.1, maxD) };
  }, { label: `Add ${type} transition` });
  SELECTION.clear();
  store.ui.selectedTransitionClip = clipBId;
  bus.emit('selection:changed');
  ui.toast(`${type} transition added`, 'success');
}

export function removeTransition(clipBId) {
  commit(p => {
    const c = p.clips.find(x => x.id === clipBId);
    if (c) c.transitionIn = null;
  }, { label: 'Remove transition' });
}

export function setTransitionDuration(clipBId, duration) {
  const clipB = getClip(clipBId);
  if (!clipB || !clipB.transitionIn) return;
  const clipA = transitionSource(clipB);
  const maxD = Math.min(2, clipA ? clipA.duration : 2, clipB.duration);
  commit(p => {
    const c = p.clips.find(x => x.id === clipBId);
    c.transitionIn.duration = clamp(duration, 0.1, maxD);
  }, { label: 'Transition duration', event: 'clip:updated', useHistory: false });
}

function resolveTransitionTarget() {
  const explicit = store.ui.selectedTransitionClip ? getClip(store.ui.selectedTransitionClip) : null;
  if (explicit) return explicit.id;
  const t = Number(store.ui.currentTime || 0);
  const all = store.project?.clips || [];
  const cut = all.find(b => {
    if (!b || b.type === 'audio') return false;
    const a = transitionSource(b);
    return !!a && Math.abs(b.start - t) < 0.09;
  });
  if (cut) return cut.id;
  const candidate = bestClipTarget();
  if (candidate) {
    const next = trackClips(candidate.trackId).find(c => c.id !== candidate.id && Math.abs(c.start - (candidate.start + candidate.duration)) < 0.06);
    if (next) return next.id;
    const prev = transitionSource(candidate);
    if (prev && Math.abs(candidate.start - t) < 0.12) return candidate.id;
  }
  return null;
}

function previewTransition(clipId) {
  const clip = getClip(clipId);
  if (!clip?.transitionIn) return;
  const d = Number(clip.transitionIn.duration || 0.6);
  const start = Math.max(0, clip.start - d / 2);
  const end = clip.start + d / 2;
  store.ui.currentTime = start;
  import('./preview.js').then(({ preview }) => {
    preview.seek(start);
    preview.play();
    const stopAt = () => {
      if (preview.time >= end - 0.01) { preview.pause(); bus.emit('playhead'); }
      else requestAnimationFrame(stopAt);
    };
    requestAnimationFrame(stopAt);
  });
}

export function buildTransitionsPane(root) {
  if (!root) return;
  root.innerHTML = '';
  root.appendChild(el('div', { class: 'pane-hint' }, '60+ transition styles. Drag onto a cut or click to apply at the current edit point.'));
  const search = el('input', { type:'search', class:'search-input', placeholder:'Search transitions…', 'data-testid':'transition-search' });
  root.appendChild(search);
  const list = el('div', { class:'transition-library', 'data-testid':'transitions-list' });

  const render = () => {
    list.innerHTML='';
    const q=(search.value||'').trim().toLowerCase();
    const filtered=TRANSITION_CATALOG.filter(t=>!q || `${t.name} ${t.category} ${t.desc}`.toLowerCase().includes(q));
    const groups=new Map();
    filtered.forEach(t=>{ if(!groups.has(t.category)) groups.set(t.category,[]); groups.get(t.category).push(t); });
    for(const [category,items] of groups){
      list.appendChild(el('div',{class:'pane-section-title',text:`${category} · ${items.length}`}));
      const grid=el('div',{class:'card-grid'});
      for(const t of items){
        grid.appendChild(el('div',{class:'fx-card', 'data-testid':`transition-card-${t.id}`,
          onpointerdown:e=>{ if(t.id!=='cut') timeline.beginLibraryDrag(e,{kind:'transition',transitionType:t.id,label:t.name},{onJunctionDrop:(trackId,boundary)=>{const clipB=trackClips(trackId).find(c=>Math.abs(c.start-boundary)<0.05);if(clipB)addTransition(clipB.id,t.id,0.6);}}); },
          onclick:()=>{
            const targetId=resolveTransitionTarget();
            if(t.id==='cut'){ if(targetId) removeTransition(targetId); else ui.toast('Put the playhead on a cut first.','info'); return; }
            if(targetId) { addTransition(targetId,t.id,0.6); previewTransition(targetId); }
            else ui.toast('Put the playhead directly on the cut between two clips, then click a transition.', 'info');
          }
        },el('div',{class:'fx-icon',text:t.id==='cut'?'✂':'◆'}),el('div',{},el('div',{class:'fx-name',text:t.name}),el('div',{class:'fx-desc',text:t.desc}),el('button',{class:'fx-preview-btn',text:'▶ Preview',onclick:e=>{e.stopPropagation(); const id=resolveTransitionTarget(); if(id){ if(!getClip(id)?.transitionIn && t.id!=='cut') addTransition(id,t.id,0.6); previewTransition(id); } else ui.toast('Select a cut first.','info');}}))));
      }
      list.appendChild(grid);
    }
    if(!filtered.length) list.appendChild(el('div',{class:'media-empty',text:'No transitions match your search.'}));
  };
  search.addEventListener('input',render);
  root.appendChild(list);
  render();
}

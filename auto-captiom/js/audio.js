import { ui } from './ui.js';
/* FORGE — WebAudio engine + browser voice-over recorder */
import { clamp, $, el } from './utils.js';
import { store, bus, createClip, SELECTION } from './state.js';
import { commit } from './project.js';


/* Built-in royalty-free procedural SFX. These are generated locally as WAV data,
   so FORGE does not ship copyrighted audio assets and the user can audition/drop
   sounds without downloading a sound pack. */
export const SOUND_EFFECT_CATALOG = [
  { id:'whoosh', name:'Whoosh', desc:'Fast airy sweep', kind:'whoosh', duration:0.7 },
  { id:'whooshLow', name:'Deep Whoosh', desc:'Low cinematic sweep', kind:'whooshLow', duration:0.9 },
  { id:'impact', name:'Impact', desc:'Short cinematic hit', kind:'impact', duration:0.55 },
  { id:'hit', name:'Hit', desc:'Punchy edit hit', kind:'hit', duration:0.28 },
  { id:'click', name:'Click', desc:'Clean UI click', kind:'click', duration:0.08 },
  { id:'pop', name:'Pop', desc:'Bright pop accent', kind:'pop', duration:0.22 },
  { id:'riser', name:'Riser', desc:'Build into a cut', kind:'riser', duration:1.6 },
  { id:'downlifter', name:'Downlifter', desc:'Drop out of a scene', kind:'downlifter', duration:1.3 },
  { id:'beep', name:'Beep', desc:'Short digital tone', kind:'beep', duration:0.16 },
  { id:'glitch', name:'Glitch', desc:'Digital burst', kind:'glitch', duration:0.42 },
  { id:'camera', name:'Camera Click', desc:'Camera shutter accent', kind:'camera', duration:0.18 },
  { id:'spark', name:'Spark', desc:'Tiny bright accent', kind:'spark', duration:0.3 },
  { id:'boing', name:'Boing', desc:'Cartoon bounce', kind:'boing', duration:0.5 },
  { id:'recordstop', name:'Record Stop', desc:'Vinyl stop accent', kind:'recordstop', duration:0.7 },
  { id:'memeboom', name:'Meme Boom', desc:'Original deep meme-style hit', kind:'memeboom', duration:0.8 },
  { id:'airhorn', name:'Air Horn', desc:'Short synthetic horn', kind:'airhorn', duration:0.45 },
  { id:'laser', name:'Laser', desc:'Arcade laser zap', kind:'laser', duration:0.35 },
  { id:'ding', name:'Ding', desc:'Bright notification tone', kind:'ding', duration:0.32 },
  { id:'swoosh', name:'Swoosh', desc:'Short movement accent', kind:'swoosh', duration:0.4 },
];

function wavBlob(samples, sampleRate = 44100) {
  const data = new ArrayBuffer(44 + samples.length * 2);
  const dv = new DataView(data);
  const put = (o, str) => [...str].forEach((c,i)=>dv.setUint8(o+i,c.charCodeAt(0)));
  put(0,'RIFF'); dv.setUint32(4,36+samples.length*2,true); put(8,'WAVE'); put(12,'fmt ');
  dv.setUint32(16,16,true); dv.setUint16(20,1,true); dv.setUint16(22,1,true);
  dv.setUint32(24,sampleRate,true); dv.setUint32(28,sampleRate*2,true); dv.setUint16(32,2,true); dv.setUint16(34,16,true);
  put(36,'data'); dv.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++) dv.setInt16(44+i*2, Math.max(-1,Math.min(1,samples[i]))*32767, true);
  return new Blob([data], {type:'audio/wav'});
}

function makeSfx(kind, duration) {
  const sr=44100, n=Math.max(1,Math.floor(sr*duration)), out=new Float32Array(n);
  const rnd=()=>Math.random()*2-1;
  for(let i=0;i<n;i++) {
    const t=i/sr, p=i/n, fade=Math.min(1,t*60,(1-p)*45);
    let v=0;
    if(kind==='click'||kind==='camera') {
      const f=kind==='camera'?1700:1100; v=Math.sin(2*Math.PI*f*t)*Math.exp(-t*32);
      if(kind==='camera') v += rnd()*0.35*Math.exp(-t*55);
    } else if(kind==='beep') v=Math.sin(2*Math.PI*(650+180*t)*t)*Math.exp(-t*18);
    else if(kind==='pop') v=Math.sin(2*Math.PI*(180+900*p)*t)*Math.exp(-t*14);
    else if(kind==='hit'||kind==='impact') {
      v=(Math.sin(2*Math.PI*(70+35*(1-p))*t)+0.45*Math.sin(2*Math.PI*140*t))*Math.exp(-t*(kind==='impact'?7:15));
      v += rnd()*0.35*Math.exp(-t*28);
    } else if(kind==='whoosh'||kind==='whooshLow') {
      const f=kind==='whooshLow'?140:420; v=rnd()*0.7*Math.sin(Math.PI*p)*Math.exp(-p*1.3);
      v += 0.22*Math.sin(2*Math.PI*(f+1800*p)*t)*Math.sin(Math.PI*p);
    } else if(kind==='riser') {
      const f=90+1700*p; v=0.5*Math.sin(2*Math.PI*f*t)+0.2*rnd(); v*=p;
    } else if(kind==='downlifter') {
      const f=1800-1500*p; v=0.45*Math.sin(2*Math.PI*f*t)+0.2*rnd(); v*=1-p;
    } else if(kind==='glitch') {
      const gate=Math.sin(t*1500)>0.72 ? 1 : 0.25; v=(rnd()*0.65+0.35*Math.sin(2*Math.PI*(300+900*p)*t))*gate;
    } else if(kind==='spark') {
      v=(rnd()*0.55+0.45*Math.sin(2*Math.PI*(1000+2200*p)*t))*Math.exp(-t*7);
    } else if(kind==='boing') {
      const f=170-95*p; v=Math.sin(2*Math.PI*f*t)*Math.exp(-t*5.5)+0.22*Math.sin(2*Math.PI*520*t)*Math.exp(-t*10);
    } else if(kind==='recordstop') {
      const f=950-880*p; v=0.5*Math.sin(2*Math.PI*f*t)*Math.exp(-t*4)+rnd()*0.12*Math.exp(-t*5);
    } else if(kind==='memeboom') {
      const f=52+18*(1-p); v=(Math.sin(2*Math.PI*f*t)+0.45*Math.sin(2*Math.PI*104*t))*Math.exp(-t*5);
      v += rnd()*0.18*Math.exp(-t*22);
    } else if(kind==='airhorn') {
      const f=310+70*Math.sin(p*Math.PI); v=(Math.sin(2*Math.PI*f*t)+0.45*Math.sin(2*Math.PI*f*1.5*t))*Math.exp(-t*3.2);
    } else if(kind==='laser') {
      const f=1800+2800*p; v=Math.sin(2*Math.PI*f*t)*Math.exp(-t*9);
    } else if(kind==='ding') {
      v=(Math.sin(2*Math.PI*880*t)+0.5*Math.sin(2*Math.PI*1320*t))*Math.exp(-t*9);
    } else if(kind==='swoosh') {
      const f=180+2100*p; v=(rnd()*0.42+0.35*Math.sin(2*Math.PI*f*t))*Math.sin(Math.PI*p)*Math.exp(-p*1.4);
    }
    out[i]=v*fade*0.55;
  }
  return wavBlob(out,sr);
}

export function createSoundEffect(kind) {
  const meta=SOUND_EFFECT_CATALOG.find(x=>x.kind===kind || x.id===kind);
  return meta ? makeSfx(meta.kind, meta.duration) : null;
}

/** Generate a local WAV, import it into the media library, and place it at the playhead. */
export async function addGeneratedSoundEffect(kind, time = store.ui.currentTime || 0) {
  const meta = SOUND_EFFECT_CATALOG.find(x => x.kind === kind || x.id === kind);
  if (!meta) return false;
  try {
    const { media } = await import('./media.js');
    const blob = createSoundEffect(meta.id);
    if (!blob) throw new Error('Could not synthesize this sound.');
    const file = new File([blob], `FORGE SFX - ${meta.name}.wav`, { type: 'audio/wav' });
    await media.importFiles([file]);
    const item = store.project?.media?.[store.project.media.length - 1];
    if (!item || item.type !== 'audio') throw new Error('Generated sound was not imported as audio.');
    media.addMediaToTimeline(item, store.ui.activeTrackId, time);
    bus.emit('clips:changed');
    return true;
  } catch (e) {
    console.error('[forge] generated SFX failed', e);
    window.dispatchEvent(new CustomEvent('forge:sfx-error', { detail: e.message || String(e) }));
    return false;
  }
}

let ctx = null;
let master = null;
let exportDest = null;
const nodes = new WeakMap();

export const AUDIO_EFFECT_CATALOG = [
  { id:'clean', name:'Clean', desc:'No processing' },
  { id:'lowpass', name:'Low Pass', desc:'Softens harsh highs' },
  { id:'highpass', name:'High Pass', desc:'Removes low rumble' },
  { id:'telephone', name:'Telephone', desc:'Band-limited voice' },
  { id:'radio', name:'Radio', desc:'Crunchy radio tone' },
  { id:'compress', name:'Compressor', desc:'Tames loud peaks' },
  { id:'distort', name:'Distortion', desc:'Creative saturation' },
  { id:'delay', name:'Echo', desc:'Short echo effect' },
];

function createCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  return ctx;
}

export const audioEngine = {
  hasContext() { return !!ctx; },
  ensureContext() {
    if (!ctx) createCtx();
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  },
  attach(elm) {
    if (!ctx || nodes.has(elm)) return;
    try {
      const src = ctx.createMediaElementSource(elm);
      const g = ctx.createGain();
      src.connect(g); g.connect(master);
      nodes.set(elm, { src, gain: g, chain: null, effectKey: '' });
    } catch (e) {
      nodes.set(elm, { src: null, gain: null });
    }
  },
  setAudioEffects(elm, effects = []) {
    const n = nodes.get(elm);
    if (!n?.src || !ctx) return;
    const key = JSON.stringify(effects || []);
    if (n.effectKey === key) return;
    try { if (n.chain) n.chain.forEach(x => { try { x.disconnect(); } catch (_) {} }); } catch (_) {}
    const chain=[]; let prev=n.src;
    for (const fx of effects || []) {
      const id=typeof fx==='string'?fx:fx?.id;
      let node=null;
      if(id==='lowpass'||id==='telephone'){ node=ctx.createBiquadFilter(); node.type='lowpass'; node.frequency.value=id==='telephone'?3200:5200; }
      else if(id==='highpass'){ node=ctx.createBiquadFilter(); node.type='highpass'; node.frequency.value=90; }
      else if(id==='compress'){ node=ctx.createDynamicsCompressor(); node.threshold.value=-20; node.knee.value=16; node.ratio.value=4; node.attack.value=0.005; node.release.value=0.12; }
      else if(id==='distort'||id==='radio'){ node=ctx.createWaveShaper(); const curve=new Float32Array(256); const amount=id==='radio'?5:2.2; for(let i=0;i<curve.length;i++){const x=i*2/255-1; curve[i]=Math.tanh(x*amount);} node.curve=curve; node.oversample='2x'; }
      else if(id==='delay'){ node=ctx.createDelay(1); node.delayTime.value=0.14; }
      if(node){ prev.connect(node); prev=node; chain.push(node); }
    }
    prev.connect(n.gain);
    n.chain=chain; n.effectKey=key;
  },
  setGain(elm, v) {
    const n = nodes.get(elm);
    if (n?.gain && ctx) n.gain.gain.setTargetAtTime(clamp(v, 0, 1), ctx.currentTime, 0.02);
    else if (elm) { elm.volume = clamp(v, 0, 1); elm.muted = v <= 0.001; }
  },
  setMasterVolume(v) { if (master && ctx) master.gain.setTargetAtTime(clamp(v, 0, 1), ctx.currentTime, 0.02); },
  beginExport() {
    this.ensureContext();
    if (!ctx) return null;
    exportDest = ctx.createMediaStreamDestination();
    master.connect(exportDest);
    return exportDest.stream;
  },
  endExport() {
    if (exportDest && master) { try { master.disconnect(exportDest); } catch (e) {} }
    exportDest = null;
  },
  exportStream() { return exportDest ? exportDest.stream : null; },
};

let recorder = null;
let recorderStream = null;
let recorderChunks = [];
let recorderStart = 0;
let timerId = null;
let recorderRoot = null;

function preferredMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find(x => window.MediaRecorder?.isTypeSupported?.(x)) || '';
}

function formatRecTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function updateRecorderUI() {
  if (!recorderRoot) return;
  const state = recorder?.state || 'inactive';
  const recording = state === 'recording';
  recorderRoot.querySelector('[data-vo-status]')?.replaceChildren(document.createTextNode(recording ? 'Recording…' : 'Ready'));
  const timer = recorderRoot.querySelector('[data-vo-timer]');
  if (timer) timer.textContent = formatRecTime(recording ? performance.now() - recorderStart : 0);
  const start = recorderRoot.querySelector('[data-vo-start]');
  const stop = recorderRoot.querySelector('[data-vo-stop]');
  if (start) start.disabled = recording;
  if (stop) stop.disabled = !recording;
}

async function startVoiceOver() {
  if (recorder?.state === 'recording') return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    throw new Error('Voice-over recording is not supported in this browser.');
  }
  recorderStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const mimeType = preferredMime();
  recorderChunks = [];
  recorder = new MediaRecorder(recorderStream, mimeType ? { mimeType } : undefined);
  recorderStart = performance.now();
  recorder.ondataavailable = e => { if (e.data?.size) recorderChunks.push(e.data); };
  recorder.onerror = e => { console.error('[forge] voice-over recorder error', e.error || e); stopVoiceOver(true); };
  recorder.onstop = () => {
    clearInterval(timerId); timerId = null;
    const type = recorder?.mimeType || mimeType || 'audio/webm';
    const blob = new Blob(recorderChunks, { type });
    recorderChunks = [];
    recorderStream?.getTracks().forEach(t => t.stop());
    recorderStream = null;
    const duration = Math.max(0.05, (performance.now() - recorderStart) / 1000);
    const safeRecorder = recorder;
    recorder = null;
    updateRecorderUI();
    if (blob.size) window.dispatchEvent(new CustomEvent('forge:voiceover-ready', { detail: { blob, duration, mimeType: type } }));
    else if (safeRecorder) console.warn('[forge] empty voice-over recording');
  };
  recorder.start(100);
  timerId = setInterval(updateRecorderUI, 100);
  updateRecorderUI();
}

function stopVoiceOver(cancel = false) {
  clearInterval(timerId); timerId = null;
  if (recorder?.state === 'recording') {
    if (cancel) recorder.ondataavailable = null;
    recorder.stop();
  } else {
    recorderStream?.getTracks().forEach(t => t.stop());
    recorderStream = null;
    recorder = null;
    updateRecorderUI();
  }
}

function buildElevenLabsPanel(root) {
  if (!root || root.querySelector('[data-elevenlabs-panel]')) return;
  const panel=el('div',{class:'voiceover-panel', 'data-elevenlabs-panel':''},
    el('div',{class:'pane-title',text:'Text → Natural Voice'}),
    el('div',{class:'pane-hint',text:'Generate natural speech with your ElevenLabs backend, then add the MP3 directly to the timeline.'}),
    el('textarea',{class:'text-input',rows:'5',placeholder:'Type or paste your script…', 'data-tts-text':''}),
    el('div',{class:'btn-row'},
      el('select',{class:'sel','data-tts-voice':''},el('option',{value:'',text:'Loading voices…'})),
      el('button',{class:'btn primary',text:'Generate Voice',onclick:async()=>{
        const text=panel.querySelector('[data-tts-text]').value.trim(); const voice=panel.querySelector('[data-tts-voice]').value;
        if(!text||!voice){ui.toast('Enter text and choose a voice','warn');return;}
        try{ui.showBusy('Generating natural voice…'); const r=await fetch((globalThis.FORGE_CONFIG?.backendApi || 'http://127.0.0.1:8787') + '/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice_id:voice})}); if(!r.ok) throw new Error((await r.json().catch(()=>({}))).error||`TTS failed (${r.status})`); const blob=await r.blob(); const file=new File([blob],'forge-elevenlabs-voice.mp3',{type:'audio/mpeg'}); await import('./media.js').then(({media})=>media.importFiles([file])); ui.toast('Voice added to Media. Add it to the timeline from the Media panel.','success',4000);}catch(e){ui.toast(e.message||'TTS failed','error',6000);}finally{ui.hideBusy();}
      }})),
    el('div',{class:'mini-note', 'data-tts-status':'',text:'ElevenLabs backend: 127.0.0.1:8787'}));
  root.appendChild(panel);
  (async()=>{ const base=globalThis.FORGE_CONFIG?.backendApi || 'http://127.0.0.1:8787'; try { await fetch(base+'/api/health'); } catch { const s=panel.querySelector('[data-tts-status]'); if(s)s.textContent='Start START_FORGE_BACKEND.bat to use ElevenLabs.'; return; } return fetch(base+'/api/voices').then(r=>r.ok?r.json():Promise.reject()).then(data=>{const sel=panel.querySelector('[data-tts-voice]');sel.innerHTML='';(data.voices||[]).forEach(v=>sel.appendChild(el('option',{value:v.voice_id,text:v.name||v.voice_id})));if(!sel.options.length) sel.appendChild(el('option',{value:'',text:'No voices available'}));}).catch(()=>{const s=panel.querySelector('[data-tts-status]');if(s)s.textContent='ElevenLabs backend is unavailable or ELEVENLABS_API_KEY is not configured.';}); })();
}

export function initVoiceOver(root = $('#pane-audio')) {
  if (!root || recorderRoot) return;
  recorderRoot = el('div', { class: 'voiceover-panel', 'data-testid': 'voiceover-panel' },
    el('div', { class: 'pane-title', text: 'Voice Over' }),
    el('div', { class: 'pane-hint', text: 'Record from your microphone and place the take at the current playhead position.' }),
    el('div', { class: 'vo-status-row' },
      el('span', { class: 'vo-status', 'data-vo-status': '', text: 'Ready' }),
      el('span', { class: 'vo-timer', 'data-vo-timer': '', text: '00:00' })),
    el('div', { class: 'btn-row' },
      el('button', { class: 'btn primary', 'data-vo-start': '', text: '● Record', onclick: async () => {
        try { await startVoiceOver(); } catch (e) { stopVoiceOver(true); window.dispatchEvent(new CustomEvent('forge:voiceover-error', { detail: e.message || String(e) })); }
      }}),
      el('button', { class: 'btn', 'data-vo-stop': '', text: '■ Stop', disabled: true, onclick: () => stopVoiceOver(false) })),
    el('div', { class: 'mini-note', 'data-vo-help': '', text: 'The recording is saved into this project as normal audio media.' }));
  root.prepend(recorderRoot);
  buildElevenLabsPanel(root);
  updateRecorderUI();
  window.addEventListener('beforeunload', () => stopVoiceOver(true), { once: true });
}


export function buildSoundEffectsPane(root, getTime = () => 0) {
  if (!root) return;
  const existing = root.querySelector('[data-sfx-library]');
  if (existing) return;
  const section = el('div', { class:'sfx-library', 'data-sfx-library':'' },
    el('div', { class:'pane-title', text:'Sound Effects' }),
    el('div', { class:'pane-hint', text:'Built-in procedural SFX — drag or click to place at the playhead.' }),
    el('div', { class:'card-grid', 'data-sfx-grid':'' })
  );
  const grid=section.querySelector('[data-sfx-grid]');
  SOUND_EFFECT_CATALOG.forEach(sfx=>{
    grid.appendChild(el('div',{class:'fx-card', 'data-testid':`sfx-card-${sfx.id}`,
      onclick:()=>addGeneratedSoundEffect(sfx.id,getTime()), ondblclick:()=>{ import('./preview.js').then(({preview})=>preview.setLibraryPreview?.({id:`sfx:${sfx.id}`,name:sfx.name,type:'audio'})); },
          },el('div',{class:'fx-icon',text:'♪'}),el('div',{},el('div',{class:'fx-name',text:sfx.name}),el('div',{class:'fx-desc',text:sfx.desc}))));
  });
  root.appendChild(section);
  const fxSection = el('div',{class:'sfx-library audio-fx-section','data-audio-fx-library':''},
    el('div',{class:'pane-title',text:'Audio FX'}),
    el('div',{class:'pane-hint',text:'Select an audio clip, then add lightweight real-time processing.'}),
    el('div',{class:'chip-row','data-audio-fx-grid':''})
  );
  const fxGrid=fxSection.querySelector('[data-audio-fx-grid]');
  AUDIO_EFFECT_CATALOG.forEach(fx=>fxGrid.appendChild(el('button',{class:'chip',text:fx.name,onclick:()=>{
    const id=window.__FORGE_GET_SELECTED_AUDIO__?.();
    if(!id){ window.dispatchEvent(new CustomEvent('forge:audio-fx',{detail:{id:fx.id}})); return; }
    window.dispatchEvent(new CustomEvent('forge:audio-fx',{detail:{id:fx.id,clipId:id}}));
  }})));
  root.appendChild(fxSection);
}

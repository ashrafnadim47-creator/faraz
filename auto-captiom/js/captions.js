/* FORGE — auto captions: local backend Whisper/faster-whisper + SRT import */
import { $, el, formatTC, clamp } from './utils.js';
import { store, bestClipTarget, getMedia, defaultText, SELECTION, bus, createTrack } from './state.js';
import { commit } from './project.js';
import { actions } from './actions.js';
import { media } from './media.js';
import { ui } from './ui.js';
import { uid } from './utils.js';

const API = String(globalThis.FORGE_CONFIG?.captionApi || (location.protocol === 'file:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? 'http://127.0.0.1:8787' : '')).replace(/\/$/, '');
let backendWarningShown = false;

async function requestWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function ensureBackend() {
  if (!API) return false;
  try {
    const res = await requestWithTimeout(`${API}/api/health`, { method: 'GET' }, 2500);
    return res.ok;
  } catch {
    return false;
  }
}

export function buildCaptionsPane(root) {
  root.innerHTML = '';
  root.appendChild(el('div', { class:'pane-section-title', text:'Auto Captions' }));
  root.appendChild(el('div', { class:'pane-hint', text:'Generate timed captions from the selected video/audio using the local speech-to-text service, or import an SRT file.' }));
  const lang = el('select',{class:'sel',value:'auto','data-testid':'caption-language'},
    el('option',{value:'auto',text:'Auto detect'}),
    el('option',{value:'hi',text:'Hindi'}),
    el('option',{value:'en',text:'English'}),
    el('option',{value:'ur',text:'Urdu'}),
    el('option',{value:'bn',text:'Bengali'}));
  root.appendChild(el('div',{class:'form-row'},el('label',{text:'Language'}),lang));

  const generate = el('button',{class:'btn primary import-cta',text:'Generate Auto Captions', 'data-testid':'generate-auto-captions', onclick:()=>generateCaptions(lang.value)});
  const importBtn = el('button',{class:'btn',text:'Import SRT', 'data-testid':'import-srt-captions'});
  const file = el('input',{type:'file',accept:'.srt,.txt',hidden:true});
  importBtn.onclick=()=>file.click();
  file.onchange=async()=>{ if(file.files?.[0]){try{await importSRT(await file.files[0].text());}catch(e){ui.toast('SRT import failed: '+e.message,'error');}} file.value=''; };
  root.append(generate,importBtn,file);
  const status=el('div',{class:'pane-hint',id:'caption-status',text:'No caption job running.'});
  root.appendChild(status);
  root.appendChild(el('div',{class:'caption-shortcuts'},
    el('button',{class:'btn',text:'Clear generated captions',onclick:()=>clearCaptions()}),
    el('button',{class:'btn',text:'Open backend help',onclick:()=>ui.toast('Run START_FORGE_BACKEND.bat, then use Generate Auto Captions. AI captions require the optional faster-whisper package.','info',7000)})
  ));
  return root;
}

async function generateCaptions(language='auto') {
  const target = bestClipTarget({ includeAudio:false });
  if (!target || !['video','audio'].includes(target.type)) return ui.toast('Put the playhead on a video/audio clip first.','warn');
  const m=getMedia(target.mediaId); if(!m) return ui.toast('Media is missing.','error');
  const status=$('#caption-status'); if(status) status.textContent='Preparing audio…';
  try {
    if (!API) {
      throw new Error('Auto Captions need the FORGE caption server. Use the Windows app with its backend, or configure FORGE_CONFIG.captionApi for the live website.');
    }
    if (!(await ensureBackend())) {
      throw new Error('FORGE caption backend is not reachable');
    }
    const blob=await media.getBlob(m.id); if(!blob) throw new Error('Could not read the local media file.');
    const form=new FormData(); form.append('file',blob,`${m.name}.${m.ext||'bin'}`); form.append('language',language); form.append('model','base');
    if(status) status.textContent='Transcribing… (first run can take longer while the AI model downloads)';
    const res=await requestWithTimeout(`${API}/api/captions/transcribe`,{method:'POST',body:form}, 30 * 60 * 1000);
    const data=await res.json().catch(()=>({}));
    if(!res.ok || !data.segments) throw new Error(data.error||`Caption service returned ${res.status}`);
    addSegments(data.segments,target.start||0);
    if(status) status.textContent=`Generated ${data.segments.length} caption blocks.`;
    ui.toast(`Auto captions generated: ${data.segments.length} blocks`,'success',3000);
  } catch(e) {
    if(status) status.textContent='Auto captions are not available yet.';
    const msg = e?.name === 'AbortError' ? 'Caption transcription timed out.' : e.message;
    if (!backendWarningShown || !/backend is not running/i.test(msg)) {
      ui.toast(`${msg}. Start FORGE normally; the desktop app will launch the local backend automatically. If you are using browser mode, run START_FORGE_BACKEND.bat.`,'warn',8000);
      backendWarningShown = true;
    }
  }
}

function addSegments(segments, offset=0) {
  commit(p=>{
    let track=p.tracks.find(t=>t.isOverlay&&!t.locked&&t.kind==='video');
    if(!track){ track=createTrack('video','Captions'); track.isOverlay=true; track.height=64; p.tracks.unshift(track); }
    for(const seg of segments){
      const start=Math.max(0,offset+Number(seg.start||0));
      const end=Math.max(start+0.08,offset+Number(seg.end||seg.start||0.8));
      p.clips.push({
        id:uid(),trackId:track.id,mediaId:null,type:'text',name:'Auto Caption',start,duration:end-start,sourceStart:0,sourceDuration:end-start,speed:1,
        transform:{x:0,y:Math.round(p.settings.height*0.35),scale:1,rotation:0,opacity:1},crop:{l:0,t:0,r:0,b:0},filters:{brightness:100,contrast:100,saturation:100,exposure:100,blur:0,grayscale:0,sepia:0,hue:0},effects:[],keyframes:{},volume:1,muted:true,fadeIn:0,fadeOut:0,caption:true,missing:false,transitionIn:null,
        text:{...defaultText(),content:String(seg.text||'').trim(),size:54,bold:true,align:'center',background:'rgba(0,0,0,.72)',shadow:true,color:'#FFFFFF',strokeWidth:2,strokeColor:'#000000'}
      });
    }
  },{label:'Generate auto captions',event:'clips:changed'});
  bus.emit('clips:changed');
}

export async function importSRT(text) {
  const segments=parseSRT(text); if(!segments.length) throw new Error('No valid SRT cues found');
  addSegments(segments,0); ui.toast(`Imported ${segments.length} captions`,'success');
}
function parseSRT(text){
  const blocks=String(text||'').replace(/\r/g,'').split(/\n\s*\n/); const out=[];
  for(const b of blocks){ const lines=b.split('\n').filter(Boolean); const ti=lines.findIndex(x=>x.includes('-->')); if(ti<0) continue; const m=lines[ti].match(/(\d{1,2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3})/); if(!m) continue; const txt=lines.slice(ti+1).join(' ').trim(); if(txt) out.push({start:toSec(m[1]),end:toSec(m[2]),text:txt}); }
  return out;
}
function toSec(v){const [h,m,s]=v.replace(',','.').split(':'); return Number(h)*3600+Number(m)*60+Number(s);}
function clearCaptions(){
  commit(p=>{p.clips=p.clips.filter(c=>!c.caption);},{label:'Clear captions',event:'clips:changed'}); bus.emit('clips:changed'); ui.toast('Caption clips cleared','success');
}

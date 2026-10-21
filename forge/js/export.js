/* FORGE — real in-browser export: canvas capture + WebAudio tap + MediaRecorder */
import { store, bus, totalDuration } from './state.js';
import { $, el, formatTC, downloadBlob, clamp, svgIcon } from './utils.js';
import { ui } from './ui.js';
import { preview } from './preview.js';
import { audioEngine } from './audio.js';
import { saveProject } from './project.js';

const state = { recording: false, recorder: null, chunks: [], cancelFlag: false, finishing: false };

const FORMAT_CANDIDATES = [
  { mime: 'video/mp4;codecs="avc1.640028,mp4a.40.2"', label: 'MP4 (H.264 + AAC)', ext: 'mp4' },
  { mime: 'video/mp4', label: 'MP4', ext: 'mp4' },
  { mime: 'video/webm;codecs=vp9,opus', label: 'WebM (VP9 + Opus)', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8,opus', label: 'WebM (VP8 + Opus)', ext: 'webm' },
  { mime: 'video/webm', label: 'WebM', ext: 'webm' },
];

function supportedFormats() {
  if (!window.MediaRecorder) return [];
  return FORMAT_CANDIDATES.filter(f => { try { return MediaRecorder.isTypeSupported(f.mime); } catch (e) { return false; } });
}

const EXPORT_PRESETS = [
  { id: 'original', name: 'Original project settings', w: null, h: null },
  { id: 'yt', name: 'YouTube — 1920 × 1080', w: 1920, h: 1080, aspect: '16:9' },
  { id: 'shorts', name: 'YouTube Shorts — 1080 × 1920', w: 1080, h: 1920, aspect: '9:16' },
  { id: 'reels', name: 'Instagram Reels — 1080 × 1920', w: 1080, h: 1920, aspect: '9:16' },
  { id: 'tiktok', name: 'TikTok — 1080 × 1920', w: 1080, h: 1920, aspect: '9:16' },
];

export const exporter = {
  init() {},
  isExporting() { return state.recording; },

  open() {
    if (state.recording) return ui.toast('An export is already running.', 'warn');
    const p = store.project;
    if (!p.clips.length) return ui.toast('Timeline is empty — add clips before exporting.', 'warn');
    const formats = supportedFormats();
    if (!formats.length) {
      return ui.showModal('Export', el('div', {},
        el('p', { text: 'This browser does not support MediaRecorder, so in-browser export is unavailable.' }),
        el('p', { class: 'form-hint', text: 'FORGE is structured for a server-side FFmpeg pipeline: POST the project JSON to /api/forge/export-jobs from a machine with FFmpeg installed to render production MP4s.' })));
    }
    const dur = totalDuration();
    const body = el('div', { 'data-testid': 'export-modal-body' });

    const presetSel = el('select', { class: 'sel', testid: 'export-preset-select' },
      ...EXPORT_PRESETS.map(pr => el('option', { value: pr.id, text: pr.name })));
    const fmtSel = el('select', { class: 'sel', testid: 'export-format-select' },
      ...formats.map((f, i) => el('option', { value: String(i), text: f.label, selected: i === (formats.findIndex(f => f.ext === 'mp4') >= 0 ? formats.findIndex(f => f.ext === 'mp4') : 0) })));
    let quality = 'high';
    const qualRow = el('div', { class: 'chip-row' },
      ...[['high', 'High'], ['medium', 'Medium'], ['low', 'Low']].map(([id, label]) => el('button', {
        class: 'chip' + (id === 'high' ? ' active' : ''), text: label, testid: `export-quality-${id}`,
        onclick: e => { quality = id; qualRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active')); e.target.classList.add('active'); },
      })));

    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Preset' }), presetSel));
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Format' }), fmtSel));
    body.appendChild(el('div', { class: 'form-row' }, el('label', { text: 'Quality' }), qualRow));
    body.appendChild(el('div', { class: 'form-hint', html:
      `Source: ${p.settings.width} × ${p.settings.height} · ${p.settings.fps} fps · ${formatTC(dur)}.<br>` +
      'Export renders the timeline in real time and records it — keep this tab visible until it finishes. ' +
      'For production MP4/H.265 rendering, connect the FFmpeg backend hook (/api/forge/export-jobs).' }));

    const settingsView = body;
    const progressView = el('div', { style: 'display:none', 'data-testid': 'export-progress-view' },
      el('div', { class: 'insp-title', text: 'Exporting' }),
      el('div', { id: 'export-stage', text: 'Preparing…', 'data-testid': 'export-stage' }),
      el('div', { style: 'height:8px;background:var(--bg-3);border-radius:4px;margin:10px 0;overflow:hidden' },
        el('div', { id: 'export-progress-bar', style: 'height:100%;width:0%;background:var(--accent);border-radius:4px;transition:width .2s', 'data-testid': 'export-progress-bar' })),
      el('div', { id: 'export-progress-label', class: 'readonly-meta', 'data-testid': 'export-progress-label' }),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn danger', text: 'Cancel export', id: 'export-cancel-btn', 'data-testid': 'export-cancel-btn' })));

    body.appendChild(progressView);

    const modal = ui.showModal('Export video', body, { width: 520, noClose: true });

    $('#export-cancel-btn').addEventListener('click', () => { state.cancelFlag = true; });

    let selectedPreset = EXPORT_PRESETS[0];
    presetSel.addEventListener('change', () => {
      selectedPreset = EXPORT_PRESETS.find(x => x.id === presetSel.value);
    });

    const exportBtn = el('button', { class: 'btn primary', text: 'Start export', 'data-testid': 'export-start-btn' });
    exportBtn.addEventListener('click', () => {
      if (selectedPreset.w) {
        // Apply the preset to project settings so the render uses it (undoable)
        import('./project.js').then(({ applyProjectSettings }) => {
          applyProjectSettings(selectedPreset.w, selectedPreset.h, null, selectedPreset.aspect);
        });
        selectedPreset = EXPORT_PRESETS[0];
      }
      settingsView.style.display = 'none';
      progressView.style.display = 'block';
      setTimeout(() => this._start(formats[Number(fmtSel.value)] || formats[0], quality), 60);
    });
    // put the start button into the modal footer
    const footer = document.querySelector('#modal-root .modal-footer');
    if (footer) footer.appendChild(exportBtn);
    else body.appendChild(exportBtn);
  },

  async _start(format, quality) {
    const p = store.project;
    const W = p.settings.width, H = p.settings.height, fps = p.settings.fps;
    const dur = totalDuration();
    state.recording = true; state.cancelFlag = false; state.finishing = false; state.chunks = [];

    preview.pause();
    const prevQuality = preview.quality;
    preview.setQuality(1);
    preview.seek(0);
    preview.draw();
    await new Promise(r => setTimeout(r, 150));

    let stream;
    try {
      stream = preview.canvas.captureStream(fps);
      const aStream = audioEngine.beginExport();
      aStream.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch (e) {
      state.recording = false;
      preview.setQuality(prevQuality);
      ui.toast(`Export failed to start: ${e.message || e}`, 'error');
      return;
    }

    const kbps = { high: 12, medium: 8, low: 4 }[quality] || 8;
    const bitrate = Math.max(1200000, Math.round(kbps * 1e6 * (W * H) / (1920 * 1080)));
    let rec;
    try {
      rec = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: bitrate, audioBitsPerSecond: 192000 });
    } catch (e) {
      state.recording = false;
      audioEngine.endExport();
      preview.setQuality(prevQuality);
      ui.toast(`Export failed: ${e.message || e}`, 'error');
      return;
    }
    state.recorder = rec;
    const stopped = new Promise(res => { rec.onstop = () => res(); });
    rec.ondataavailable = ev => { if (ev.data && ev.data.size) state.chunks.push(ev.data); };
    rec.onerror = ev => { console.error('[forge] recorder error', ev); };

    const stage = $('#export-stage'), bar = $('#export-progress-bar'), label = $('#export-progress-label');
    stage.textContent = 'Rendering & recording (real-time)';
    rec.start(300);
    preview.play();

    const tick = () => {
      if (!state.recording || state.finishing) return;
      const pct = dur ? clamp((preview.time / dur) * 100, 0, 100) : 0;
      bar.style.width = pct + '%';
      label.textContent = `${formatTC(preview.time)} / ${formatTC(dur)} · ${Math.round(pct)}%`;
      if (state.cancelFlag || preview.time >= dur - 0.004 || !preview.playing) {
        this._finish(rec, stopped, format, dur, prevQuality);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  async _finish(rec, stopped, format, dur, prevQuality) {
    if (state.finishing) return;
    state.finishing = true;
    const cancelled = state.cancelFlag;
    preview.pause();
    const stage = $('#export-stage'), label = $('#export-progress-label'), bar = $('#export-progress-bar');
    stage.textContent = 'Finalizing…';
    label.textContent = 'Muxing recorded frames…';
    try { rec.stop(); } catch (e) {}
    await stopped;
    audioEngine.endExport();
    preview.setQuality(prevQuality);
    state.recording = false;

    if (cancelled) {
      stage.textContent = 'Export cancelled';
      label.textContent = '';
      ui.toast('Export cancelled', 'warn');
      setTimeout(() => ui.closeTopModal(), 900);
      return;
    }
    const blob = new Blob(state.chunks, { type: format.mime.split(';')[0] });
    if (!blob.size) {
      stage.textContent = 'Export failed';
      label.textContent = 'The recorder produced no data. Try a different format.';
      ui.toast('Export produced no data — try another format (WebM is the most compatible).', 'error', 6000);
      return;
    }
    const name = (store.project.name || 'forge-export').replace(/[^\w\- ]+/g, '_');
    let saveResult;
    try {
      saveResult = await downloadBlob(blob, `${name}.${format.ext}`);
    } catch (e) {
      stage.textContent = 'Export failed';
      label.textContent = e?.message || 'Could not save the exported file.';
      ui.toast('Export finished, but saving the file failed.', 'error', 6000);
      return;
    }
    if (saveResult?.canceled) {
      stage.textContent = 'Export ready';
      label.textContent = 'Save dialog cancelled. The rendered video is still available in memory until this dialog closes.';
      ui.toast('Export save cancelled', 'warn');
      return;
    }
    bar.style.width = '100%';
    stage.textContent = 'Export complete';
    label.textContent = `${(blob.size / 1024 / 1024).toFixed(2)} MB · ${format.label} · ${formatTC(dur)} — saved`;
    ui.toast('Export finished — video saved', 'success');
    saveProject();
    setTimeout(() => { if (!$('#export-cancel-btn')) return; ui.closeTopModal(); }, 2200);
  },
};

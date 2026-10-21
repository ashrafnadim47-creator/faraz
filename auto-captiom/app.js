// FORGE PRO - Full CapCut Reverse-Engineered Video Editor Core Engine

// State Management
const state = {
  duration: 15.0,
  currentTime: 0.0,
  isPlaying: false,
  aspectRatio: "9-16",
  speed: 1.0,
  volume: 1.0,
  filter: "none",
  captionPreset: "mrbeast",
  activeText: "VIRAL REEL HOOK",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 48,
  textColor: "#ffffff",
  highlightColor: "#ffea00",
  activeSticker: null,
  pixelsPerSecond: 60,
  selectedTrackItem: null,
  videoElement: null,
  videoLoaded: false,
  videoName: "CapCut Project"
};

// Tracks Data
let trackData = {
  video: [
    { id: "v1", start: 0, end: 15, title: "Main Video Clip", color: "block-video" }
  ],
  captions: [
    { id: "c1", start: 0.5, end: 3.2, text: "WELCOME TO FORGE PRO", preset: "mrbeast" },
    { id: "c2", start: 3.5, end: 7.0, text: "CAPCUT ONLINE STUDIO", preset: "mrbeast" },
    { id: "c3", start: 7.5, end: 11.2, text: "MULTI-TRACK TIMELINE & FX", preset: "mrbeast" },
    { id: "c4", start: 11.5, end: 14.8, text: "EXPORT FREE ZERO WATERMARK", preset: "mrbeast" }
  ],
  audio: [
    { id: "a1", start: 0, end: 15, title: "Background Track.mp3", color: "block-audio" }
  ],
  fx: [
    { id: "f1", start: 0, end: 15, filter: "none", title: "Visual Filter", color: "block-fx" }
  ]
};

// DOM Elements
const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const canvasWrapper = document.getElementById("canvasWrapper");
const hiddenVideo = document.getElementById("hiddenSourceVideo");

const timecodeDisplay = document.getElementById("timecodeDisplay");
const playPauseBtn = document.getElementById("playPauseBtn");
const seekStartBtn = document.getElementById("seekStartBtn");
const stepBackBtn = document.getElementById("stepBackBtn");
const stepForwardBtn = document.getElementById("stepForwardBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const timeRuler = document.getElementById("timeRuler");
const timelineInner = document.getElementById("timelineInner");
const timelineScroll = document.getElementById("timelineScroll");
const playhead = document.getElementById("playhead");

const laneCaptions = document.getElementById("laneCaptions");
const laneVideo = document.getElementById("laneVideo");
const laneAudio = document.getElementById("laneAudio");
const laneFx = document.getElementById("laneFx");

const videoFileInput = document.getElementById("videoFileInput");
const uploadDropZone = document.getElementById("uploadDropZone");
const browseMediaBtn = document.getElementById("browseMediaBtn");

// Inspector Elements
const inspectorTextInput = document.getElementById("inspectorTextInput");
const inspectorFontSelect = document.getElementById("inspectorFontSelect");
const inspectorFontSizeSlider = document.getElementById("inspectorFontSizeSlider");
const inspectorTextColor = document.getElementById("inspectorTextColor");
const inspectorHighlightColor = document.getElementById("inspectorHighlightColor");
const inspectorVolumeSlider = document.getElementById("inspectorVolumeSlider");
const volumeValueLabel = document.getElementById("volumeValueLabel");
const speedValueLabel = document.getElementById("speedValueLabel");

// Export Elements
const exportVideoBtn = document.getElementById("exportVideoBtn");
const exportSrtBtn = document.getElementById("exportSrtBtn");
const exportVttBtn = document.getElementById("exportVttBtn");
const exportModal = document.getElementById("exportModal");
const exportProgressBar = document.getElementById("exportProgressBar");
const exportStatusText = document.getElementById("exportStatusText");

// Web Audio API Context
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// --- INITIALIZE EDITOR ---
function initEditor() {
  setAspectRatio("9-16");
  renderTimelineRuler();
  renderTimelineBlocks();
  setupEventListeners();
  startRenderLoop();
}

// --- ASPECT RATIO SWITCHER ---
function setAspectRatio(ratio) {
  state.aspectRatio = ratio;
  canvasWrapper.className = `canvas-wrapper ratio-${ratio}`;

  if (ratio === "9-16") {
    canvas.width = 720;
    canvas.height = 1280;
  } else if (ratio === "16-9") {
    canvas.width = 1280;
    canvas.height = 720;
  } else if (ratio === "1-1") {
    canvas.width = 1080;
    canvas.height = 1080;
  } else if (ratio === "4-5") {
    canvas.width = 864;
    canvas.height = 1080;
  }
}

document.querySelectorAll(".aspect-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".aspect-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    setAspectRatio(btn.dataset.ratio);
  });
});

// --- LEFT ICON RAIL NAVIGATION ---
document.querySelectorAll(".nav-tab-item").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab-item").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const target = tab.dataset.tab;
    document.querySelectorAll(".drawer-pane").forEach(pane => pane.classList.add("hidden"));
    const activePane = document.getElementById(`pane-${target}`);
    if (activePane) activePane.classList.remove("hidden");
  });
});

// --- MEDIA FILE IMPORT ---
browseMediaBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  videoFileInput.click();
});

uploadDropZone.addEventListener("click", () => videoFileInput.click());

uploadDropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadDropZone.style.borderColor = "var(--accent-cyan)";
});

uploadDropZone.addEventListener("dragleave", () => {
  uploadDropZone.style.borderColor = "rgba(255, 255, 255, 0.15)";
});

uploadDropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadDropZone.style.borderColor = "rgba(255, 255, 255, 0.15)";
  if (e.dataTransfer.files?.length > 0) {
    loadVideoFile(e.dataTransfer.files[0]);
  }
});

videoFileInput.addEventListener("change", () => {
  if (videoFileInput.files?.length > 0) {
    loadVideoFile(videoFileInput.files[0]);
  }
});

function loadVideoFile(file) {
  if (!file.type.startsWith("video/")) {
    alert("Please select a valid video file.");
    return;
  }

  const url = URL.createObjectURL(file);
  hiddenVideo.src = url;
  state.videoElement = hiddenVideo;
  state.videoLoaded = true;
  state.videoName = file.name;

  hiddenVideo.addEventListener("loadedmetadata", () => {
    const dur = Math.max(hiddenVideo.duration || 15, 4);
    state.duration = parseFloat(dur.toFixed(2));
    trackData.video = [{ id: "v1", start: 0, end: state.duration, title: file.name, color: "block-video" }];
    trackData.audio = [{ id: "a1", start: 0, end: state.duration, title: "Original Audio", color: "block-audio" }];
    trackData.fx = [{ id: "f1", start: 0, end: state.duration, filter: state.filter, title: "Visual Filter", color: "block-fx" }];
    
    renderTimelineRuler();
    renderTimelineBlocks();
    updatePlayhead();
  }, { once: true });
}

// STOCK TEMPLATES
document.querySelectorAll(".demo-sample-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    state.videoLoaded = false;
    state.videoName = btn.dataset.type === "gaming" ? "Gaming Montage" : "Cyberpunk Synthwave";
    state.duration = 15;
    trackData.video = [{ id: "v1", start: 0, end: 15, title: state.videoName, color: "block-video" }];
    renderTimelineRuler();
    renderTimelineBlocks();
    alert(`Loaded ${state.videoName} template!`);
  });
});

// --- STICKERS ---
document.querySelectorAll(".sticker-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    state.activeSticker = btn.dataset.sticker;
    alert(`Added sticker ${state.activeSticker} to center canvas!`);
  });
});

// --- FILTER & EFFECT SELECTION ---
document.querySelectorAll(".filter-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".filter-card").forEach(c => c.classList.remove("active"));
    card.classList.add("active");
    state.filter = card.dataset.filter;
    if (trackData.fx.length > 0) {
      trackData.fx[0].filter = state.filter;
    }
  });
});

// --- CAPTION PRESETS ---
document.querySelectorAll(".caption-preset-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".caption-preset-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.captionPreset = btn.dataset.preset;
    trackData.captions.forEach(c => c.preset = state.captionPreset);
  });
});

// SCRIPT SYNC TO TIMELINE
document.getElementById("applyScriptTimelineBtn").addEventListener("click", () => {
  const text = document.getElementById("customScriptInput").value.trim();
  if (!text) {
    alert("Please enter text in the script box.");
    return;
  }
  const lines = text.split(/[\n.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  if (lines.length === 0) return;

  const perLine = Math.max(1.5, state.duration / lines.length);
  trackData.captions = lines.map((line, idx) => {
    const start = parseFloat((idx * perLine).toFixed(2));
    const end = parseFloat(Math.min(state.duration, start + perLine - 0.2).toFixed(2));
    return {
      id: `c_${idx}`,
      start,
      end,
      text: line,
      preset: state.captionPreset
    };
  });

  renderTimelineBlocks();
  alert(`Added ${lines.length} captions to timeline!`);
});

// GENERATE AUTO CAPTIONS
document.getElementById("generateCaptionsBtn").addEventListener("click", () => {
  const sampleSentences = [
    "🔥 NEXT LEVEL VIDEO EDITING",
    "⚡ REAL MULTI-TRACK TIMELINE",
    "🎬 POWERFUL CAPCUT PRESETS",
    "🚀 READY FOR REELS & SHORTS"
  ];
  const step = state.duration / sampleSentences.length;
  trackData.captions = sampleSentences.map((txt, i) => ({
    id: `c_gen_${i}`,
    start: parseFloat((i * step + 0.2).toFixed(2)),
    end: parseFloat(((i + 1) * step - 0.2).toFixed(2)),
    text: txt,
    preset: state.captionPreset
  }));
  renderTimelineBlocks();
});

// SOUND EFFECTS SYNTHESIZER
document.querySelectorAll(".sfx-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    playSynthSFX(btn.dataset.sfx);
  });
});

function playSynthSFX(type) {
  try {
    const actx = getAudioContext();
    if (actx.state === "suspended") actx.resume();

    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);

    const now = actx.currentTime;

    if (type === "whoosh") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
      gain.gain.setValueAtTime(0.3 * state.volume, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.35);

    } else if (type === "bass") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.6);
      gain.gain.setValueAtTime(0.5 * state.volume, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.65);

    } else if (type === "ding") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(980, now);
      gain.gain.setValueAtTime(0.4 * state.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.55);

    } else if (type === "camera") {
      osc.type = "square";
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.2 * state.volume, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {
    console.warn("AudioContext SFX:", e);
  }
}

// --- RIGHT INSPECTOR PROPERTY BINDINGS ---
inspectorTextInput.addEventListener("input", (e) => {
  state.activeText = e.target.value;
  if (trackData.captions.length > 0) {
    trackData.captions[0].text = state.activeText;
    renderTimelineBlocks();
  }
});

inspectorFontSelect.addEventListener("change", (e) => {
  state.fontFamily = e.target.value;
});

inspectorFontSizeSlider.addEventListener("input", (e) => {
  state.fontSize = parseInt(e.target.value);
});

inspectorTextColor.addEventListener("input", (e) => {
  state.textColor = e.target.value;
});

inspectorHighlightColor.addEventListener("input", (e) => {
  state.highlightColor = e.target.value;
});

inspectorVolumeSlider.addEventListener("input", (e) => {
  state.volume = e.target.value / 100;
  volumeValueLabel.textContent = `${e.target.value}%`;
  if (state.videoElement) {
    state.videoElement.volume = state.volume;
  }
});

document.querySelectorAll(".speed-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".speed-btn").forEach(b => {
      b.classList.remove("active");
      b.style.color = "";
      b.style.borderColor = "";
    });
    btn.classList.add("active");
    btn.style.color = "var(--accent-cyan)";
    btn.style.borderColor = "var(--accent-cyan)";
    state.speed = parseFloat(btn.dataset.speed);
    speedValueLabel.textContent = `${state.speed}x`;
    if (state.videoElement) {
      state.videoElement.playbackRate = state.speed;
    }
  });
});

// --- PLAYBACK CONTROLS ---
playPauseBtn.addEventListener("click", togglePlay);

function togglePlay() {
  state.isPlaying = !state.isPlaying;
  playPauseBtn.textContent = state.isPlaying ? "⏸" : "▶";

  if (state.videoElement && state.videoLoaded) {
    if (state.isPlaying) {
      state.videoElement.currentTime = state.currentTime;
      state.videoElement.play();
    } else {
      state.videoElement.pause();
    }
  }
}

seekStartBtn.addEventListener("click", () => seekTo(0));
stepBackBtn.addEventListener("click", () => seekTo(Math.max(0, state.currentTime - 1.0)));
stepForwardBtn.addEventListener("click", () => seekTo(Math.min(state.duration, state.currentTime + 1.0)));

fullscreenBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    canvasWrapper.requestFullscreen().catch(err => alert(err.message));
  } else {
    document.exitFullscreen();
  }
});

function seekTo(time) {
  state.currentTime = Math.min(state.duration, Math.max(0, time));
  if (state.videoElement && state.videoLoaded) {
    state.videoElement.currentTime = state.currentTime;
  }
  updatePlayhead();
}

// KEYBOARD SHORTCUTS (CapCut Shortcuts)
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  } else if (e.code === "ArrowLeft") {
    seekTo(state.currentTime - 0.5);
  } else if (e.code === "ArrowRight") {
    seekTo(state.currentTime + 0.5);
  } else if (e.code === "Home") {
    seekTo(0);
  } else if (e.key === "b" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    document.getElementById("splitClipBtn").click();
  }
});

// --- TIMELINE RENDERING & DRAGGING ---
function renderTimelineRuler() {
  timeRuler.innerHTML = "";
  const totalPixels = state.duration * state.pixelsPerSecond + 200;
  timelineInner.style.minWidth = `${totalPixels}px`;

  for (let s = 0; s <= state.duration; s += 1) {
    const mark = document.createElement("div");
    mark.className = "ruler-mark";
    mark.style.left = `${s * state.pixelsPerSecond}px`;
    if (s % 2 === 0) {
      mark.textContent = `${s}s`;
    }
    timeRuler.appendChild(mark);
  }
}

function renderTimelineBlocks() {
  laneCaptions.innerHTML = "";
  laneVideo.innerHTML = "";
  laneAudio.innerHTML = "";
  laneFx.innerHTML = "";

  // 1. Captions
  trackData.captions.forEach(cap => {
    const el = document.createElement("div");
    el.className = "timeline-block block-caption";
    el.style.left = `${cap.start * state.pixelsPerSecond}px`;
    el.style.width = `${Math.max(40, (cap.end - cap.start) * state.pixelsPerSecond)}px`;
    el.innerHTML = `<span>💬 ${escapeHTML(cap.text)}</span>`;
    el.title = `Caption: "${cap.text}" (${cap.start}s - ${cap.end}s)`;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      seekTo(cap.start);
      inspectorTextInput.value = cap.text;
    });
    laneCaptions.appendChild(el);
  });

  // 2. Video
  trackData.video.forEach(v => {
    const el = document.createElement("div");
    el.className = "timeline-block block-video";
    el.style.left = `${v.start * state.pixelsPerSecond}px`;
    el.style.width = `${Math.max(60, (v.end - v.start) * state.pixelsPerSecond)}px`;
    el.innerHTML = `<span>🎬 ${escapeHTML(v.title)}</span>`;
    laneVideo.appendChild(el);
  });

  // 3. Audio
  trackData.audio.forEach(a => {
    const el = document.createElement("div");
    el.className = "timeline-block block-audio";
    el.style.left = `${a.start * state.pixelsPerSecond}px`;
    el.style.width = `${Math.max(60, (a.end - a.start) * state.pixelsPerSecond)}px`;
    el.innerHTML = `<span>🎵 ${escapeHTML(a.title)}</span>`;
    laneAudio.appendChild(el);
  });

  // 4. FX
  trackData.fx.forEach(f => {
    const el = document.createElement("div");
    el.className = "timeline-block block-fx";
    el.style.left = `${f.start * state.pixelsPerSecond}px`;
    el.style.width = `${Math.max(60, (f.end - f.start) * state.pixelsPerSecond)}px`;
    el.innerHTML = `<span>✨ Filter: ${escapeHTML(state.filter)}</span>`;
    laneFx.appendChild(el);
  });
}

timelineInner.addEventListener("click", (e) => {
  const rect = timelineInner.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const time = clickX / state.pixelsPerSecond;
  seekTo(time);
});

let isDraggingPlayhead = false;
playhead.addEventListener("mousedown", () => isDraggingPlayhead = true);
window.addEventListener("mouseup", () => isDraggingPlayhead = false);
window.addEventListener("mousemove", (e) => {
  if (isDraggingPlayhead) {
    const rect = timelineInner.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = clickX / state.pixelsPerSecond;
    seekTo(time);
  }
});

function updatePlayhead() {
  const x = state.currentTime * state.pixelsPerSecond;
  playhead.style.left = `${x}px`;
  timecodeDisplay.textContent = `${formatTime(state.currentTime)} / ${formatTime(state.duration)}`;
}

// TIMELINE TOOLS (SPLIT / DELETE / ADD)
document.getElementById("splitClipBtn").addEventListener("click", () => {
  alert(`✂️ Split clip at playhead: ${state.currentTime.toFixed(2)}s`);
});

document.getElementById("addTextLayerBtn").addEventListener("click", () => {
  const newCap = {
    id: `c_${Date.now()}`,
    start: parseFloat(state.currentTime.toFixed(2)),
    end: parseFloat(Math.min(state.duration, state.currentTime + 2.5).toFixed(2)),
    text: "NEW VIRAL TEXT",
    preset: state.captionPreset
  };
  trackData.captions.push(newCap);
  trackData.captions.sort((a, b) => a.start - b.start);
  renderTimelineBlocks();
});

document.getElementById("deleteTrackItemBtn").addEventListener("click", () => {
  if (trackData.captions.length > 0) {
    trackData.captions.pop();
    renderTimelineBlocks();
  }
});

document.getElementById("zoomInBtn").addEventListener("click", () => {
  state.pixelsPerSecond = Math.min(180, state.pixelsPerSecond + 20);
  renderTimelineRuler();
  renderTimelineBlocks();
  updatePlayhead();
});

document.getElementById("zoomOutBtn").addEventListener("click", () => {
  state.pixelsPerSecond = Math.max(30, state.pixelsPerSecond - 20);
  renderTimelineRuler();
  renderTimelineBlocks();
  updatePlayhead();
});

// --- REAL-TIME CANVAS RENDER LOOP ---
let lastTime = performance.now();

function startRenderLoop() {
  function loop(now) {
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    if (state.isPlaying) {
      state.currentTime += delta * state.speed;
      if (state.currentTime >= state.duration) {
        state.currentTime = 0;
        if (state.videoElement && state.videoLoaded) {
          state.videoElement.currentTime = 0;
          state.videoElement.play();
        }
      }
      updatePlayhead();
    }

    renderCanvasFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function renderCanvasFrame() {
  const W = canvas.width;
  const H = canvas.height;

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // 1. DRAW VIDEO OR DYNAMIC TEMPLATE
  if (state.videoLoaded && state.videoElement && state.videoElement.readyState >= 2) {
    applyCanvasFilter(ctx, state.filter);
    ctx.drawImage(state.videoElement, 0, 0, W, H);
    ctx.filter = "none";
  } else {
    renderDynamicBackground(ctx, W, H, state.currentTime);
  }

  // 2. DRAW ACTIVE STICKERS
  if (state.activeSticker) {
    ctx.save();
    ctx.font = "64px Arial";
    ctx.textAlign = "center";
    ctx.fillText(state.activeSticker, W / 2, H * 0.35);
    ctx.restore();
  }

  // 3. DRAW ACTIVE CAPTIONS OVERLAY
  renderActiveCaptions(ctx, W, H, state.currentTime);

  ctx.restore();
}

function applyCanvasFilter(context, filter) {
  if (filter === "cyberpunk") {
    context.filter = "contrast(140%) saturate(180%) hue-rotate(190deg)";
  } else if (filter === "retro-vhs") {
    context.filter = "sepia(40%) contrast(120%) brightness(110%)";
  } else if (filter === "cinema-dark") {
    context.filter = "contrast(130%) brightness(90%) saturate(120%)";
  } else if (filter === "golden-hour") {
    context.filter = "sepia(60%) saturate(160%) brightness(105%)";
  } else if (filter === "noir") {
    context.filter = "grayscale(100%) contrast(160%)";
  } else {
    context.filter = "none";
  }
}

function renderDynamicBackground(context, W, H, time) {
  const grad = context.createLinearGradient(0, 0, W, H);
  const shift = Math.sin(time) * 40;
  grad.addColorStop(0, `rgb(${30 + shift}, 10, 60)`);
  grad.addColorStop(0.5, `rgb(10, ${30 + shift}, 70)`);
  grad.addColorStop(1, `rgb(15, 20, ${40 + shift})`);
  context.fillStyle = grad;
  context.fillRect(0, 0, W, H);

  // Animated perspective grid
  context.strokeStyle = "rgba(0, 242, 254, 0.25)";
  context.lineWidth = 2;
  const horizon = H * 0.6;
  const lines = 12;

  for (let i = 0; i < lines; i++) {
    const x = (W / (lines - 1)) * i;
    context.beginPath();
    context.moveTo(W / 2, horizon);
    context.lineTo(x, H);
    context.stroke();
  }

  const offset = (time * 80) % 40;
  for (let y = horizon; y < H; y += 30) {
    context.beginPath();
    context.moveTo(0, y + offset);
    context.lineTo(W, y + offset);
    context.stroke();
  }

  // Center title
  context.save();
  context.font = "900 36px 'Orbitron', sans-serif";
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.shadowColor = "#00f2fe";
  context.shadowBlur = 25;
  context.fillText("⚡ FORGE PRO", W / 2, horizon - 50);
  context.font = "700 16px 'Plus Jakarta Sans', sans-serif";
  context.fillStyle = "#94a3b8";
  context.shadowBlur = 0;
  context.fillText(state.videoName, W / 2, horizon - 15);
  context.restore();
}

function renderActiveCaptions(context, W, H, curTime) {
  const cap = trackData.captions.find(c => curTime >= c.start && curTime <= c.end);
  if (!cap) return;

  const text = cap.text.toUpperCase();
  const preset = cap.preset || state.captionPreset;
  const posY = H * 0.78;

  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";

  if (preset === "mrbeast") {
    context.font = `900 ${state.fontSize}px ${state.fontFamily}`;
    context.strokeStyle = "#000000";
    context.lineWidth = 14;
    context.lineJoin = "round";
    context.strokeText(text, W / 2, posY);

    context.fillStyle = state.highlightColor;
    context.shadowColor = "rgba(0, 0, 0, 0.9)";
    context.shadowBlur = 10;
    context.fillText(text, W / 2, posY);

  } else if (preset === "neon") {
    context.font = `900 ${state.fontSize}px 'Orbitron', sans-serif`;
    context.shadowColor = "#00f2fe";
    context.shadowBlur = 30;
    context.fillStyle = state.textColor;
    context.fillText(text, W / 2, posY);

    context.strokeStyle = "#00f2fe";
    context.lineWidth = 4;
    context.strokeText(text, W / 2, posY);

  } else if (preset === "pop") {
    context.font = `900 ${state.fontSize}px 'Orbitron', sans-serif`;
    context.fillStyle = "#ff007f";
    context.fillText(text, W / 2 + 5, posY + 5);
    context.fillStyle = "#00f2fe";
    context.fillText(text, W / 2, posY);

  } else if (preset === "box") {
    context.font = `800 ${state.fontSize * 0.75}px ${state.fontFamily}`;
    const metrics = context.measureText(text);
    const boxW = metrics.width + 40;
    const boxH = 55;

    context.fillStyle = "#ffffff";
    context.shadowColor = "rgba(0,0,0,0.6)";
    context.shadowBlur = 15;
    context.fillRect(W / 2 - boxW / 2, posY - boxH / 2, boxW, boxH);

    context.fillStyle = "#000000";
    context.shadowBlur = 0;
    context.fillText(text, W / 2, posY);

  } else if (preset === "karaoke") {
    const words = text.split(" ");
    const progress = (curTime - cap.start) / Math.max(0.1, cap.end - cap.start);
    const activeWordIdx = Math.min(words.length - 1, Math.floor(progress * words.length));

    context.font = `900 ${state.fontSize}px ${state.fontFamily}`;
    context.strokeStyle = "#000";
    context.lineWidth = 10;
    context.strokeText(text, W / 2, posY);

    context.fillStyle = state.highlightColor;
    context.shadowColor = state.highlightColor;
    context.shadowBlur = 20;
    context.fillText(text, W / 2, posY);

  } else {
    context.font = `900 ${state.fontSize}px ${state.fontFamily}`;
    context.strokeStyle = "#000";
    context.lineWidth = 12;
    context.strokeText(text, W / 2, posY);
    context.fillStyle = state.textColor;
    context.fillText(text, W / 2, posY);
  }

  context.restore();
}

// --- CAPCUT REAL VIDEO EXPORTER ---
exportVideoBtn.addEventListener("click", startVideoExport);

async function startVideoExport() {
  exportModal.classList.remove("hidden");
  exportProgressBar.style.width = "0%";
  exportStatusText.textContent = "Initializing CapCut video encoder...";

  if (state.isPlaying) togglePlay();

  const stream = canvas.captureStream(30);
  let mimeType = "video/webm;codecs=vp9";
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = "video/webm";
  }

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8000000
  });

  const recordedChunks = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CapCut_${state.videoName.replace(/\.[^/.]+$/, "")}_Export.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    exportStatusText.textContent = "✅ Export Complete! Download started.";
    exportProgressBar.style.width = "100%";
    setTimeout(() => {
      exportModal.classList.add("hidden");
    }, 1500);
  };

  mediaRecorder.start();

  const fps = 30;
  const totalFrames = Math.floor(state.duration * fps);
  let frame = 0;

  function renderExportFrame() {
    if (frame >= totalFrames) {
      mediaRecorder.stop();
      return;
    }

    state.currentTime = frame / fps;
    if (state.videoElement && state.videoLoaded) {
      state.videoElement.currentTime = state.currentTime;
    }
    renderCanvasFrame();

    frame++;
    const percent = Math.floor((frame / totalFrames) * 100);
    exportProgressBar.style.width = `${percent}%`;
    exportStatusText.textContent = `Encoding frame ${frame} of ${totalFrames} (${percent}%)...`;

    setTimeout(renderExportFrame, 1000 / fps);
  }

  renderExportFrame();
}

// SUBTITLE EXPORTS
exportSrtBtn.addEventListener("click", () => {
  if (!trackData.captions.length) {
    alert("No captions to export!");
    return;
  }
  let srt = "";
  trackData.captions.forEach((c, i) => {
    srt += `${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n\n`;
  });
  downloadFile(srt, "CapCut_Captions.srt", "text/plain");
});

exportVttBtn.addEventListener("click", () => {
  if (!trackData.captions.length) {
    alert("No captions to export!");
    return;
  }
  let vtt = "WEBVTT\n\n";
  trackData.captions.forEach((c, i) => {
    vtt += `${i + 1}\n${formatVttTime(c.start)} --> ${formatVttTime(c.end)}\n${c.text}\n\n`;
  });
  downloadFile(vtt, "CapCut_Captions.vtt", "text/vtt");
});

function formatTime(sec) {
  const s = Math.floor(sec || 0);
  const ms = Math.floor(((sec || 0) % 1) * 100);
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return `${String(m).padStart(2, "0")}:${String(remS).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

function formatSrtTime(seconds) {
  const date = new Date(0);
  date.setUTCMilliseconds(seconds * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss},${ms}`;
}

function formatVttTime(seconds) {
  const date = new Date(0);
  date.setUTCMilliseconds(seconds * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setupEventListeners() {
  window.addEventListener("resize", () => {
    renderTimelineRuler();
    renderTimelineBlocks();
    updatePlayhead();
  });
}

// Run
initEditor();

import {
  pipeline,
  env
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm";


/* =========================================
   SETTINGS
========================================= */

env.allowLocalModels = false;

env.useBrowserCache = true;


/* =========================================
   ELEMENTS
========================================= */

const videoInput =
  document.getElementById("videoInput");

const uploadBox =
  document.getElementById("uploadBox");

const generateBtn =
  document.getElementById("generateBtn");

const stopBtn =
  document.getElementById("stopBtn");

const video =
  document.getElementById("video");

const captionOverlay =
  document.getElementById("captionOverlay");

const captionTimeline =
  document.getElementById("captionTimeline");

const captionCount =
  document.getElementById("captionCount");

const statusBox =
  document.getElementById("status");

const progressBar =
  document.getElementById("progressBar");

const language =
  document.getElementById("language");


/* =========================================
   VARIABLES
========================================= */

let videoURL = null;

let transcriber = null;

let captions = [];

let currentStyle = "style-bold";

let stopped = false;


/* =========================================
   UPLOAD
========================================= */

uploadBox.addEventListener(
  "click",
  () => videoInput.click()
);


videoInput.addEventListener(
  "change",
  () => {

    const file =
      videoInput.files[0];

    if (!file) return;


    if (videoURL) {
      URL.revokeObjectURL(videoURL);
    }


    videoURL =
      URL.createObjectURL(file);


    video.src = videoURL;

    video.load();


    generateBtn.disabled = false;

    statusBox.textContent =
      "✅ Video ready. Generate Auto Captions dabao.";

    progressBar.style.width = "0%";


    captions = [];

    renderTimeline();

    captionOverlay.innerHTML = "";

  }
);


/* =========================================
   LOAD WHISPER
========================================= */

async function loadWhisper() {

  if (transcriber) {
    return transcriber;
  }


  statusBox.textContent =
    "🤖 AI caption model loading...";


  progressBar.style.width = "10%";


  transcriber =
    await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny",
      {
        device:
          "webgpu"
      }
    );


  progressBar.style.width = "25%";


  return transcriber;
}


/* =========================================
   EXTRACT AUDIO
========================================= */

async function extractAudio(file) {

  statusBox.textContent =
    "🎧 Reading video audio...";


  const ffmpeg =
    new FFmpegWASM.FFmpeg();


  await ffmpeg.load({
    coreURL:
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js"
  });


  const data =
    new Uint8Array(
      await file.arrayBuffer()
    );


  await ffmpeg.writeFile(
    "input.mp4",
    data
  );


  await ffmpeg.exec([
    "-i",
    "input.mp4",
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-f",
    "wav",
    "audio.wav"
  ]);


  const audioData =
    await ffmpeg.readFile(
      "audio.wav"
    );


  return audioData;
}


/* =========================================
   WAV → FLOAT32
========================================= */

function wavToFloat32(buffer) {

  const view =
    new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );


  const channels =
    view.getUint16(22, true);

  const sampleRate =
    view.getUint32(24, true);

  const bits =
    view.getUint16(34, true);


  if (
    channels !== 1 ||
    sampleRate !== 16000 ||
    bits !== 16
  ) {

    throw new Error(
      "Unexpected WAV format."
    );

  }


  const dataOffset = 44;

  const samples =
    (buffer.length - dataOffset) / 2;


  const output =
    new Float32Array(samples);


  for (
    let i = 0;
    i < samples;
    i++
  ) {

    const value =
      view.getInt16(
        dataOffset + i * 2,
        true
      );


    output[i] =
      value / 32768;

  }


  return output;
}


/* =========================================
   GENERATE CAPTIONS
========================================= */

generateBtn.addEventListener(
  "click",
  async () => {

    const file =
      videoInput.files[0];

    if (!file) {

      statusBox.textContent =
        "⚠️ Upload a video first.";

      return;
    }


    stopped = false;

    generateBtn.disabled = true;

    stopBtn.disabled = false;


    try {

      const model =
        await loadWhisper();


      if (stopped) return;


      const audioFile =
        await extractAudio(file);


      if (stopped) return;


      statusBox.textContent =
        "🧠 AI is transcribing...";


      progressBar.style.width = "40%";


      const audio =
        wavToFloat32(audioFile);


      let languageOption =
        language.value;


      let options = {

        return_timestamps:
          "word",

        chunk_length_s:
          30,

        stride_length_s:
          5,

        task:
          "transcribe"

      };


      if (
        languageOption !== "auto"
      ) {

        options.language =
          languageOption;

      }


      const result =
        await model(
          audio,
          options
        );


      if (stopped) return;


      progressBar.style.width =
        "90%";


      captions =
        normalizeCaptions(
          result
        );


      renderTimeline();

      renderCaption();


      statusBox.textContent =
        `✅ ${captions.length} words generated.`;


      progressBar.style.width =
        "100%";


      video.currentTime = 0;

    }

    catch(error) {

      console.error(error);

      statusBox.textContent =
        "❌ Caption generation failed. Browser console check karo.";

      progressBar.style.width =
        "0%";

    }

    finally {

      generateBtn.disabled =
        false;

      stopBtn.disabled =
        true;

    }

  }
);


/* =========================================
   NORMALIZE WHISPER RESULT
========================================= */

function normalizeCaptions(result) {

  const chunks =
    result?.chunks || [];

  const output = [];


  for (
    const chunk of chunks
  ) {

    const text =
      (chunk.text || "").trim();


    const timestamp =
      chunk.timestamp;


    if (
      !text ||
      !timestamp
    ) {
      continue;
    }


    const start =
      Number(timestamp[0] ?? 0);


    const end =
      Number(
        timestamp[1] ??
        start + .5
      );


    const words =
      text.split(/\s+/);


    const duration =
      Math.max(
        .15,
        (end - start) /
        words.length
      );


    words.forEach(
      (word,index) => {

        output.push({

          word,

          start:
            start +
            index * duration,

          end:
            start +
            (index + 1) *
            duration

        });

      }
    );

  }


  return output;
}


/* =========================================
   TIMELINE
========================================= */

function renderTimeline() {

  captionTimeline.innerHTML = "";


  if (!captions.length) {

    captionTimeline.innerHTML =
      `<div class="empty-timeline">
        Generate captions to see them here.
      </div>`;

    captionCount.textContent =
      "0 words";

    return;
  }


  captionCount.textContent =
    `${captions.length} words`;


  captions.forEach(
    (item,index) => {

      const div =
        document.createElement("div");


      div.className =
        "timeline-word";


      div.dataset.index =
        index;


      div.textContent =
        item.word;


      captionTimeline.appendChild(
        div
      );

    }
  );

}


/* =========================================
   LIVE CAPTION
========================================= */

function renderCaption() {

  captionOverlay.innerHTML = "";

  captionOverlay.className =
    `caption-overlay ${currentStyle}`;


  if (!captions.length) return;


  /*
    Show a small group of words
    around current playback time.
  */

  const now =
    video.currentTime;


  let currentIndex = -1;


  for (
    let i = 0;
    i < captions.length;
    i++
  ) {

    if (
      now >= captions[i].start &&
      now <= captions[i].end
    ) {

      currentIndex = i;

      break;

    }

  }


  if (currentIndex === -1) {

    return;

  }


  const start =
    Math.max(
      0,
      currentIndex - 3
    );


  const end =
    Math.min(
      captions.length,
      currentIndex + 4
    );


  for (
    let i = start;
    i < end;
    i++
  ) {

    const span =
      document.createElement("span");


    span.className =
      "caption-word";


    if (
      i === currentIndex
    ) {

      span.classList.add(
        "current"
      );

    }


    span.textContent =
      captions[i].word;


    captionOverlay.appendChild(
      span
    );

  }


  updateTimeline(
    currentIndex
  );

}


/* =========================================
   TIMELINE ACTIVE WORD
========================================= */

function updateTimeline(index) {

  document
    .querySelectorAll(
      ".timeline-word"
    )
    .forEach(
      element => {

        element.classList.toggle(
          "active",
          Number(
            element.dataset.index
          ) === index
        );

      }
    );

}


/* =========================================
   VIDEO TIME UPDATE
========================================= */

video.addEventListener(
  "timeupdate",
  renderCaption
);


/* =========================================
   STOP
========================================= */

stopBtn.addEventListener(
  "click",
  () => {

    stopped = true;

    statusBox.textContent =
      "⏹ Stopped.";

    stopBtn.disabled =
      true;

    generateBtn.disabled =
      false;

  }
);


/* =========================================
   STYLE SWITCHER
========================================= */

document
  .querySelectorAll(".style-card")
  .forEach(
    card => {

      card.addEventListener(
        "click",
        () => {

          currentStyle =
            card.dataset.style;


          document
            .querySelectorAll(
              ".style-card"
            )
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );


          card.classList.add(
            "active"
          );


          renderCaption();

        }
      );

    }
  );


/* =========================================
   CAPCUT PRO FEATURES (TIMELINE, EXPORT, RATIO)
========================================= */

// 1. ASPECT RATIO
const videoContainer = document.getElementById("videoContainer");
document.querySelectorAll(".ratio-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".ratio-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    videoContainer.className = `video-container ratio-${btn.dataset.ratio}`;
  });
});

// 2. TIMELINE CLICK-TO-SEEK & DOUBLE-CLICK-TO-EDIT
captionTimeline.addEventListener("click", (e) => {
  const wordEl = e.target.closest(".timeline-word");
  if (!wordEl) return;
  const idx = Number(wordEl.dataset.index);
  if (captions[idx]) {
    video.currentTime = captions[idx].start;
    video.play();
  }
});

captionTimeline.addEventListener("dblclick", (e) => {
  const wordEl = e.target.closest(".timeline-word");
  if (!wordEl) return;
  const idx = Number(wordEl.dataset.index);
  if (captions[idx]) {
    const newWord = prompt("Edit word text:", captions[idx].word);
    if (newWord !== null && newWord.trim() !== "") {
      captions[idx].word = newWord.trim();
      wordEl.textContent = captions[idx].word;
      renderCaption();
    }
  }
});

// 3. CAPTION POSITION & SIZE
const captionPosition = document.getElementById("captionPosition");
const captionSizeSlider = document.getElementById("captionSizeSlider");

if (captionPosition) {
  captionPosition.addEventListener("change", (e) => {
    const val = e.target.value;
    captionOverlay.style.top = "";
    captionOverlay.style.bottom = "";
    captionOverlay.style.transform = "translateX(-50%)";

    if (val === "top") {
      captionOverlay.style.top = "15%";
    } else if (val === "middle") {
      captionOverlay.style.top = "50%";
      captionOverlay.style.transform = "translate(-50%, -50%)";
    } else {
      captionOverlay.style.bottom = "10%";
    }
  });
}

if (captionSizeSlider) {
  captionSizeSlider.addEventListener("input", (e) => {
    captionOverlay.style.fontSize = `${e.target.value}px`;
  });
}

// 4. CUSTOM SCRIPT / PASTE TEXT SYNC
const customScriptInput = document.getElementById("customScriptInput");
const applyScriptBtn = document.getElementById("applyScriptBtn");

if (applyScriptBtn && customScriptInput) {
  applyScriptBtn.addEventListener("click", () => {
    const text = customScriptInput.value.trim();
    if (!text) {
      alert("Please paste text or script first.");
      return;
    }

    const dur = video.duration || 10;
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (!words.length) return;

    const timePerWord = Math.max(0.2, dur / words.length);
    captions = words.map((w, i) => ({
      word: w,
      start: parseFloat((i * timePerWord).toFixed(2)),
      end: parseFloat(((i + 1) * timePerWord).toFixed(2))
    }));

    renderTimeline();
    renderCaption();
    statusBox.textContent = `✅ Synced ${captions.length} words to video!`;
  });
}

// 5. EXPORT SUBTITLES (.SRT & .VTT)
const exportSrtBtn = document.getElementById("exportSrtBtn");
const exportVttBtn = document.getElementById("exportVttBtn");

if (exportSrtBtn) {
  exportSrtBtn.addEventListener("click", () => {
    if (!captions.length) {
      alert("No captions to export!");
      return;
    }
    let srt = "";
    captions.forEach((c, i) => {
      srt += `${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.word}\n\n`;
    });
    downloadBlob(srt, "Faraz_Captions.srt", "text/plain");
  });
}

if (exportVttBtn) {
  exportVttBtn.addEventListener("click", () => {
    if (!captions.length) {
      alert("No captions to export!");
      return;
    }
    let vtt = "WEBVTT\n\n";
    captions.forEach((c, i) => {
      vtt += `${i + 1}\n${formatVttTime(c.start)} --> ${formatVttTime(c.end)}\n${c.word}\n\n`;
    });
    downloadBlob(vtt, "Faraz_Captions.vtt", "text/vtt");
  });
}

// 6. REAL CAPCUT VIDEO EXPORTER (BURN-IN CAPTIONS TO MP4/WEBM)
const exportVideoBtn = document.getElementById("exportVideoBtn");
const exportModal = document.getElementById("exportModal");
const exportProgressFill = document.getElementById("exportProgressFill");
const exportStatusText = document.getElementById("exportStatusText");

if (exportVideoBtn) {
  exportVideoBtn.addEventListener("click", async () => {
    if (!video.src) {
      alert("Please upload a video first!");
      return;
    }

    exportModal.classList.remove("hidden");
    exportProgressFill.style.width = "0%";
    exportStatusText.textContent = "Setting up CapCut video canvas...";

    video.pause();
    video.currentTime = 0;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext("2d");

    const stream = canvas.captureStream(30);
    let mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 6000000
    });

    const chunks = [];
    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      downloadBlob(blob, "Faraz_FORGE_CapCut.webm", "video/webm");
      exportStatusText.textContent = "✅ Export Complete! Video saved to your PC.";
      exportProgressFill.style.width = "100%";
      setTimeout(() => exportModal.classList.add("hidden"), 1500);
    };

    recorder.start();

    const duration = video.duration || 5;
    const fps = 25;
    const totalFrames = Math.floor(duration * fps);
    let currentFrame = 0;

    function renderNextFrame() {
      if (currentFrame >= totalFrames || stopped) {
        recorder.stop();
        return;
      }

      video.currentTime = currentFrame / fps;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Burn in current word or group
      const now = video.currentTime;
      const activeWord = captions.find(c => now >= c.start && now <= c.end);

      if (activeWord) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `900 ${canvas.width * 0.08}px Arial, Impact, sans-serif`;
        
        const posX = canvas.width / 2;
        const posY = canvas.height * 0.85;

        // Shadow & Stroke
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 10;
        ctx.strokeText(activeWord.word.toUpperCase(), posX, posY);

        // Fill color
        ctx.fillStyle = "#ffea00";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 15;
        ctx.fillText(activeWord.word.toUpperCase(), posX, posY);

        ctx.restore();
      }

      currentFrame++;
      const pct = Math.floor((currentFrame / totalFrames) * 100);
      exportProgressFill.style.width = `${pct}%`;
      exportStatusText.textContent = `Encoding frame ${currentFrame} / ${totalFrames} (${pct}%)...`;

      setTimeout(renderNextFrame, 1000 / fps);
    }

    renderNextFrame();
  });
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

function downloadBlob(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

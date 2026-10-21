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
const videoInput = document.getElementById("videoInput");
const chooseBtn = document.getElementById("chooseBtn");
const captionBtn = document.getElementById("captionBtn");

const video = document.getElementById("video");
const fileName = document.getElementById("fileName");

const previewSection = document.getElementById("previewSection");
const stylesSection = document.getElementById("stylesSection");
const captionOutput = document.getElementById("captionOutput");

const status = document.getElementById("status");
const progressBar = document.getElementById("progressBar");
const captionsBox = document.getElementById("captions");

let selectedVideo = null;
let selectedStyle = "classic";

chooseBtn.addEventListener("click", () => {
  videoInput.click();
});

videoInput.addEventListener("change", () => {

  const file = videoInput.files?.[0];

  if (!file) return;

  selectedVideo = file;

  fileName.textContent = file.name;

  video.src = URL.createObjectURL(file);

  previewSection.classList.remove("hidden");
  stylesSection.classList.remove("hidden");

  status.textContent = "Video ready.";

});

document.querySelectorAll(".style").forEach(button => {

  button.addEventListener("click", () => {

    document.querySelectorAll(".style")
      .forEach(x => x.classList.remove("active"));

    button.classList.add("active");

    selectedStyle = button.dataset.style;

    renderCaptions();

  });

});

captionBtn.addEventListener("click", async () => {

  if (!selectedVideo) {
    status.textContent = "Please select a video first.";
    return;
  }

  captionBtn.disabled = true;

  progressBar.style.width = "5%";

  status.textContent =
    "Preparing audio...";

  try {

    /*
      STEP 1
      Extract audio from the uploaded video.
    */

    const audioBuffer =
      await extractAudio(selectedVideo);

    progressBar.style.width = "25%";

    status.textContent =
      "Transcribing locally...";

    /*
      STEP 2

      whisper.cpp integration goes here.

      The official whisper.cpp browser build
      exposes the WASM inference layer.

      It must be built/copied into:

      auto-caption/whisper/
    */

    const result =
      await transcribeWithWhisper(audioBuffer);

    progressBar.style.width = "100%";

    status.textContent =
      "Captions generated successfully.";

    window.captionData = result;

    captionOutput.classList.remove("hidden");

    renderCaptions();

  } catch (error) {

    console.error(error);

    status.textContent =
      "Caption generation failed. Check Console.";

  } finally {

    captionBtn.disabled = false;

  }

});


async function extractAudio(file) {

  const arrayBuffer =
    await file.arrayBuffer();

  const AudioContext =
    window.AudioContext ||
    window.webkitAudioContext;

  const audioContext =
    new AudioContext();

  const decoded =
    await audioContext.decodeAudioData(arrayBuffer);

  const mono =
    convertToMono(decoded);

  await audioContext.close();

  return mono;

}


function convertToMono(audioBuffer) {

  const channels =
    audioBuffer.numberOfChannels;

  const length =
    audioBuffer.length;

  const sampleRate =
    audioBuffer.sampleRate;

  const mono =
    new Float32Array(length);

  for (let channel = 0; channel < channels; channel++) {

    const data =
      audioBuffer.getChannelData(channel);

    for (let i = 0; i < length; i++) {

      mono[i] +=
        data[i] / channels;

    }

  }

  return {
    data: mono,
    sampleRate
  };

}


async function transcribeWithWhisper(audio) {

  /*
    Placeholder for whisper.cpp WASM.

    IMPORTANT:

    whisper.cpp's official browser build is generated
    with Emscripten. The generated JS/WASM files must
    be placed in:

    auto-caption/whisper/

    Do NOT use a fake CDN filename here.
  */

  throw new Error(
    "whisper.cpp WASM runtime is not installed yet."
  );

}


function renderCaptions() {

  if (!window.captionData) {

    captionsBox.innerHTML =
      "<div class='caption-line'>No captions yet.</div>";

    return;

  }

  captionsBox.innerHTML = "";

  window.captionData.forEach(item => {

    const div =
      document.createElement("div");

    div.className =
      `caption-line ${selectedStyle}`;

    div.innerHTML = `
      <strong>
        ${escapeHTML(item.text)}
      </strong>
      <small>
        ${formatTime(item.start)}
        →
        ${formatTime(item.end)}
      </small>
    `;

    captionsBox.appendChild(div);

  });

}


function formatTime(seconds) {

  return Number(seconds || 0)
    .toFixed(2) + "s";

}


function escapeHTML(text) {

  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

} 
/* =========================================================
   FreePDF Tools - Main App
   ========================================================= */

const PDF_APP = {

  currentTool: null,
  currentFile: null,
  currentBlob: null,
  currentFileName: "",

  tools: {

    split: {
      name: "Split PDF",
      description: "Split your PDF into separate files.",
      icon: "✂️",
      module: "splitPDF"
    },

    compress: {
      name: "Compress PDF",
      description: "Reduce the size of your PDF.",
      icon: "📦",
      module: "compressPDF"
    },

    editor: {
      name: "PDF Editor",
      description: "Add text, draw and annotate your PDF.",
      icon: "✏️",
      module: "editorPDF"
    },

    merge: {
      name: "Merge PDF",
      description: "Combine multiple PDF files into one.",
      icon: "📑",
      module: "mergePDF"
    },

    rotate: {
      name: "Rotate PDF",
      description: "Rotate your PDF pages.",
      icon: "🔄",
      module: "rotatePDF"
    },

    delete: {
      name: "Delete Pages",
      description: "Remove unwanted pages from your PDF.",
      icon: "🗑️",
      module: "deletePDF"
    },

    extract: {
      name: "Extract Pages",
      description: "Extract selected pages from your PDF.",
      icon: "📄",
      module: "extractPDF"
    },

    reorder: {
      name: "Reorder Pages",
      description: "Change the order of your PDF pages.",
      icon: "↕️",
      module: "reorderPDF"
    },

    watermark: {
      name: "Watermark",
      description: "Add a watermark to your PDF.",
      icon: "💧",
      module: "watermarkPDF"
    },

    jpgpdf: {
      name: "JPG to PDF",
      description: "Convert JPG images into a PDF.",
      icon: "🖼️",
      module: "jpgpdfPDF"
    },

    pdfjpg: {
      name: "PDF to JPG",
      description: "Convert PDF pages into JPG images.",
      icon: "📸",
      module: "pdfjpgPDF"
    },

    text: {
      name: "PDF to Text",
      description: "Extract selectable text from a PDF.",
      icon: "📝",
      module: "pdfText"
    },

    pagenumbers: {
      name: "Page Numbers",
      description: "Add page numbers to every page.",
      icon: "🔢",
      module: "pageNumbersPDF"
    },

    metadata: {
      name: "PDF Metadata",
      description: "Edit title, author, subject and keywords.",
      icon: "🏷️",
      module: "metadataPDF"
    },

    blank: {
      name: "Add Blank Pages",
      description: "Insert blank pages into your PDF.",
      icon: "➕",
      module: "blankPagesPDF"
    }

  }

};


/* =========================================================
   INITIALIZE APP
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  setupToolCards();
  setupUpload();
  setupProcessButton();
  setupBackButton();
  setupAgainButton();
  setupSpecialInputs();
  setupMoreMenu();

});


/* =========================================================
   TOOL CARDS
   ========================================================= */

function setupToolCards() {

  const cards = document.querySelectorAll(".tool-card");

  cards.forEach(function (card) {

    card.addEventListener("click", function () {

      const tool = card.dataset.tool;

      if (tool) {
        openTool(tool);
      }

    });

  });

}


/* =========================================================
   OPEN TOOL
   ========================================================= */

function openTool(tool) {

  const config = PDF_APP.tools[tool];

  if (!config) return;

  PDF_APP.currentTool = tool;
  PDF_APP.currentFile = null;
  PDF_APP.currentBlob = null;
  PDF_APP.currentFileName = "";

  hideElement("toolList");
  hideElement("resultScreen");
  hideElement("processingScreen");

  showElement("workspace");

  setText("toolIcon", config.icon);
  setText("toolTitle", config.name);
  setText("toolDescription", config.description);
  const guide = document.getElementById("toolGuide");
  if (guide) {
    const guideMap = {
      editor:["Edit and annotate pages in one workspace.","Upload → choose an edit → set page/position → Process PDF.","A new edited PDF."],
      split:["Create a smaller PDF from selected pages.","Upload → enter a range such as 1-3,5 → Process.","A PDF containing the selected pages."],
      merge:["Combine several PDFs into one document.","Select multiple PDFs → Process.","One merged PDF."],
      compress:["Reduce the PDF file size.","Upload → choose compression level → Process.","A smaller PDF export."],
      watermark:["Stamp every page with watermark text.","Upload → enter text/opacity → Process.","A watermarked PDF."]
    };
    const g=guideMap[tool]||[config.description,"Upload the file → choose the options → Process PDF.","A downloadable result file."];
    guide.innerHTML=`<div class="tool-guide-grid"><div class="guide-box"><b>WHAT IT DOES</b><p>${g[0]}</p></div><div class="guide-box"><b>HOW TO USE</b><p>${g[1]}</p></div><div class="guide-box"><b>YOU GET</b><p>${g[2]}</p></div></div>`;
  }

  resetUpload();
  showToolOptions(tool);

}


/* =========================================================
   SHOW TOOL OPTIONS
   ========================================================= */

function showToolOptions(tool) {

  const optionIds = [
    "splitOptions",
    "compressOptions",
    "editorOptions",
    "mergeOptions",
    "rotateOptions",
    "deleteOptions",
    "extractOptions",
    "reorderOptions",
    "watermarkOptions",
    "jpgpdfOptions",
    "pdfjpgOptions",
    "textOptions",
    "pagenumbersOptions",
    "metadataOptions",
    "blankOptions"
  ];

  optionIds.forEach(function (id) {
    hideElement(id);
  });

  const selected = document.getElementById(tool + "Options");

  if (selected) {
    showElement(selected);
  }

  const optionsArea = document.getElementById("optionsArea");

  if (optionsArea) {
    showElement(optionsArea);
  }

}


/* =========================================================
   UPLOAD
   ========================================================= */

function setupUpload() {

  const uploadArea = document.getElementById("uploadArea");
  const fileInput = document.getElementById("fileInput");

  if (!uploadArea || !fileInput) return;


  /* File input change */

  fileInput.addEventListener("change", function () {

    if (this.files && this.files.length) {
      handleFiles(this.files);
    }

  });


  /* Upload area click */

  uploadArea.addEventListener("click", function (e) {

    /*
      If the user clicked the actual Choose PDF label/input,
      browser handles the file picker itself.
    */

    if (
      e.target.closest(".choose-btn") ||
      e.target === fileInput
    ) {
      return;
    }

    fileInput.click();

  });


  /* Drag over */

  uploadArea.addEventListener("dragover", function (e) {

    e.preventDefault();

    uploadArea.classList.add("dragging");

  });


  /* Drag leave */

  uploadArea.addEventListener("dragleave", function () {

    uploadArea.classList.remove("dragging");

  });


  /* Drop */

  uploadArea.addEventListener("drop", function (e) {

    e.preventDefault();

    uploadArea.classList.remove("dragging");

    if (e.dataTransfer.files.length) {

      handleFiles(e.dataTransfer.files);

    }

  });

}


/* =========================================================
   HANDLE FILES
   ========================================================= */

function handleFiles(files) {

  if (!files || !files.length) return;

  const tool = PDF_APP.currentTool;


  /* =========================================
     JPG TO PDF
     ========================================= */

  if (tool === "jpgpdf") {

    const images = Array.from(files).filter(function (file) {

      return (
        file.type === "image/jpeg" ||
        file.type === "image/jpg"
      );

    });


    if (!images.length) {

      alert("Please select JPG or JPEG images.");

      return;

    }


    const imageInput = document.getElementById("imageInput");

    if (imageInput) {

      try {

        const dataTransfer = new DataTransfer();

        images.forEach(function (file) {

          dataTransfer.items.add(file);

        });

        imageInput.files = dataTransfer.files;

      } catch (error) {

        console.warn("Could not set image input files.", error);

      }

    }


    PDF_APP.currentFile = images[0];
    PDF_APP.currentFileName = images[0].name;

    showFileName(
      images.length + " JPG image" +
      (images.length > 1 ? "s" : "") +
      " selected"
    );

    enableProcessButton();

    return;

  }


  /* =========================================
     MERGE PDF
     ========================================= */

  if (tool === "merge") {

    const pdfFiles = Array.from(files).filter(function (file) {

      return (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      );

    });


    if (!pdfFiles.length) {

      alert("Please select PDF files.");

      return;

    }


    window.PDF_MERGE_FILES = pdfFiles;

    PDF_APP.currentFile = pdfFiles[0];
    PDF_APP.currentFileName = pdfFiles[0].name;


    const mergeInput = document.getElementById("mergeInput");

    if (mergeInput) {

      try {

        const dataTransfer = new DataTransfer();

        pdfFiles.forEach(function (file) {

          dataTransfer.items.add(file);

        });

        mergeInput.files = dataTransfer.files;

      } catch (error) {

        console.warn("Could not set merge input files.", error);

      }

    }


    showFileName(
      pdfFiles.length +
      " PDF file" +
      (pdfFiles.length > 1 ? "s" : "") +
      " selected"
    );

    enableProcessButton();

    return;

  }


  /* =========================================
     NORMAL PDF TOOLS
     ========================================= */

  const file = files[0];

  const isPDF =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");


  if (!isPDF) {

    alert("Please select a PDF file.");

    return;

  }


  PDF_APP.currentFile = file;
  PDF_APP.currentFileName = file.name;

  showFileName(file.name);

  if (tool === "editor" && typeof initVisualPdfEditor === "function") initVisualPdfEditor(file);

  enableProcessButton();

}


/* =========================================================
   PROCESS BUTTON
   ========================================================= */

function setupProcessButton() {

  const button = document.getElementById("processButton");

  if (!button) return;

  button.addEventListener("click", function () {

    processCurrentTool();

  });

}


/* =========================================================
   PROCESS CURRENT TOOL
   ========================================================= */

async function processCurrentTool() {

  const tool = PDF_APP.currentTool;

  if (!tool) return;


  /* JPG TO PDF */

  if (tool === "jpgpdf") {

    const imageInput = document.getElementById("imageInput");

    if (
      !imageInput ||
      !imageInput.files ||
      !imageInput.files.length
    ) {

      alert("Please select JPG images first.");

      return;

    }

  }


  /* MERGE */

  else if (tool === "merge") {

    if (
      !window.PDF_MERGE_FILES ||
      !window.PDF_MERGE_FILES.length
    ) {

      alert("Please select PDF files first.");

      return;

    }

  }


  /* NORMAL PDF */

  else {

    if (!PDF_APP.currentFile) {

      alert("Please select a PDF file first.");

      return;

    }

  }


  const config = PDF_APP.tools[tool];

  if (!config) {

    alert("Tool configuration not found.");

    return;

  }


  const processor = window[config.module];

  if (
    !processor ||
    typeof processor.process !== "function"
  ) {

    alert(
      "This tool is not available yet: " +
      config.name
    );

    return;

  }


  /* Hide workspace */

  hideElement("workspace");

  hideElement("resultScreen");

  showElement("processingScreen");


  /* Start game */

  if (typeof startMiniGame === "function") {

    startMiniGame();

  }


  updateProgress(
    5,
    "Starting..."
  );


  try {

    const result = await processor.process(
      PDF_APP.currentFile,
      updateProgress
    );


    /* Stop game immediately */

    if (typeof stopMiniGame === "function") {

      stopMiniGame();

    }


    updateProgress(
      100,
      "Processing complete!"
    );


    if (!result || !result.blob) {

      throw new Error(
        "The tool did not return a valid file."
      );

    }


    showResult(
      result.blob,
      result.name || "download.pdf"
    );

  } catch (error) {

    console.error(error);


    if (typeof stopMiniGame === "function") {

      stopMiniGame();

    }


    hideElement("processingScreen");

    showElement("workspace");


    alert(
      "Something went wrong:\n\n" +
      (error.message || error)
    );

  }

}


/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress(percent, message) {

  const safePercent = Math.max(
    0,
    Math.min(100, Number(percent) || 0)
  );


  const progressBar =
    document.getElementById("progressBar");

  const progressPercent =
    document.getElementById("progressPercent");

  const processingText =
    document.getElementById("processingText");


  if (progressBar) {

    progressBar.style.width =
      safePercent + "%";

  }


  if (progressPercent) {

    progressPercent.textContent =
      Math.round(safePercent) + "%";

  }


  if (processingText && message) {

    processingText.textContent =
      message;

  }

}


/* =========================================================
   RESULT
   ========================================================= */

function showResult(blob, filename) {

  PDF_APP.currentBlob = blob;

  PDF_APP.currentFileName = filename;


  hideElement("processingScreen");

  showElement("resultScreen");


  const resultText =
    document.getElementById("resultText");

  if (resultText) {

    resultText.textContent =
      "Your file is ready: " + filename;

  }


  const downloadButton =
    document.getElementById("downloadButton");

  if (!downloadButton) return;


  downloadButton.onclick = function () {

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(function () {

      URL.revokeObjectURL(url);

    }, 1000);

  };

}


/* =========================================================
   BACK BUTTON
   ========================================================= */

function setupBackButton() {

  const button =
    document.getElementById("backButton");

  if (!button) return;


  button.addEventListener("click", function () {

    resetEverything();

    hideElement("workspace");

    hideElement("processingScreen");

    hideElement("resultScreen");

    showElement("toolList");

  });

}


/* =========================================================
   AGAIN BUTTON
   ========================================================= */

function setupAgainButton() {

  const button =
    document.getElementById("againButton");

  if (!button) return;


  button.addEventListener("click", function () {

    hideElement("resultScreen");

    showElement("workspace");

    resetUpload();

  });

}


/* =========================================================
   SPECIAL INPUTS
   ========================================================= */


/* =========================================================
   THREE-DOT MENU
   Works on desktop and mobile as the site's own menu.
   Browser's native Chrome/Edge menu is controlled by browser.
   ========================================================= */

function setupMoreMenu() {
  const btn = document.getElementById("moreMenuBtn");
  const menu = document.getElementById("moreMenu");
  if (!btn || !menu) return;

  btn.addEventListener("click", function(e) {
    e.stopPropagation();
    menu.classList.toggle("hidden");
  });

  document.addEventListener("click", function() {
    menu.classList.add("hidden");
  });

  const privacy = document.getElementById("menuPrivacy");
  if (privacy) {
    privacy.addEventListener("click", function() {
      alert("FreePDF Tools processes supported files locally in your browser. Nothing is uploaded by this PDF tool.");
    });
  }

  const all = document.getElementById("menuAllTools");
  if (all) {
    all.addEventListener("click", function() {
      menu.classList.add("hidden");
      if (typeof resetEverything === "function") resetEverything();
      hideElement("workspace");
      hideElement("processingScreen");
      hideElement("resultScreen");
      showElement("toolList");
    });
  }
}

function setupSpecialInputs() {

  window.PDF_EDITOR_STATE = {
    text: "",
    textX: 50,
    textY: 50,
    textSize: 18,
    textPage: 1,
    drawLines: [],
    highlights: [],
    replaceFind: "",
    replaceWith: "",
    replacePage: "all"
  };

  const addTextBtn = document.getElementById("addTextBtn");
  const drawBtn = document.getElementById("drawBtn");
  const highlightBtn = document.getElementById("highlightBtn");

  if (addTextBtn) {
    addTextBtn.addEventListener("click", function () {
      const text = prompt("Enter the text to add:");
      if (text !== null && text.trim()) {
        const state = window.PDF_EDITOR_STATE;
        state.text = text.trim();
        state.textX = Number(document.getElementById("editorX")?.value) || 50;
        state.textY = Number(document.getElementById("editorY")?.value) || 50;
        state.textSize = Number(document.getElementById("editorSize")?.value) || 18;
        state.textPage = Number(document.getElementById("editorPage")?.value) || 1;
        alert("Text ready. Set X/Y/page if needed, then click Process PDF.");
      }
    });
  }

  if (drawBtn) {
    drawBtn.addEventListener("click", function () {
      alert("Draw mode is available for the existing editor state. Click Process PDF to apply it.");
    });
  }

  if (highlightBtn) {
    highlightBtn.addEventListener("click", function () {
      alert("Highlight mode is available for the existing editor state. Click Process PDF to apply it.");
    });
  }

  ["editorX","editorY","editorSize","editorPage"].forEach(function(id){
    const el=document.getElementById(id);
    if(el) el.addEventListener("input", function(){
      const s=window.PDF_EDITOR_STATE;
      if(id==="editorX") s.textX=Number(this.value)||0;
      if(id==="editorY") s.textY=Number(this.value)||0;
      if(id==="editorSize") s.textSize=Number(this.value)||18;
      if(id==="editorPage") s.textPage=Number(this.value)||1;
    });
  });

  const findInput=document.getElementById("replaceFind");
  const withInput=document.getElementById("replaceWith");
  const pageInput=document.getElementById("replacePage");
  if(findInput) findInput.addEventListener("input",()=>window.PDF_EDITOR_STATE.replaceFind=findInput.value);
  if(withInput) withInput.addEventListener("input",()=>window.PDF_EDITOR_STATE.replaceWith=withInput.value);
  if(pageInput) pageInput.addEventListener("input",()=>window.PDF_EDITOR_STATE.replacePage=pageInput.value.trim() || "all");
}

/* =========================================================
   RESET UPLOAD
   ========================================================= */

function resetUpload() {

  const fileInput =
    document.getElementById("fileInput");

  const imageInput =
    document.getElementById("imageInput");


  if (fileInput) {

    fileInput.value = "";

  }


  if (imageInput) {

    imageInput.value = "";

  }


  window.PDF_MERGE_FILES = [];


  PDF_APP.currentFile = null;

  PDF_APP.currentFileName = "";

  PDF_APP.currentBlob = null;


  const fileName =
    document.getElementById("fileName");

  if (fileName) {

    fileName.textContent = "";

  }


  disableProcessButton();

}


/* =========================================================
   RESET EVERYTHING
   ========================================================= */

function resetEverything() {

  resetUpload();

  PDF_APP.currentTool = null;

  hideElement("optionsArea");

}


/* =========================================================
   FILE NAME
   ========================================================= */

function showFileName(name) {

  const element =
    document.getElementById("fileName");

  if (!element) return;

  element.textContent =
    name || "";

}


/* =========================================================
   PROCESS BUTTON STATE
   ========================================================= */

function enableProcessButton() {

  const button =
    document.getElementById("processButton");

  if (!button) return;

  button.disabled = false;

  button.classList.add("active");

}


function disableProcessButton() {

  const button =
    document.getElementById("processButton");

  if (!button) return;

  button.disabled = true;

  button.classList.remove("active");

}


/* =========================================================
   SHOW / HIDE HELPERS
   ========================================================= */

function showElement(element) {

  if (typeof element === "string") {

    element =
      document.getElementById(element);

  }

  if (!element) return;

  element.classList.remove("hidden");

  element.style.display = "";

}


function hideElement(element) {

  if (typeof element === "string") {

    element =
      document.getElementById(element);

  }

  if (!element) return;

  element.classList.add("hidden");

  element.style.display = "none";

}


/* =========================================================
   TEXT HELPER
   ========================================================= */

function setText(id, value) {

  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent =
    value;

}
window.initVisualPdfEditor = async function(file){
  const canvas=document.getElementById('editorCanvas'); if(!canvas||!window.pdfjsLib||!file)return;
  const ctx=canvas.getContext('2d'); const state=window.PDF_EDITOR_STATE||(window.PDF_EDITOR_STATE={text:'',textX:50,textY:50,textSize:18,textPage:1,drawLines:[],highlights:[],replaceFind:'',replaceWith:'',replacePage:'all'});
  let pdf,pageNo=Math.max(1,Number(state.textPage)||1),mode='text',drag=null;
  try{pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise}catch(e){console.warn(e);return}
  const pageLabel=document.getElementById('editorCanvasPage'),modeLabel=document.getElementById('editorMode');
  async function render(){pageNo=Math.max(1,Math.min(pdf.numPages,pageNo));const page=await pdf.getPage(pageNo),vp=page.getViewport({scale:1.35});canvas.width=vp.width;canvas.height=vp.height;await page.render({canvasContext:ctx,viewport:vp}).promise;const scale=canvas.width/900;(state.highlights||[]).filter(h=>(h.pageIndex||0)===pageNo-1).forEach(h=>{ctx.fillStyle='rgba(255,225,0,.35)';ctx.fillRect(h.x*scale,h.y*scale,h.width*scale,h.height*scale)});(state.drawLines||[]).filter(l=>(l.pageIndex||0)===pageNo-1).forEach(l=>{ctx.strokeStyle='#111827';ctx.lineWidth=(l.thickness||2)*scale;ctx.beginPath();ctx.moveTo(l.x1*scale,l.y1*scale);ctx.lineTo(l.x2*scale,l.y2*scale);ctx.stroke()});if(state.text&&Number(state.textPage)===pageNo){ctx.fillStyle='#111827';ctx.font=`${Math.max(8,Number(state.textSize)||18)*scale}px Arial`;ctx.fillText(state.text,state.textX*scale,state.textY*scale)}pageLabel.textContent=pageNo;state.textPage=pageNo}
  const pt=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};
  document.getElementById('addTextBtn')?.addEventListener('click',()=>{mode='text';modeLabel.textContent='Text mode'});document.getElementById('drawBtn')?.addEventListener('click',()=>{mode='draw';modeLabel.textContent='Draw mode'});document.getElementById('highlightBtn')?.addEventListener('click',()=>{mode='highlight';modeLabel.textContent='Highlight mode'});document.getElementById('clearMarksBtn')?.addEventListener('click',()=>{state.drawLines=[];state.highlights=[];state.text='';render()});document.getElementById('editorPrev')?.addEventListener('click',()=>{pageNo--;render()});document.getElementById('editorNext')?.addEventListener('click',()=>{pageNo++;render()});
  canvas.onpointerdown=e=>{const p=pt(e);canvas.setPointerCapture?.(e.pointerId);if(mode==='text'){const t=prompt('Text to add:');if(t){state.text=t;state.textX=p.x;state.textY=p.y;state.textPage=pageNo;state.textSize=Number(document.getElementById('editorSize')?.value)||18;render()}}else drag=p};canvas.onpointerup=e=>{if(!drag)return;const p=pt(e);if(mode==='draw')state.drawLines.push({pageIndex:pageNo-1,x1:drag.x,y1:drag.y,x2:p.x,y2:p.y,thickness:2});if(mode==='highlight')state.highlights.push({pageIndex:pageNo-1,x:Math.min(drag.x,p.x),y:Math.min(drag.y,p.y),width:Math.abs(p.x-drag.x),height:Math.abs(p.y-drag.y)});drag=null;render()};
  await render();
};

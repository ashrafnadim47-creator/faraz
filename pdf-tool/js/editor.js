/* =========================================================
   PDF EDITOR
   Browser-side PDF editing.
   Note: Find & Replace visually redacts matched text by
   covering it and drawing the replacement. PDF-lib does not
   provide a full text-content editor.
   ========================================================= */

window.editorPDF = {

  async process(file, updateProgress) {

    if (!file) throw new Error("No PDF selected.");
    if (!window.PDFLib) throw new Error("PDF-lib library is not loaded.");

    updateProgress(10, "Opening PDF...");
    const bytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const pages = pdf.getPages();

    if (!pages.length) throw new Error("PDF contains no pages.");

    const state = window.PDF_EDITOR_STATE || {};
    const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);

    /* ADD TEXT */
    if (state.text && state.text.trim()) {
      const pageIndex = Math.max(0, Math.min(pages.length - 1, (Number(state.textPage) || 1) - 1));
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      page.drawText(state.text.trim(), {
        x: Math.max(0, Math.min(width - 10, Number(state.textX) || 50)),
        y: Math.max(0, Math.min(height - 10, height - (Number(state.textY) || 50))),
        size: Math.max(6, Number(state.textSize) || 18),
        font,
        color: PDFLib.rgb(0, 0, 0)
      });
    }

    updateProgress(35, "Searching PDF text...");

    /* FIND & REPLACE / VISUAL REDACTION */
    const find = String(state.replaceFind || "").trim();
    const replacement = String(state.replaceWith || "");
    if (find && window.pdfjsLib) {
      const pdfjs = await pdfjsLib.getDocument({data: bytes.slice(0)}).promise;
      const wantedPage = state.replacePage || "all";

      for (let i = 1; i <= pdfjs.numPages; i++) {
        if (wantedPage !== "all" && Number(wantedPage) !== i) continue;

        const p = await pdfjs.getPage(i);
        const content = await p.getTextContent();
        const targetPage = pages[i - 1];
        const { height } = targetPage.getSize();

        for (const item of content.items || []) {
          const value = String(item.str || "");
          if (!value || value.toLowerCase().indexOf(find.toLowerCase()) === -1) continue;

          const pos = item.transform || [1,0,0,1,0,0];
          const x = Number(pos[4]) || 0;
          const baseline = Number(pos[5]) || 0;
          const fontSize = Math.max(6, Math.abs(Number(pos[3]) || Number(pos[0]) || 12));
          const fullWidth = Math.max(10, Number(item.width) || find.length * fontSize * 0.5);
          const ratio = value.length ? Math.min(1, find.length / value.length) : 1;
          const boxWidth = Math.max(12, fullWidth * ratio);
          const boxHeight = Math.max(fontSize * 1.25, 12);
          const pdfY = Math.max(0, baseline - fontSize * 0.25);

          /* White rectangle hides the old visible text. */
          targetPage.drawRectangle({
            x,
            y: Math.max(0, pdfY - boxHeight * 0.8),
            width: boxWidth + 4,
            height: boxHeight,
            color: PDFLib.rgb(1,1,1),
            borderWidth: 0
          });

          if (replacement) {
            targetPage.drawText(replacement, {
              x,
              y: Math.max(0, pdfY),
              size: fontSize,
              font,
              color: PDFLib.rgb(0,0,0)
            });
          }
        }
      }
    }

    updateProgress(60, "Applying drawings and highlights...");

    for (const line of (Array.isArray(state.drawLines) ? state.drawLines : [])) {
      const pageIndex = Number(line.pageIndex) || 0;
      if (!pages[pageIndex]) continue;
      const page = pages[pageIndex];
      const {height} = page.getSize();
      page.drawLine({
        start: {x:Number(line.x1)||0, y:height-(Number(line.y1)||0)},
        end: {x:Number(line.x2)||0, y:height-(Number(line.y2)||0)},
        thickness:Number(line.thickness)||2,
        color:PDFLib.rgb(0,0,0)
      });
    }

    for (const h of (Array.isArray(state.highlights) ? state.highlights : [])) {
      const pageIndex = Number(h.pageIndex)||0;
      if (!pages[pageIndex]) continue;
      const page=pages[pageIndex], {height}=page.getSize();
      const x=Number(h.x)||0, y=height-(Number(h.y)||0);
      const w=Number(h.width)||100, hh=Number(h.height)||15;
      page.drawRectangle({
        x, y:y-hh, width:w, height:hh,
        color:PDFLib.rgb(1,0.9,0), opacity:0.35, borderWidth:0
      });
    }

    updateProgress(90, "Saving edited PDF...");
    const outputBytes = await pdf.save({useObjectStreams:true});

    return {
      blob: new Blob([outputBytes], {type:"application/pdf"}),
      name: createEditedFileName(file.name)
    };
  }
};

function createEditedFileName(originalName) {
  return originalName.replace(/\.pdf$/i, "") + "_edited.pdf";
}

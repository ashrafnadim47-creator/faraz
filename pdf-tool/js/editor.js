 /* =========================================
    PDF EDITOR
    Browser-side PDF editing
 ========================================= */

window.editorPDF = {

  async process(file, updateProgress) {

    if (!file) {
      throw new Error("No PDF selected.");
    }

    if (!window.PDFLib) {
      throw new Error(
        "PDF-lib library is not loaded."
      );
    }

    updateProgress(
      10,
      "Opening PDF..."
    );

    const bytes =
      await file.arrayBuffer();

    const pdf =
      await PDFLib.PDFDocument.load(
        bytes
      );

    const pages =
      pdf.getPages();

    if (!pages.length) {
      throw new Error(
        "PDF contains no pages."
      );
    }

    updateProgress(
      25,
      "Reading editor settings..."
    );

    /*
      Current editor UI supports:
      - Add Text
      - Draw
      - Highlight

      The actual values are read from
      the editor state created by app.js.
    */

    const editorState =
      window.PDF_EDITOR_STATE || {
        text: "",
        textX: 50,
        textY: 50,
        textSize: 18,
        drawLines: [],
        highlights: []
      };

    /*
      ADD TEXT
    */

    if (
      editorState.text &&
      editorState.text.trim()
    ) {

      const page =
        pages[0];

      const {
        width,
        height
      } =
        page.getSize();

      page.drawText(
        editorState.text.trim(),
        {
          x:
            Number(
              editorState.textX
            ) || 50,

          y:
            height -
            (
              Number(
                editorState.textY
              ) || 50
            ),

          size:
            Number(
              editorState.textSize
            ) || 18,

          color:
            PDFLib.rgb(
              0,
              0,
              0
            )
        }
      );
    }

    updateProgress(
      50,
      "Applying drawings..."
    );

    /*
      DRAW
    */

    if (
      Array.isArray(
        editorState.drawLines
      )
    ) {

      for (
        const line
        of editorState.drawLines
      ) {

        const pageIndex =
          Number(
            line.pageIndex
          ) || 0;

        if (
          !pages[pageIndex]
        ) {
          continue;
        }

        const page =
          pages[pageIndex];

        const {
          height
        } =
          page.getSize();

        const x1 =
          Number(line.x1) || 0;

        const y1 =
          height -
          (
            Number(line.y1) || 0
          );

        const x2 =
          Number(line.x2) || 0;

        const y2 =
          height -
          (
            Number(line.y2) || 0
          );

        page.drawLine({
          start: {
            x: x1,
            y: y1
          },

          end: {
            x: x2,
            y: y2
          },

          thickness:
            Number(
              line.thickness
            ) || 2,

          color:
            PDFLib.rgb(
              0,
              0,
              0
            )
        });
      }
    }

    updateProgress(
      70,
      "Applying highlights..."
    );

    /*
      HIGHLIGHTS
    */

    if (
      Array.isArray(
        editorState.highlights
      )
    ) {

      for (
        const highlight
        of editorState.highlights
      ) {

        const pageIndex =
          Number(
            highlight.pageIndex
          ) || 0;

        if (
          !pages[pageIndex]
        ) {
          continue;
        }

        const page =
          pages[pageIndex];

        const {
          height
        } =
          page.getSize();

        const x =
          Number(
            highlight.x
          ) || 0;

        const y =
          height -
          (
            Number(
              highlight.y
            ) || 0
          );

        const width =
          Number(
            highlight.width
          ) || 100;

        const highlightHeight =
          Number(
            highlight.height
          ) || 15;

        page.drawRectangle({
          x,
          y:
            y -
            highlightHeight,

          width,

          height:
            highlightHeight,

          color:
            PDFLib.rgb(
              1,
              0.9,
              0
            ),

          opacity:
            0.35,

          borderWidth:
            0
        });
      }
    }

    updateProgress(
      90,
      "Saving edited PDF..."
    );

    const outputBytes =
      await pdf.save({
        useObjectStreams: true
      });

    updateProgress(
      100,
      "PDF editing complete!"
    );

    return {
      blob:
        new Blob(
          [outputBytes],
          {
            type:
              "application/pdf"
          }
        ),

      name:
        createEditedFileName(
          file.name
        )
    };
  }
};


/* =========================================
   FILE NAME
 ========================================= */

function createEditedFileName(
  originalName
) {

  const clean =
    originalName.replace(
      /\.pdf$/i,
      ""
    );

  return (
    clean +
    "_edited.pdf"
  );
}
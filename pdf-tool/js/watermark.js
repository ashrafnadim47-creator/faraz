/* =========================================
   WATERMARK PDF
   Browser-side PDF watermarking
========================================= */

window.watermarkPDF = {

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
      "Reading PDF..."
    );

    const bytes =
      await file.arrayBuffer();

    updateProgress(
      25,
      "Loading PDF..."
    );

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

    const textElement =
      document.getElementById(
        "watermarkText"
      );

    const watermarkText =
      textElement
        ? textElement.value.trim()
        : "";

    if (!watermarkText) {
      throw new Error(
        "Enter watermark text."
      );
    }

    /*
      Optional settings
      If these controls don't exist,
      default values are used.
    */

    const opacityElement =
      document.getElementById(
        "watermarkOpacity"
      );

    const sizeElement =
      document.getElementById(
        "watermarkSize"
      );

    const opacity =
      opacityElement
        ? Number(
            opacityElement.value
          )
        : 0.25;

    const fontSize =
      sizeElement
        ? Number(
            sizeElement.value
          )
        : 36;

    updateProgress(
      35,
      "Applying watermark..."
    );

    for (
      let i = 0;
      i < pages.length;
      i++
    ) {

      const page =
        pages[i];

      const {
        width,
        height
      } =
        page.getSize();

      /*
        Center the watermark
      */

      const font =
        await pdf.embedFont(
          PDFLib.StandardFonts.HelveticaBold
        );

      const textWidth =
        font.widthOfTextAtSize(
          watermarkText,
          fontSize
        );

      const x =
        (
          width -
          textWidth
        ) / 2;

      const y =
        height / 2;

      page.drawText(
        watermarkText,
        {
          x,
          y,

          size:
            fontSize,

          font,

          color:
            PDFLib.rgb(
              0.45,
              0.45,
              0.45
            ),

          opacity:
            Math.max(
              0,
              Math.min(
                1,
                opacity
              )
            ),

          rotate:
            PDFLib.degrees(
              -30
            )
        }
      );

      const progress =
        35 +
        (
          (i + 1) /
          pages.length
        ) * 50;

      updateProgress(
        progress,
        "Watermarking page " +
        (i + 1) +
        " of " +
        pages.length +
        "..."
      );

      await wait(10);
    }

    updateProgress(
      90,
      "Saving watermarked PDF..."
    );

    const outputBytes =
      await pdf.save({
        useObjectStreams: true
      });

    updateProgress(
      100,
      "Watermark added successfully!"
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
        createWatermarkedFileName(
          file.name
        )
    };
  }
};


/* =========================================
   FILE NAME
========================================= */

function createWatermarkedFileName(
  originalName
) {

  const clean =
    originalName.replace(
      /\.pdf$/i,
      ""
    );

  return (
    clean +
    "_watermarked.pdf"
  );
}


/* =========================================
   SMALL DELAY
========================================= */

function wait(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
    );
}
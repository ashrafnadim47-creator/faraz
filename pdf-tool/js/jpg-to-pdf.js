/* =========================================
   JPG TO PDF
   Browser-side image → PDF conversion
========================================= */

window.jpgpdfPDF = {

  async process(file, updateProgress) {

    /*
      JPG to PDF uses the imageInput
      because the main upload is designed
      for PDF files.
    */

    const input =
      document.getElementById(
        "imageInput"
      );

    if (!input || !input.files.length) {
      throw new Error(
        "Please select JPG or JPEG images."
      );
    }

    if (!window.PDFLib) {
      throw new Error(
        "PDF-lib library is not loaded."
      );
    }

    const files =
      Array.from(
        input.files
      );

    updateProgress(
      5,
      "Preparing images..."
    );

    const output =
      await PDFLib.PDFDocument.create();

    for (
      let i = 0;
      i < files.length;
      i++
    ) {

      const imageFile =
        files[i];

      if (
        !imageFile.type.match(
          /^image\/jpeg$/
        )
      ) {
        throw new Error(
          "Only JPG/JPEG images are supported."
        );
      }

      updateProgress(
        10 +
        (
          i /
          files.length
        ) * 70,

        "Reading image " +
        (i + 1) +
        " of " +
        files.length +
        "..."
      );

      const imageBytes =
        new Uint8Array(
          await imageFile.arrayBuffer()
        );

      const image =
        await output.embedJpg(
          imageBytes
        );

      const imageWidth =
        image.width;

      const imageHeight =
        image.height;

      /*
        A4 page size
        595 × 842 points
      */

      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;

      /*
        Fit image inside A4
        while keeping aspect ratio.
      */

      const scale =
        Math.min(
          A4_WIDTH /
            imageWidth,

          A4_HEIGHT /
            imageHeight
        );

      const drawWidth =
        imageWidth *
        scale;

      const drawHeight =
        imageHeight *
        scale;

      const page =
        output.addPage([
          A4_WIDTH,
          A4_HEIGHT
        ]);

      const x =
        (
          A4_WIDTH -
          drawWidth
        ) / 2;

      const y =
        (
          A4_HEIGHT -
          drawHeight
        ) / 2;

      page.drawImage(
        image,
        {
          x,
          y,
          width:
            drawWidth,
          height:
            drawHeight
        }
      );

      updateProgress(
        10 +
        (
          (i + 1) /
          files.length
        ) * 70,

        "Adding image " +
        (i + 1) +
        "..."
      );

      await wait(10);
    }

    updateProgress(
      90,
      "Creating PDF..."
    );

    const outputBytes =
      await output.save({
        useObjectStreams: true
      });

    updateProgress(
      100,
      "JPG to PDF conversion complete!"
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
        createJpgPdfFileName()
    };
  }
};


/* =========================================
   FILE NAME
========================================= */

function createJpgPdfFileName() {

  return "images_to_pdf.pdf";
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
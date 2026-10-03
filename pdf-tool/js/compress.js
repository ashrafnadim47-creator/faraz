/* =========================================
   COMPRESS PDF
   Browser-side PDF compression
   ========================================= */

window.compressPDF = {

  async process(file, updateProgress) {

    if (!file) {
      throw new Error("No PDF selected.");
    }

    if (!window.pdfjsLib) {
      throw new Error(
        "PDF.js library is not loaded."
      );
    }

    if (!window.PDFLib) {
      throw new Error(
        "PDF-lib library is not loaded."
      );
    }

    updateProgress(
      5,
      "Reading PDF..."
    );

    const bytes =
      await file.arrayBuffer();

    const loadingTask =
      pdfjsLib.getDocument({
        data: bytes
      });

    const pdf =
      await loadingTask.promise;

    const totalPages =
      pdf.numPages;

    if (!totalPages) {
      throw new Error(
        "PDF contains no pages."
      );
    }

    /*
      Compression settings
      Higher compression = smaller file
      but lower image quality.
    */

    const levelElement =
      document.getElementById(
        "compressionLevel"
      );

    const level =
      levelElement
        ? levelElement.value
        : "medium";

    const settings =
      getCompressionSettings(level);

    updateProgress(
      10,
      "Preparing compression..."
    );

    const output =
      await PDFLib.PDFDocument.create();

    for (
      let pageNumber = 1;
      pageNumber <= totalPages;
      pageNumber++
    ) {

      updateProgress(
        10 +
        (
          (pageNumber - 1) /
          totalPages
        ) * 75,
        "Compressing page " +
        pageNumber +
        " of " +
        totalPages +
        "..."
      );

      const page =
        await pdf.getPage(
          pageNumber
        );

      const viewport =
        page.getViewport({
          scale: settings.scale
        });

      const canvas =
        document.createElement(
          "canvas"
        );

      const context =
        canvas.getContext(
          "2d",
          {
            alpha: false
          }
        );

      canvas.width =
        Math.floor(
          viewport.width
        );

      canvas.height =
        Math.floor(
          viewport.height
        );

      context.fillStyle =
        "#ffffff";

      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      await page.render({
        canvasContext:
          context,
        viewport:
          viewport
      }).promise;

      /*
        Convert rendered page
        to compressed JPEG.
      */

      const imageData =
        canvas.toDataURL(
          "image/jpeg",
          settings.quality
        );

      const imageBytes =
        dataURLToUint8Array(
          imageData
        );

      const image =
        await output.embedJpg(
          imageBytes
        );

      const outputPage =
        output.addPage([
          viewport.width,
          viewport.height
        ]);

      outputPage.drawImage(
        image,
        {
          x: 0,
          y: 0,
          width:
            viewport.width,
          height:
            viewport.height
        }
      );

      canvas.width = 1;
      canvas.height = 1;

      await wait(5);
    }

    updateProgress(
      90,
      "Creating compressed PDF..."
    );

    const outputBytes =
      await output.save({
        useObjectStreams: true,
        addDefaultPage: false
      });

    updateProgress(
      100,
      "Compression complete!"
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
        createCompressedFileName(
          file.name
        )
    };
  }
};


/* =========================================
   COMPRESSION SETTINGS
   ========================================= */

function getCompressionSettings(
  level
) {

  switch (level) {

    case "low":
      return {
        scale: 1.5,
        quality: 0.82
      };

    case "high":
      return {
        scale: 0.9,
        quality: 0.48
      };

    case "medium":
    default:
      return {
        scale: 1.15,
        quality: 0.65
      };
  }
}


/* =========================================
   DATA URL → UINT8ARRAY
   ========================================= */

function dataURLToUint8Array(
  dataURL
) {

  const base64 =
    dataURL.split(",")[1];

  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes;
}


/* =========================================
   FILE NAME
   ========================================= */

function createCompressedFileName(
  originalName
) {

  const clean =
    originalName.replace(
      /\.pdf$/i,
      ""
    );

  return (
    clean +
    "_compressed.pdf"
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
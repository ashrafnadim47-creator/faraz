/* =========================================
   PDF TO JPG
   Browser-side PDF → JPG conversion
========================================= */

window.pdfjpgPDF = {

  async process(
    file,
    updateProgress
  ) {

    if (!file) {
      throw new Error(
        "No PDF selected."
      );
    }

    if (!window.pdfjsLib) {
      throw new Error(
        "PDF.js library is not loaded."
      );
    }

    updateProgress(
      5,
      "Reading PDF..."
    );

    const bytes =
      await file.arrayBuffer();

    updateProgress(
      15,
      "Opening PDF..."
    );

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
      PDF → JPG creates one JPG
      per PDF page.

      Since the normal app result
      expects one downloadable Blob,
      we create a ZIP containing
      all JPG files.
    */

    if (
      typeof JSZip ===
        "undefined"
    ) {

      throw new Error(
        "JSZip library is required for PDF to JPG."
      );

    }

    const zip =
      new JSZip();

    for (
      let pageNumber = 1;
      pageNumber <= totalPages;
      pageNumber++
    ) {

      updateProgress(
        15 +
        (
          (pageNumber - 1) /
          totalPages
        ) * 75,

        "Converting page " +
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
          scale: 1.5
        });

      const canvas =
        document.createElement(
          "canvas"
        );

      const context =
        canvas.getContext(
          "2d"
        );

      canvas.width =
        Math.floor(
          viewport.width
        );

      canvas.height =
        Math.floor(
          viewport.height
        );

      await page.render({
        canvasContext:
          context,

        viewport:
          viewport
      }).promise;

      const jpgBlob =
        await canvasToJpegBlob(
          canvas,
          0.88
        );

      zip.file(
        "page-" +
        pageNumber +
        ".jpg",
        jpgBlob
      );

      canvas.width = 1;
      canvas.height = 1;

      await wait(10);
    }

    updateProgress(
      92,
      "Creating JPG package..."
    );

    const zipBlob =
      await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });

    updateProgress(
      100,
      "PDF to JPG conversion complete!"
    );

    return {

      blob:
        zipBlob,

      name:
        createPdfJpgFileName(
          file.name
        )

    };
  }
};


/* =========================================
   CANVAS → JPEG BLOB
========================================= */

function canvasToJpegBlob(
  canvas,
  quality
) {

  return new Promise(
    (resolve, reject) => {

      canvas.toBlob(
        blob => {

          if (!blob) {

            reject(
              new Error(
                "Could not create JPG image."
              )
            );

            return;
          }

          resolve(
            blob
          );

        },

        "image/jpeg",

        quality
      );

    }
  );
}


/* =========================================
   FILE NAME
========================================= */

function createPdfJpgFileName(
  originalName
) {

  const clean =
    originalName.replace(
      /\.pdf$/i,
      ""
    );

  return (
    clean +
    "_jpg.zip"
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
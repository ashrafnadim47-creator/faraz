/* =========================================
   ROTATE PDF
   Browser-side PDF rotation
========================================= */

window.rotatePDF = {

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

    /*
      Get rotation from UI
      Expected values:
      90
      180
      270
    */

    const rotationElement =
      document.getElementById(
        "rotation"
      );

    let rotation =
      rotationElement
        ? Number(
            rotationElement.value
          )
        : 90;

    if (
      ![90, 180, 270].includes(
        rotation
      )
    ) {
      rotation = 90;
    }

    updateProgress(
      35,
      "Rotating pages..."
    );

    for (
      let i = 0;
      i < pages.length;
      i++
    ) {

      const page =
        pages[i];

      const currentRotation =
        page
          .getRotation()
          .angle || 0;

      const newRotation =
        (
          currentRotation +
          rotation
        ) % 360;

      page.setRotation(
        PDFLib.degrees(
          newRotation
        )
      );

      const progress =
        35 +
        (
          (i + 1) /
          pages.length
        ) * 50;

      updateProgress(
        progress,
        "Rotating page " +
        (i + 1) +
        " of " +
        pages.length +
        "..."
      );

      await wait(5);
    }

    updateProgress(
      90,
      "Saving rotated PDF..."
    );

    const outputBytes =
      await pdf.save({
        useObjectStreams: true
      });

    updateProgress(
      100,
      "Rotation complete!"
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
        createRotatedFileName(
          file.name
        )
    };
  }
};


/* =========================================
   FILE NAME
========================================= */

function createRotatedFileName(
  originalName
) {

  const clean =
    originalName.replace(
      /\.pdf$/i,
      ""
    );

  return (
    clean +
    "_rotated.pdf"
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
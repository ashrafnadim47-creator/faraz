/* =========================================
   MERGE PDF
   Browser-side PDF merging
========================================= */

window.mergePDF = {

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

    /*
      Merge tool needs multiple files.
      app.js can provide them through
      window.PDF_MERGE_FILES.
    */

    let files =
      window.PDF_MERGE_FILES;

    /*
      If no separate files were provided,
      use the currently selected file.
    */

    if (
      !Array.isArray(files) ||
      !files.length
    ) {
      files = [file];
    }

    updateProgress(
      20,
      "Preparing PDF files..."
    );

    const output =
      await PDFLib.PDFDocument.create();

    let totalPages = 0;

    /*
      Find total pages first
    */

    for (
      const currentFile
      of files
    ) {

      const bytes =
        await currentFile.arrayBuffer();

      const source =
        await PDFLib.PDFDocument.load(
          bytes
        );

      totalPages +=
        source.getPageCount();
    }

    if (!totalPages) {
      throw new Error(
        "No pages found in PDF files."
      );
    }

    let processedPages = 0;

    /*
      Merge every PDF
    */

    for (
      let fileIndex = 0;
      fileIndex < files.length;
      fileIndex++
    ) {

      const currentFile =
        files[fileIndex];

      updateProgress(
        25 +
        (
          fileIndex /
          files.length
        ) * 10,

        "Opening PDF " +
        (fileIndex + 1) +
        " of " +
        files.length +
        "..."
      );

      const bytes =
        await currentFile.arrayBuffer();

      const source =
        await PDFLib.PDFDocument.load(
          bytes
        );

      const pageIndexes =
        source
          .getPages()
          .map(
            (_, index) =>
              index
          );

      const pages =
        await output.copyPages(
          source,
          pageIndexes
        );

      for (
        const page
        of pages
      ) {

        output.addPage(
          page
        );

        processedPages++;

        const progress =
          35 +
          (
            processedPages /
            totalPages
          ) * 55;

        updateProgress(
          progress,

          "Merging page " +
          processedPages +
          " of " +
          totalPages +
          "..."
        );

        await wait(5);
      }
    }

    updateProgress(
      92,
      "Creating merged PDF..."
    );

    const outputBytes =
      await output.save({
        useObjectStreams: true
      });

    updateProgress(
      100,
      "PDFs merged successfully!"
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
        createMergedFileName(
          file.name
        )
    };
  }
};


/* =========================================
   FILE NAME
========================================= */

function createMergedFileName(
  originalName
) {

  const clean =
    originalName.replace(
      /\.pdf$/i,
      ""
    );

  return (
    clean +
    "_merged.pdf"
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
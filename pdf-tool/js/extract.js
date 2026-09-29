/* =========================================
   EXTRACT PAGES
   Browser-side PDF page extraction
========================================= */

window.extractPDF = {

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

    const source =
      await PDFLib.PDFDocument.load(
        bytes
      );

    const totalPages =
      source.getPageCount();

    if (!totalPages) {
      throw new Error(
        "PDF contains no pages."
      );
    }

    /*
      Read page range from UI.
      Example:
      1,3,5-8
    */

    const rangeElement =
      document.getElementById(
        "extractRange"
      );

    const range =
      rangeElement
        ? rangeElement.value.trim()
        : "";

    let pageIndexes;

    if (!range) {

      throw new Error(
        "Enter the pages you want to extract."
      );

    } else {

      pageIndexes =
        parseExtractRange(
          range,
          totalPages
        );
    }

    if (!pageIndexes.length) {
      throw new Error(
        "No valid pages selected."
      );
    }

    updateProgress(
      40,
      "Preparing selected pages..."
    );

    const output =
      await PDFLib.PDFDocument.create();

    const copiedPages =
      await output.copyPages(
        source,
        pageIndexes
      );

    for (
      let i = 0;
      i < copiedPages.length;
      i++
    ) {

      output.addPage(
        copiedPages[i]
      );

      const progress =
        40 +
        (
          (i + 1) /
          copiedPages.length
        ) * 45;

      updateProgress(
        progress,
        "Extracting page " +
        (i + 1) +
        " of " +
        copiedPages.length +
        "..."
      );

      await wait(10);
    }

    updateProgress(
      90,
      "Creating extracted PDF..."
    );

    const outputBytes =
      await output.save({
        useObjectStreams: true
      });

    updateProgress(
      100,
      "Pages extracted successfully!"
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
        createExtractedFileName(
          file.name
        )
    };
  }
};


/* =========================================
   PARSE PAGE RANGE
========================================= */

function parseExtractRange(
  input,
  totalPages
) {

  const pages =
    new Set();

  const parts =
    input
      .split(",")
      .map(
        item => item.trim()
      )
      .filter(Boolean);

  for (
    const part of parts
  ) {

    /*
      Range:
      2-6
    */

    if (
      part.includes("-")
    ) {

      const values =
        part
          .split("-")
          .map(
            value =>
              Number(
                value.trim()
              )
          );

      if (
        values.length !== 2 ||
        values.some(
          Number.isNaN
        )
      ) {
        continue;
      }

      let start =
        values[0];

      let end =
        values[1];

      if (start > end) {
        [
          start,
          end
        ] =
        [
          end,
          start
        ];
      }

      for (
        let page = start;
        page <= end;
        page++
      ) {

        if (
          page >= 1 &&
          page <= totalPages
        ) {
          pages.add(
            page - 1
          );
        }
      }

    } else {

      /*
        Single page:
        4
      */

      const page =
        Number(part);

      if (
        !Number.isNaN(page) &&
        page >= 1 &&
        page <= totalPages
      ) {
        pages.add(
          page - 1
        );
      }
    }
  }

  return [
    ...pages
  ].sort(
    (a, b) => a - b
  );
}


/* =========================================
   FILE NAME
========================================= */

function createExtractedFileName(
  originalName
) {

  const clean =
    originalName.replace(
      /\.pdf$/i,
      ""
    );

  return (
    clean +
    "_extracted.pdf"
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
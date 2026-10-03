/* =========================================
   REORDER PDF
   Browser-side PDF page reordering
========================================= */

window.reorderPDF = {

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
      "Loading PDF pages..."
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
      Expected input:
      3,1,4,2,5

      Each number represents
      the original page number.
    */

    const inputElement =
      document.getElementById(
        "reorderRange"
      );

    const input =
      inputElement
        ? inputElement.value.trim()
        : "";

    if (!input) {
      throw new Error(
        "Enter the new page order."
      );
    }

    updateProgress(
      35,
      "Checking page order..."
    );

    const pageOrder =
      parseReorderRange(
        input,
        totalPages
      );

    if (!pageOrder.length) {
      throw new Error(
        "No valid page order found."
      );
    }

    /*
      Require every page exactly once.
    */

    if (
      pageOrder.length !==
      totalPages
    ) {
      throw new Error(
        "Please include every page exactly once."
      );
    }

    const uniquePages =
      new Set(pageOrder);

    if (
      uniquePages.size !==
      totalPages
    ) {
      throw new Error(
        "Each page must appear only once."
      );
    }

    updateProgress(
      45,
      "Creating new page order..."
    );

    const output =
      await PDFLib.PDFDocument.create();

    const copiedPages =
      await output.copyPages(
        source,
        pageOrder.map(
          pageNumber =>
            pageNumber - 1
        )
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
        45 +
        (
          (i + 1) /
          copiedPages.length
        ) * 40;

      updateProgress(
        progress,
        "Reordering page " +
        (i + 1) +
        " of " +
        copiedPages.length +
        "..."
      );

      await wait(10);
    }

    updateProgress(
      90,
      "Saving reordered PDF..."
    );

    const outputBytes =
      await output.save({
        useObjectStreams: true
      });

    updateProgress(
      100,
      "Pages reordered successfully!"
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
        createReorderedFileName(
          file.name
        )
    };
  }
};


/* =========================================
   PARSE PAGE ORDER
========================================= */

function parseReorderRange(
  input,
  totalPages
) {

  const pages = [];

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
      Support ranges too.

      Example:
      3,1,5-7,2,4
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
          pages.push(
            page
          );
        }
      }

    } else {

      const page =
        Number(part);

      if (
        !Number.isNaN(page) &&
        page >= 1 &&
        page <= totalPages
      ) {
        pages.push(
          page
        );
      }
    }
  }

  return pages;
}


/* =========================================
   FILE NAME
========================================= */

function createReorderedFileName(
  originalName
) {

  const clean =
    originalName.replace(
      /\.pdf$/i,
      ""
    );

  return (
    clean +
    "_reordered.pdf"
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
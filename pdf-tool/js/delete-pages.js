/* =========================================
   DELETE PAGES
   Browser-side PDF page deletion
========================================= */

window.deletePDF = {

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
      Read page numbers from UI.
      Example:
      1,3,5-7
    */

    const inputElement =
      document.getElementById(
        "deleteRange"
      );

    const input =
      inputElement
        ? inputElement.value.trim()
        : "";

    if (!input) {
      throw new Error(
        "Enter the page numbers to delete."
      );
    }

    updateProgress(
      35,
      "Checking selected pages..."
    );

    const pagesToDelete =
      parseDeleteRange(
        input,
        totalPages
      );

    if (!pagesToDelete.length) {
      throw new Error(
        "No valid pages selected."
      );
    }

    if (
      pagesToDelete.length >=
      totalPages
    ) {
      throw new Error(
        "You cannot delete every page."
      );
    }

    updateProgress(
      45,
      "Removing selected pages..."
    );

    /*
      Delete from highest page number
      to lowest so indexes don't shift.
    */

    const sortedPages =
      [...pagesToDelete]
        .sort(
          (a, b) => b - a
        );

    for (
      let i = 0;
      i < sortedPages.length;
      i++
    ) {

      const pageIndex =
        sortedPages[i];

      source.removePage(
        pageIndex
      );

      const progress =
        45 +
        (
          (i + 1) /
          sortedPages.length
        ) * 35;

      updateProgress(
        progress,
        "Deleting page " +
        (pageIndex + 1) +
        "..."
      );

      await wait(10);
    }

    updateProgress(
      85,
      "Creating new PDF..."
    );

    const outputBytes =
      await source.save({
        useObjectStreams: true
      });

    updateProgress(
      100,
      "Pages deleted successfully!"
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
        createDeletedFileName(
          file.name
        )
    };
  }
};


/* =========================================
   PARSE PAGE RANGE
========================================= */

function parseDeleteRange(
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
      2-5
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

function createDeletedFileName(
  originalName
) {

  const clean =
    originalName.replace(
      /\.pdf$/i,
      ""
    );

  return (
    clean +
    "_pages_deleted.pdf"
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
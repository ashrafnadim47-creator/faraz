window.splitPDF = {

  async process(file, updateProgress) {

    if (!file) {
      throw new Error("No PDF selected.");
    }

    if (!window.PDFLib) {
      throw new Error("PDF library is not loaded.");
    }

    if (!window.JSZip) {
      throw new Error("JSZip library is not loaded.");
    }


    updateProgress(
      5,
      "Reading PDF..."
    );


    const bytes =
      await file.arrayBuffer();


    updateProgress(
      15,
      "Loading PDF pages..."
    );


    const source =
      await PDFLib.PDFDocument.load(bytes);


    const totalPages =
      source.getPageCount();


    if (totalPages === 0) {
      throw new Error("PDF has no pages.");
    }


    const rangeInput =
      document.getElementById("splitRange");


    const range =
      rangeInput
        ? rangeInput.value.trim()
        : "";


    let pageIndexes;


    /*
      Blank range = split every page
    */

    if (!range) {

      pageIndexes =
        Array.from(
          { length: totalPages },
          (_, index) => index
        );

    } else {

      pageIndexes =
        parseSplitRange(
          range,
          totalPages
        );

    }


    if (!pageIndexes.length) {

      throw new Error(
        "Invalid page range."
      );

    }


    updateProgress(
      25,
      "Preparing pages..."
    );


    const zip =
      new JSZip();


    for (
      let i = 0;
      i < pageIndexes.length;
      i++
    ) {

      const pageIndex =
        pageIndexes[i];


      updateProgress(
        25 +
          ((i) / pageIndexes.length) * 65,

        "Creating page " +
          (pageIndex + 1) +
          " of " +
          pageIndexes.length +
          "..."
      );


      /*
        Create a new PDF
        for this single page
      */

      const output =
        await PDFLib.PDFDocument.create();


      const copiedPages =
        await output.copyPages(
          source,
          [pageIndex]
        );


      output.addPage(
        copiedPages[0]
      );


      const outputBytes =
        await output.save();


      /*
        Add individual PDF
        into ZIP
      */

      zip.file(
        "page_" +
          (pageIndex + 1) +
          ".pdf",

        outputBytes
      );


      /*
        Small delay so progress
        animation remains visible
      */

      await wait(20);

    }


    updateProgress(
      92,
      "Creating ZIP file..."
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
      "Split complete!"
    );


    const originalName =
      file.name
        .replace(/\.pdf$/i, "");


    return {

      blob: zipBlob,

      name:
        originalName +
        "_split_pages.zip"

    };

  }

};


/* =========================================================
   PAGE RANGE PARSER
   ========================================================= */

function parseSplitRange(
  input,
  totalPages
) {

  const result = new Set();


  const parts =
    input
      .split(",")
      .map(function (part) {

        return part.trim();

      })
      .filter(Boolean);


  for (const part of parts) {

    /*
      Single page
      Example: 5
    */

    if (/^\d+$/.test(part)) {

      const page =
        Number(part);


      if (
        page < 1 ||
        page > totalPages
      ) {

        throw new Error(
          "Page " +
            page +
            " does not exist."
        );

      }


      result.add(
        page - 1
      );


      continue;

    }


    /*
      Page range
      Example: 2-5
    */

    const match =
      part.match(
        /^(\d+)\s*-\s*(\d+)$/
      );


    if (!match) {

      throw new Error(
        "Invalid page range: " +
          part
      );

    }


    let start =
      Number(match[1]);


    let end =
      Number(match[2]);


    if (
      start < 1 ||
      end < 1 ||
      start > totalPages ||
      end > totalPages
    ) {

      throw new Error(
        "Page range is outside the PDF."
      );

    }


    if (start > end) {

      const temp =
        start;

      start =
        end;

      end =
        temp;

    }


    for (
      let page = start;
      page <= end;
      page++
    ) {

      result.add(
        page - 1
      );

    }

  }


  /*
    Keep pages in the order
    entered by the user.
  */

  return Array.from(result);

}


/* =========================================================
   SMALL DELAY
   ========================================================= */

function wait(ms) {

  return new Promise(
    function (resolve) {

      setTimeout(
        resolve,
        ms
      );

    }
  );

}
window.pdfText = {
  async process(file, updateProgress) {
    if (!window.pdfjsLib) throw new Error("PDF.js library is not loaded.");
    const bytes = await file.arrayBuffer();
    updateProgress(20, "Reading PDF pages...");
    const doc = await pdfjsLib.getDocument({data: bytes}).promise;
    let out = "";
    for (let i=1;i<=doc.numPages;i++) {
      const page=await doc.getPage(i);
      const content=await page.getTextContent();
      out += `--- Page ${i} ---\n`;
      out += (content.items||[]).map(x=>x.str||"").join(" ") + "\n\n";
      updateProgress(20 + (i/doc.numPages)*70, `Extracting page ${i}...`);
    }
    return {blob:new Blob([out],{type:"text/plain;charset=utf-8"}),name:file.name.replace(/\.pdf$/i,"")+"_text.txt"};
  }
};
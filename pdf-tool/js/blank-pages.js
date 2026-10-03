window.blankPagesPDF = {
  async process(file, updateProgress) {
    if (!window.PDFLib) throw new Error("PDF-lib library is not loaded.");
    const pdf=await PDFLib.PDFDocument.load(await file.arrayBuffer());
    const pages=pdf.getPages();
    const count=Math.max(1,Math.min(20,Number(document.getElementById("blankCount")?.value)||1));
    const after=Math.max(0,Math.min(pages.length,Number(document.getElementById("blankAfter")?.value)||0));
    const ref=pages[Math.max(0,Math.min(pages.length-1,after-1))];
    const {width,height}=ref.getSize();
    for(let i=0;i<count;i++) {
      pdf.insertPage(after+i,[width,height]);
      updateProgress(15+((i+1)/count)*70,`Adding blank page ${i+1}...`);
    }
    const bytes=await pdf.save();
    return {blob:new Blob([bytes],{type:"application/pdf"}),name:file.name.replace(/\.pdf$/i,"")+"_blank-pages.pdf"};
  }
};
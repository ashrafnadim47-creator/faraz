window.metadataPDF = {
  async process(file, updateProgress) {
    if (!window.PDFLib) throw new Error("PDF-lib library is not loaded.");
    const pdf=await PDFLib.PDFDocument.load(await file.arrayBuffer());
    const v=id=>document.getElementById(id)?.value||"";
    if(v("metaTitle")) pdf.setTitle(v("metaTitle"));
    if(v("metaAuthor")) pdf.setAuthor(v("metaAuthor"));
    if(v("metaSubject")) pdf.setSubject(v("metaSubject"));
    if(v("metaKeywords")) pdf.setKeywords(v("metaKeywords").split(",").map(s=>s.trim()).filter(Boolean));
    pdf.setProducer("FreePDF Tools");
    updateProgress(70,"Updating PDF metadata...");
    const bytes=await pdf.save();
    return {blob:new Blob([bytes],{type:"application/pdf"}),name:file.name.replace(/\.pdf$/i,"")+"_metadata.pdf"};
  }
};
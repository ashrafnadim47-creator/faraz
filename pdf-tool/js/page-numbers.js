window.pageNumbersPDF = {
  async process(file, updateProgress) {
    if (!window.PDFLib) throw new Error("PDF-lib library is not loaded.");
    const pdf=await PDFLib.PDFDocument.load(await file.arrayBuffer());
    const pages=pdf.getPages();
    const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const position=document.getElementById("numberPosition")?.value||"bottom-center";
    const size=Number(document.getElementById("numberSize")?.value)||10;
    const start=Number(document.getElementById("numberStart")?.value)||1;
    pages.forEach((page,i)=>{
      const {width}=page.getSize(), text=String(start+i);
      const tw=font.widthOfTextAtSize(text,size);
      let x=20;
      if(position.includes("center")) x=(width-tw)/2;
      if(position.includes("right")) x=width-tw-20;
      page.drawText(text,{x,y:18,size,font,color:PDFLib.rgb(0,0,0)});
      updateProgress(10+((i+1)/pages.length)*80,`Numbering page ${i+1}...`);
    });
    const bytes=await pdf.save();
    return {blob:new Blob([bytes],{type:"application/pdf"}),name:file.name.replace(/\.pdf$/i,"")+"_numbered.pdf"};
  }
};
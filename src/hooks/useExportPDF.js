import { buildThreadPdf, pdfFileName } from '@/lib/threadPdf';

export function useExportPDF() {
  // Builds the PDF, starts its download and returns the file name plus a
  // link that opens the same document in a new tab.
  const exportThread = (title, messages) => {
    const doc = buildThreadPdf(title, messages);
    const name = pdfFileName(title);
    doc.save(name);
    return { name, url: URL.createObjectURL(doc.output('blob')) };
  };

  return { exportThread };
}
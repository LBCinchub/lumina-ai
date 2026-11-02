import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { pdfSafe, pdfMessageText } from '@/lib/pdfText';

const LINE = 14;

// Lays out a chat thread as an A4 PDF: header, title, then each saved turn
// under its speaker. Long messages continue on the next page, never cut off.
export function buildThreadPdf(title, messages) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 56;
  const contentW = pageW - marginX * 2;
  const bottom = pageH - 50;
  let y = 60;
  const addPage = () => { doc.addPage(); y = 60; };

  // Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(160, 150, 140);
  doc.text('Lumina AI · LBC.Network', marginX, y);
  doc.text(format(new Date(), 'MMMM d, yyyy'), pageW - marginX, y, { align: 'right' });
  y += 28;
  doc.setDrawColor(220, 215, 208);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageW - marginX, y);
  y += 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 25, 20);
  const titleLines = doc.splitTextToSize(pdfSafe(title) || 'Conversation', contentW);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 22 + 20;

  // Saved turns only: local error notices are not part of the thread.
  messages.filter(m => !String(m.id).startsWith('error-')).forEach((msg) => {
    const isUser = msg.role === 'user';
    if (y + 30 > bottom) addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(isUser ? 80 : 140, isUser ? 80 : 120, isUser ? 80 : 100);
    doc.text(isUser ? 'YOU' : 'LUMINA', marginX, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(pdfMessageText(msg.content), isUser ? contentW - 40 : contentW);
    // Draw in page-sized chunks; user turns keep their tinted bubble per chunk.
    for (let i = 0; i < lines.length;) {
      if (bottom - y - 8 < LINE) addPage();
      const chunk = lines.slice(i, i + Math.floor((bottom - y - 8) / LINE));
      if (isUser) {
        doc.setFillColor(245, 241, 235);
        doc.roundedRect(marginX, y - 4, contentW, chunk.length * LINE + 8, 6, 6, 'F');
      }
      doc.setTextColor(isUser ? 40 : 55, isUser ? 35 : 50, isUser ? 30 : 45);
      doc.text(chunk, isUser ? marginX + 10 : marginX, y + 6);
      y += chunk.length * LINE + 8;
      i += chunk.length;
    }
    y += 24;
  });

  // Footer on each page
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 170, 160);
    doc.text(`Page ${p} of ${totalPages}`, pageW - marginX, pageH - 28, { align: 'right' });
    doc.text('Exported from Lumina AI', marginX, pageH - 28);
  }
  return doc;
}

export const pdfFileName = (title) =>
  `lumina-${(title || 'conversation').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
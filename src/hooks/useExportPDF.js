import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export function useExportPDF() {
  const exportThread = (title, messages) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 56;
    const contentW = pageW - marginX * 2;
    let y = 60;

    const addPage = () => {
      doc.addPage();
      y = 60;
    };

    const checkY = (needed) => {
      if (y + needed > pageH - 50) addPage();
    };

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
    const titleLines = doc.splitTextToSize(title || 'Conversation', contentW);
    doc.text(titleLines, marginX, y);
    y += titleLines.length * 22 + 20;

    // Messages
    messages.forEach((msg) => {
      const isUser = msg.role === 'user';

      // Role label
      checkY(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(isUser ? 80 : 140, isUser ? 80 : 120, isUser ? 80 : 100);
      doc.text(isUser ? 'YOU' : 'LUMINA', marginX, y);
      y += 14;

      // Message content — strip markdown symbols simply
      const clean = (msg.content || '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,3}\s/g, '')
        .replace(/`(.*?)`/g, '$1');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(isUser ? 40 : 55, isUser ? 35 : 50, isUser ? 30 : 45);

      const lines = doc.splitTextToSize(clean, isUser ? contentW - 40 : contentW);
      const blockH = lines.length * 14 + 8;

      if (isUser) {
        // User bubble: light warm tint
        checkY(blockH + 20);
        doc.setFillColor(245, 241, 235);
        doc.roundedRect(marginX, y - 4, contentW, blockH, 6, 6, 'F');
        doc.text(lines, marginX + 10, y + 6);
      } else {
        checkY(blockH + 8);
        doc.text(lines, marginX, y + 6);
      }

      y += blockH + 24;
    });

    // Footer on each page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(180, 170, 160);
      doc.text(`Page ${i} of ${totalPages}`, pageW - marginX, pageH - 28, { align: 'right' });
      doc.text('Exported from Lumina AI', marginX, pageH - 28);
    }

    const filename = (title || 'conversation').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    doc.save(`lumina-${filename}.pdf`);
  };

  return { exportThread };
}
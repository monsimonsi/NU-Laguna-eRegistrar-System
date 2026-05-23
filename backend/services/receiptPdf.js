const PDFDocument = require('pdfkit');

function addRow(doc, label, value) {
  const y = doc.y;
  doc.fontSize(10).fillColor('#666666').text(label, 50, y, { width: 180 });
  doc.fontSize(10).fillColor('#111111').text(String(value || '—'), 240, y, {
    width: 305,
    align: 'right'
  });
  doc.moveDown(0.6);
}

function generateReceiptPdfBuffer(receipt) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const paidDate = receipt.paidAt
      ? new Date(receipt.paidAt).toLocaleString('en-PH', {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      : '—';

    const walletLabel = receipt.paymentMethod?.includes('Maya') ? 'Maya' : 'GCash';

    doc.fontSize(20).fillColor('#35408F').text('NU Laguna e-Registrar', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(14).fillColor('#333333').text('Official Payment Receipt', { align: 'center' });
    doc.moveDown(1.2);

    doc.fontSize(10).fillColor('#666666');
    doc.text(`Receipt No.: ${receipt.receiptNumber || '—'}`, { align: 'left' });
    doc.text(`Date paid: ${paidDate}`, { align: 'left' });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke();
    doc.moveDown(0.8);

    doc.fontSize(11).fillColor('#35408F').text('Payer details');
    doc.moveDown(0.4);
    addRow(doc, 'Name', receipt.payerName);
    addRow(doc, `${walletLabel} number`, receipt.payerMobile);
    addRow(doc, 'Email', receipt.payerEmail);

    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#35408F').text('Payment details');
    doc.moveDown(0.4);
    addRow(doc, 'Document', receipt.documentType);
    addRow(doc, 'Tracking no.', receipt.trackingNumber || receipt.requestId);
    addRow(doc, 'Payment method', receipt.paymentMethod);
    addRow(doc, 'Transaction ref.', receipt.transactionReference);

    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('#0a7a3e');
    doc.text(`Amount paid: ${receipt.amountFormatted || '—'}`, { align: 'right' });

    doc.moveDown(1.5);
    doc.fontSize(9).fillColor('#888888').text(
      'This receipt confirms payment for your document request. Keep a copy for your records.',
      { align: 'center', width: 495 }
    );

    doc.end();
  });
}

module.exports = { generateReceiptPdfBuffer };

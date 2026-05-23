const crypto = require('crypto');

function normalizePhilippineMobile(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('09')) return digits;
  if (digits.length === 10 && digits.startsWith('9')) return `0${digits}`;
  if (digits.length === 12 && digits.startsWith('639')) return `0${digits.slice(2)}`;
  return null;
}

function generateReceiptNumber() {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `RCP-${ymd}-${suffix}`;
}

function maskMobile(mobile) {
  const m = String(mobile || '');
  if (m.length < 7) return m;
  return `${m.slice(0, 4)}***${m.slice(-4)}`;
}

function buildReceiptPayload(payment, documentRequest) {
  const amountCentavos = Number(payment?.amountCentavos) || 0;
  return {
    receiptNumber: payment.receiptNumber || '',
    paidAt: payment.paidAt || payment.updatedAt || null,
    transactionReference: payment.transactionReference || '',
    paymentMethod: payment.paymentMethod || '',
    amountCentavos,
    amountFormatted: `PHP ${(amountCentavos / 100).toFixed(2)}`,
    payerName: payment.payerName || documentRequest?.full_name || '',
    payerMobile: payment.payerMobile || '',
    payerMobileMasked: maskMobile(payment.payerMobile),
    payerEmail: payment.payerEmail || documentRequest?.email || '',
    documentType: documentRequest?.documentType || '',
    trackingNumber: documentRequest?.trackingNumber || '',
    requestId: String(documentRequest?._id || payment?.documentRequestId || '')
  };
}

module.exports = {
  normalizePhilippineMobile,
  generateReceiptNumber,
  maskMobile,
  buildReceiptPayload
};

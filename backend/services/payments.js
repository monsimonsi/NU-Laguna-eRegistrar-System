const Paymongo = require('paymongo-node');
const Payment = require('../models/Payment');
const DocumentRequest = require('../models/DocumentRequest');
const { createNotification } = require('./notifications');
const mail = require('./mail');

function paymongoSecret() {
  return String(process.env.PAYMONGO_SECRET_KEY || '').trim();
}

function webhookSecret() {
  return String(process.env.PAYMONGO_WEBHOOK_SECRET || '').trim();
}

function isPaymongoConfigured() {
  return Boolean(paymongoSecret());
}

function centavosForRequest() {
  const n = Number(process.env.DOCUMENT_REQUEST_FEE_CENTAVOS);
  return Number.isFinite(n) && n >= 100 ? Math.round(n) : 10000;
}

function client() {
  const sk = paymongoSecret();
  if (!sk) return null;
  return Paymongo(sk);
}

function mapSourceTypeToLabel(sourceType) {
  const t = String(sourceType || '').toLowerCase();
  if (t === 'gcash') return 'GCash';
  if (t === 'paymaya') return 'Maya';
  return t ? t.replace(/_/g, ' ') : '';
}

async function notifyRequestSubmitted(documentRequest, userId) {
  await createNotification({
    userId,
    category: 'request_submitted',
    message: `Your request for ${documentRequest.documentType} was submitted successfully.`,
    meta: {
      requestId: String(documentRequest._id),
      trackingNumber: documentRequest.trackingNumber || ''
    }
  });

  void mail.notifyDocumentRequestSubmitted({
    to: documentRequest.email,
    fullName: documentRequest.full_name,
    trackingNumber: documentRequest.trackingNumber || '',
    documentType: documentRequest.documentType
  });
}

/**
 * Creates a PayMongo PaymentIntent and upserts the Payment row for this document request.
 */
async function createOrRefreshPaymentIntent(documentRequest, existingPayment) {
  const pm = client();
  if (!pm) {
    throw new Error('PayMongo is not configured');
  }

  const amount = centavosForRequest();
  const description = `NU Laguna e-Registrar — ${documentRequest.documentType} (${documentRequest.trackingNumber || ''})`.trim();

  if (existingPayment?.paymongoPaymentIntentId) {
    try {
      await pm.paymentIntents.cancel(existingPayment.paymongoPaymentIntentId);
    } catch (_) {
      /* ignore cancel errors (already terminal) */
    }
  }

  const pi = await pm.paymentIntents.create({
    amount,
    currency: 'PHP',
    payment_method_allowed: ['gcash', 'paymaya'],
    description,
    metadata: {
      document_request_id: String(documentRequest._id),
      tracking_number: String(documentRequest.trackingNumber || '')
    }
  });

  let row = existingPayment;
  if (!row) {
    row = await Payment.create({
      documentRequestId: documentRequest._id,
      amountCentavos: amount,
      currency: 'PHP',
      paymentStatus: 'pending',
      paymongoPaymentIntentId: pi.id,
      paymongoClientKey: pi.client_key || ''
    });
  } else {
    row.amountCentavos = amount;
    row.paymentStatus = 'pending';
    row.paymongoPaymentIntentId = pi.id;
    row.paymongoClientKey = pi.client_key || '';
    row.transactionReference = '';
    row.paymentMethod = '';
    await row.save();
  }

  return {
    payment: row,
    clientKey: pi.client_key,
    paymentIntentId: pi.id,
    amountCentavos: amount,
    currency: 'PHP'
  };
}

async function markPaidFromPaymongoPayment({
  paymentIntentId,
  paymongoPaymentId,
  sourceType
}) {
  if (!paymentIntentId) return { ok: false, reason: 'missing_payment_intent' };

  const payment = await Payment.findOne({ paymongoPaymentIntentId: paymentIntentId });
  if (!payment) {
    console.warn('[payments] webhook: no local Payment for PI', paymentIntentId);
    return { ok: false, reason: 'payment_not_found' };
  }

  if (payment.paymentStatus === 'paid') {
    return { ok: true, duplicate: true };
  }

  const doc = await DocumentRequest.findById(payment.documentRequestId);
  if (!doc) {
    return { ok: false, reason: 'request_not_found' };
  }

  const methodLabel = mapSourceTypeToLabel(sourceType);

  payment.paymentStatus = 'paid';
  payment.transactionReference = paymongoPaymentId || paymentIntentId;
  if (methodLabel) payment.paymentMethod = methodLabel;
  await payment.save();

  if (!doc.paymentConfirmed) {
    doc.paymentConfirmed = true;
    await doc.save();
    if (doc.requesterId) {
      await notifyRequestSubmitted(doc, doc.requesterId);
    }
  }

  return { ok: true };
}

async function markFailedFromPaymongoPayment({ paymentIntentId }) {
  if (!paymentIntentId) return { ok: false, reason: 'missing_payment_intent' };
  const payment = await Payment.findOne({ paymongoPaymentIntentId: paymentIntentId });
  if (!payment || payment.paymentStatus === 'paid') return { ok: false, reason: 'skip' };

  payment.paymentStatus = 'failed';
  await payment.save();
  return { ok: true };
}

function extractPaymentPayload(event) {
  const type = event.type;
  const res = event.resource;
  if (!res) return { type, paymentIntentId: null, paymentId: null, sourceType: '' };

  const payAttrs = res.attributes || res;
  const paymentIntentId = payAttrs.payment_intent_id || null;
  const paymentId = res.id || null;
  const source = payAttrs.source || {};
  const sourceType = source.type || source.provider || '';
  return { type, paymentIntentId, paymentId, sourceType };
}

/**
 * Express handler: raw JSON body (register with express.raw).
 */
async function handlePayMongoWebhook(req, res) {
  const pm = client();
  const whSecret = webhookSecret();

  if (!pm || !whSecret) {
    console.warn('[payments] webhook ignored: PayMongo or PAYMONGO_WEBHOOK_SECRET not set');
    return res.status(503).json({ message: 'Webhook not configured' });
  }

  const rawBuf = req.body;
  const payloadString = Buffer.isBuffer(rawBuf) ? rawBuf.toString('utf8') : String(rawBuf || '');
  const signatureHeader =
    req.get('paymongo-signature') || req.get('Paymongo-Signature') || '';

  let event;
  try {
    event = pm.webhooks.constructEvent({
      payload: payloadString,
      signatureHeader,
      webhookSecretKey: whSecret
    });
  } catch (err) {
    console.warn('[payments] webhook signature failed:', err.message || err.type);
    return res.status(400).json({ message: 'Invalid signature' });
  }

  try {
    const { type, paymentIntentId, paymentId, sourceType } = extractPaymentPayload(event);

    if (type === 'payment.paid') {
      const r = await markPaidFromPaymongoPayment({
        paymentIntentId,
        paymongoPaymentId: paymentId,
        sourceType
      });
      if (!r.ok && r.reason === 'payment_not_found') {
        return res.status(200).json({ received: true, ignored: true });
      }
    } else if (type === 'payment.failed') {
      await markFailedFromPaymongoPayment({ paymentIntentId });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[payments] webhook handler error:', err);
    return res.status(500).json({ message: 'Webhook processing error' });
  }
}

module.exports = {
  isPaymongoConfigured,
  centavosForRequest,
  createOrRefreshPaymentIntent,
  notifyRequestSubmitted,
  handlePayMongoWebhook
};

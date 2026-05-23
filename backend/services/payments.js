const Paymongo = require('paymongo-node');
const Payment = require('../models/Payment');
const DocumentRequest = require('../models/DocumentRequest');
const { createNotification } = require('./notifications');
const mail = require('./mail');
const {
  normalizePhilippineMobile,
  generateReceiptNumber,
  buildReceiptPayload
} = require('./receipts');

function paymongoSecret() {
  return String(process.env.PAYMONGO_SECRET_KEY || '').trim();
}

function validatePaymongoSecretKey() {
  const sk = paymongoSecret();
  if (!sk) return;
  if (sk.startsWith('pk_')) {
    throw new Error(
      'PAYMONGO_SECRET_KEY is a public key (pk_). Use your secret key (sk_test_ or sk_live_) from PayMongo Dashboard → API Keys.'
    );
  }
  if (!sk.startsWith('sk_')) {
    throw new Error(
      'PAYMONGO_SECRET_KEY looks invalid. It should start with sk_test_ or sk_live_.'
    );
  }
}

function webhookSecret() {
  return String(process.env.PAYMONGO_WEBHOOK_SECRET || '').trim();
}

function isPaymongoConfigured() {
  return Boolean(paymongoSecret());
}

function getPaymongoKeyStatus() {
  const sk = paymongoSecret();
  if (!sk) return 'missing';
  if (sk.startsWith('pk_')) return 'public';
  if (sk.startsWith('sk_')) return 'secret';
  return 'invalid';
}

function centavosForRequest(documentRequest) {
  const totalFee = Number(documentRequest?.totalFee);
  if (Number.isFinite(totalFee) && totalFee > 0) {
    return Math.round(totalFee * 100);
  }
  const n = Number(process.env.DOCUMENT_REQUEST_FEE_CENTAVOS);
  return Number.isFinite(n) && n >= 100 ? Math.round(n) : 10000;
}

async function paymongoApi(path, method, body) {
  const sk = paymongoSecret();
  if (!sk) throw new Error('PayMongo is not configured');
  validatePaymongoSecretKey();

  const res = await fetch(`https://api.paymongo.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${sk}:`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const json = await res.json();
  if (!res.ok) {
    const err = new Error('PayMongo API error');
    err.errors = json.errors;
    err.status = res.status;
    throw err;
  }
  return json.data;
}

function client() {
  const sk = paymongoSecret();
  if (!sk) return null;
  validatePaymongoSecretKey();
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

async function createOrRefreshPaymentIntent(documentRequest, existingPayment) {
  const pm = client();
  if (!pm) {
    throw new Error('PayMongo is not configured');
  }

  const amount = centavosForRequest(documentRequest);
  const description = `NU Laguna e-Registrar — ${documentRequest.documentType} (${documentRequest.trackingNumber || ''})`.trim();

  if (existingPayment?.paymongoPaymentIntentId) {
    try {
      await pm.paymentIntents.cancel(existingPayment.paymongoPaymentIntentId);
    } catch (_) {
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
    row = await Payment.findOneAndUpdate(
      { documentRequestId: documentRequest._id },
      {
        amountCentavos: amount,
        paymentStatus: 'pending',
        paymongoPaymentIntentId: pi.id,
        paymongoClientKey: pi.client_key || '',
        transactionReference: '',
        paymentMethod: ''
      },
      { new: true }
    );
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
  if (!payment.receiptNumber) payment.receiptNumber = generateReceiptNumber();
  if (!payment.paidAt) payment.paidAt = new Date();
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

/**
 * Starts GCash or Maya checkout; returns redirect URL for the e-wallet app/page.*/
async function startEwalletCheckout(documentRequest, existingPayment, method, returnUrl) {
  const pm = client();
  if (!pm) throw new Error('PayMongo is not configured');

  const normalizedMethod = String(method || '').trim().toLowerCase();
  if (normalizedMethod !== 'gcash' && normalizedMethod !== 'paymaya') {
    throw new Error('Invalid payment method. Use gcash or paymaya.');
  }

  const intent = await createOrRefreshPaymentIntent(documentRequest, existingPayment);
  const paymentIntentId = intent.paymentIntentId;

  const paymentRow = await Payment.findOne({ documentRequestId: documentRequest._id }).lean();
  const billingName = String(
    paymentRow?.payerName || documentRequest.full_name || 'NU Student'
  ).trim();
  const billingEmail = String(paymentRow?.payerEmail || documentRequest.email || '').trim();
  const billingPhone = String(
    paymentRow?.payerMobile || process.env.PAYMONGO_BILLING_PHONE || '09170000000'
  ).trim();

  let paymentMethod;
  if (pm.paymentMethods && typeof pm.paymentMethods.create === 'function') {
    paymentMethod = await pm.paymentMethods.create({
      type: normalizedMethod,
      billing: {
        name: billingName,
        email: billingEmail,
        phone: billingPhone
      }
    });
  } else {
    paymentMethod = await paymongoApi('/payment_methods', 'POST', {
      data: {
        attributes: {
          type: normalizedMethod,
          billing: {
            name: billingName,
            email: billingEmail,
            phone: billingPhone
          }
        }
      }
    });
  }

  const paymentMethodId = paymentMethod.id || paymentMethod?.data?.id;
  if (!paymentMethodId) {
    throw new Error('Could not create payment method.');
  }

  const attachPayload = {
    payment_method: paymentMethodId,
    return_url: returnUrl
  };

  let attached;
  if (pm.paymentIntents && typeof pm.paymentIntents.attach === 'function') {
    attached = await pm.paymentIntents.attach(paymentIntentId, attachPayload);
  } else {
    attached = await paymongoApi(`/payment_intents/${paymentIntentId}/attach`, 'POST', {
      data: { attributes: attachPayload }
    });
  }

  const attrs = attached.attributes || attached;
  const redirectUrl =
    attrs?.next_action?.redirect?.url ||
    attrs?.next_action?.redirect?.checkout_url ||
    null;

  return {
    redirectUrl,
    paymentIntentId,
    clientKey: intent.clientKey,
    amountCentavos: intent.amountCentavos,
    currency: intent.currency,
    payment: intent.payment
  };
}

async function getPaymentForRequest(documentRequestId) {
  return Payment.findOne({ documentRequestId }).lean();
}

async function savePayerDetails(documentRequest, { payerName, payerMobile } = {}) {
  const mobileRaw = String(payerMobile || '').trim();
  const mobile = mobileRaw ? normalizePhilippineMobile(mobileRaw) : '';
  if (mobileRaw && !mobile) {
    throw new Error('Invalid Philippine mobile number. Use format 09XXXXXXXXX.');
  }

  const amount = centavosForRequest(documentRequest);
  const name = String(payerName || documentRequest.full_name || '').trim();

  await Payment.findOneAndUpdate(
    { documentRequestId: documentRequest._id },
    {
      payerName: name,
      payerMobile: mobile,
      payerEmail: String(documentRequest.email || '').trim()
    },
    {
      upsert: true,
      setOnInsert: {
        amountCentavos: amount,
        currency: 'PHP',
        paymentStatus: 'pending'
      }
    }
  );

  return { payerName: name, payerMobile: mobile };
}

async function getPaymentReceipt(documentRequestId) {
  const payment = await Payment.findOne({ documentRequestId }).lean();
  if (!payment || payment.paymentStatus !== 'paid') return null;

  const doc = await DocumentRequest.findById(documentRequestId).lean();
  if (!doc) return null;

  return buildReceiptPayload(payment, doc);
}

/**
 * After GCash/Maya redirect: check PayMongo payment intent status and mark paid locally.
 * Needed when webhooks are not configured (e.g. localhost dev).
 */
async function syncPaymentFromPaymongo(documentRequestId) {
  if (!isPaymongoConfigured()) {
    return { ok: false, reason: 'paymongo_not_configured' };
  }

  const payment = await Payment.findOne({ documentRequestId });
  if (!payment?.paymongoPaymentIntentId) {
    return { ok: false, reason: 'no_payment_intent' };
  }

  const doc = await DocumentRequest.findById(documentRequestId);
  if (!doc) return { ok: false, reason: 'request_not_found' };
  if (doc.paymentConfirmed) {
    return { ok: true, paymentConfirmed: true, alreadyPaid: true };
  }

  const piId = payment.paymongoPaymentIntentId;
  let pi;
  try {
    pi = await paymongoApi(`/payment_intents/${piId}`, 'GET');
  } catch (err) {
    return { ok: false, reason: 'paymongo_fetch_failed', message: err.message };
  }

  const attrs = pi?.attributes || pi;
  const status = String(attrs?.status || '').toLowerCase();

  if (status === 'succeeded') {
    let paymongoPaymentId = '';
    let sourceType = '';

    const embedded = attrs?.payments?.data || attrs?.payments || [];
    const paymentRows = Array.isArray(embedded) ? embedded : [];
    if (paymentRows.length > 0) {
      const last = paymentRows[paymentRows.length - 1];
      paymongoPaymentId = last.id || '';
      const pAttrs = last.attributes || last;
      sourceType = pAttrs?.source?.type || pAttrs?.source?.provider || '';
    }

    if (!paymongoPaymentId) {
      try {
        const sk = paymongoSecret();
        const res = await fetch(
          `https://api.paymongo.com/v1/payments?payment_intent_id=${encodeURIComponent(piId)}&limit=5`,
          {
            headers: { Authorization: `Basic ${Buffer.from(`${sk}:`).toString('base64')}` }
          }
        );
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];
        if (rows.length > 0) {
          const last = rows[rows.length - 1];
          paymongoPaymentId = last.id || '';
          const pAttrs = last.attributes || {};
          sourceType = pAttrs?.source?.type || pAttrs?.source?.provider || '';
        }
      } catch (_) {
        /* optional lookup */
      }
    }

    await markPaidFromPaymongoPayment({
      paymentIntentId: piId,
      paymongoPaymentId: paymongoPaymentId || piId,
      sourceType
    });

    const updated = await DocumentRequest.findById(documentRequestId).lean();
    return {
      ok: true,
      paymentConfirmed: Boolean(updated?.paymentConfirmed),
      status: 'succeeded'
    };
  }

  if (status === 'failed' || status === 'cancelled') {
    await markFailedFromPaymongoPayment({ paymentIntentId: piId });
    return { ok: false, reason: 'failed', status };
  }

  return { ok: false, reason: 'pending', status: status || 'unknown' };
}

/**
 * Dev/sandbox: mark request paid when PayMongo is not configured (payment page flow).
 */
async function confirmSandboxPayment(documentRequest, method = 'sandbox') {
  if (isPaymongoConfigured()) {
    throw new Error('Sandbox payment is disabled while PayMongo is configured.');
  }

  if (documentRequest.paymentConfirmed) {
    return { ok: true, alreadyPaid: true, request: documentRequest };
  }

  const normalizedMethod = String(method || 'sandbox').trim().toLowerCase();
  const methodLabel =
    normalizedMethod === 'gcash'
      ? 'GCash (sandbox)'
      : normalizedMethod === 'paymaya'
        ? 'Maya (sandbox)'
        : 'Sandbox';

  const amount = centavosForRequest(documentRequest);

  await Payment.findOneAndUpdate(
    { documentRequestId: documentRequest._id },
    {
      documentRequestId: documentRequest._id,
      amountCentavos: amount,
      currency: 'PHP',
      paymentStatus: 'paid',
      paymentMethod: methodLabel,
      transactionReference: `SANDBOX-${Date.now()}`,
      receiptNumber: generateReceiptNumber(),
      paidAt: new Date(),
      payerName: String(documentRequest.full_name || '').trim(),
      payerEmail: String(documentRequest.email || '').trim()
    },
    { upsert: true, new: true }
  );

  documentRequest.paymentConfirmed = true;
  await documentRequest.save();

  if (documentRequest.requesterId) {
    await notifyRequestSubmitted(documentRequest, documentRequest.requesterId);
  }

  return { ok: true, request: documentRequest };
}

module.exports = {
  isPaymongoConfigured,
  getPaymongoKeyStatus,
  centavosForRequest,
  createOrRefreshPaymentIntent,
  startEwalletCheckout,
  getPaymentForRequest,
  savePayerDetails,
  getPaymentReceipt,
  syncPaymentFromPaymongo,
  confirmSandboxPayment,
  notifyRequestSubmitted,
  handlePayMongoWebhook
};

const crypto = require('crypto');
const Payment = require('../models/Payment');
const DocumentRequest = require('../models/DocumentRequest');
const {
  centavosForRequest,
  notifyRegistrarRequestPaid,
  notifyPaymentFailed,
  isPaymongoConfigured
} = require('./payments');
const { notifyPaymentSuccessful: notifyPaymentNotification } = require('./notifications');
const mail = require('./mail');
const { normalizePhilippineMobile, generateReceiptNumber } = require('./receipts');

const MOCK_PROVIDERS = {
  gcash: { id: 'gcash', label: 'GCash', referencePrefix: 'MOCK-GC' },
  paymaya: { id: 'paymaya', label: 'Maya', referencePrefix: 'MOCK-MY' }
};

function isMockEwalletEnabled() {
  return !isPaymongoConfigured();
}

function assertMockEnabled() {
  if (!isMockEwalletEnabled()) {
    throw new Error('Mock e-wallet APIs are only available when PayMongo is not configured.');
  }
}

function normalizeMethod(method) {
  const m = String(method || '').trim().toLowerCase();
  if (m === 'gcash' || m === 'maya') return m === 'maya' ? 'paymaya' : 'gcash';
  if (m === 'paymaya') return 'paymaya';
  return null;
}

function newSessionId() {
  return crypto.randomUUID();
}

function frontendBase() {
  return String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function mockRedirectUrl(provider, sessionId) {
  const path = provider === 'paymaya' ? '/payment/mock/maya' : '/payment/mock/gcash';
  return `${frontendBase()}${path}?session=${encodeURIComponent(sessionId)}`;
}

async function upsertPendingPayment(documentRequest, provider, sessionId) {
  const amount = centavosForRequest(documentRequest);
  const meta = MOCK_PROVIDERS[provider];

  const row = await Payment.findOneAndUpdate(
    { documentRequestId: documentRequest._id },
    {
      documentRequestId: documentRequest._id,
      amountCentavos: amount,
      currency: 'PHP',
      paymentStatus: 'pending',
      paymentMethod: meta.label,
      transactionReference: '',
      mockSessionId: sessionId,
      mockProvider: provider
    },
    { upsert: true, returnDocument: 'after' }
  );

  return { payment: row, amountCentavos: amount, provider: meta };
}

async function startMockCheckout(documentRequest, method, returnUrl) {
  assertMockEnabled();

  const provider = normalizeMethod(method);
  if (!provider) {
    throw new Error('Invalid payment method. Use gcash or paymaya (maya).');
  }

  if (documentRequest.paymentConfirmed) {
    throw new Error('This request is already paid.');
  }

  const sessionId = newSessionId();
  const { payment, amountCentavos, provider: meta } = await upsertPendingPayment(
    documentRequest,
    provider,
    sessionId
  );

  const redirectUrl = mockRedirectUrl(provider, sessionId);
  const resolvedReturn =
    returnUrl ||
    `${frontendBase()}/payment/return?requestId=${encodeURIComponent(String(documentRequest._id))}`;

  return {
    sessionId,
    redirectUrl,
    returnUrl: resolvedReturn,
    amountCentavos,
    currency: 'PHP',
    provider: meta.id,
    providerLabel: meta.label,
    merchantName: 'NU Laguna e-Registrar',
    description: documentRequest.documentType,
    trackingNumber: documentRequest.trackingNumber || '',
    payment
  };
}

async function findPaymentBySession(sessionId) {
  if (!sessionId) return null;
  return Payment.findOne({ mockSessionId: sessionId });
}

async function assertSessionOwner(sessionId, userId, email) {
  const payment = await findPaymentBySession(sessionId);
  if (!payment) {
    const err = new Error('Payment session not found or expired.');
    err.status = 404;
    throw err;
  }

  const doc = await DocumentRequest.findById(payment.documentRequestId);
  if (!doc) {
    const err = new Error('Document request not found.');
    err.status = 404;
    throw err;
  }

  if (String(doc.requesterId || '') !== String(userId)) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  const docEmail = String(doc.email || '').trim().toLowerCase();
  const authEmail = String(email || '').trim().toLowerCase();
  if (docEmail && authEmail && docEmail !== authEmail) {
    const err = new Error('Email does not match this request.');
    err.status = 403;
    throw err;
  }

  return { payment, doc };
}

async function getMockSession(sessionId, userId, email) {
  assertMockEnabled();
  const { payment, doc } = await assertSessionOwner(sessionId, userId, email);
  const provider = payment.mockProvider || 'gcash';
  const meta = MOCK_PROVIDERS[provider] || MOCK_PROVIDERS.gcash;

  return {
    sessionId,
    status: payment.paymentStatus,
    amountCentavos: payment.amountCentavos,
    currency: payment.currency || 'PHP',
    provider: meta.id,
    providerLabel: meta.label,
    merchantName: 'NU Laguna e-Registrar',
    description: doc.documentType,
    trackingNumber: doc.trackingNumber || '',
    requestId: String(doc._id),
    paymentConfirmed: Boolean(doc.paymentConfirmed)
  };
}

async function completeMockSession(sessionId, userId, email, payerDetails = {}) {
  assertMockEnabled();
  const { payment, doc } = await assertSessionOwner(sessionId, userId, email);

  if (doc.paymentConfirmed || payment.paymentStatus === 'paid') {
    return { ok: true, alreadyPaid: true, request: doc, payment };
  }

  if (payment.paymentStatus === 'failed') {
    const err = new Error('This payment session was cancelled. Start checkout again.');
    err.status = 400;
    throw err;
  }

  const mobileRaw = String(payerDetails.payerMobile || payment.payerMobile || '').trim();
  const mobile = mobileRaw ? normalizePhilippineMobile(mobileRaw) : payment.payerMobile;
  if (mobileRaw && !mobile) {
    const err = new Error('Invalid Philippine mobile number. Use format 09XXXXXXXXX.');
    err.status = 400;
    throw err;
  }
  if (!mobile) {
    const err = new Error('GCash/Maya mobile number is required to complete payment.');
    err.status = 400;
    throw err;
  }

  const payerName = String(
    payerDetails.payerName || payment.payerName || doc.full_name || ''
  ).trim();

  const provider = payment.mockProvider || 'gcash';
  const meta = MOCK_PROVIDERS[provider] || MOCK_PROVIDERS.gcash;
  const reference = `${meta.referencePrefix}-${Date.now()}`;
  const receiptNumber = generateReceiptNumber();

  payment.paymentStatus = 'paid';
  payment.paymentMethod = meta.label;
  payment.transactionReference = reference;
  payment.payerName = payerName;
  payment.payerMobile = mobile;
  payment.payerEmail = String(payment.payerEmail || doc.email || '').trim();
  payment.receiptNumber = receiptNumber;
  payment.paidAt = new Date();
  await payment.save();

  const claimed = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      paymentSuccessDispatchedAt: null
    },
    {
      $set: { paymentSuccessDispatchedAt: new Date() }
    },
    { returnDocument: 'after' }
  ).lean();

  if (!doc.paymentConfirmed) {
    doc.paymentConfirmed = true;
    doc.status = 'Pending';
    await doc.save();
  }

  if (claimed) {
    if (doc.requesterId) {
      await notifyPaymentNotification({
        userId: doc.requesterId,
        documentRequest: doc,
        payment: {
          amountCentavos: claimed.amountCentavos || payment.amountCentavos || 0,
          currency: claimed.currency || payment.currency || 'PHP',
          receiptNumber: claimed.receiptNumber || payment.receiptNumber || '',
          transactionReference: claimed.transactionReference || payment.transactionReference || '',
          paymentMethod: claimed.paymentMethod || payment.paymentMethod || ''
        }
      });
    }
    void mail.notifyPaymentSuccessful({
      to: doc.email,
      fullName: doc.full_name,
      documentType: doc.documentType,
      amount: Number(claimed.amountCentavos || payment.amountCentavos || 0) / 100,
      currency: claimed.currency || payment.currency || 'PHP',
      referenceNumber: claimed.receiptNumber || payment.receiptNumber || claimed.transactionReference || payment.transactionReference || '',
      paymentMethod: claimed.paymentMethod || payment.paymentMethod || ''
    });
    await notifyRegistrarRequestPaid(doc, claimed);
  }

  return {
    ok: true,
    request: doc,
    payment,
    transactionReference: reference,
    receiptNumber
  };
}

async function cancelMockSession(sessionId, userId, email) {
  assertMockEnabled();
  const { payment, doc } = await assertSessionOwner(sessionId, userId, email);

  if (doc.paymentConfirmed || payment.paymentStatus === 'paid') {
    const err = new Error('Payment is already completed.');
    err.status = 400;
    throw err;
  }

  payment.paymentStatus = 'failed';
  payment.transactionReference = '';
  await payment.save();

  await notifyPaymentFailed(doc, payment, 'mock_checkout_cancelled');

  return { ok: true, payment };
}

module.exports = {
  MOCK_PROVIDERS,
  isMockEwalletEnabled,
  startMockCheckout,
  getMockSession,
  completeMockSession,
  cancelMockSession,
  normalizeMethod
};

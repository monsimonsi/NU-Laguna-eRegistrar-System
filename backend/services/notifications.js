const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');

function buildPaymentMessage(meta = {}) {
  const documentType = meta.documentType || meta.facts?.documentType || '';
  const amount = meta.amount || meta.facts?.amount || '';
  const currency = meta.currency || meta.facts?.currency || '';
  const reference = meta.referenceNumber || meta.facts?.referenceNumber || meta.facts?.reference || '';
  const method = meta.paymentMethod || meta.facts?.paymentMethod || '';
  const receipt = meta.receiptUrl || meta.facts?.receiptUrl || '';

  const parts = [];
  if (documentType) {
    parts.push(`Your payment for ${documentType} was successful`);
  } else if (amount) {
    parts.push(`Payment of ${amount}${currency ? ` ${currency}` : ''} received`);
  } else {
    parts.push('Payment received');
  }

  if (reference) parts.push(`Reference: ${reference}`);
  if (method) parts.push(`Method: ${method}`);

  let message = parts.join('. ') + '.';
  if (receipt) {
    message += ` You can download your receipt here: ${receipt}.`;
  }
  return message.trim();
}

async function notifyPaymentSuccessful({ userId, documentRequest, payment, receiptUrl = '' }) {
  if (!documentRequest?.documentType || !userId) {
    console.warn('[notifications] notifyPaymentSuccessful called with missing userId or documentRequest', {
      userId,
      documentRequest,
      payment
    });
    return null;
  }

  const amount = payment?.amountCentavos ? (payment.amountCentavos / 100).toFixed(2) : '';
  const currency = payment?.currency || 'PHP';
  const referenceNumber = payment?.receiptNumber || payment?.transactionReference || '';
  const paymentMethod = payment?.paymentMethod || '';

  return createNotification({
    userId,
    category: 'payment_successful',
    message: buildPaymentMessage({
      documentType: documentRequest.documentType,
      amount,
      currency,
      referenceNumber,
      paymentMethod,
      receiptUrl
    }),
    meta: {
      event: 'payment_successful',
      requestId: String(documentRequest._id),
      trackingNumber: documentRequest.trackingNumber || '',
      documentType: documentRequest.documentType,
      amount,
      currency,
      referenceNumber,
      paymentMethod,
      receiptUrl
    }
  });
}

async function createNotification({ userId, message, category = 'general', meta = {} }) {
  if (!userId) {
    console.warn('[notifications] createNotification called with missing userId', { userId, message, category, meta });
    return null;
  }

  // If no explicit message provided, attempt to generate one for known events
  if (!message && meta && String(meta.event || '').toLowerCase() === 'payment_successful') {
    message = buildPaymentMessage(meta);
    if (!message) {
      console.warn('[notifications] createNotification missing message and unable to generate from meta', { userId, category, meta });
      return null;
    }
    if (!category || category === 'general') category = 'payment';
  }

  if (!message) {
    console.warn('[notifications] createNotification called with missing message', { userId, category, meta });
    return null;
  }
  try {
    const created = await Notification.create({
      user_id: userId,
      message,
      status: 'sent',
      date_sent: new Date(),
      category,
      meta
    });
    console.log('[notifications] created', { id: created._id, userId, category });
    return created;
  } catch (err) {
    console.error('[notifications] create failed:', err && err.message ? err.message : err);
    return null;
  }
}

async function createForRole({ role, message, category = 'general', meta = {}, dedupeKey = '' }) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (!normalizedRole || !message) return [];

  try {
    const users = await User.find({ role: normalizedRole, status: 'active' })
      .select('_id')
      .lean();
    if (users.length === 0) return [];

    const now = new Date();
    const resolvedMeta = dedupeKey ? { ...meta, dedupeKey } : meta;

    if (dedupeKey) {
      console.log('[notifications] createForRole dedupe', { role, category, dedupeKey, count: users.length });
      const writes = await Promise.all(
        users.map((user) =>
          Notification.updateOne(
            {
              user_id: user._id,
              category,
              'meta.dedupeKey': dedupeKey
            },
            {
              $setOnInsert: {
                user_id: user._id,
                message,
                status: 'sent',
                date_sent: now,
                category,
                meta: resolvedMeta
              }
            },
            { upsert: true }
          )
        )
      );
      return writes;
    }

    console.log('[notifications] createForRole insertMany', { role, category, count: users.length });
    return Notification.insertMany(
      users.map((user) => ({
        user_id: user._id,
        message,
        status: 'sent',
        date_sent: now,
        category,
        meta: resolvedMeta
      })),
      { ordered: false }
    );
  } catch (err) {
    console.error('[notifications] createForRole failed:', err && err.message ? err.message : err);
    return [];
  }
}

async function listForUser(userId, { limit = 50, skip = 0 } = {}) {
  const uid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!uid) return [];
  const n = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const s = Math.max(Number(skip) || 0, 0);
  return Notification.find({ user_id: uid })
    .sort({ date_sent: -1 })
    .skip(s)
    .limit(n)
    .lean()
    .then((rows) => {
      const seen = new Set();
      return rows.filter((row) => {
        const key = row.meta?.dedupeKey ||
          [row.category, row.meta?.requestId || '', row.meta?.paymentStatus || '', row.message].join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
}

async function markRead(userId, notificationId) {
  const uid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!uid || !mongoose.Types.ObjectId.isValid(notificationId)) {
    return { ok: false, reason: 'invalid_id' };
  }
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, user_id: uid },
    { $set: { status: 'read' } },
    { returnDocument: 'after' }
  ).lean();
  if (!updated) return { ok: false, reason: 'not_found' };
  return { ok: true, notification: updated };
}

async function markAllRead(userId) {
  const uid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!uid) {
    return { ok: false, reason: 'invalid_id' };
  }
  const result = await Notification.updateMany(
    { user_id: uid, status: { $ne: 'read' } },
    { $set: { status: 'read' } }
  );
  const modifiedCount =
    typeof result?.modifiedCount === 'number'
      ? result.modifiedCount
      : typeof result?.nModified === 'number'
        ? result.nModified
        : 0;
  return { ok: true, modifiedCount };
}

module.exports = {
  createNotification,
  createForRole,
  notifyPaymentSuccessful,
  listForUser,
  markRead,
  markAllRead
};

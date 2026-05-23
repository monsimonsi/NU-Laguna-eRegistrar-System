const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');

async function createNotification({ userId, message, category = 'general', meta = {} }) {
  if (!userId || !message) return null;
  try {
    return await Notification.create({
      user_id: userId,
      message,
      status: 'sent',
      date_sent: new Date(),
      category,
      meta
    });
  } catch (err) {
    console.error('[notifications] create failed:', err.message);
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
    console.error('[notifications] createForRole failed:', err.message);
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
    { new: true }
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
  listForUser,
  markRead,
  markAllRead
};

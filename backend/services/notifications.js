const mongoose = require('mongoose');
const Notification = require('../models/Notification');

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

async function listForUser(userId, { limit = 50, skip = 0 } = {}) {
  const uid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!uid) return [];
  const n = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const s = Math.max(Number(skip) || 0, 0);
  return Notification.find({ user_id: uid })
    .sort({ date_sent: -1 })
    .skip(s)
    .limit(n)
    .lean();
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

module.exports = {
  createNotification,
  listForUser,
  markRead
};
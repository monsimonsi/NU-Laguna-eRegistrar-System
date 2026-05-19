const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['sent', 'read'],
      default: 'sent',
      index: true
    },
    date_sent: { type: Date, default: Date.now, index: true },
    category: { type: String, default: 'general' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);

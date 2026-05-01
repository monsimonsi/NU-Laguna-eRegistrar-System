const mongoose = require('mongoose');

const DocumentRequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  full_name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  documentType: { type: String, required: true },
  purpose: { type: String },
  copies: { type: Number, default: 1 },
  deliveryMethod: { type: String, default: 'pickup' },
  address: { type: String },
  succeedingPages: { type: Number, default: 0 },
  notes: { type: String },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Ready for Pickup', 'Out for Delivery', 'Completed'],
    default: 'Pending'
  },
  trackingNumber: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('DocumentRequest', DocumentRequestSchema);

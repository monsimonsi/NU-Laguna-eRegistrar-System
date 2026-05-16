const mongoose = require('mongoose');

/** Matches registrar workflow: Released = claimed / closed (was previously "Completed"). */
const REQUEST_STATUSES = [
  'Pending',
  'Processing',
  'Ready for Pickup',
  'Out for Delivery',
  'Released'
];

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
  basePrice: { type: Number, default: 0 },
  perSucceedingPageFee: { type: Number, default: 0 },
  succeedingPagesFee: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  totalFee: { type: Number, default: 0 },
  status: {
    type: String,
    enum: REQUEST_STATUSES,
    default: 'Pending'
  },
  trackingNumber: { type: String },
  /** When false, the registrar queue hides this row until PayMongo reports a successful payment. */
  paymentConfirmed: { type: Boolean, default: false }
}, { timestamps: true });

const DocumentRequest = mongoose.model('DocumentRequest', DocumentRequestSchema);
DocumentRequest.REQUEST_STATUSES = REQUEST_STATUSES;
module.exports = DocumentRequest;

const mongoose = require('mongoose');

const PAYMENT_STATUSES = ['pending', 'paid', 'failed'];

const PaymentSchema = new mongoose.Schema(
  {
    documentRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentRequest',
      required: true,
      unique: true
    },
    amountCentavos: { type: Number, required: true },
    currency: { type: String, default: 'PHP' },
    paymentMethod: { type: String, default: '' },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending'
    },
    transactionReference: { type: String, default: '' },
    paymongoPaymentIntentId: { type: String, default: '' },
    paymongoClientKey: { type: String, default: '' },
    mockSessionId: { type: String, default: '' },
    mockProvider: { type: String, default: '' },
    payerName: { type: String, default: '' },
    payerMobile: { type: String, default: '' },
    payerEmail: { type: String, default: '' },
    receiptNumber: { type: String, default: '' },
    paidAt: { type: Date, default: null },
    paymentSuccessDispatchedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', PaymentSchema);
Payment.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports = Payment;

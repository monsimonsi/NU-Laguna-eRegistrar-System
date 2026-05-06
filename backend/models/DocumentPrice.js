const mongoose = require('mongoose');

const DocumentPriceSchema = new mongoose.Schema({
  documentType: { type: String, required: true, unique: true },
  basePrice: { type: Number, required: true },
  perSucceedingPageFee: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 150 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('DocumentPrice', DocumentPriceSchema);

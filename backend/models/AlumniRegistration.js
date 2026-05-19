const mongoose = require('mongoose');

const AlumniRegistrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  full_name: { type: String, required: true },
  email: { type: String, required: true },
  student_id: { type: String, required: true },
  year_graduated: { type: Number, required: true },
  course: { type: String, required: true },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectionReason: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('AlumniRegistration', AlumniRegistrationSchema);

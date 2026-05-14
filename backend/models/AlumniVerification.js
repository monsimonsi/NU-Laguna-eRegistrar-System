const mongoose = require("mongoose");

const alumniVerificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    student_number: { type: String, required: true },
    course: { type: String, required: true },
    year_graduated: { type: String, required: true },
    verification_status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejection_reason: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AlumniVerification", alumniVerificationSchema);

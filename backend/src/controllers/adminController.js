const AlumniVerification = require("../models/AlumniVerification");
const User = require("../models/User");
const { USER_STATUS, VERIFICATION_STATUS } = require("../constants/enums");
const { sendEmail } = require("../services/emailService");

const listPendingAlumni = async (_req, res) => {
  try {
    const items = await AlumniVerification.find({
      verificationStatus: VERIFICATION_STATUS.PENDING
    })
      .populate("userId", "fullName email status")
      .sort({ createdAt: 1 });

    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch pending alumni", error: error.message });
  }
};

const approveAlumni = async (req, res) => {
  try {
    const verification = await AlumniVerification.findById(req.params.id).populate("userId");
    if (!verification || !verification.userId) {
      return res.status(404).json({ message: "record not found" });
    }

    verification.verificationStatus = VERIFICATION_STATUS.APPROVED;
    verification.reviewedBy = req.user._id;
    verification.rejectionReason = "";
    await verification.save();

    const user = await User.findById(verification.userId._id);
    user.status = USER_STATUS.ACTIVE;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "NU Alumni Account Approved",
      text: "Your alumni account has been approved. You may now log in and submit requests."
    });

    return res.json({ message: "Alumni account approved" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to approve alumni", error: error.message });
  }
};

const rejectAlumni = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const verification = await AlumniVerification.findById(req.params.id).populate("userId");
    if (!verification || !verification.userId) {
      return res.status(404).json({ message: "Verification record not found" });
    }

    verification.verificationStatus = VERIFICATION_STATUS.REJECTED;
    verification.reviewedBy = req.user._id;
    verification.rejectionReason = reason.trim();
    await verification.save();

    const user = await User.findById(verification.userId._id);
    user.status = USER_STATUS.REJECTED;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Alumni Account Rejected",
      text: `Your alumni application was rejected. Reason: ${reason.trim()}\nYou may reapply by submitting corrected details.`
    });

    return res.json({ message: "Alumni account rejected" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to reject alumni", error: error.message });
  }
};

module.exports = {
  listPendingAlumni,
  approveAlumni,
  rejectAlumni
};

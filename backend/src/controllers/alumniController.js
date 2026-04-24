const User = require("../models/User");
const AlumniVerification = require("../models/AlumniVerification");
const { ROLES, USER_STATUS, VERIFICATION_STATUS } = require("../constants/enums");

const registerAlumni = async (req, res) => {
  try {
    const { fullName, email, password, studentNumber, course, yearGraduated } = req.body;

    if (!fullName || !email || !password || !studentNumber || !course || !yearGraduated) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const user = await User.create({
      fullName,
      email: email.toLowerCase().trim(),
      password,
      role: ROLES.ALUMNI,
      status: USER_STATUS.PENDING
    });

    await AlumniVerification.create({
      userId: user._id,
      studentNumber,
      course,
      yearGraduated: Number(yearGraduated),
      verificationStatus: VERIFICATION_STATUS.PENDING
    });

    return res.status(201).json({
      message: "Alumni registration submitted and pending verification",
      userId: user._id
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to register alumni",
      error: error.message
    });
  }
};

const reapplyAlumni = async (req, res) => {
  try {
    const { studentNumber, course, yearGraduated } = req.body;
    if (!studentNumber || !course || !yearGraduated) {
      return res.status(400).json({ message: "All fields are required for reapplication" });
    }

    if (req.user.role !== ROLES.ALUMNI) {
      return res.status(403).json({ message: "Only alumni accounts can reapply" });
    }

    if (req.user.status !== USER_STATUS.REJECTED) {
      return res
        .status(400)
        .json({ message: "Only rejected alumni accounts can submit a reapplication" });
    }

    const verification = await AlumniVerification.findOne({ userId: req.user._id });
    if (!verification) {
      return res.status(404).json({ message: "Verification record not found" });
    }

    verification.studentNumber = studentNumber;
    verification.course = course;
    verification.yearGraduated = Number(yearGraduated);
    verification.verificationStatus = VERIFICATION_STATUS.PENDING;
    verification.reviewedBy = null;
    verification.rejectionReason = "";
    await verification.save();

    req.user.status = USER_STATUS.PENDING;
    await req.user.save();

    return res.json({ message: "Reapplication submitted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to process reapplication", error: error.message });
  }
};

module.exports = {
  registerAlumni,
  reapplyAlumni
};

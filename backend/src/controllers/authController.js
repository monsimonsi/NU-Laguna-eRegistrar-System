const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ROLES, USER_STATUS } = require("../constants/enums");

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1d"
  });

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.role === ROLES.ALUMNI && user.status !== USER_STATUS.ACTIVE) {
      return res.status(403).json({
        message:
          user.status === USER_STATUS.PENDING
            ? "Your account is pending registrar verification"
            : "Your account was rejected. Please reapply with updated details."
      });
    }

    return res.json({
      token: signToken(user._id),
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to login", error: error.message });
  }
};

module.exports = { login };

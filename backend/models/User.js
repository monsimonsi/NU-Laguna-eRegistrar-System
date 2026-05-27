const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  id_num: { type: String, default: '' },

  department: { type: String, default: '' },

  program: { type: String, default: '' }, 

  password: { type: String, required: true },

  password_reset_token: { type: String, default: '' },

  password_reset_expires_at: { type: Date, default: null },

  role: {
    type: String,
    enum: ["student", "alumni", "admin"],
    required: true
  },

  status: {
    type: String,
    enum: ["active", "pending", "rejected"],
    default: "active"
  },

  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);
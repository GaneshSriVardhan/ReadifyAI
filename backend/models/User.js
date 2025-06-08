const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: ["Admin", "Student", "Faculty"],
    required: true
  },
  rollNumber: {
    type: String,
    required: function () {
      return this.role === "Student";
    }
  },
  password: { type: String, required: true },
  verificationOtp: { type: String }, // Store OTP for signup verification
  otpExpires: { type: Date }, // OTP expiration time
  isVerified: { type: Boolean, default: false }, // Track verification status
  booksCanRequest: {
    type: Number,
    default: function () {
      return this.role === "Student" ? 3 : null;
    },
    min: [0, "Books that can be requested cannot be negative"]
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);

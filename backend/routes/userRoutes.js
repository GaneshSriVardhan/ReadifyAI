const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const router = express.Router();

// Configure nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify SMTP connection at startup
transporter.verify((err, success) => {
  if (err) {
    console.error("SMTP connection error:", err.message);
  } else {
    console.log("SMTP connection verified successfully");
  }
});

console.log("User routes loaded");

// Generate a 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: `"ReadifyAI" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "ReadifyAI Email Verification OTP",
    text: `Your verification OTP is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your verification OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP email sent to:", email);
  } catch (err) {
    console.error("Error sending OTP email:", err.message);
    throw new Error(`Failed to send OTP email: ${err.message}`);
  }
};

// Register a user
router.post("/signup", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { name, email, role, rollNumber, password } = req.body;
    console.log("Signup request received:", { name, email, role, rollNumber });
    if (!name || !email || !role || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      role,
      rollNumber: role === "Student" ? rollNumber : undefined,
      password: hashedPassword,
      verificationOtp: otp,
      otpExpires,
      isVerified: false,
      booksCanRequest: role === "Student" ? 3 : null,
    });
    await newUser.save();

    await sendOtpEmail(email, otp);

    res.status(201).json({ message: "User created. Please verify your email with OTP." });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { email, otp } = req.body;
    console.log("Verify OTP request:", { email, otp }); // Debugging
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    if (user.verificationOtp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.verificationOtp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Error verifying OTP:", err.message);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Resend OTP
router.post("/resend-otp", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { email } = req.body;
    console.log("Resend OTP request:", { email });
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.verificationOtp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOtpEmail(email, otp);

    res.status(200).json({ message: "New OTP sent to your email" });
  } catch (err) {
    console.error("Error resending OTP:", err.message);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Forgot password
router.post("/forgot-password", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.verificationOtp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOtpEmail(email, otp);

    res.status(200).json({ message: "Password reset OTP sent to your email" });
  } catch (err) {
    console.error("Error sending reset OTP:", err.message);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Update password
router.post("/update-password", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ message: "Email, OTP, and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verificationOtp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.verificationOtp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error updating password:", err.message);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Get user role
router.post("/get-role", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ role: user.role });
  } catch (err) {
    console.error("Error fetching role:", err.message);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Get user details
router.post("/get-user-details", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { email } = req.body;
    console.log("Fetching user details for:", { email });
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber || "",
        booksCanRequest: user.role === "Student" ? (user.booksCanRequest ?? 3) : null,
      },
    });
  } catch (err) {
    console.error("Error fetching user details:", err.message);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});
// Login user
router.post("/login", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { email, password, role } = req.body;
    console.log("Login request received:", { email, role });

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    // Validate role
    if (user.role !== role) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Return user data
    res.status(200).json({
      message: "Login successful",
      user: {
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Verify Password Reset OTP
router.post("/verify-reset-otp", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { email, otp } = req.body;
    console.log("Verify Reset OTP request:", { email, otp });
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verificationOtp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("Error verifying reset OTP:", err.message);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});
router.post("/change-password", async (req, res) => {
  console.log("Received request to update password");
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({ message: "Password updated successfully in MongoDB" });
  } catch (err) {
    console.error("Error updating password:", err.message);
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;
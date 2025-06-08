const mongoose = require("mongoose");

const issueRequestSchema = new mongoose.Schema({
  bookId: { type: String, required: true },
  title: { type: String, required: true },
  email: { type: String, required: true },
  role: {
    type: String,
    enum: ["Student", "Faculty"],
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Issued", "Rejected", "Returned"],
    default: "Pending"
  },
  requestedAt: { type: Date, default: Date.now },
  returnDate: {
    type: Date,
    required: function () {
      return this.status === "Issued" && this.role === "Student";
    }
  },
  finePerDay: {
    type: Number,
    required: function () {
      return this.status === "Issued" && this.role === "Student";
    },
    min: [0, "Fine per day cannot be negative"]
  },
  reasonForRejection: {
    type: String,
    required: function () {
      return this.status === "Rejected";
    }
  }
}, { 
  timestamps: true,
  collection: "issueRequests"
});

module.exports = mongoose.model("IssueRequest", issueRequestSchema, "issueRequests");
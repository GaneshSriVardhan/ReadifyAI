const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
  bookId: { type: String, required: true },
  title: { type: String, required: true },
  email: { type: String, required: true },
  role: {
    type: String,
    enum: ["Student", "Faculty", "Admin"],
    required: true
  }
}, { 
  timestamps: true,
  collection: "favorites"
});

module.exports = mongoose.model("Favorite", favoriteSchema, "favorites");
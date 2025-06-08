const express = require("express");
const nodemailer = require("nodemailer");
const Favorite = require("../models/Favorite");
const User = require("../models/User");

const router = express.Router();

console.log("Favorite routes initialized");


// Create a new favorite
router.post("/save-favorite", async (req, res) => {
  try {
    const { bookId, title, email } = req.body;
    console.log("Received save-favorite:", { bookId, title, email });

    if (!bookId || !title || !email) {
      console.error("Missing fields:", { bookId, title, email });
      return res.status(400).json({ message: "Book ID, title, and email are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.error("User not found:", email);
      return res.status(401).json({ message: "Invalid user" });
    }
    if (!["Student", "Faculty", "Admin"].includes(user.role)) {
      console.error("Invalid role:", user.role);
      return res.status(400).json({ message: "Invalid user role" });
    }

    const favoriteExists = await Favorite.findOne({ bookId, email });
    if (favoriteExists) {
      console.log("Duplicate favorite:", favoriteExists);
      return res.status(400).json({ message: "Book already in favorites" });
    }

    const newFavorite = new Favorite({
      bookId,
      title,
      email,
      role: user.role,
    });

    console.log("Attempting to save to MongoDB:", newFavorite);
    const savedFavorite = await newFavorite.save();
    console.log("Saved to MongoDB:", savedFavorite);


    res.status(201).json({
      message: "Favorite added successfully",
      favorite: savedFavorite,
    });
  } catch (err) {
    console.error("Error saving favorite:", err.message);
    res.status(500).json({
      message: "Failed to save favorite",
      error: err.message,
    });
  }
});

// Get all favorites for a user
router.post("/user-favorites", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Fetching all favorites for:", { email });

    if (!email) {
      console.error("Missing email in request");
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.error("User not found:", email);
      return res.status(401).json({ message: "Invalid user" });
    }
    if (!["Student", "Faculty", "Admin"].includes(user.role)) {
      console.error("Invalid role:", user.role);
      return res.status(403).json({ message: "Access restricted" });
    }

    const favorites = await Favorite.find({ email }).sort({ createdAt: -1 });
    console.log("Query result:", { count: favorites.length, favorites });
    res.status(200).json({ favorites });
  } catch (err) {
    console.error("Error fetching user favorites:", err.message);
    res.status(500).json({ message: "Failed to fetch user favorites: " + err.message });
  }
});

// Delete a favorite
router.delete("/remove-favorite", async (req, res) => {
  try {
    const { bookId, email } = req.body;
    console.log("Received remove-favorite:", { bookId, email });

    if (!bookId || !email) {
      console.error("Missing fields:", { bookId, email });
      return res.status(400).json({ message: "Book ID and email are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.error("User not found:", email);
      return res.status(401).json({ message: "Invalid user" });
    }
    if (!["Student", "Faculty", "Admin"].includes(user.role)) {
      console.error("Invalid role:", user.role);
      return res.status(400).json({ message: "Invalid user role" });
    }

    const favorite = await Favorite.findOneAndDelete({ bookId, email });
    if (!favorite) {
      console.error("Favorite not found:", { bookId, email });
      return res.status(404).json({ message: "Favorite not found" });
    }

    console.log("Favorite deleted:", favorite);

    

    res.status(200).json({
      message: "Favorite removed successfully",
      favorite,
    });
  } catch (err) {
    console.error("Error removing favorite:", err.message);
    res.status(500).json({
      message: "Failed to remove favorite",
      error: err.message,
    });
  }
});

module.exports = router;
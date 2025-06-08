const express = require("express");
const nodemailer = require("nodemailer");
const IssueRequest = require("../models/IssueRequest");
const User = require("../models/User");

const router = express.Router();

console.log("IssueRequest routes initialized");

// Create a new issue request
router.post("/save-request", async (req, res) => {
  try {
    const { bookId, title, email } = req.body;
    console.log("Received save-request:", { bookId, title, email });

    if (!bookId || !title || !email) {
      console.error("Missing fields:", { bookId, title, email });
      return res.status(400).json({ message: "Book ID, title, and email are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.error("User not found:", email);
      return res.status(401).json({ message: "Invalid user" });
    }
    if (!["Student", "Faculty"].includes(user.role)) {
      console.error("Invalid role:", user.role);
      return res.status(400).json({ message: "User must be Student or Faculty" });
    }

    if (user.role === "Student") {
      if (user.booksCanRequest === null) {
        await User.findByIdAndUpdate(user._id, { booksCanRequest: 3 });
        user.booksCanRequest = 3;
      }
      if (user.booksCanRequest <= 0) {
        console.error("No books can be requested:", email);
        return res.status(403).json({ message: "No more books can be requested" });
      }
    }

    const requestExists = await IssueRequest.findOne({ 
      bookId, 
      email, 
      status: "Pending" 
    });
    if (requestExists) {
      console.log("Duplicate request:", requestExists);
      return res.status(400).json({ message: "Request already exists for this book" });
    }

    const newRequest = new IssueRequest({
      bookId,
      title,
      email,
      role: user.role,
      status: "Pending",
      requestedAt: new Date(),
    });

    console.log("Attempting to save to MongoDB:", newRequest);
    const savedRequest = await newRequest.save();
    console.log("Saved to MongoDB:", savedRequest);

    res.status(201).json({ 
      message: "Request created successfully", 
      request: savedRequest 
    });
  } catch (err) {
    console.error("Error saving request:", err.message);
    res.status(500).json({ 
      message: "Failed to save request", 
      error: err.message 
    });
  }
});

// Get all requests for a user (Student or Faculty)
router.post("/user-requests", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Fetching all requests for:", { email });

    if (!email) {
      console.error("Missing email in request");
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.error("User not found:", email);
      return res.status(401).json({ message: "Invalid user" });
    }
    if (!["Student", "Faculty"].includes(user.role)) {
      console.error("Invalid role:", user.role);
      return res.status(403).json({ message: "Access restricted to Students and Faculty" });
    }

    const requests = await IssueRequest.find({ email }).sort({ requestedAt: -1 });
    console.log("Query result:", { count: requests.length, requests });
    res.status(200).json({ requests });
  } catch (err) {
    console.error("Error fetching user requests:", err.message);
    res.status(500).json({ message: "Failed to fetch user requests: " + err.message });
  }
});

// Update request status (admin only)
router.post("/update-status", async (req, res) => {
  console.log("Reached /api/issueRequests/update-status endpoint");
  try {
    const { id, status, email, returnDate, finePerDay, reasonForRejection } = req.body;
    console.log("Updating request:", { id, status, email, returnDate, finePerDay, reasonForRejection });

    if (!id || !status || !email) {
      console.error("Missing fields:", { id, status, email });
      return res.status(400).json({ message: "ID, status, and email are required" });
    }
    if (!["Pending", "Issued", "Rejected", "Returned"].includes(status)) {
      console.error("Invalid status:", status);
      return res.status(400).json({ message: "Invalid status" });
    }
    if (status === "Rejected" && !reasonForRejection) {
      console.error("Missing reason for rejection");
      return res.status(400).json({ message: "Reason for rejection is required" });
    }

    const user = await User.findOne({ email });
    console.log("User query result:", user);
    if (!user) {
      console.error("User not found:", email);
      return res.status(401).json({ message: "Invalid user" });
    }
    if (user.role !== "Admin") {
      console.error("Non-admin update attempt:", email);
      return res.status(403).json({ message: "Admin access required" });
    }

    const request = await IssueRequest.findById(id);
    if (!request) {
      console.error("Request not found:", id);
      return res.status(404).json({ message: "Request not found" });
    }

    const requestUser = await User.findOne({ email: request.email });
    if (!requestUser) {
      console.error("Request user not found:", request.email);
      return res.status(404).json({ message: "Request user not found" });
    }

    if (status === "Issued" && requestUser.role === "Student") {
      if (!returnDate || !finePerDay) {
        console.error("Missing returnDate or finePerDay for student");
        return res.status(400).json({ message: "Return date and fine per day are required for student requests" });
      }
      if (requestUser.booksCanRequest === null) {
        await User.findByIdAndUpdate(requestUser._id, { booksCanRequest: 3 });
        requestUser.booksCanRequest = 3;
      }
      if (requestUser.booksCanRequest <= 0) {
        console.error("No books can be issued:", request.email);
        return res.status(403).json({ message: "No more books can be issued for this student" });
      }
      request.returnDate = new Date(returnDate);
      request.finePerDay = parseFloat(finePerDay);
      await User.findByIdAndUpdate(requestUser._id, { $inc: { booksCanRequest: -1 } });
    } else if (status === "Issued" && requestUser.role === "Faculty") {
      request.returnDate = null;
      request.finePerDay = null;
    } else if (status === "Returned" && requestUser.role === "Student") {
      if (requestUser.booksCanRequest === null) {
        await User.findByIdAndUpdate(requestUser._id, { booksCanRequest: 3 });
      }
      await User.findByIdAndUpdate(requestUser._id, { $inc: { booksCanRequest: 1 } });
      request.fine = 0; // Reset fine on return
    } else if (status === "Rejected") {
      request.reasonForRejection = reasonForRejection;
    }

    request.status = status;
    const updatedRequest = await request.save();
    console.log("Request updated:", updatedRequest);

    res.status(200).json({ 
      message: "Status updated successfully", 
      request: updatedRequest 
    });
  } catch (err) {
    console.error("Error updating request:", err.message);
    res.status(500).json({ message: "Failed to update request: " + err.message });
  }
});

// Calculate fines for overdue books (admin only)
router.post("/calculate-fines", async (req, res) => {
  console.log("Reached /api/issueRequests/calculate-fines endpoint");
  try {
    const { email } = req.body;
    console.log("Calculating fines, admin email:", { email });

    if (!email) {
      console.error("Missing admin email in request");
      return res.status(400).json({ message: "Admin email is required" });
    }

    const admin = await User.findOne({ email });
    console.log("Admin query result:", { email, found: !!admin, role: admin?.role });
    if (!admin) {
      console.error("Admin not found:", email);
      return res.status(401).json({ message: "Invalid admin" });
    }
    if (admin.role !== "Admin") {
      console.error("Non-admin access attempt:", email);
      return res.status(403).json({ message: "Admin access required" });
    }

    const issuedBooks = await IssueRequest.find({ status: "Issued", role: "Student" });
    console.log(`Found ${issuedBooks.length} issued books for fine calculation`);

    const today = new Date();
    let updatedCount = 0;
    const updatedBooks = [];

    for (const book of issuedBooks) {
      if (!book.returnDate || !book.finePerDay) {
        console.warn(`Skipping fine calculation for book ${book._id}: missing returnDate or finePerDay`);
        continue;
      }

      const returnDate = new Date(book.returnDate);
      const daysOverdue = Math.max(0, Math.floor((today - returnDate) / (1000 * 60 * 60 * 24)));
      const fine = daysOverdue * parseFloat(book.finePerDay);

      if (fine !== book.fine) {
        await IssueRequest.findByIdAndUpdate(book._id, { fine });
        console.log(`Updated fine for book ${book._id}: $${fine} (${daysOverdue} days overdue)`);
        updatedCount++;
        updatedBooks.push({ id: book._id, title: book.title, fine, daysOverdue });
      } else if (book.fine !== 0 && daysOverdue === 0) {
        await IssueRequest.findByIdAndUpdate(book._id, { fine: 0 });
        console.log(`Reset fine for book ${book._id} to $0`);
        updatedCount++;
        updatedBooks.push({ id: book._id, title: book.title, fine: 0, daysOverdue: 0 });
      }
    }

    res.status(200).json({ 
      message: `Fines calculated and updated for ${updatedCount} books`,
      updatedCount,
      updatedBooks
    });
  } catch (err) {
    console.error("Error processing fines:", err.message);
    res.status(500).json({ message: "Failed to process fines: " + err.message });
  }
});

// Get unique users with issued books and their roles (admin only)
router.post("/issued-users", async (req, res) => {
  console.log("Reached /api/issueRequests/issued-users endpoint");
  try {
    const { email } = req.body;
    console.log("Fetching issued users for:", { email });

    if (!email) {
      console.error("Missing email in request");
      return res.status(400).json({ message: "Admin email is required" });
    }

    const admin = await User.findOne({ email });
    console.log("Admin query result:", { email, found: !!admin, role: admin?.role });
    if (!admin) {
      console.error("Admin not found:", email);
      return res.status(401).json({ message: "Admin user not found" });
    }
    if (admin.role !== "Admin") {
      console.error("Non-admin access attempt:", email);
      return res.status(403).json({ message: "Admin access required" });
    }

    const issuedRequests = await IssueRequest.find({ status: "Issued" });
    console.log("Issued requests found:", { count: issuedRequests.length });

    const userEmails = [...new Set(issuedRequests
      .filter(request => request.email)
      .map(request => request.email))];
    console.log("Unique users:", { count: userEmails.length, userEmails });

    const users = await User.find(
      { email: { $in: userEmails } },
      { email: 1, role: 1, _id: 0 }
    );
    console.log("Users found:", { count: users.length, users: users.map(u => ({ email: u.email, role: u.role })) });

    const usersWithRoles = users
      .map(user => ({ email: user.email, role: user.role }))
      .sort((a, b) => a.email.localeCompare(b.email));

    console.log("Returning users:", { count: usersWithRoles.length, usersWithRoles });

    res.status(200).json({ users: usersWithRoles });
  } catch (err) {
    console.error("Error fetching issued users:", err.message);
    res.status(500).json({ message: "Failed to fetch issued users: " + err.message });
  }
});

// Get issued books by email (admin only)
router.post("/issued-by-email", async (req, res) => {
  console.log("Reached /api/issueRequests/issued-by-email endpoint");
  try {
    const { email, userEmail } = req.body;
    console.log("Fetching issued books for:", { email, userEmail });

    if (!email || !userEmail) {
      console.error("Missing email or userEmail in request");
      return res.status(400).json({ message: "Admin email and user email are required" });
    }

    const admin = await User.findOne({ email });
    console.log("Admin query result:", { email, found: !!admin, role: admin?.role });
    if (!admin) {
      console.error("Admin not found:", email);
      return res.status(401).json({ message: "Invalid admin" });
    }
    if (admin.role !== "Admin") {
      console.error("Non-admin access attempt:", email);
      return res.status(403).json({ message: "Admin access required" });
    }

    const user = await User.findOne({ email: userEmail });
    console.log("User query result:", { userEmail, found: !!user });
    if (!user) {
      console.error("User not found:", userEmail);
      return res.status(404).json({ message: "User not found" });
    }

    const issuedBooks = await IssueRequest.find({ 
      email: userEmail, 
      status: "Issued" 
    });
    console.log("Query result:", { count: issuedBooks.length, books: issuedBooks.map(b => ({ id: b._id, title: b.title })) });
    res.status(200).json({ issuedBooks });
  } catch (err) {
    console.error("Error fetching issued books:", err.message);
    res.status(500).json({ message: "Failed to fetch issued books: " + err.message });
  }
});

// Get all issue requests (admin only)
router.post("/all", async (req, res) => {
  console.log("Reached /api/issueRequests/all endpoint");
  try {
    const { email } = req.body;
    console.log("Fetching all requests for admin:", { email });

    if (!email) {
      console.error("Missing email in request");
      return res.status(400).json({ message: "Admin email is required" });
    }

    const admin = await User.findOne({ email });
    console.log("Admin query result:", { email, found: !!admin, role: admin?.role });
    if (!admin) {
      console.error("Admin not found:", email);
      return res.status(401).json({ message: "Admin user not found" });
    }
    if (admin.role !== "Admin") {
      console.error("Non-admin access attempt:", email);
      return res.status(403).json({ message: "Admin access required" });
    }

    const requests = await IssueRequest.find({}).sort({ requestedAt: -1 });
    console.log("Query result:", { count: requests.length, requests: requests.map(r => ({ id: r._id, title: r.title, email: r.email, status: r.status })) });
    res.status(200).json({ requests });
  } catch (err) {
    console.error("Error fetching all requests:", err.message);
    res.status(500).json({ message: "Failed to fetch all requests: " + err.message });
  }
});

module.exports = router;
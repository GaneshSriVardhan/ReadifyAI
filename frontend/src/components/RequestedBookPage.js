import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import bg1 from "../styles/h.png";
import "../styles/fonts.css";

const RequestedBooksPage = () => {
  const [requests, setRequests] = useState([]);
  const [coverUrls, setCoverUrls] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [returnDate, setReturnDate] = useState("");
  const [finePerDay, setFinePerDay] = useState("");
  const [reasonForRejection, setReasonForRejection] = useState("");
  const navigate = useNavigate();
  const requestsPerPage = 4;
  const placeholderImage = "https://via.placeholder.com/128x192?text=No+Cover";

  // Check admin role
  useEffect(() => {
    const checkAdmin = () => {
      try {
        const userRaw = localStorage.getItem("user");
        console.log("RequestedBooks user from localStorage:", userRaw);
        if (!userRaw) {
          setError("No user data found. Redirecting to login...");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }
        const user = JSON.parse(userRaw);
        if (!user.email || user.role !== "Admin") {
          setError("Access denied. Admins only. Redirecting to Home...");
          setTimeout(() => navigate("/Home"), 3000);
        }
      } catch (err) {
        console.error("Error reading localStorage:", err.message);
        setError("Failed to verify user. Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      }
    };
    checkAdmin();
  }, [navigate]);

  // Fetch cover images for requests
  useEffect(() => {
    const fetchCoverUrls = async () => {
      const newCoverUrls = {};
      for (const request of requests) {
        if (request.bookId) {
          try {
            const workId = request.bookId.split("/").pop();
            const res = await fetch(`https://openlibrary.org/works/${workId}.json`);
            const data = await res.json();
            const coverId = data?.covers?.at(-1);
            newCoverUrls[request._id] = coverId
              ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
              : placeholderImage;
          } catch (err) {
            console.error(`Error fetching cover for book ${request.bookId}:`, err.message);
            newCoverUrls[request._id] = placeholderImage;
          }
        } else {
          newCoverUrls[request._id] = placeholderImage;
        }
      }
      setCoverUrls(newCoverUrls);
    };

    if (requests.length > 0) {
      fetchCoverUrls();
    }
  }, [requests]);

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const userRaw = localStorage.getItem("user");
      console.log("localStorage contents:", { userRaw });
      if (!userRaw) {
        throw new Error("No user data found. Please log in.");
      }
      const user = JSON.parse(userRaw);
      if (!user.email) {
        throw new Error("Invalid user data. Please log in again.");
      }

      console.log("Sending fetch request to /api/issueRequests/all with:", { email: user.email });
      const response = await fetch("https://elibraryreadifyai.vercel.app/api/issueRequests/all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email }),
      });

      console.log("API response status:", response.status);
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = `Failed to fetch requests: ${response.status}`;
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } else {
          const text = await response.text();
          console.log("Non-JSON response:", text);
          errorMessage = `Server returned non-JSON response: ${response.status} ${text.substring(0, 100)}...`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log("API response data:", responseData);

      let requestsData = responseData.requests || [];
      if (!requestsData.length) {
        setError("No requests found in the database. Ensure requests have been submitted.");
        setRequests([]);
        setLoading(false);
        return;
      }

      setRequests(requestsData);
    } catch (err) {
      console.error("Error fetching requests:", err.message);
      setError(`Failed to load requests: ${err.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle issue action with modal
  const handleIssueClick = (requestId) => {
    setSelectedRequestId(requestId);
    const request = requests.find(r => r._id === requestId);
    if (request.role === "Student") {
      setModalOpen(true);
    } else {
      handleAction(requestId, "Issued", null, null, true);
    }
  };

  // Handle reject action with modal
  const handleRejectClick = (requestId) => {
    setSelectedRequestId(requestId);
    setRejectModalOpen(true);
  };

  // Handle action (issue or reject)
  const handleAction = useCallback(
    async (id, newStatus, returnDate = null, finePerDay = null, showAlert = true, reasonForRejection = null) => {
      setError("");
      try {
        const userRaw = localStorage.getItem("user");
        if (!userRaw) {
          throw new Error("No user data found. Please log in.");
        }
        const user = JSON.parse(userRaw);
        if (!user.email) {
          throw new Error("Invalid user data. Please log in again.");
        }

        const requestBody = { id, status: newStatus, email: user.email };
        if (newStatus === "Issued" && returnDate && finePerDay) {
          requestBody.returnDate = returnDate;
          requestBody.finePerDay = parseFloat(finePerDay);
        }
        if (newStatus === "Rejected" && reasonForRejection) {
          requestBody.reasonForRejection = reasonForRejection;
        }

        console.log(`Sending update request to /api/issueRequests/update-status:`, requestBody);
        const response = await fetch("https://elibraryreadifyai.vercel.app/api/issueRequests/update-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        console.log("API response status:", response.status);
        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          let errorMessage = `Failed to update status: ${response.status}`;
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } else {
            const text = await response.text();
            console.log("Non-JSON response:", text);
            errorMessage = `Server returned non-JSON response: ${response.status} ${text.substring(0, 100)}...`;
          }
          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        console.log("API response data:", responseData);

        if (showAlert) {
          alert(`Request ${newStatus === "Issued" ? "issued" : "rejected"} successfully.`);
        }
        setModalOpen(false);
        setRejectModalOpen(false);
        setReturnDate("");
        setFinePerDay("");
        setReasonForRejection("");
        await fetchRequests();
      } catch (err) {
        console.error("Error updating request status:", err.message);
        setError(`Failed to update status: ${err.message}. Please try again.`);
      }
    },
    [fetchRequests]
  );

  // Call fetchRequests on component mount
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Pagination logic
  const indexOfLast = currentPage * requestsPerPage;
  const indexOfFirst = indexOfLast - requestsPerPage;
  const currentRequests = requests.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(requests.length / requestsPerPage);

  if (error && !loading && !requests.length) {
    return (
      <div className="min-h-screen relative text-white font-[Eczar]">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${bg1})` }} />
        <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
        <div className="relative z-10 p-10 max-w-md mx-auto bg-green-900 bg-opacity-80 rounded-lg text-center">
          <p className="text-green-500 font-bold text-lg mb-4">{error}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={fetchRequests}
              className="bg-yellow-500 hover:bg-yellow-gray text-gray-800 font-bold py-2 px-6 rounded-full"
            >
              Retry
            </button>
            <Link
              to="/Home"
              className="bg-green-500 hover:bg-green-600 text-gray-800 font-bold py-2 px-6 rounded-full"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative text-white font-[Eczar]">
      <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${bg1})` }} />
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>

      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-5xl font-[Lancelot] text-center flex-1">Requested Books</h1>
          <div className="flex space-x-4">
            <Link
              to="/Home"
              className="bg-green-500 hover:bg-green-600 text-gray-800 font-bold py-2 px-6 rounded-full"
            >
              Home
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 px-6 rounded-full"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex justify-center mb-4">
          <button
            onClick={fetchRequests}
            className="bg-yellow-500 hover:bg-yellow-gray text-gray-800 font-bold py-2 px-6 rounded-full"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh Requests"}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center">
            <svg
              className="animate-spin h-10 w-10 text-green-400"
              xmlns="https://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <p className="ml-4 text-lg">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center">
            <p className="text-lg mb-4">{error || "No requests found."}</p>
            <button
              onClick={fetchRequests}
              className="bg-yellow-500 hover:bg-yellow-gray text-gray-800 font-bold py-2 px-6 rounded-full"
              disabled={loading}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {currentRequests.map((request) => (
                <div
                  key={request._id}
                  className="bg-green-900 bg-opacity-80 p-4 rounded-xl flex flex-col items-center text-center"
                >
                  <div className="w-32 h-44 bg-gray-200 animate-pulse rounded mb-4" />
                  <img
                    src={coverUrls[request._id] || placeholderImage}
                    alt={request.title || "Book cover"}
                    className="w-32 h-44 object-cover mb-4 rounded absolute"
                    onError={(e) => (e.target.src = placeholderImage)}
                    style={{ display: coverUrls[request._id] ? "block" : "none" }}
                    onLoad={(e) => (e.target.style.display = "block")}
                  />
                  <p className="text-lg font-semibold mb-1 truncate w-full">{request.title}</p>
                  <p className="text-sm mb-1">Requested by: {request.email}</p>
                  <p className="text-sm mb-1">Status: {request.status}</p>
                  <p className="text-sm mb-1">Role: {request.role}</p>
                  {request.status === "Rejected" && request.reasonForRejection && (
                    <p className="text-sm mb-2 text-red-400">Reason: {request.reasonForRejection}</p>
                  )}
                  <button
                    onClick={() => handleIssueClick(request._id)}
                    disabled={request.status !== "Pending"}
                    className={`bg-yellow-500 hover:bg-yellow-gray text-gray-800 font-bold py-1 px-4 rounded-full m-1 ${
                      request.status !== "Pending" ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Issue
                  </button>
                  <button
                    onClick={() => handleRejectClick(request._id)}
                    disabled={request.status !== "Pending"}
                    className={`bg-red-500 hover:bg-red-400 text-white font-bold py-1 px-4 rounded-full m-1 ${
                      request.status !== "Pending" ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Reject
                  </button>
                </div>
              ))}
            </div>

            {/* Modal for return date and fine */}
            {modalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20">
                <div className="bg-green-900 bg-opacity-80 p-6 rounded-lg text-white">
                  <h2 className="text-2xl mb-4">Issue Book</h2>
                  <div className="mb-4">
                    <label className="block mb-2">Return Date</label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full p-2 rounded text-gray-800"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2">Fine per Day</label>
                    <input
                      type="number"
                      value={finePerDay}
                      onChange={(e) => setFinePerDay(e.target.value)}
                      className="w-full p-2 rounded text-gray-800"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => {
                        setModalOpen(false);
                        setReturnDate("");
                        setFinePerDay("");
                      }}
                      className="bg-red-500 hover:bg-red-400 text-white py-2 px-4 rounded-full"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAction(selectedRequestId, "Issued", returnDate, finePerDay)}
                      disabled={!returnDate || !finePerDay}
                      className={`bg-yellow-500 hover:bg-yellow-gray text-gray-800 py-2 px-4 rounded-full ${
                        !returnDate || !finePerDay ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Confirm Issue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal for rejection reason */}
            {rejectModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20">
                <div className="bg-green-900 bg-opacity-80 p-6 rounded-lg text-white">
                  <h2 className="text-2xl mb-4">Reject Book Request</h2>
                  <div className="mb-4">
                    <label className="block mb-2">Reason for Rejection</label>
                    <textarea
                      value={reasonForRejection}
                      onChange={(e) => setReasonForRejection(e.target.value)}
                      className="w-full p-2 rounded text-gray-800"
                      rows="4"
                      placeholder="Enter reason for rejection"
                    />
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => {
                        setRejectModalOpen(false);
                        setReasonForRejection("");
                      }}
                      className="bg-red-500 hover:bg-red-400 text-white py-2 px-4 rounded-full"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAction(selectedRequestId, "Rejected", null, null, true, reasonForRejection)}
                      disabled={!reasonForRejection}
                      className={`bg-yellow-500 hover:bg-yellow-gray text-gray-800 py-2 px-4 rounded-full ${
                        !reasonForRejection ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Confirm Reject
                    </button>
                  </div>
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`bg-green-800 hover:bg-green-700 text-white py-1 px-4 rounded-full mx-2 ${
                    currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Prev
                </button>
                <span className="py-1 px-4">{`Page ${currentPage} of ${totalPages}`}</span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`bg-green-800 hover:bg-green-700 text-white py-1 px-4 rounded-full mx-2 ${
                    currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RequestedBooksPage;
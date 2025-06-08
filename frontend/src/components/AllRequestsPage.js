import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import bg1 from "../styles/h.png";
import "../styles/fonts.css";

const AllRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [coverUrls, setCoverUrls] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const requestsPerPage = 4;
  const placeholderImage = "https://via.placeholder.com/128x192?text=No+Cover";

  // Check user role (Student or Faculty)
  useEffect(() => {
    const checkUser = () => {
      try {
        const userRaw = localStorage.getItem("user");
        console.log("AllRequests user from localStorage:", userRaw);
        if (!userRaw) {
          setError("No user data found. Redirecting to login...");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }
        const user = JSON.parse(userRaw);
        if (!user.email || !["Student", "Faculty"].includes(user.role)) {
          setError("Access denied. Students and Faculty only. Redirecting to Home...");
          setTimeout(() => navigate("/Home"), 3000);
        }
      } catch (err) {
        console.error("Error reading localStorage:", err.message);
        setError("Failed to verify user. Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      }
    };
    checkUser();
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

  // Fetch all requests for the logged-in user
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

      console.log("Sending fetch request to /api/issueRequests/user-requests with:", { email: user.email });
      const response = await fetch("https://elibraryreadifyai.vercel.app/api/issueRequests/user-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email }),
      });

      console.log("API response status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.log("API response text:", text);
        let errorMessage = `Failed to fetch requests: ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Response is not JSON:", e.message);
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log("API response data:", responseData);

      let requestsData = responseData.requests || [];
      if (!requestsData.length) {
        setError("No requests found for this user.");
        setRequests([]);
        setLoading(false);
        return;
      }

      setRequests(requestsData);
    } catch (err) {
      console.error("Error fetching requests:", err.message);
      setError(`Failed to load requests: ${err.message}. Please try again.`);
      if (err.message.includes("Please log in")) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Calculate fines for issued books
  const handleCalculateFines = useCallback(async () => {
    if (!window.confirm("Are you sure you want to recalculate fines for all issued books?")) return;
    setError("");
    try {
      const userRaw = localStorage.getItem("user");
      if (!userRaw) {
        throw new Error("No user data found. Please log in.");
      }
      const user = JSON.parse(userRaw);
      if (!user.email || user.role !== "Admin") {
        throw new Error("Admin access required to calculate fines.");
      }

      console.log("Calculating fines for all issued books");
      const response = await fetch("https://elibraryreadifyai.vercel.app/api/issueRequests/calculate-fines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      console.log("calculate-fines response status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.log("calculate-fines response text:", text);
        let errorMessage = `Failed to calculate fines: ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Response is not JSON:", e.message);
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log("calculate-fines response data:", responseData);
      alert(`Fines updated for ${responseData.updatedCount} books.`);
      fetchRequests(); // Refresh requests to get updated fines
    } catch (err) {
      console.error("Error calculating fines:", err.message);
      setError(`Failed to calculate fines: ${err.message}. Please try again.`);
    }
  }, [fetchRequests]);

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
              className="bg-yellow-500 hover:bg-yellow-400 text-gray-800 font-bold py-2 px-6 rounded-full"
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
          <h1 className="text-5xl font-[Lancelot] text-center flex-1">My Book Requests</h1>
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

        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={fetchRequests}
            className="bg-yellow-500 hover:bg-yellow-400 text-gray-800 font-bold py-2 px-6 rounded-full"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh Requests"}
          </button>
          {JSON.parse(localStorage.getItem("user") || "{}").role === "Admin" && (
            <button
              onClick={handleCalculateFines}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full"
              disabled={loading}
            >
              Calculate Fines
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center">
            <svg
              className="animate-spin h-10 w-10 text-green-400"
              xmlns="http://www.w3.org/2000/svg"
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
              className="bg-yellow-500 hover:bg-yellow-400 text-gray-800 font-bold py-2 px-6 rounded-full"
              disabled={loading}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {currentRequests.map((request) => {
                const daysLeft = request.returnDate
                  ? Math.ceil((new Date(request.returnDate) - new Date()) / (1000 * 60 * 60 * 24))
                  : null;
                const isOverdue = request.returnDate && daysLeft < 0;
                const calculatedFine = isOverdue && request.finePerDay
                  ? Math.abs(daysLeft) * request.finePerDay
                  : request.fine || 0;
                const fineStatus = isOverdue
                  ? "Overdue"
                  : daysLeft === 0
                  ? "Due Today"
                  : daysLeft
                  ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                  : "No due date";
                const fineDisplay =
                  request.finePerDay && request.returnDate && typeof calculatedFine === "number"
                    ? `$${calculatedFine.toFixed(2)}`
                    : "N/A";

                return (
                  <div
                    key={request._id}
                    className={`bg-green-900 bg-opacity-80 p-4 rounded-xl flex flex-col items-center text-center relative ${
                      isOverdue ? "border-2 border-red-500" : ""
                    }`}
                    title={
                      fineDisplay === "N/A"
                        ? "No fine data (missing return date or fine rate)"
                        : `Fine: ${fineDisplay} (${fineStatus})`
                    }
                  >
                    <div className="w-32 h-44 bg-gray-200 animate-pulse rounded mb-4" />
                    <img
                      src={coverUrls[request._id] || placeholderImage}
                      alt={request.title}
                      className="w-32 h-44 object-cover mb-4 rounded absolute"
                      onError={(e) => (e.target.src = placeholderImage)}
                      style={{ display: coverUrls[request._id] ? "block" : "none" }}
                      onLoad={(e) => (e.target.style.display = "block")}
                    />
                    <p className="text-lg font-semibold mb-1 truncate w-full">{request.title}</p>
                    <p className="text-sm mb-1">Status: {request.status}</p>
                    <p className="text-sm mb-1">Role: {request.role}</p>
                    <p className="text-sm mb-1">
                      Requested: {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                    {request.returnDate && (
                      <p className="text-sm mb-1">
                        Due: {new Date(request.returnDate).toLocaleDateString()}
                      </p>
                    )}
                    {request.finePerDay && request.returnDate && (
                      <p className="text-sm mb-1">Fine Rate: ${request.finePerDay.toFixed(2)}/day</p>
                    )}
                    {request.status === "Issued" && request.role === "Student" && (
                      <p className={`text-sm mb-1 ${isOverdue ? "text-red-400" : ""}`}>
                        Fine: {fineDisplay} {fineStatus !== "N/A" ? `(${fineStatus})` : ""}
                      </p>
                    )}
                    {request.status === "Rejected" && request.reasonForRejection && (
                      <p className="text-sm mb-2 text-red-400">
                        Reason for Rejection: {request.reasonForRejection}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

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

export default AllRequestsPage;

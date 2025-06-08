import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import bg1 from "../styles/h.png";
import "../styles/fonts.css";

const FavoriteBooksPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [coverUrls, setCoverUrls] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const favoritesPerPage = 4;
  const placeholderImage = "https://via.placeholder.com/128x192?text=No+Cover";

  // Check user authentication
  useEffect(() => {
    const checkUser = () => {
      try {
        const userRaw = localStorage.getItem("user");
        console.log("FavoriteBooks user from localStorage:", userRaw);
        if (!userRaw) {
          setError("No user data found. Redirecting to login...");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }
        const user = JSON.parse(userRaw);
        if (!user.email || !["Student", "Faculty", "Admin"].includes(user.role)) {
          setError("Invalid user data or role. Redirecting to login...");
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (err) {
        console.error("Error reading localStorage:", err.message);
        setError("Failed to verify user. Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      }
    };
    checkUser();
  }, [navigate]);

  // Fetch cover images for favorites
  useEffect(() => {
    const fetchCoverUrls = async () => {
      const newCoverUrls = {};
      for (const favorite of favorites) {
        if (favorite.bookId) {
          try {
            const workId = favorite.bookId.split("/").pop();
            const res = await fetch(`https://openlibrary.org/works/${workId}.json`);
            const data = await res.json();
            const coverId = data?.covers?.at(-1);
            newCoverUrls[favorite._id] = coverId
              ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
              : placeholderImage;
          } catch (err) {
            console.error(`Error fetching cover for book ${favorite.bookId}:`, err.message);
            newCoverUrls[favorite._id] = placeholderImage;
          }
        } else {
          newCoverUrls[favorite._id] = placeholderImage;
        }
      }
      setCoverUrls(newCoverUrls);
    };

    if (favorites.length > 0) {
      fetchCoverUrls();
    }
  }, [favorites]);

  // Fetch favorites
  const fetchFavorites = useCallback(async () => {
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

      console.log("Sending fetch request to /api/favorites/user-favorites with:", { email: user.email });
      const response = await fetch("https://elibraryreadifyai.vercel.app/api/favorites/user-favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email }),
      });

      console.log("API response status:", response.status);
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = `Failed to fetch favorites: ${response.status}`;
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

      let favoritesData = responseData.favorites || [];
      if (!favoritesData.length) {
        setError("No favorite books found.");
        setFavorites([]);
        setLoading(false);
        return;
      }

      setFavorites(favoritesData);
    } catch (err) {
      console.error("Error fetching favorites:", err.message);
      setError(`Failed to load favorites: ${err.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle remove favorite
  const handleRemoveFavorite = async (bookId) => {
    try {
      const userRaw = localStorage.getItem("user");
      if (!userRaw) {
        throw new Error("No user data found. Please log in.");
      }
      const user = JSON.parse(userRaw);
      if (!user.email) {
        throw new Error("Invalid user data. Please log in again.");
      }

      console.log("Sending remove request to /api/favorites/remove-favorite:", { bookId, email: user.email });
      const response = await fetch("https://elibraryreadifyai.vercel.app/api/favorites/remove-favorite", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookId, email: user.email }),
      });

      console.log("API response status:", response.status);
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = `Failed to remove favorite: ${response.status}`;
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
      alert("Favorite removed successfully.");
      await fetchFavorites();
    } catch (err) {
      console.error("Error removing favorite:", err.message);
      setError(`Failed to remove favorite: ${err.message}. Please try again.`);
    }
  };

  // Call fetchFavorites on component mount
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Pagination logic
  const indexOfLast = currentPage * favoritesPerPage;
  const indexOfFirst = indexOfLast - favoritesPerPage;
  const currentFavorites = favorites.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(favorites.length / favoritesPerPage);

  if (error && !loading && !favorites.length) {
    return (
      <div className="min-h-screen relative text-white font-[Eczar]">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${bg1})` }} />
        <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
        <div className="relative z-10 p-10 max-w-md mx-auto bg-green-900 bg-opacity-80 rounded-lg text-center">
          <p className="text-green-500 font-bold text-lg mb-4">{error}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={fetchFavorites}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-bold py-2 px-6 rounded-full"
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
          <h1 className="text-5xl font-[Lancelot] text-center flex-1">Favorite Books</h1>
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
            onClick={fetchFavorites}
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-bold py-2 px-6 rounded-full"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh Favorites"}
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
            <p className="ml-4 text-lg">Loading favorites...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center">
            <p className="text-lg mb-4">{error || "No favorite books found."}</p>
            <button
              onClick={fetchFavorites}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-bold py-2 px-6 rounded-full"
              disabled={loading}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {currentFavorites.map((favorite) => (
                <div
                  key={favorite._id}
                  className="bg-green-900 bg-opacity-80 p-4 rounded-xl flex flex-col items-center text-center"
                >
                  <div className="w-32 h-44 bg-gray-200 animate-pulse rounded mb-4" />
                  <img
                    src={coverUrls[favorite._id] || placeholderImage}
                    alt={favorite.title || "Book cover"}
                    className="w-32 h-44 object-cover mb-4 rounded absolute"
                    onError={(e) => (e.target.src = placeholderImage)}
                    style={{ display: coverUrls[favorite._id] ? "block" : "none" }}
                    onLoad={(e) => (e.target.style.display = "block")}
                  />
                  <p className="text-lg font-semibold mb-1 truncate w-full">{favorite.title}</p>
                  <p className="text-sm mb-1">Added by: {favorite.email}</p>
                  <p className="text-sm mb-1">Role: {favorite.role}</p>
                  <button
                    onClick={() => handleRemoveFavorite(favorite.bookId)}
                    className="bg-red-500 hover:bg-red-400 text-white font-bold py-1 px-4 rounded-full m-1"
                  >
                    Remove
                  </button>
                </div>
              ))}
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

export default FavoriteBooksPage;

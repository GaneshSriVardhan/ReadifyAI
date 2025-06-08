import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import bg1 from '../styles/h.png';
import '../styles/fonts.css';

const BookDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [book, setBook] = useState(null);
  const [userRole, setUserRole] = useState('Student');
  const [userEmail, setUserEmail] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const category = location.state?.category || 'fiction';

  useEffect(() => {
    const initializeUser = () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        console.log('BookDetails user from localStorage:', user);
        if (user?.email && user?.role) {
          setUserEmail(user.email);
          setUserRole(user.role);
        } else {
          navigate('/login');
        }
      } catch (err) {
        console.error('Error reading localStorage:', err.message);
        navigate('/login');
      }
    };
    initializeUser();
  }, [navigate]);

  useEffect(() => {
  const fetchBookDetails = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching book with ID:', id);
      const response = await fetch(`https://openlibrary.org/works/${id}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Book data:', data);

      const passedBook = location.state?.book || {};
      const description = typeof data.description === 'string'
        ? data.description
        : data.description?.value || 'No description available.';

      // Fetch author names if available in the API response
      let authors = 'Unknown Author';
      if (data.authors && Array.isArray(data.authors)) {
        const authorPromises = data.authors.map(async (authorObj) => {
          const authorKey = authorObj.author?.key; // e.g., '/authors/OL1234A'
          if (authorKey) {
            const authorResponse = await fetch(`https://openlibrary.org${authorKey}.json`);
            if (authorResponse.ok) {
              const authorData = await authorResponse.json();
              return authorData.name || 'Unknown Author';
            }
          }
          return 'Unknown Author';
        });
        const authorNames = await Promise.all(authorPromises);
        authors = authorNames.filter(name => name !== 'Unknown Author').join(', ') || 'Unknown Author';
      } else if (passedBook.authors?.length) {
        // Fallback to passedBook.authors if available
        authors = passedBook.authors.map(a => a.name).join(', ') || 'Unknown Author';
      }

      const cover = passedBook.cover_id
        ? `https://covers.openlibrary.org/b/id/${passedBook.cover_id}-M.jpg`
        : data.covers?.[0]
          ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`
          : 'https://via.placeholder.com/128x192?text=No+Cover';

      setBook({
        title: data.title || passedBook.title || 'Unknown Title',
        description,
        authors,
        cover,
      });
    } catch (err) {
      console.error('Error fetching book details:', err.message);
      setError('Failed to load book details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (id) {
    fetchBookDetails();
  } else {
    setError('No book ID provided.');
    setLoading(false);
  }
}, [id, location.state]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUserEmail('');
    setUserRole('Student');
    setShowDropdown(false);
    navigate('/login');
  };

  const handleAddToFavorites = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/favorites/save-favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: id,
          title: book.title,
          email: userEmail,
          role: userRole,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      alert('Book added to favorites successfully!');
    } catch (err) {
      console.error('Error adding to favorites:', err.message);
      alert('Failed to add book to favorites. Please try again.');
    }
  };

  const navLinks = userRole === 'Admin'
    ? [
        { to: '/Home', label: 'Home' },
        { to: `/category/${category}`, label: 'Back to Category' },
        { to: '/requested-books', label: 'Requested Books' },
        { to: '/issued-books', label: 'Issued Books' },
        { to: '/about', label: 'About Us' },
      ]
    : [
        { to: '/Home', label: 'Home' },
        { to: `/category/${category}`, label: 'Back to Category' },
        { to: '/favorites', label: 'Favourites' },
        { to: '/issued-books', label: 'Issued Books' },
        { to: '/about', label: 'About Us' },
      ];

  const firstLetter = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  if (loading) {
    return (
      <div
        className="min-h-screen text-white relative"
        style={{ backgroundImage: `url(${bg1})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-black opacity-60 z-0" />
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-4">
            <svg className="animate-spin h-10 w-10 text-green-400" xmlns="https://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <p className="text-white font-[Eczar] text-lg">Loading book details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div
        className="min-h-screen text-white relative"
        style={{ backgroundImage: `url(${bg1})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-black opacity-60 z-0" />
        <div className="relative z-10 p-8 text-center">
          <p className="text-red-500 font-[Eczar] text-lg">{error || 'Book not found.'}</p>
          <Link
            to={`/category/${category}`}
            className="mt-4 inline-block px-5 py-2 bg-green-500 hover:bg-green-600 rounded-full text-black font-semibold font-[Eczar] border-2 border-black"
          >
            Back to Category
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-screen relative text-white font-[Eczar] overflow-x-hidden m-0 p-0">
      <div className="absolute inset-0 bg-cover bg-center opacity-32" style={{ backgroundImage: `url(${bg1})` }}></div>
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>

      <div className="relative z-30 flex items-center justify-between p-4 bg-green-900 bg-opacity-50">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded-full">
            <svg className="w-8 h-8 text-green-800" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L1 9l11 7 9-5.65V20H3v2h18v-9l2-1.3L12 2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold font-[Lancelot] text-white">Readify AI</h1>
        </div>

        <div className="flex space-x-4">
          {navLinks.map((link, index) => (
            <Link
              key={index}
              to={link.to}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-full text-black font-semibold border-2 border-black"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="relative" ref={dropdownRef}>
          <div
            className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-xl font-bold cursor-pointer"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {firstLetter}
          </div>
          {showDropdown && (
            <div className="absolute right-0 mt-4 w-48 bg-green-800 rounded-lg shadow-lg z-50 animate-fade-in">
              <Link
                to="/Profile"
                className="block px-4 py-2 text-white hover:bg-green-600 rounded-t-lg"
                onClick={() => setShowDropdown(false)}
              >
                View Profile
              </Link>
              <Link
                to="/change"
                className="block px-4 py-2 text-white hover:bg-green-600"
                onClick={() => setShowDropdown(false)}
              >
                Update Password
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-white hover:bg-green-600 rounded-b-lg"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex justify-center items-center min-h-[calc(100vh-80px)] p-6">
        <div className="flex flex-col md:flex-row bg-gray-700 rounded-lg p-6 max-w-3xl shadow-lg text-white">
          <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
            <img
              src={book.cover}
              alt={book.title}
              className="w-40 h-56 object-cover rounded-lg"
            />
          </div>

          <div className="flex flex-col justify-between">
            <h2 className="text-2xl font-bold mb-2">{book.title}</h2>
            <p className="text-gray-300 mb-4">{book.description}</p>
            <p className="text-gray-300 mb-2">
              <span className="font-semibold">Author:</span> {book.authors}
            </p>
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => navigate('/request-issue', {
                  state: {
                    id,
                    book,
                    category,
                  },
                })}
                className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-full"
              >
                Ask For Issue Book
              </button>
              <button
                onClick={handleAddToFavorites}
                className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-full"
              >
                Add to Favourite
              </button>
              <button
                onClick={() => navigate('/read', { state: { title: book.title } })}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-full"
              >
                Start Reading
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailsPage;

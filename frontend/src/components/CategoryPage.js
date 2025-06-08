import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import '../styles/fonts.css';
import bg1 from '../styles/h.png';

const CategoryPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('Student');
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMoreBooks, setHasMoreBooks] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const booksPerPage = 12;

  useEffect(() => {
    // Initialize user data from localStorage
    const initializeUser = () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        console.log('Category user from localStorage:', user); // Debug log
        if (user?.email && user?.role) {
          setUserRole(user.role);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error reading localStorage:', error.message);
        navigate('/login');
      }
    };
    initializeUser();
  }, [navigate]);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const subject = category.replace(/-/g, '_').toLowerCase().replace('_books', '');
        const offset = (page - 1) * booksPerPage;
        const response = await fetch(`https://openlibrary.org/subjects/${subject}.json?limit=${booksPerPage}&offset=${offset}`);
        const data = await response.json();
        const works = data.works || [];
        setBooks(works);
        setFilteredBooks(works);
        setHasMoreBooks(works.length === booksPerPage);
      } catch (err) {
        console.error('Error fetching books:', err.message);
        setBooks([]);
        setFilteredBooks([]);
        setHasMoreBooks(false);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [category, page]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = books.filter(book =>
      book.title?.toLowerCase().includes(term) ||
      book.authors?.some(author => author.name.toLowerCase().includes(term))
    );
    setFilteredBooks(filtered);
  }, [searchTerm, books]);

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (hasMoreBooks) setPage(page + 1);
  };

  const displayCategory = category.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

  const navLinks = userRole === 'Admin'
    ? [
        { to: '/Home', label: 'Home' },
      ]
    : [{ to: '/Home', label: 'Home' }];

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        backgroundImage: `url(${bg1})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black opacity-60 z-0" />
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            {navLinks.map((link, index) => (
              <Link
                key={index}
                to={link.to}
                className="px-5 py-2 bg-green-500 hover:bg-green-600 rounded-full text-sm md:text-lg text-black font-semibold font-[Eczar] border-2 border-black"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="relative w-full max-w-md ml-auto">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-green-500 text-black rounded-full px-4 py-2 pr-10 border-2 border-black placeholder-black font-[Eczar]"
            />
            <svg
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </div>
        </nav>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="flex flex-col items-center space-y-4">
              <svg className="animate-spin h-10 w-10 text-green-400" xmlns="https://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <p className="text-white font-[Eczar] text-lg">Fetching books...</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          <h2 className="font-[Lancelot] text-3xl text-center mb-6">{displayCategory}</h2>
          {filteredBooks.length === 0 ? (
            <p className="text-center font-[Eczar] text-lg">No books found.</p>
          ) : (
            <div className="grid grid-cols-6 gap-6">
              {filteredBooks.map((book, index) => (
                <div key={index} className="flex flex-col items-center">
                  <img
                    src={
                      book.cover_id
                        ? `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`
                        : 'https://via.placeholder.com/128x192?text=No+Cover'
                    }
                    alt={book.title}
                    className="w-32 h-48 object-cover mb-2"
                  />
                  <h3 className="font-[Eczar] text-lg text-center">{book.title}</h3>
                  <p className="font-[Eczar] text-sm text-gray-300 text-center">
                    {book.authors?.map(a => a.name).join(', ') || 'Unknown Author'}
                  </p>
                  <Link
                    to={`/book/${book.key?.split('/').pop()}`}
                    state={{ category }}
                    className="mt-2 px-5 py-2 bg-green-500 hover:bg-green-600 rounded-full text-sm text-black font-semibold font-[Eczar] border-2 border-black"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={handlePrevPage}
              disabled={page === 1}
              className={`px-4 py-2 rounded-full font-[Eczar] ${
                page === 1
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-black border-2 border-black'
              }`}
            >
              Prev
            </button>
            <button className="px-4 py-2 rounded-full font-[Eczar] bg-green-500 text-black border-2 border-black">
              Page {page}
            </button>
            <button
              onClick={handleNextPage}
              disabled={!hasMoreBooks}
              className={`px-4 py-2 rounded-full font-[Eczar] ${
                !hasMoreBooks
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-black border-2 border-black'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import bg1 from '../styles/h.png';
import '../styles/fonts.css';

const LibrarianIssuedBooksPage = () => {
  const [users, setUsers] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [coverUrls, setCoverUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const placeholderImage = 'https://via.placeholder.com/128x192?text=No+Cover';

  useEffect(() => {
    const fetchCoverUrls = async () => {
      console.log('Fetching cover URLs for books:', issuedBooks.map(b => b._id));
      const newCoverUrls = {};
      for (const book of issuedBooks) {
        if (book.bookId) {
          try {
            const workId = book.bookId.split('/').pop();
            const res = await fetch(`https://openlibrary.org/works/${workId}.json`);
            const data = await res.json();
            const coverId = data?.covers?.at(-1);
            newCoverUrls[book._id] = coverId
              ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
              : placeholderImage;
          } catch (err) {
            console.error(`Error fetching cover for book ${book.bookId}:`, err.message);
            newCoverUrls[book._id] = placeholderImage;
          }
        } else {
          newCoverUrls[book._id] = placeholderImage;
        }
      }
      setCoverUrls(newCoverUrls);
    };

    if (issuedBooks.length > 0) {
      fetchCoverUrls();
    }
  }, [issuedBooks]);

  const fetchUsersWithIssuedBooks = useCallback((email) => {
    console.log('fetchUsersWithIssuedBooks called with email:', email);
    if (!email) {
      console.error('No email provided');
      setError('Admin email is required. Please log in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    fetch('http://localhost:5000/api/issueRequests/issued-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((response) => {
        console.log('issued-users response status:', response.status);
        if (!response.ok) {
          return response.text().then((text) => {
            console.log('issued-users response text:', text);
            let errorMessage = `Failed to fetch users: ${response.status}`;
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              console.error('Response is not JSON:', e.message);
            }
            throw new Error(errorMessage);
          });
        }
        return response.json();
      })
      .then((responseData) => {
        console.log('issued-users response data:', responseData);
        setUsers(responseData.users || []);
        if (!responseData.users || responseData.users.length === 0) {
          setError('No users with issued books found.');
        }
      })
      .catch((err) => {
        console.error('Error fetching users:', err.message);
        setError(`Failed to load users: ${err.message}. Please try again.`);
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchBooksByEmail = useCallback((userEmail, adminEmail) => {
    console.log('fetchBooksByEmail called with:', { adminEmail, userEmail });
    if (!adminEmail || !userEmail) {
      console.error('Missing adminEmail or userEmail:', { adminEmail, userEmail });
      setError('Admin email or user email is missing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    fetch('http://localhost:5000/api/issueRequests/issued-by-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, userEmail }),
    })
      .then((response) => {
        console.log('issued-by-email response status:', response.status);
        if (!response.ok) {
          return response.text().then((text) => {
            console.log('issued-by-email response text:', text);
            let errorMessage = `Failed to fetch issued books: ${response.status}`;
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              console.error('Response is not JSON:', e.message);
            }
            throw new Error(errorMessage);
          });
        }
        return response.json();
      })
      .then((responseData) => {
        console.log('issued-by-email response data:', responseData);
        setIssuedBooks(responseData.issuedBooks || []);
        if (!responseData.issuedBooks || responseData.issuedBooks.length === 0) {
          setError('No issued books found for this user.');
        }
      })
      .catch((err) => {
        console.error('Error fetching books:', err.message);
        setError(`Failed to load issued books: ${err.message}. Please try again.`);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleReturn = useCallback(async (requestId, title, adminEmail) => {
    if (!window.confirm(`Are you sure you want to return "${title}"?`)) return;
    setError('');
    try {
      console.log(`Sending return request for ID: ${requestId}`);
      const response = await fetch('http://localhost:5000/api/issueRequests/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, status: 'Returned', email: adminEmail }),
      });
      console.log('update-status response status:', response.status);
      if (!response.ok) {
        const text = await response.text();
        console.log('update-status response text:', text);
        let errorMessage = `Failed to update status: ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error('Response is not JSON:', e.message);
        }
        throw new Error(errorMessage);
      }
      const responseData = await response.json();
      console.log('update-status response data:', responseData);
      alert('Book returned successfully.');
      fetchBooksByEmail(selectedEmail, adminEmail);
    } catch (err) {
      console.error('Error returning book:', err.message);
      setError(`Failed to return book: ${err.message}. Please try again.`);
    }
  }, [selectedEmail, fetchBooksByEmail]);

  const handleCalculateFines = useCallback(async (adminEmail) => {
    if (!window.confirm('Are you sure you want to recalculate fines for all issued books?')) return;
    setError('');
    try {
      console.log('Calculating fines for all issued books');
      const response = await fetch('http://localhost:5000/api/issueRequests/calculate-fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail }),
      });
      console.log('calculate-fines response status:', response.status);
      if (!response.ok) {
        const text = await response.text();
        console.log('calculate-fines response text:', text);
        let errorMessage = `Failed to calculate fines: ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error('Response is not JSON:', e.message);
        }
        throw new Error(errorMessage);
      }
      const responseData = await response.json();
      console.log('calculate-fines response data:', responseData);
      alert(`Fines updated for ${responseData.updatedCount} books.`);
      if (selectedEmail) {
        fetchBooksByEmail(selectedEmail, adminEmail); // Refresh books for the selected user
      }
    } catch (err) {
      console.error('Error calculating fines:', err.message);
      setError(`Failed to calculate fines: ${err.message}. Please try again.`);
    }
  }, [selectedEmail, fetchBooksByEmail]);

  useEffect(() => {
    const checkAdmin = () => {
      try {
        const userRaw = localStorage.getItem('user');
        console.log('Raw user data from localStorage:', userRaw);
        if (!userRaw) {
          console.error('No user data in localStorage');
          setError('No user data found. Redirecting to login...');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        let user;
        try {
          user = JSON.parse(userRaw);
          console.log('Parsed user data:', user);
        } catch (parseErr) {
          console.error('Failed to parse user data:', parseErr.message);
          setError('Invalid user data. Redirecting to login...');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        if (!user?.email) {
          console.error('No email in user object:', user);
          setError('User email not found. Redirecting to login...');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        if (user.role !== 'Admin') {
          console.error('Non-admin user:', user);
          setError('Access denied. Admins only. Redirecting to Home...');
          setTimeout(() => navigate('/Home'), 3000);
          return;
        }
        fetchUsersWithIssuedBooks(user.email);
      } catch (err) {
        console.error('Error reading localStorage:', err.message);
        setError('Failed to verify user. Redirecting to login...');
        setTimeout(() => navigate('/login'), 3000);
      }
    };
    checkAdmin();
  }, [navigate, fetchUsersWithIssuedBooks]);

  const handleEmailClick = (userEmail) => {
    setSelectedEmail(userEmail);
    try {
      const userRaw = localStorage.getItem('user');
      console.log('Raw user data from localStorage for email click:', userRaw);
      if (!userRaw) {
        console.error('No user data for email click');
        setError('No user data found. Please log in.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }
      const user = JSON.parse(userRaw);
      console.log('Parsed user data for email click:', user);
      if (!user?.email) {
        console.error('No email in user object for email click:', user);
        setError('Invalid user data. Please log in again.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }
      fetchBooksByEmail(userEmail, user.email);
    } catch (err) {
      console.error('Error reading localStorage for email click:', err.message);
      setError('Failed to fetch books: Invalid user data. Please log in again.');
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  const handleLogout = () => {
    console.log('Logging out, clearing localStorage');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !users.length) {
    return (
      <div className="min-h-screen relative text-white font-[Eczar]">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${bg1})` }} />
        <div className="absolute inset-0 bg-black bg-opacity-50 z-0"></div>
        <div className="relative z-10 p-10 text-center">
          <svg
            className="animate-spin h-10 w-10 text-green-400 mx-auto"
            xmlns="https://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !users.length) {
    return (
      <div className="min-h-screen relative text-white font-[Eczar]">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${bg1})` }} />
        <div className="absolute inset-0 bg-black bg-opacity-50 z-0"></div>
        <div className="relative z-10 p-10 max-w-2xl mx-auto bg-green-900 bg-opacity-80 rounded-xl text-center">
          <p className="text-red-500 text-lg mb-4">
            {error.includes('No users') ? 'No users have issued books yet.' : error}
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                console.log('Retry clicked, user email:', user?.email);
                fetchUsersWithIssuedBooks(user?.email);
              }}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-full"
            >
              Retry
            </button>
            <Link
              to="/Home"
              className="bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-6 rounded-full"
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
      <div className="absolute inset-0 bg-black bg-opacity-50 z-0"></div>

      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-5xl font-[Lancelot] text-center">Issued Books by Users</h1>
          <div className="flex space-x-4">
            <Link
              to="/Home"
              className="bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-6 rounded-full"
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

        <div className="flex justify-center mb-6">
          <div className="w-full max-w-md">
            <input
              type="text"
              placeholder="Search by email or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 rounded-full bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        <div className="flex justify-center mb-4">
          <button
            onClick={() => {
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              console.log('Refresh clicked, user email:', user?.email);
              fetchUsersWithIssuedBooks(user?.email);
            }}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-full"
          >
            Refresh Users
          </button>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center">
            <p className="text-lg mb-4">
              {searchTerm ? 'No users match your search.' : (error || 'No users with issued books found.')}
            </p>
            <button
              onClick={() => {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                console.log('Retry clicked, user email:', user?.email);
                fetchUsersWithIssuedBooks(user?.email);
              }}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-full"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Users with Issued Books</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredUsers.map((user) => (
                  <button
                    key={user.email}
                    onClick={() => handleEmailClick(user.email)}
                    className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full text-left truncate max-w-xs ${
                      selectedEmail === user.email ? 'ring-2 ring-yellow-400' : ''
                    }`}
                    title={`${user.email} (${user.role})`}
                  >
                    {user.email} <span className="text-sm opacity-75">({user.role})</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedEmail && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Issued Books for {selectedEmail}</h2>
                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={() => {
                      console.log('Clearing selected user');
                      setSelectedEmail(null);
                      setIssuedBooks([]);
                      setCoverUrls({});
                    }}
                    className="bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-6 rounded-full"
                  >
                    Back to Users
                  </button>
                  <button
                    onClick={() => {
                      const user = JSON.parse(localStorage.getItem('user') || '{}');
                      handleCalculateFines(user.email);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full"
                  >
                    Calculate All Fines
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
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <p className="ml-4 text-lg">Loading books...</p>
                  </div>
                ) : issuedBooks.length === 0 ? (
                  <p className="text-lg text-center">{error || 'No issued books found for this user.'}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {issuedBooks.map((book) => {
                      const daysLeft = book.returnDate
                        ? Math.ceil((new Date(book.returnDate) - new Date()) / (1000 * 60 * 60 * 24))
                        : null;
                      const isOverdue = book.returnDate && daysLeft < 0;
                      const calculatedFine = isOverdue && book.finePerDay
                        ? Math.abs(daysLeft) * book.finePerDay
                        : book.fine || 0;
                      const fineStatus = isOverdue
                        ? 'Overdue'
                        : daysLeft === 0
                        ? 'Due Today'
                        : daysLeft
                        ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
                        : 'No due date';
                      const fineDisplay = book.finePerDay && book.returnDate && typeof calculatedFine === 'number'
                        ? `$${calculatedFine.toFixed(2)}`
                        : 'N/A';
                      const user = JSON.parse(localStorage.getItem('user') || '{}');

                      return (
                        <div
                          key={book._id}
                          className={`bg-green-900 bg-opacity-80 p-4 rounded-xl flex flex-col items-center text-center relative ${
                            isOverdue ? 'border-2 border-red-500' : ''
                          }`}
                          title={fineDisplay === 'N/A' ? 'No fine data available (missing return date or fine rate)' : `Fine: ${fineDisplay} (${fineStatus})`}
                        >
                          <div className="w-32 h-44 bg-gray-200 animate-pulse rounded mb-4" />
                          <img
                            src={coverUrls[book._id] || placeholderImage}
                            alt={book.title}
                            className="w-32 h-44 object-cover mb-4 rounded absolute"
                            onError={(e) => (e.target.src = placeholderImage)}
                            style={{ display: coverUrls[book._id] ? 'block' : 'none' }}
                            onLoad={(e) => (e.target.style.display = 'block')}
                          />
                          <p className="text-lg font-semibold mb-1 truncate w-full">{book.title}</p>
                          <p className={`text-sm mb-1 ${isOverdue ? 'text-red-400' : ''}`}>
                            Fine: {fineDisplay} {fineStatus !== 'N/A' ? `(${fineStatus})` : ''}
                          </p>
                          {book.finePerDay && book.returnDate && (
                            <p className="text-sm mb-2">
                              Fine Rate: ${book.finePerDay.toFixed(2)}/day
                            </p>
                          )}
                          <button
                            onClick={() => handleReturn(book._id, book.title, user.email)}
                            className="bg-red-500 hover:bg-red-400 text-white font-bold py-1 px-4 rounded-full mb-2"
                          >
                            Return
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LibrarianIssuedBooksPage;

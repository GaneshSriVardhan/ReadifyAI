import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import bg1 from '../styles/h.png';
import '../styles/fonts.css';

const RequestIssuePage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [booksCanRequest, setBooksCanRequest] = useState(null); // New state for booksCanRequest
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize user email and fetch user details from localStorage and backend
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user?.email) {
          setEmail(user.email);
          // Fetch user details to get booksCanRequest
          const response = await fetch('http://localhost:5000/api/users/get-user-details', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: user.email }),
          });

          if (!response.ok) {
            throw new Error('Failed to fetch user details');
          }

          const data = await response.json();
          setBooksCanRequest(data.user.booksCanRequest);
        } else {
          setError('User not logged in. Redirecting to login...');
          navigate('/login'); // Immediate redirect
        }
      } catch (err) {
        setError('Failed to load user data. Redirecting to login...');
        navigate('/login'); // Immediate redirect
      }
    };
    initializeUser();
  }, [navigate]);

  // Validate state data
  useEffect(() => {
    if (!state?.id || !state?.book?.title) {
      setError('Invalid book data. Please select a book from the book details page.');
      navigate('/Home'); // Immediate redirect
    }
  }, [state, navigate]);

  const handleSubmit = async () => {
    if (!email) {
      setError('User email is missing. Please log in again.');
      return;
    }
    if (!state?.id || !state?.book?.title) {
      setError('Book data is incomplete. Please try again.');
      return;
    }
    if (booksCanRequest === 0) {
      setError('You have reached your book request limit. Return a book to request a new one.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const response = await fetch('http://localhost:5000/api/issueRequests/save-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: state.id,
          title: state.book.title,
          email,
          role: user.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to submit request: ${response.statusText}`);
      }

      await response.json(); // Parse response to ensure it's valid JSON
      alert('Request sent to admin successfully.');
      navigate('/Home');
    } catch (err) {
      setError(`Failed to submit request: ${err.message}. Please try again or contact support.`);
    } finally {
      setLoading(false);
    }
  };

  // If there's an error or no valid state, don't render the main content
  if (error || !state?.id || !state?.book?.title) {
    return (
      <div className="min-h-screen relative text-white font-[Eczar]">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${bg1})` }} />
        <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
        <div className="relative z-10 p-10 max-w-2xl mx-auto bg-green-900 bg-opacity-80 rounded-xl text-center">
          <p className="text-red-500 text-lg mb-4">{error || 'Invalid book data.'}</p>
          <Link
            to="/Home"
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-full"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative text-white font-[Eczar]">
      <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${bg1})` }} />
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>

      <div className="relative z-10 p-10 max-w-2xl mx-auto bg-green-900 bg-opacity-80 rounded-xl">
        <h1 className="text-4xl font-[Lancelot] mb-4">Issue Request</h1>
        <p className="text-lg mb-4">
          You are about to request: <strong>{state.book.title}</strong> by {state.book.authors || 'Unknown Author'}
        </p>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="flex space-x-4">
          <button
            onClick={handleSubmit}
            disabled={loading || booksCanRequest === 0}
            className={`bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-full ${
              loading || booksCanRequest === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Submitting...' : 'Confirm Request'}
          </button>
          <Link
            to={`/book/${state.id}`}
            state={{ category: state?.category, book: state?.book }}
            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-full"
          >
            Back to Book
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RequestIssuePage;
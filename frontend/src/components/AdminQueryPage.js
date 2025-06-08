import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import bg1 from '../styles/h.png';
import '../styles/fonts.css';

const AdminQueryPage = () => {
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [queryLoading, setQueryLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [question, setQuestion] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const initializeUser = () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.email && user?.role) {
        setUserEmail(user.email);
        setUserName(user.name || '');
        if (user.role !== 'Admin') {
          navigate('/Home');
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    };

    initializeUser();
  }, [navigate]);

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
    setUserName('');
    setShowDropdown(false);
    navigate('/login');
  };

  const navLinks = [
    { to: '/Home', label: 'Home' },
    { to: '/requested-books', label: 'Requested Books' },
    { to: '/librarian-issued-books', label: 'Issued Books' },
    { to: '/about', label: 'About Us' },
  ];

  const handleQuestionSubmit = async () => {
    if (!question.trim()) {
      setError('Please enter a valid question');
      return;
    }

    try {
      setQueryLoading(true);
      setError('');
      setQueryResult(null);
      console.log('Sending question:', question);
      const response = await axios.post(
        'http://localhost:5000/api/admin-query',
        { question },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setQueryResult(response.data.data);
    } catch (err) {
      console.error('Frontend error:', err);
      setError(err.response?.data?.error || 'Failed to fetch query results. Please try again.');
    } finally {
      setQueryLoading(false);
    }
  };

  const renderResultsTable = (data) => {
    if (!data || data.length === 0) return <p className=" bg-green-500">No results found.</p>;

    // Dynamically determine columns, handling nested objects
    const headers = data[0]
      ? Object.keys(data[0]).filter(key => key !== '_id').flatMap(key => {
          if (typeof data[0][key] === 'object' && data[0][key] !== null) {
            // For nested objects like issueRequests, create separate columns
            return Object.keys(data[0][key]).map(nestedKey => `${key}.${nestedKey}`);
          }
          return key;
        })
      : [];

    // Format header names (e.g., convert camelCase to Title Case)
    const formatHeader = (key) => {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/\./g, ' ') // Replace dots with spaces for nested fields
        .replace(/^./, str => str.toUpperCase())
        .trim();
    };

    // Map rows dynamically
    const rowMapper = (item) => (
      <tr key={item._id || JSON.stringify(item)} className="border-b border-gray-600">
        {headers.map((header) => {
          // Handle nested fields
          if (header.includes('.')) {
            const [parent, child] = header.split('.');
            return (
              <td key={header} className="py-2 px-4">
                {item[parent] && item[parent][child] ? item[parent][child] : 'N/A'}
              </td>
            );
          }
          return (
            <td key={header} className="py-2 px-4">
              {item[header] instanceof Date
                ? new Date(item[header]).toLocaleString()
                : item[header] || 'N/A'}
            </td>
          );
        })}
      </tr>
    );

    return (
      <table className="w-full bg-gray-800 rounded-lg">
        <thead>
          <tr className="bg-green-700">
            {headers.map((header) => (
              <th key={header} className="py-2 px-4 text-left">{formatHeader(header)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(rowMapper)}
        </tbody>
      </table>
    );
  };

  if (loading) {
    return <div className="text-white text-center p-8">Loading...</div>;
  }

  const profileInitial = userName ? userName.charAt(0).toUpperCase() : userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen min-w-screen relative text-white font-[Eczar] overflow-x-hidden m-0 p-0">
      <div className="absolute inset-0 bg-cover bg-center opacity-32" style={{ backgroundImage: `url(${bg1})` }}></div>

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
            aria-label="User profile menu"
            role="button"
          >
            {profileInitial}
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

      <div className="relative z-10 p-6">
        <h2 className="text-3xl text-green-900 font-bold text-center mb-4">Admin Query</h2>
        <div className="flex justify-center mb-6">
          <input
            type="text"
            placeholder="Enter your question (e.g., 'Show all students with zero booksCanRequest, including their name, email, roll number, and books can request, sorted by name in descending order')"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full max-w-2xl bg-gray-700 text-white rounded-full px-6 py-3 text-lg border-2 border-black"
            aria-label="Admin query input"
          />
          <button
            onClick={handleQuestionSubmit}
            disabled={queryLoading}
            className="ml-4 px-6 py-3 bg-green-500 hover:bg-green-600 rounded-full text-black font-semibold border-2 border-black disabled:bg-gray-500"
          >
            {queryLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg max-w-4xl mx-auto mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {queryResult && (
          <div className="bg-green-900 bg-opacity-50 p-6 rounded-lg max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold mb-2">Results:</h3>
            {renderResultsTable(queryResult)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQueryPage;

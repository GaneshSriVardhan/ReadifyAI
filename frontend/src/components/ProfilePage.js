import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import bg1 from '../styles/h.png';
import '../styles/fonts.css';

const ProfilePage = () => {
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [booksCanRequest, setBooksCanRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError('');
      try {
        // Get user data from localStorage
        const userRaw = localStorage.getItem('user');
        console.log('Profile user from localStorage:', userRaw);
        if (!userRaw) {
          throw new Error('No user data found. Please log in.');
        }

        const user = JSON.parse(userRaw);
        if (!user.email || !user.role || !user.name) {
          throw new Error('Incomplete user data in localStorage. Please log in again.');
        }

        // Set initial state from localStorage
        setUserEmail(user.email);
        setUserRole(user.role);
        setUserName(user.name);

        // Fetch additional user details from backend
        const response = await fetch('https://elibraryreadifyai.vercel.app/api/users/get-user-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
        });

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          let errorMessage = `Failed to fetch user details: ${response.status}`;
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } else {
            const text = await response.text();
            console.log('Non-JSON response:', text);
            errorMessage = `Server returned non-JSON response: ${response.status} ${text.substring(0, 100)}...`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('User details from backend:', data);

        // Update state with backend data
        const { name, role, rollNumber, booksCanRequest } = data.user;
        setUserName(name || 'Not available');
        setUserRole(role || 'Unknown');
        setRollNumber(rollNumber || 'Not available');
        setBooksCanRequest(booksCanRequest !== undefined ? booksCanRequest : null);
      } catch (err) {
        console.error('Error fetching user data:', err.message);
        setError(err.message);
        setUserEmail('');
        setUserRole('');
        setUserName('');
        setRollNumber('');
        setBooksCanRequest(null);
        setTimeout(() => navigate('/login'), 3000);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [navigate]);

  const firstLetter = userName && userName.length > 0 
    ? userName.charAt(0).toUpperCase() 
    : (userEmail && userEmail.length > 0 ? userEmail.charAt(0).toUpperCase() : 'U');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-[Eczar]">
        <svg
          className="animate-spin h-10 w-10 text-green-400 mr-4"
          xmlns="https://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <span>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative text-white font-[Eczar]">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${bg1})` }} />
        <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
        <div className="relative z-10 p-10 max-w-md mx-auto bg-green-900 bg-opacity-80 rounded-lg text-center">
          <p className="text-red-500 font-bold text-lg mb-4">{error}</p>
          <Link
            to="/login"
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-800 font-bold py-2 px-6 rounded-full"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-screen relative text-white font-[Eczar] overflow-x-hidden m-0 p-0">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center opacity-32" style={{ backgroundImage: `url(${bg1})` }}></div>
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>

      {/* Top Navbar */}
      <div className="relative z-30 flex items-center justify-between p-4">
        {/* Home Button */}
        <Link
          to="/Home"
          className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-full text-black font-semibold border-2 border-black"
        >
          Home
        </Link>

        {/* Profile Title */}
        <h1 className="absolute left-1/2 transform -translate-x-1/2 text-5xl font-bold font-[Lancelot] text-white">
          Profile
        </h1>

        {/* Profile Badge */}
        <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
          {firstLetter}
        </div>
      </div>

      {/* Profile Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-12">
        <div className="flex flex-col gap-6 w-full max-w-md">
          {/* Name */}
          <div className="bg-green-500 rounded-xl p-4 text-white text-xl">
            <span className="font-bold">Name: </span>{userName}
          </div>

          {/* Role */}
          <div className="bg-green-500 rounded-xl p-4 text-white text-xl">
            <span className="font-bold">Role: </span>{userRole}
          </div>

          {/* Roll Number (only for students) */}
          {userRole === 'Student' && (
            <div className="bg-green-500 rounded-xl p-4 text-white text-xl">
              <span className="font-bold">Roll Number: </span>{rollNumber}
            </div>
          )}

          {/* Email */}
          <div className="bg-green-500 rounded-xl p-4 text-white text-xl">
            <span className="font-bold">Email: </span>{userEmail}
          </div>

          {/* Books Can Request (only for students) */}
          {userRole === 'Student' && (
            <div className="bg-green-500 rounded-xl p-4 text-white text-xl">
              <span className="font-bold">Books Can Request: </span>
              {booksCanRequest !== null ? booksCanRequest : 'Not available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
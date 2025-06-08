import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import bg1 from '../styles/y1.png';
import '../styles/fonts.css';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.email) {
      navigate('/change');
    }
  }, [navigate]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user?.email) {
        throw new Error('No authenticated user found');
      }

      const response = await fetch('https://elibraryreadifyai.vercel.app/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: newPassword }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update password');
      }

      setMessage('Password updated successfully!');
      localStorage.removeItem('user');
      setTimeout(() => {
        navigate('/login');
      }, 1000); // Brief delay to show success message
    } catch (err) {
      console.error('Password update error:', err.message);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex justify-center items-center p-8 bg-cover bg-center" style={{ backgroundImage: `url(${bg1})` }}>
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
      <div className="relative z-10 w-full max-w-md text-white text-center font-[Eczar] text-[21px]">
        <h1 className="font-[Lancelot] text-[85px] mb-4">Change Password</h1>
        <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-4">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
            autoComplete="new-password"
            className="bg-gray-700 text-white rounded-full px-4 py-2 placeholder-gray-300"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            required
            autoComplete="new-password"
            className="bg-gray-700 text-white rounded-full px-4 py-2 placeholder-gray-300"
          />
          {message && <p className="text-green-500">{message}</p>}
          {error && <p className="text-red-500">{error}</p>}
          <p className="text-white">
            If not registered? <Link to="/signup" className="text-blue-500 hover:underline">signup</Link>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-600 text-white rounded-full py-3 hover:bg-yellow-700 transition duration-300"
          >
            {loading ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;

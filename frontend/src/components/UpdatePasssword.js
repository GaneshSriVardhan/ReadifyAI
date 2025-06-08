import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import bg1 from '../styles/x.png';
import '../styles/fonts.css';

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const email = localStorage.getItem('pendingResetEmail');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!email) {
      setError('No email found. Please start the password reset process again.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/users/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password: newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update password');
      }

      localStorage.removeItem('pendingResetEmail');
      setMessage('Password updated successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error('Change password error:', err.message);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    if (!email) {
      setError('No email found. Please start the password reset process again.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/users/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resend OTP');
      }

      setMessage('New OTP sent to your email.');
    } catch (err) {
      console.error('Resend OTP error:', err.message);
      setError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex justify-center items-center p-8 bg-cover bg-center" style={{ backgroundImage: `url(${bg1})` }}>
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
      <div className="relative z-10 w-full max-w-md text-white text-center font-[Eczar] text-[21px]">
        <h1 className="font-[Lancelot] text-[85px] mb-4">Change Password</h1>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <p className="text-[1.5rem]">Enter the OTP sent to your email.</p>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            required
            className="bg-gray-700 text-white rounded-full px-4 py-2 placeholder-gray-300"
          />
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
            placeholder="Confirm new password"
            required
            autoComplete="new-password"
            className="bg-gray-700 text-white rounded-full px-4 py-2 placeholder-gray-300"
          />
          {message && <p className="text-green-500">{message}</p>}
          {error && <p className="text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-600 text-white rounded-full py-3 hover:bg-yellow-700 transition duration-300"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={loading}
            className="bg-blue-600 text-white rounded-full py-3 hover:bg-blue-700 transition duration-300"
          >
            {loading ? 'Sending...' : 'Resend OTP'}
          </button>
          <p className="text-white">
            Not registered? <Link to="/signup" className="text-blue-400 underline">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;
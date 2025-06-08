import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import bg1 from '../styles/x.png';
import '../styles/fonts.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send OTP');
      }

      localStorage.setItem('pendingResetEmail', email);
      setMessage('OTP sent to your email. Redirecting to change password...');
      setTimeout(() => navigate('/change-password'), 2000);
    } catch (err) {
      console.error('Forgot password error:', err.message);
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex justify-center items-center p-8 bg-cover bg-center" style={{ backgroundImage: `url(${bg1})` }}>
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
      <div className="relative z-10 w-full max-w-md text-white text-center font-[Eczar] text-[21px]">
        <h1 className="font-[Lancelot] text-[85px] mb-4">Forgot Password</h1>
        <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            required
            autoComplete="email"
            className="bg-gray-700 text-white rounded-full px-4 py-2 placeholder-gray-300"
          />
          {message && <p className="text-green-500">{message}</p>}
          {error && <p className="text-red-500">{error}</p>}
          <p className="text-white">
            Not registered? <Link to="/signup" className="text-blue-400 underline">Sign up</Link>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-600 text-white rounded-full py-3 hover:bg-yellow-700 transition duration-300"
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;

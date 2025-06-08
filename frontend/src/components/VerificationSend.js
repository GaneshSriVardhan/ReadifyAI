import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import bg1 from '../styles/x.png';
import '../styles/fonts.css';

const VerificationSend = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [resendMessage, setResendMessage] = useState(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const navigate = useNavigate();

  const email = localStorage.getItem('pendingUserEmail');

  const handleVerifyOtp = async () => {
    setLoading1(true);
    setError(null);
    setResendMessage(null);

    try {

      const response = await fetch('https://elibraryreadifyai.vercel.app/api/users/verify-otp', {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid or expired OTP');
      }

      localStorage.removeItem('pendingUserEmail');
      alert('Email verified successfully!');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading1(false);
    }
  };

  const handleResend = async () => {
    setLoading2(true);
    setError(null);
    setResendMessage(null);

    if (!email) {
      setError('No email found. Please sign up again.');
      setLoading2(false);
      return;
    }

    try {
      const response = await fetch('https://elibraryreadifyai.vercel.app/api/users/resend-otp', {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resend OTP');
      }

      setResendMessage('A new OTP has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading2(false);
    }
  };

  return (
    <div className="min-h-screen relative flex justify-center items-center p-8 bg-cover bg-center" style={{ backgroundImage: `url(${bg1})` }}>
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
      <div className="relative z-10 w-full max-w-md text-white text-center font-[GreatVibes] text-[28px]">
        <h1 className="font-[Lancelot] text-[85px] mb-4">Verification</h1>
        <div className="flex flex-col gap-4">
          {error && <p className="text-[1.5rem] font-[Eczar] text-red-400">{error}</p>}
          {resendMessage && <p className="text-[1.5rem] font-[Eczar] text-green-400">{resendMessage}</p>}
          <p className="text-[1.5rem] font-[Eczar]">Enter the OTP sent to your email.</p>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="bg-gray-700 text-white rounded-full px-4 py-2 placeholder-gray-300"
          />
          <button
            onClick={handleVerifyOtp}
            disabled={loading1}
            className="bg-green-600 text-white rounded-full py-2 px-4 hover:bg-green-700 transition duration-300"
          >
            {loading1 ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button
            onClick={handleResend}
            disabled={loading2}
            className="bg-blue-600 text-white rounded-full py-2 px-4 hover:bg-blue-700 transition duration-300"
          >
            {loading2 ? 'Sending...' : 'Resend OTP'}
          </button>
          <p className="text-white mt-4 font-[Eczar] text-[21px]">
            Already verified? <Link to="/login" className="text-blue-400 underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerificationSend;


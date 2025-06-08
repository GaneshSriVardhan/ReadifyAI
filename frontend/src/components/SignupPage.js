import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import bg1 from '../styles/y.png';
import '../styles/fonts.css';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    rollNumber: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.role === 'Student' && !formData.rollNumber.trim()) {
      setError('Roll Number is required for Student role.');
      setLoading(false);
      return;
    }

    try {

      const response = await fetch('https://elibraryreadifyai.vercel.app/api/users/signup', {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // body: JSON.stringify(formData),
        body: JSON.stringify({
          ...formData,
          email: formData.email.toLowerCase(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Signup failed. Please try again.');
      }

      // Store email in localStorage for verification
      localStorage.setItem('pendingUserEmail', formData.email);
      navigate('/verify');
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex justify-center items-center p-8 bg-cover bg-center" style={{ backgroundImage: `url(${bg1})` }}>
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
      <div className="relative z-10 w-full max-w-md text-white text-center font-[Eczar] text-[21px]">
        <h1 className="font-[Lancelot] text-[85px] mb-4">Sign Up</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-red-500">{error}</p>}
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="bg-gray-700 text-white rounded-full px-4 py-2 placeholder-gray-300"
          >
            <option value="" disabled>Select Role</option>
            <option value="Admin">Admin</option>
            <option value="Student">Student</option>
            <option value="Faculty">Faculty</option>
          </select>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter name"
            required
            autoComplete="name"
            className="bg-gray-700 text-white rounded-full px-4 py-2 placeholder-gray-300"
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            required
            autoComplete="email"
            className="bg-gray-700 text-white rounded-full px-4 py-2 placeholder-gray-300"
          />
          {formData.role === 'Student' && (
            <input
              type="text"
              name="rollNumber"
              value={formData.rollNumber}
              onChange={handleChange}
              placeholder="Enter Roll Number"
              required
              className="bg-gray-700 text-white rounded-full px-4 py-2 placeholder-gray-300"
            />
          )}
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter password"
            required
            autoComplete="new-password"
            className="bg-gray-700 text-white rounded-full px-4 py-2 placeholder-gray-300"
          />
          <p className="text-white">
            Already registered? <Link to="/login" className="text-blue-400 underline">Login</Link>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-600 text-white rounded-full py-3 hover:bg-yellow-700 transition duration-300"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;

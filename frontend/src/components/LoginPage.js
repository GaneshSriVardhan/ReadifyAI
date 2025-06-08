import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import bg1 from '../styles/x1.png';
import '../styles/fonts.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', role: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.email) {
      navigate('/Home');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('Login response:', result); // Debug log
      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      // Check if user data is present
      if (!result.user || !result.user.email || !result.user.role) {
        throw new Error('Invalid response: User data missing');
      }

      // Store user data in localStorage
      const user = {
        email: result.user.email,
        role: result.user.role,
        name: result.user.name || '',
      };
      localStorage.setItem('user', JSON.stringify(user));
      console.log('Login successful:', user); // Debug log
      navigate('/Home');
    } catch (error) {
      console.error('Login error:', error.message);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex justify-center items-center p-8 bg-cover bg-center" style={{ backgroundImage: `url(${bg1})` }}>
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
      <div className="relative z-10 w-full max-w-md text-white text-center font-[Eczar] text-[21px]">
        <h1 className="font-[Lancelot] text-[85px] mb-4">Login</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="px-4 py-2 bg-gray-700 text-white rounded-full border-none font-[Eczar] text-[21px]"
          >
            <option value="" disabled>Select Role</option>
            <option value="Admin">Admin</option>
            <option value="Student">Student</option>
            <option value="Faculty">Faculty</option>
          </select>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            required
            autoComplete="email"
            className="px-4 py-2 bg-gray-700 text-white rounded-full border-none font-[Eczar] text-[21px] placeholder-gray-300"
          />
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter password"
            required
            autoComplete="current-password"
            className="px-4 py-2 bg-gray-700 text-white rounded-full border-none font-[Eczar] text-[21px] placeholder-gray-300"
          />
          <p className="text-white">
            If not registered?{' '}
            <Link to="/signup" className="text-blue-400 underline">Signup</Link><br />
            Forget Password?{' '}
            <Link to="/forgot" className="text-blue-400 underline">Click here</Link>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full font-[Eczar] text-[21px] transition duration-300"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

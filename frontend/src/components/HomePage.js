import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import bg1 from '../styles/h.png';
import '../styles/fonts.css';
import logo from '../styles/logo.png';

const HomePage = () => {
  const [userRole, setUserRole] = useState('Student');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Memoize default categories to prevent re-creation on every render
  const defaultCategories = useMemo(() => [
    // Arts & Culture
      "Arts", "Dance", "Design", "Fashion",  "Film", "Graphic Design", "Music", "Painting", "Photography", 
      // Literature
      "Fiction", "Fantasy", "Horror", "Humor", "Literature", "Magic", "Mystery and detective stories", "Plays", "Poetry", "Romance", "Science Fiction", "Short Stories", "Thriller", "Young Adult", "Adventure", "Crime", "Classics", 
      // Science & Technology
       "Biology", "Chemistry", "Mathematics", "Physics", "Programming", "Astronomy", "Geology", "Data Science", "Artificial Intelligence", "Technology", "Machine Learning", "Cryptocurrency",
      "Business Success", "Finance", "Economics", "Marketing", "Leadership", "Kids Books", "Stories in Rhyme", "Baby Books", "Bedtime Books",
      // History
      "History", "Anthropology", "World War II", "Modern History", "Social Life and Customs",
      // Health & Wellness
      "Health & Wellness", "Cookbooks", "Mental Health", "Exercise", "Nutrition", "Medicine", "Yoga",
      // Biography
      "Biography", "Autobiographies",  "Women", "Kings and Rulers", "Composers", "Artists", "Scientists", "Explorers",
      // Social Sciences
      "Political Science", "Psychology", 
      // Textbooks
      "Geography", "Algebra", "Science", "English", "Computer Science", "Academic Writing", "Pedagogy", "Learning",
      // Engineering
      "Chemical Engineering", "IT", "Electronics and Communication", "Electrical Engineering", "Civil Engineering", "Mechanical Engineering", "Robotics", "Automobiles", "Aerospace Engineering",
  ], []);

  // Function to fetch categories from Open Library Subjects API
  const fetchCategories = async (query) => {
    if (!query) {
      return defaultCategories;
    }

    try {
      const response = await fetch(`https://openlibrary.org/search/subjects.json?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.docs && data.docs.length > 0) {
        // Extract subject names and normalize
        const subjects = data.docs.map(doc =>
          doc.name
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
        );
        return [...new Set(subjects)]; // Remove duplicates
      }
      return defaultCategories; // Fallback if no subjects found
    } catch (error) {
      console.error('Error fetching subjects from Open Library:', error);
      setError('Failed to fetch categories. Showing default categories.');
      return defaultCategories; // Fallback on error
    }
  };

  useEffect(() => {
    // Initialize user data from localStorage
    const initializeUser = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      console.log('Initial user from localStorage:', user);
      if (user?.email && user?.role) {
        setUserEmail(user.email);
        setUserRole(user.role);
      } else {
        navigate('/login');
      }

      // Set default categories on initial load
      setFilteredCategories(defaultCategories);
      setLoading(false);
    };

    initializeUser();
  }, [navigate, defaultCategories]);

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

  // Debounced search handler
  const debouncedSearch = useRef(
    debounce(async (term) => {
      const generatedCategories = await fetchCategories(term);
      setFilteredCategories(generatedCategories);
      setError(''); // Clear error on successful fetch
    }, 500)
  ).current;

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase().trim();
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUserEmail('');
    setUserRole('Student');
    setShowDropdown(false);
    navigate('/login');
  };

  if (loading) {
    return <div className="text-white text-center p-8">Loading...</div>;
  }

  const profileInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  const navLinks = userRole === 'Admin' ? [
    { to: '/Home', label: 'Home' },
    { to: '/requested-books', label: 'Requested' },
    { to: '/librarian-issued-books', label: 'Issued' },
    { to: '/about', label: 'About Us' },
    { to: '/query', label: 'Query' },
  ] : [
    { to: '/Home', label: 'Home' },
    { to: '/favorites', label: 'Favourites' },
    { to: '/issued-books', label: 'All Books' },
    { to: '/about', label: 'About Us' },
  ];

  return (
    <div className="min-h-screen min-w-screen relative text-white font-[Eczar] overflow-x-hidden m-0 p-0">
      <div className="absolute inset-0 bg-cover bg-center opacity-32" style={{ backgroundImage: `url(${bg1})` }}></div>

      <div className="relative z-30 flex items-center justify-between p-4 bg-green-900 bg-opacity-50">
        <div className="flex items-center space-x-3">
          <div 
            className="bg-white p-2 rounded-full cursor-pointer"
          >
            <img 
              src={logo} 
              alt="Readify AI Logo" 
              className="w-12 h-21 object-contain"
            />
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

        <input
          type="text"
          placeholder="Search for hacking, thermodynamics, etc..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-[24rem] md:w-[30rem] lg:w-[36rem] bg-gray-700 text-white rounded-full px-6 py-3 text-lg border-2 border-black"
          aria-label="Search categories"
        />

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

      <div className="relative z-10 flex flex-wrap justify-center gap-4 p-6">
        {error && <p className="text-red-500 text-lg mb-4">{error}</p>}
        {filteredCategories.map((category, index) => (
          <Link
            key={index}
            to={userRole === 'Admin'
              ? `/admin/${category.toLowerCase().replace(/\s+/g, '-')}`
              : `/category/${category.toLowerCase().replace(/\s+/g, '-')}`}
            className="px-5 py-2 bg-green-500 hover:bg-green-600 rounded-full text-sm md:text-lg text-black font-semibold border-2 border-black"
          >
            {category}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HomePage;

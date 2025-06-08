import React from 'react';
import { Link } from 'react-router-dom';
import bg2 from '../styles/h.png';
import '../styles/fonts.css';

const AboutUs = () => {
  return (
    <div
      className="min-h-screen relative flex flex-col justify-center items-center p-12 text-white"
      style={{ backgroundImage: `url(${bg2})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Dark Overlay with Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/50 z-0" />
        <br></br>
      {/* Home Button (Fixed at Top-Left) */}
      <br></br>
      <div className="fixed top-4 left-4 z-20">
        <Link
          to="/Home"
          className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-full text-lg text-black font-semibold font-[Eczar] border-2 border-black transition-transform duration-200 hover:scale-105"
        >
          Home
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-5xl animate-fade-in">
        <h2 className="font-[Lancelot] text-5xl mb-8 text-white">About Us</h2>
        <div className="font-[Eczar] text-xl leading-8 space-y-6 text-white">
          <p>
            Welcome to <strong>Readify AI</strong> — your intelligent digital library platform designed to revolutionize the academic reading experience. We are committed to creating an accessible, intelligent, and user-centric library for students, faculty, and administrators alike.
          </p>
          <p>
            <strong>Our Mission:</strong> To empower education through seamless access to a dynamic collection of books, research material, and resources — powered by advanced AI technologies that simplify, personalize, and optimize your learning journey.
          </p>
          <p>
            Readify AI caters to students looking for study material, faculty conducting research, and administrators managing library workflows. Our platform enhances the experience with features like automated borrowing rules, category-based browsing, personalized dashboards, and smart search.
          </p>
          <p>
            We're not just a digital library — we're a knowledge partner in your academic success. Whether you're diving into your next novel, exploring cutting-edge research, or handling book logistics, we’re here to support you every step of the way.
          </p>
          <p>
            Join us and embrace the future of smart libraries. <em>Have questions?</em> We're just a click away.
          </p>
        </div>

        {/* Contact Icons */}
        <div className="flex justify-center space-x-8 mt-10">
          <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <svg
              className="w-8 h-8 text-blue-500 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-1.337-.027-3.063-1.867-3.063-1.872 0-2.159 1.461-2.159 2.971v5.696h-3v-11h2.897v1.494h.041c.403-.764 1.387-1.567 2.854-1.567 3.052 0 3.614 2.008 3.614 4.621v6.452z"/>
            </svg>
          </a>
          <a href="tel:+1234567890" aria-label="Phone">
            <svg
              className="w-8 h-8 text-white hover:scale-110 hover:shadow-lg hover:shadow-white/50 transition-all duration-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.12.35.03.74-.24 1.02l-2.2 2.2z"/>
            </svg>
          </a>
          <a href="mailto:support@readifyai.com" aria-label="Email">
            <svg
              className="w-8 h-8 text-white hover:scale-110 hover:shadow-lg hover:shadow-white/50 transition-all duration-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
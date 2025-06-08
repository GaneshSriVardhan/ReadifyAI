import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import backgroundImage from '../styles/image.png';
import logo from '../styles/logo.png';
import '../styles/fonts.css';

const text1 =
  'Welcome to the E-Library Book Store - your one-stop destination for discovering, requesting, and managing books online.';
const text2 =
  'Easily browse through a wide collection of books, access AI-generated summaries and chapter notes, and stay on top of your book return dates. Log in to begin your digital reading journey today!';

const typeText = async (text, setText, delay = 50) => {
  let typedText = '';
  for (let i = 0; i < text.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    typedText += text[i];
    setText(typedText);
  }
};

const LandingPage = () => {
  const [displayedText1, setDisplayedText1] = useState('');
  const [displayedText2, setDisplayedText2] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const startTyping = async () => {
      await typeText(text1, setDisplayedText1, 50);
      await typeText(text2, setDisplayedText2, 50);
      setIsTypingDone(true);
    };

    startTyping();
  }, []);

  const handleLogoClick = () => {
    navigate('/login');
  };

  return (
    <div
      className="flex justify-center items-center min-h-screen text-center relative bg-cover bg-center"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-black opacity-70 z-10"></div>

      <div className="relative z-20 text-white font-[GreatVibes] text-[28px] px-4 max-w-3xl">
        <img
          src={logo}
          alt="Readify AI Logo"
          className="w-[185px] h-[200px] object-contain mx-auto mb-4 cursor-pointer"
          onClick={handleLogoClick}
          role="button"
          aria-label="Go to Login"
        />
        <h1 className="font-[Lancelot] text-[85px] mb-4">ReadifyAI</h1>
        <p className="my-4 min-h-[6rem] whitespace-pre-wrap">{displayedText1}</p>
        <p className="my-4 min-h-[6rem] whitespace-pre-wrap">{displayedText2}</p>
      </div>
    </div>
  );
};

export default LandingPage;

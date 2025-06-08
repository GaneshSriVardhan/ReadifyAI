import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/fonts.css';
import bg1 from '../styles/h.png';

const ReadPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const title = location.state?.title;

  const [embedUrl, setEmbedUrl] = useState('');
  const [bookTitle, setBookTitle] = useState('Loading...');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [showQuestionSidebar, setShowQuestionSidebar] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [responseLoading, setResponseLoading] = useState(false);

  useEffect(() => {
    const fetchBookData = async () => {
      try {
        if (!title) {
          setBookTitle('No title provided');
          setLoading(false);
          return;
        }

        const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`;
        const res = await fetch(searchUrl);
        const data = await res.json();

        const firstBook = data.docs?.[0];

        if (firstBook) {
          setBookTitle(firstBook.title || 'Untitled');

          const iaId = firstBook.ia?.[0];
          if (iaId) {
            setEmbedUrl(`https://archive.org/embed/${iaId}?ui=embed`);
          } else {
            setErrorMsg('This book is not available for online reading.');
          }
        } else {
          setBookTitle('Book not found');
          setErrorMsg('No matching book found.');
        }
      } catch (err) {
        console.error('Error fetching book data:', err);
        setBookTitle('Error loading book');
        setErrorMsg('Failed to load book data.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookData();
  }, [title]);

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      setResponse('Please enter a question.');
      return;
    }

    setResponseLoading(true);
    setResponse('');

    try {
      const proxyUrl = 'https://elibraryreadifyai.vercel.app/api/ask';
      const payload = {
        bookTitle,
        question,
      };

      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Proxy request failed with status ${res.status}`);
      }

      const data = await res.json();
      const rawAnswer = data.answer || 'No response received.';
      const formattedAnswer = formatAnswer(rawAnswer);
      setResponse(formattedAnswer);
    } catch (err) {
      console.error('Error fetching question response:', err);
      setResponse(`Error: ${err.message}`);
    } finally {
      setResponseLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-[Eczar] relative">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${bg1})` }}
      ></div>
      <div className="absolute inset-0 bg-black opacity-60 z-0"></div>

      <div className="relative z-10 flex justify-between items-center p-6 bg-green-900 bg-opacity-50">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-green-400 rounded-full text-black font-semibold text-lg hover:bg-green-300 transition"
        >
          ← Back
        </button>

        <div className="px-6 py-3 bg-green-400 rounded-full text-black font-semibold text-xl font-[Magnolia Script]">
          {bookTitle}
        </div>

        <button
          onClick={() => setShowQuestionSidebar(!showQuestionSidebar)}
          className="px-6 py-3 bg-green-400 rounded-full text-black font-semibold text-xl font-[Magnolia Script] hover:bg-green-300 transition"
        >
          {showQuestionSidebar ? 'Hide Questions' : 'Ask a Question'}
        </button>
      </div>

      <div className="relative z-10 flex h-[calc(100vh-120px)] p-6">
        <div className={`flex-1 transition-all duration-300 ${showQuestionSidebar ? 'w-3/4' : 'w-full'}`}>
          {loading ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-green-400"></div>
              <p className="text-white text-xl">Loading book...</p>
            </div>
          ) : embedUrl ? (
            <div className="w-full h-full bg-white p-1 rounded overflow-auto">
              <iframe
                src={embedUrl}
                title="Book Reader"
                className="w-full h-[80vh] border-none"
                style={{ overflow: 'auto' }}
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <p className="text-white text-2xl">{errorMsg}</p>
          )}
        </div>

        {showQuestionSidebar && (
          <div className="w-1/4 bg-white text-black p-6 rounded-lg ml-4 flex flex-col">
            <h2 className="text-2xl font-semibold mb-4">Ask a Question</h2>
            <div className="flex-1 space-y-4 overflow-auto">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter your question (e.g., Summarize Chapter 1, Create MCQs for the book, etc.)"
                className="w-full p-2 border rounded h-32"
              ></textarea>

              {responseLoading ? (
                <div className="flex justify-center">
                  <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-green-400"></div>
                </div>
              ) : response ? (
                <div className="p-4 bg-gray-100 rounded overflow-y-auto max-h-[300px]">
                  {typeof response === 'string' ? <p>{response}</p> : response}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowQuestionSidebar(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Close
              </button>
              <button
                onClick={handleAskQuestion}
                className="px-4 py-2 bg-green-400 rounded text-black hover:bg-green-300"
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format answer text
const formatAnswer = (text) => {
  const lines = text.split(/\n|(?=\d+\.)/g); // Split at newlines or "1.", "2." etc.
  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <p key={index} className="text-sm whitespace-pre-wrap leading-relaxed">
          {line.trim()}
        </p>
      ))}
    </div>
  );
};

export default ReadPage;

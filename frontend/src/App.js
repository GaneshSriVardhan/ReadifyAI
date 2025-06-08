import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import VerificationSend from './components/VerificationSend';
import ForgotPassword from './components/ForgotPassword';
import ChangePassword from './components/ChangePassword';
import HomePage from './components/HomePage';
import CategoryPage from './components/CategoryPage';
import AboutUs from './components/AboutUs';
import ProfilePage from './components/ProfilePage';
import BookDetailsPage from './components/BookDetailsPage';
import ReadPage from './components/ReadPage';
import RequestIssuePage from './components/RequestIssuePage';
import AllRequestsPage from './components/AllRequestsPage';
import RequestedBooksPage from './components/RequestedBookPage';
import LibrarianIssuedBooksPage from './components/LibrarianIssuedBooksPage';
import FavoriteBooksPage from './components/FavoriteBooksPage';
import AdminQueryPage from './components/AdminQueryPage';
import UpdatePassword from './components/UpdatePasssword';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot" element={<ForgotPassword />} />
         <Route path="/change-password" element={<UpdatePassword />} />
        <Route path="/change" element={<ChangePassword />} />
        <Route path="/Home" element={<HomePage />} />
        <Route path="/book/:id" element={<BookDetailsPage />} />
        <Route path="/Profile" element={<ProfilePage />} />
        <Route path="/query" element={<AdminQueryPage />} />
        <Route path="/requested-books" element={<RequestedBooksPage />} />
        <Route path="/request-issue" element={<RequestIssuePage />} />
        <Route path="/librarian-issued-books" element={<LibrarianIssuedBooksPage />} />
        <Route path="/issued-books" element={<AllRequestsPage />} />
        <Route path="/category/:category" element={<CategoryPage />} />
        <Route path="/admin/:category" element={<CategoryPage />} />
        <Route path="/favorites" element={<FavoriteBooksPage />} />
        <Route path="/read" element={<ReadPage />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/verify" element={<VerificationSend />} /> {/* Handles verification */}
        {/* Add other routes as needed */}
      </Routes>
    </Router>
  );
}

export default App;
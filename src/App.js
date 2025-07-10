import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from './AppProvider';
import Home from './Home';
import Documents from './Documents';
import TrackDocument from './TrackDocument';
import MyProfile from './MyProfile';
import About from './About';
import ConfirmationModal from './ConfirmationModal'; // Import the modal component

const App = () => {
  const { isLoggedIn, setIsLoggedIn, currentPage, setCurrentPage, error, isMenuOpen, setIsMenuOpen, handleLogin, username, setUsername, password, setPassword, dateTime, user, setError } = useContext(AppContext);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [inactivityTime, setInactivityTime] = useState(1800000); // 30 minutes in ms
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const [modalMessage, setModalMessage] = useState(''); // State for modal message

  useEffect(() => {
    const handleActivity = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);

    const checkInactivity = () => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      const remainingTime = Math.max(0, 1800000 - timeSinceLastActivity);
      setInactivityTime(remainingTime);
      if (timeSinceLastActivity >= 1800000) { // 30 minutes
        setIsLoggedIn(false);
        setError('Session timed out due to inactivity');
      }
    };

    const inactivityInterval = setInterval(checkInactivity, 1000);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(inactivityInterval);
    };
  }, [lastActivity, setIsLoggedIn, setError]);

  const formatInactivityTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Function to open the modal with a specific message
  const openModal = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setModalMessage('');
  };

  // Function to handle confirm (optional, can be customized for specific actions)
  const handleConfirm = () => {
    closeModal(); // For now, just close the modal; add custom logic if needed
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <img src="https://sdolaoagcity.wordpress.com/wp-content/uploads/2018/08/cropped-deped-laoag-seal_2-1.png?w=100" alt="DOLC Logo" className="login-logo" />
            <h2 className="login-title">SDOLC Tracking System</h2>
          </div>
          <div className="login-content">
            <h3>Sign In to Your Account</h3>
            <p className="login-subtitle">School Division of Laoag City Document Management</p>
            {error && <div className="error-message"><i className="fas fa-exclamation-circle"></i> {error}</div>}
            <div className="login-form">
              <div className="input-group">
                <label className="input-label">Username</label>
                <div className="input-container">
                  <i className="fas fa-user input-icon"></i>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="login-input" placeholder="Enter your username" />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-container">
                  <i className="fas fa-lock input-icon"></i>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="login-input" placeholder="Enter your password" />
                </div>
              </div>
              <div className="remember-forgot">
                <label className="remember-me">
                  <input type="checkbox" />
                  Remember me
                </label>
                <button type="button" className="forgot-password" onClick={(e) => { e.preventDefault(); openModal('Please contact support to reset your password'); }}>
                  Forgot password?
                </button>
              </div>
              <button className="login-button" onClick={handleLogin}>
                <i className="fas fa-sign-in-alt"></i> Sign In
              </button>
            </div>
          </div>
          <div className="login-footer">
            <p>New user? <button className="contact-admin" onClick={(e) => { e.preventDefault(); openModal('Please contact your system administrator for account approval'); }}>Contact administrator for account approval</button></p>
            <p className="copyright">© 2025 DEPED Document Tracking System. All rights reserved.</p>
          </div>
        </div>
        <div className="login-background">
          <div className="background-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>
        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onConfirm={handleConfirm}
          message={modalMessage}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-top">
          <div className="logo-container">
            <img src="https://sdolaoagcity.wordpress.com/wp-content/uploads/2018/08/cropped-deped-laoag-seal_2-1.png?w=80" alt="DOLC Logo" className="logo-image" />
            <h1 className="app-title">DEPED <span>Schools Division of Laoag City</span></h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                <i className="fas fa-user-circle"></i>
              </div>
              <div className="user-details">
                <p className="user-name">{user ? user.username : 'Loading...'}</p>
                <p className="user-role">{user ? user.role || 'N/A' : 'N/A'}</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="icon-button">
                <i className="fas fa-bell"></i>
                <span className="notification-badge">3</span>
              </button>
              <button className="icon-button" onClick={() => setIsLoggedIn(false)}>
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
        <div className="header-bottom">
          <div className="datetime-container">
            <i className="fas fa-clock"></i>
            <span className="clock-text">{dateTime.toLocaleString()}</span>
            <span> | Inactivity Timeout: {formatInactivityTime(inactivityTime)}</span>
          </div>
          <nav className={`nav-bar ${isMenuOpen ? 'active' : ''}`}>
            <button type="button" onClick={() => { setCurrentPage('home'); setIsMenuOpen(false); }} className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}>
              <i className="fas fa-home"></i> Home
            </button>
            <button type="button" onClick={() => { setCurrentPage('documents'); setIsMenuOpen(false); }} className={`nav-link ${currentPage === 'documents' ? 'active' : ''}`}>
              <i className="fas fa-file"></i> Documents
            </button>
            <button type="button" onClick={() => { setCurrentPage('track'); setIsMenuOpen(false); }} className={`nav-link ${currentPage === 'track' ? 'active' : ''}`}>
              <i className="fas fa-search"></i> Track
            </button>
            <button type="button" onClick={() => { setCurrentPage('profile'); setIsMenuOpen(false); }} className={`nav-link ${currentPage === 'profile' ? 'active' : ''}`}>
              <i className="fas fa-user"></i> Profile
            </button>
            <button type="button" onClick={() => { setCurrentPage('about'); setIsMenuOpen(false); }} className={`nav-link ${currentPage === 'about' ? 'active' : ''}`}>
              <i className="fas fa-info-circle"></i> About
            </button>
          </nav>
          <button type="button" className="menu-toggle" id="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <i className={`fas fa-${isMenuOpen ? 'times' : 'bars'}`}></i>
          </button>
        </div>
      </header>
      <main className="main-content">
        {currentPage === 'home' && <Home />}
        {currentPage === 'documents' && <Documents />}
        {currentPage === 'track' && <TrackDocument />}
        {currentPage === 'profile' && <MyProfile />}
        {currentPage === 'about' && <About />}
      </main>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>SDOLC Tracking System</h4>
            <p>Efficient document management solution for the School Division of Laoag City</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li>
                <button className="footer-link-button" onClick={() => openModal('User manual download coming soon')}>
                  User Manual
                </button>
              </li>
              <li>
                <button className="footer-link-button" onClick={() => openModal('No updates available at this time')}>
                  System Updates
                </button>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <ul className="footer-contact">
              <li><i className="fas fa-envelope"></i> laoag.city@deped.gov.ph</li>
              <li><i className="fas fa-phone"></i> (077) 771-3678</li>
              <li><i className="fas fa-map-marker-alt"></i> Barangay 23 San Matias, Laoag City</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 Department of Education. All rights reserved.</p>
          <div className="social-links">
            <button className="social-button" onClick={() => window.open('https://facebook.com', '_blank')}>
              <i className="fab fa-facebook"></i>
            </button>
            <button className="social-button" onClick={() => window.open('https://twitter.com', '_blank')}>
              <i className="fab fa-twitter"></i>
            </button>
            <button className="social-button" onClick={() => window.open('https://linkedin.com', '_blank')}>
              <i className="fas fa-linkedin"></i>
            </button>
          </div>
        </div>
      </footer>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={handleConfirm}
        message={modalMessage}
      />
    </div>
  );
};

export default App;

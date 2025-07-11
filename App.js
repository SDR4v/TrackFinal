import React, { useContext, useEffect, useState, useCallback } from 'react';
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
  const [notificationCount, setNotificationCount] = useState(0); // State for notification count
  const [showLoginBox, setShowLoginBox] = useState(false); // State for showing login box

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

  // Function to fetch notification count (incoming documents)
  const fetchNotificationCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/documents/${user._id}/incoming`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const incomingDocuments = await response.json();
        // Count unaccepted documents for the current user's department
        const unacceptedCount = incomingDocuments.filter(doc => 
          !doc.accepted && doc.releaseTo === user.department
        ).length;
        setNotificationCount(unacceptedCount);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  }, [user]);

  // Fetch notification count when user is logged in
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchNotificationCount();
      // Refresh notification count every 30 seconds
      const notificationInterval = setInterval(fetchNotificationCount, 30000);
      return () => clearInterval(notificationInterval);
    }
  }, [isLoggedIn, user, fetchNotificationCount]);

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

  // Function to handle logo click and show login box
  const handleLogoClick = () => {
    setShowLoginBox(true);
  };

  // Show logo trigger initially
  if (!isLoggedIn && !showLoginBox) {
    return (
      <div className="login-background">
        <div className="login-logo-trigger" onClick={handleLogoClick}>
          <img src="https://sdolaoagcity.wordpress.com/wp-content/uploads/2018/08/cropped-deped-laoag-seal_2-1.png?w=80" alt="DepEd Laoag Logo" />
          <h2>DepEd Laoag</h2>
          <p>Document Tracking System</p>
        </div>
      </div>
    );
  }

  // Show login box when triggered
  if (!isLoggedIn && showLoginBox) {
    return (
      <div className="login-background">
        <div className="login-box show">
          <div className="login-header">
            <img src="https://sdolaoagcity.wordpress.com/wp-content/uploads/2018/08/cropped-deped-laoag-seal_2-1.png?w=80" alt="DepEd Laoag Logo" className="login-logo" />
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
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="login-input" placeholder="Enter your username or email" />
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
              <button type="button" className="back-button" onClick={() => setShowLoginBox(false)}>
                <i className="fas fa-arrow-left"></i> Back
              </button>
            </div>
          </div>
          <div className="login-footer">
            <p>New user? <button className="contact-admin" onClick={(e) => { e.preventDefault(); openModal('Please contact your system administrator for account approval'); }}>Contact administrator for account approval</button></p>
            <p className="copyright">© 2025 DEPED Document Tracking System. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-top">
          <div className="logo-container">
            <img src="https://sdolaoagcity.wordpress.com/wp-content/uploads/2018/08/cropped-deped-laoag-seal_2-1.png?w=80" alt="DOLC Logo" className="logo-image" />
            <div className="title-container">
              <h1 className="app-title">Department of Education</h1>
              <p className="app-subtitle">Schools Division of Laoag City</p>
            </div>
          </div>
          <div className="header-right">
            <div className="user-info" onClick={() => setCurrentPage('profile')} style={{ cursor: 'pointer' }}>
              <div className="user-avatar">
                {user?.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt="Profile" 
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      objectFit: 'cover' 
                    }} 
                  />
                ) : (
                  <i className="fas fa-user-circle"></i>
                )}
              </div>
              <div className="user-details">
                <p className="user-name">{user ? user.username : 'Loading...'}</p>
                <p className="user-role">{user ? user.role || 'N/A' : 'N/A'}</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="icon-button" onClick={() => setCurrentPage('documents')}>
                <i className="fas fa-bell"></i>
                {notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}
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
      <footer className="footer" style={{ padding: '10px 0', fontSize: '14px' }}>
        <div className="footer-content" style={{ padding: '0 20px', gap: '15px' }}>
          <div className="footer-section" style={{ marginBottom: '8px' }}>
            <h4 style={{ fontSize: '16px', marginBottom: '4px' }}>SDOLC Tracking System</h4>
            <p style={{ fontSize: '13px', lineHeight: '1.3', margin: '0' }}>Efficient document management solution for the School Division of Laoag City</p>
          </div>
          <div className="footer-section" style={{ marginBottom: '8px' }}>
            <h4 style={{ fontSize: '16px', marginBottom: '4px' }}>Quick Links</h4>
            <ul className="footer-links" style={{ margin: '0', padding: '0' }}>
              <li style={{ marginBottom: '2px' }}>
                <button className="footer-link-button" onClick={() => window.open('https://docs.google.com/document/d/1CAUPJrOlagWUD0AToEjIrXYC1G0aV4cf/edit?usp=sharing&ouid=113301063360399798667&rtpof=true&sd=true', '_blank')} style={{ fontSize: '13px', padding: '2px 6px' }}>
                  User Manual
                </button>
              </li>
              <li style={{ marginBottom: '2px' }}>
                <button className="footer-link-button" onClick={() => openModal('No updates available at this time')} style={{ fontSize: '13px', padding: '2px 6px' }}>
                  System Updates
                </button>
              </li>
            </ul>
          </div>
          <div className="footer-section" style={{ marginBottom: '8px' }}>
            <h4 style={{ fontSize: '16px', marginBottom: '4px' }}>Contact</h4>
            <ul className="footer-contact" style={{ margin: '0', padding: '0' }}>
              <li style={{ fontSize: '13px', marginBottom: '2px' }}><i className="fas fa-envelope"></i> laoag.city@deped.gov.ph</li>
              <li style={{ fontSize: '13px', marginBottom: '2px' }}><i className="fas fa-phone"></i> (077) 771-3678</li>
              <li style={{ fontSize: '13px', marginBottom: '2px' }}><i className="fas fa-map-marker-alt"></i> Barangay 23 San Matias, Laoag City</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom" style={{ padding: '6px 20px', borderTop: '1px solid #ddd' }}>
          <p style={{ fontSize: '12px', margin: '0' }}>© 2025 Department of Education. All rights reserved.</p>
          <div className="social-links" style={{ gap: '6px' }}>
            <button className="social-button" onClick={() => window.open('https://facebook.com', '_blank')} style={{ width: '30px', height: '30px', fontSize: '14px' }}>
              <i className="fab fa-facebook"></i>
            </button>
            <button className="social-button" onClick={() => window.open('https://twitter.com', '_blank')} style={{ width: '30px', height: '30px', fontSize: '14px' }}>
              <i className="fab fa-twitter"></i>
            </button>
            <button className="social-button" onClick={() => window.open('https://linkedin.com', '_blank')} style={{ width: '30px', height: '30px', fontSize: '14px' }}>
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
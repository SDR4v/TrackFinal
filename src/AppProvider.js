import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentPage, setCurrentPage] = useState('home');
  const [error, setError] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = `${wsProtocol}${window.location.host}/ws`;
    const socket = new WebSocket(wsHost);
    socket.onopen = () => console.log('WebSocket connected successfully');
    socket.onmessage = (event) => console.log('Real-time update:', event.data);
    socket.onerror = (error) => console.error('WebSocket error:', error);

    const updateClock = setInterval(() => setDateTime(new Date()), 1000);

    const checkLoginStatus = async () => {
      try {
        const response = await fetch('/api/user/check', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsLoggedIn(true);
        } else if (response.status !== 401) {
          // Only set error for unexpected failures, not for "not authenticated"
          setError('Failed to verify login status');
          setIsLoggedIn(false);
        } else {
          setIsLoggedIn(false); // No session, just set to not logged in without error
        }
      } catch (err) {
        setError('Failed to verify login status: ' + err.message);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();

    return () => {
      socket.close();
      clearInterval(updateClock);
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (username && password) {
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Login failed');
        const data = await response.json();
        if (data.success) {
          setIsLoggedIn(true);
          const userData = await (await fetch(`/api/user/${data.userId}`, { credentials: 'include' })).json();
          setUser(userData);
        } else {
          throw new Error('Invalid credentials or account not approved');
        }
      } catch (err) {
        setError(err.message);
      }
      setUsername('');
      setPassword('');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AppContext.Provider value={{ isLoggedIn, setIsLoggedIn, dateTime, currentPage, setCurrentPage, error, setError, isMenuOpen, setIsMenuOpen, handleLogin, username, setUsername, password, setPassword, user, setUser }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
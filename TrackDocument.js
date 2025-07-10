import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from './AppProvider';
import io from 'socket.io-client';

const TrackDocument = () => {
  const { setError, user } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackingResults, setTrackingResults] = useState([]);

 useEffect(() => {
    if (!user || !user._id) {
      setError('You must be logged in to track documents');
      return;
    }

    const socket = io('http://localhost:5001');
    socket.on('connect', () => {
      if (searchQuery) {
        socket.emit('trackDocument', searchQuery);
      }
    });

    socket.on('documentUpdate', (data) => {
      fetch(`http://localhost:5001/api/document?query=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include'
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch documents');
          return res.json();
        })
        .then(docs => {
          const updatedResults = docs.map(doc => ({
            id: doc._id,
            documentId: doc.documentId,
            title: doc.title,
            status: doc.status,
            currentLocation: doc.department,
            lastUpdated: new Date(doc.updatedAt || doc.createdAt).toLocaleString(),
            documentType: doc.documentType,
            purpose: doc.purpose,
            releaseTo: doc.releaseTo,
            history: doc.history || [],
          }));
          if (updatedResults.some(result => result.id === data.id || result.documentId === data.documentId)) {
            setTrackingResults(updatedResults);
            setError(null);
          }
        })
        .catch(err => setError(err.message));
    });

    return () => socket.disconnect();
  }, [searchQuery, setError, user]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!user || !user._id) {
      setError('You must be logged in to track documents');
      return;
    }
    if (!searchQuery) {
      setError('Please enter a Document ID or Title');
      return;
    }
    fetch(`http://localhost:5001/api/document?query=${encodeURIComponent(searchQuery)}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error('No documents found');
        return res.json();
      })
      .then(docs => {
        const results = docs.map(doc => ({
          id: doc._id,
          documentId: doc.documentId,
          title: doc.title,
          status: doc.status,
          currentLocation: doc.department,
          lastUpdated: new Date(doc.updatedAt || doc.createdAt).toLocaleString(),
          documentType: doc.documentType,
          purpose: doc.purpose,
          releaseTo: doc.releaseTo,
          history: doc.history || [],
        }));
        setTrackingResults(results);
        setError(null);
        const socket = io('http://localhost:5001');
        socket.emit('trackDocument', searchQuery);
      })
      .catch(err => {
        setTrackingResults([]);
        setError(err.message);
      });
  };

 return (
    <div className="content-card">
      <h2 className="section-title">Track Document</h2>
      <div className="track-input-group">
        <form onSubmit={handleSearch}>
          <div className="search-container">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Enter Document ID or Title"
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-button">Search</button>
          </div>
        </form>
      </div>
      {trackingResults.length > 0 ? (
        trackingResults.map((result, index) => (
          <div key={result.id} className="tracking-results">
            <div className="tracking-header">
              <h3>Document: {result.title} (ID: {result.documentId || result.id})</h3>
              <span className={`status-badge ${result.status.toLowerCase().replace(' ', '-')}`}>
                {result.status}
              </span>
            </div>
            <div className="tracking-info">
              <div className="info-item">
                <label>Document ID:</label>
                <span>{result.documentId || result.id}</span>
              </div>
              <div className="info-item">
                <label>Current Location:</label>
                <span>{result.currentLocation}</span>
              </div>
              <div className="info-item">
                <label>Document Type:</label>
                <span>{result.documentType}</span>
              </div>
              <div className="info-item">
                <label>Purpose:</label>
                <span>{result.purpose}</span>
              </div>
              <div className="info-item">
                <label>Release To:</label>
                <span>{result.releaseTo}</span>
              </div>
              <div className="info-item">
                <label>Last Updated:</label>
                <span>{result.lastUpdated}</span>
              </div>
            </div>
            <h4>Document History</h4>
            <div className="tracking-timeline">
              {result.history.length > 0 ? (
                result.history.map((event, eventIndex) => (
                  <div key={eventIndex} className="timeline-event">
                    <div className="timeline-point"></div>
                    <div className="timeline-content">
                      <p className="event-action">{event.action}</p>
                      <p className="event-department">{event.department}</p>
                      <p className="event-date">{new Date(event.date).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p>No history available for this document.</p>
              )}
            </div>
          </div>
        ))
      ) : (
        <p>No documents found.</p>
      )}
    </div>
  );
};

export default TrackDocument;
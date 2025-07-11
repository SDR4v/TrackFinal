import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from './AppProvider';
import ConfirmationModal from './ConfirmationModal';
import { documentTypes, releaseToOptions } from './constants';
import io from 'socket.io-client';

const TrackDocument = () => {
  const { setError, user } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackingResults, setTrackingResults] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); // Add processing state
  const [filterType, setFilterType] = useState('all'); // 'all', 'text', 'documentType', 'unit'
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  const showConfirmationModal = (message, action) => {
    if (isProcessing) return; // Prevent multiple confirmations
    setModalMessage(message);
    setModalAction(() => async () => {
      if (isProcessing) return; // Double check
      setIsProcessing(true);
      try {
        await action();
      } finally {
        setIsProcessing(false);
      }
    });
    setIsModalOpen(true);
  };

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

    setIsProcessing(true); // Set processing state to true

    // Build search URL based on filter type
    let searchUrl = `http://localhost:5001/api/document?`;
    let searchParams = [];

    if (filterType === 'text' && searchQuery) {
      searchParams.push(`query=${encodeURIComponent(searchQuery)}`);
    } else if (filterType === 'documentType' && selectedDocumentType) {
      searchParams.push(`documentType=${encodeURIComponent(selectedDocumentType)}`);
    } else if (filterType === 'unit' && selectedUnit) {
      searchParams.push(`unit=${encodeURIComponent(selectedUnit)}`);
    } else if (filterType === 'all') {
      if (searchQuery) searchParams.push(`query=${encodeURIComponent(searchQuery)}`);
      if (selectedDocumentType) searchParams.push(`documentType=${encodeURIComponent(selectedDocumentType)}`);
      if (selectedUnit) searchParams.push(`unit=${encodeURIComponent(selectedUnit)}`);
    }

    if (searchParams.length === 0) {
      setError('Please enter search criteria or select a filter');
      setIsProcessing(false); // Reset processing state
      return;
    }

    searchUrl += searchParams.join('&');

    fetch(searchUrl, {
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
          createdBy: doc.createdByUsername,
          remarks: doc.remarks,
          history: doc.history || [],
        }));
        setTrackingResults(results);
        setError(null);
        showConfirmationModal(`Found ${results.length} document(s) matching your search criteria`, () => setIsModalOpen(false));
        const socket = io('http://localhost:5001');
        socket.emit('trackDocument', searchQuery || selectedDocumentType || selectedUnit);
      })
      .catch(err => {
        setTrackingResults([]);
        setError(err.message);
      })
      .finally(() => setIsProcessing(false)); // Reset processing state
  };

 return (
    <div className="content-card">
      <h2 className="section-title">Track Document</h2>
      
      {/* Filter Options */}
      <div className="track-filter-container">
        <div className="filter-option">
          <label>
            <input
              type="radio"
              value="all"
              checked={filterType === 'all'}
              onChange={(e) => setFilterType(e.target.value)}
            />
            All Filters
          </label>
        </div>
        <div className="filter-option">
          <label>
            <input
              type="radio"
              value="text"
              checked={filterType === 'text'}
              onChange={(e) => setFilterType(e.target.value)}
            />
            Text Search
          </label>
        </div>
        <div className="filter-option">
          <label>
            <input
              type="radio"
              value="documentType"
              checked={filterType === 'documentType'}
              onChange={(e) => setFilterType(e.target.value)}
            />
            Document Type
          </label>
        </div>
        <div className="filter-option">
          <label>
            <input
              type="radio"
              value="unit"
              checked={filterType === 'unit'}
              onChange={(e) => setFilterType(e.target.value)}
            />
            Unit/Department
          </label>
        </div>
      </div>

      <div className="track-input-group">
        <form onSubmit={handleSearch}>
          {/* Text Search Input */}
          {(filterType === 'text' || filterType === 'all') && (
            <div className="search-container">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Enter Document ID or Title"
                className="input-field"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Document Type Filter */}
          {(filterType === 'documentType' || filterType === 'all') && (
            <div className="form-group">
              <label>Document Type</label>
              <select
                className="input-field select"
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
              >
                <option value="">All Document Types</option>
                {documentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          {/* Unit/Department Filter */}
          {(filterType === 'unit' || filterType === 'all') && (
            <div className="form-group">
              <label>Unit/Department</label>
              <select
                className="input-field select"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
              >
                <option value="">All Units/Departments</option>
                <optgroup label="Units">
                  {releaseToOptions
                    .filter(option => option.startsWith('Unit:'))
                    .map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                </optgroup>
                <optgroup label="Schools">
                  {releaseToOptions
                    .filter(option => option.startsWith('School:'))
                    .map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                </optgroup>
                <optgroup label="Private Schools">
                  {releaseToOptions
                    .filter(option => option.startsWith('Private School:'))
                    .map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                </optgroup>
                <optgroup label="Agencies">
                  {releaseToOptions
                    .filter(option => option.startsWith('Agency:'))
                    .map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                </optgroup>
              </select>
            </div>
          )}

          <button type="submit" className="search-button" disabled={isProcessing}>
            <i className="fas fa-search"></i> {isProcessing ? 'Searching...' : 'Search Documents'}
          </button>
        </form>
      </div>

      {/* Results */}
      {trackingResults.length > 0 ? (
        <div className="track-results-section">
          <div className="track-results-header">
            <h3 className="track-results-title">Search Results</h3>
            <span className="track-results-count">{trackingResults.length} document(s) found</span>
          </div>
          {trackingResults.map((result, index) => (
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
                  <label>Created By:</label>
                  <span>{result.createdBy}</span>
                </div>
                {result.remarks && (
                  <div className="info-item">
                    <label>Remarks:</label>
                    <span>{result.remarks}</span>
                  </div>
                )}
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
                        {event.remarks && (
                          <p className="event-remarks"><strong>Remarks:</strong> {event.remarks}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No history available for this document.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-results">
          <i className="fas fa-search"></i>
          <p>No documents found. Try adjusting your search criteria.</p>
        </div>
      )}
      
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsProcessing(false);
        }}
        onConfirm={modalAction}
        message={modalMessage}
      />
    </div>
  );
};

export default TrackDocument;
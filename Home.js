import React, { useContext, useEffect, useState, useRef } from 'react';
import { AppContext } from './AppProvider';
import { documentTypes, purposes, releaseToOptions } from './constants';
import io from 'socket.io-client';
import moment from 'moment-timezone';
import { handlePrint } from './printUtils';
import ConfirmationModal from './ConfirmationModal';
import './index.css';

// Multi-select component for destinations (duplicate from Documents.js for now)
const MultiSelect = ({ options, selectedValues, onChange, placeholder, groupBy = null }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Debug logging when component receives options
  useEffect(() => {
    console.log('MultiSelect received options:', options);
    console.log('Personnel options found:', options.filter(opt => opt.startsWith('Personnel:')));
  }, [options]);

  const handleToggleOption = (option) => {
    const isSelected = selectedValues.includes(option);
    if (isSelected) {
      onChange(selectedValues.filter(item => item !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const handleRemoveItem = (item) => {
    onChange(selectedValues.filter(option => option !== item));
  };

  const renderOptions = () => {
    if (groupBy) {
      const groups = {
        'Personnel': options.filter(opt => opt.startsWith('Personnel:')),
        'Unit': options.filter(opt => opt.startsWith('Unit:')),
        'School': options.filter(opt => opt.startsWith('School:')),
        'Private School': options.filter(opt => opt.startsWith('Private School:')),
        'Agency': options.filter(opt => opt.startsWith('Agency:'))
      };

      console.log('MultiSelect options:', options);
      console.log('Personnel group options:', groups.Personnel);

      return Object.entries(groups)
        .filter(([groupName, groupOptions]) => groupOptions.length > 0)
        .map(([groupName, groupOptions]) => (
        <div key={groupName}>
          <div className="multiselect-group-header">{groupName}</div>
          {groupOptions.map(option => (
            <div
              key={option}
              className={`multiselect-option ${selectedValues.includes(option) ? 'selected' : ''}`}
              onClick={() => handleToggleOption(option)}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option)}
                onChange={() => {}}
                onClick={(e) => e.stopPropagation()}
              />
              <span>{option}</span>
            </div>
          ))}
        </div>
      ));
    }

    return options.map(option => (
      <div
        key={option}
        className={`multiselect-option ${selectedValues.includes(option) ? 'selected' : ''}`}
        onClick={() => handleToggleOption(option)}
      >
        <input
          type="checkbox"
          checked={selectedValues.includes(option)}
          onChange={() => {}}
          onClick={(e) => e.stopPropagation()}
        />
        <span>{option}</span>
      </div>
    ));
  };

  return (
    <div className="multiselect-container">
      <div className="multiselect-input" onClick={() => setIsOpen(!isOpen)}>
        <div className="multiselect-values">
          {selectedValues.length === 0 ? (
            <span className="multiselect-placeholder">{placeholder}</span>
          ) : (
            selectedValues.map(item => (
              <span key={item} className="multiselect-tag">
                {item}
                <button
                  type="button"
                  className="multiselect-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveItem(item);
                  }}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <span className="multiselect-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <div className="multiselect-dropdown">
          <div className="multiselect-header">
            <button
              type="button"
              className="multiselect-action"
              onClick={() => onChange([])}
            >
              Clear All
            </button>
            <button
              type="button"
              className="multiselect-action"
              onClick={() => onChange(options)}
            >
              Select All
            </button>
          </div>
          <div className="multiselect-options">
            {renderOptions()}
          </div>
        </div>
      )}
    </div>
  );
};

const Home = () => {
  const { setError, user } = useContext(AppContext);
  const [stats, setStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [selectedStat, setSelectedStat] = useState(null);
  const [categoryDocuments, setCategoryDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [trackingResult, setTrackingResult] = useState(null);
  const [editDocument, setEditDocument] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); // Add processing state
  const recentlyAcceptedDocs = useRef(new Set());

  // Debug the constants
  useEffect(() => {
    console.log('releaseToOptions in Home:', releaseToOptions);
    console.log('Personnel options in constants:', releaseToOptions.filter(opt => opt.startsWith('Personnel:')));
  }, []);

  // Helper function to get the last reset time (8 AM PHT)
  const getLastResetTime = () => {
    const now = moment.tz('Asia/Manila');
    const resetTimeToday = moment.tz('Asia/Manila').set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
    return now.isBefore(resetTimeToday) 
      ? resetTimeToday.clone().subtract(1, 'day') 
      : resetTimeToday;
  };

  useEffect(() => {
    if (!user?._id) {
      setError('User not logged in. Please log in again.');
      return;
    }

    // Fetch stats
    fetch(`/api/documents/${user._id}/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
      })
      .then(async (data) => {
        // For urgent count, we need to filter to only include receiver documents
        let urgentCount = data.urgent || 0;
        let missedCount = data.missed || 0;
        
        try {
          // Fetch urgent documents to get accurate count for receivers only
          const urgentResponse = await fetch(`/api/documents/${user._id}/urgent`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
          
          if (urgentResponse.ok) {
            const urgentDocs = await urgentResponse.json();
            // Filter to only count urgent documents for receivers (not creators)
            urgentCount = urgentDocs.filter(doc => {
              const isCreator = doc.userId === user._id;
              const isReceiver = doc.releaseTo && doc.releaseTo.includes(user.department);
              return !doc.accepted && !isCreator && isReceiver;
            }).length;
          }

          // Fetch missed documents to get accurate count for receivers only
          const missedResponse = await fetch(`/api/documents/${user._id}/missed`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
          
          if (missedResponse.ok) {
            const missedDocs = await missedResponse.json();
            // Filter to only count missed documents for receivers (not creators) that are unviewed after 24 hours
            missedCount = missedDocs.filter(doc => {
              const isCreator = doc.userId === user._id;
              const isReceiver = doc.releaseTo && doc.releaseTo.includes(user.department);
              const createdAt = new Date(doc.createdAt);
              const now = new Date();
              const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
              
              return !doc.accepted && 
                     !doc.viewed &&
                     !isCreator && 
                     isReceiver &&
                     hoursSinceCreation >= 24; // Missed if not viewed after 24 hours
            }).length;
          }
        } catch (err) {
          console.error('Error fetching urgent/missed documents for count:', err);
          // Fallback to backend count if fetch fails
        }

        setStats({
          incoming: data.incoming || 0,
          completedToday: data.completedToday || 0,
          urgent: urgentCount,
          missed: missedCount,
          accepted: data.accepted || 0,
          pending: data.pending || 0,
          createdToday: data.createdToday || 0,
        });
      })
      .catch(err => {
        console.error('Stats fetch error:', err.message);
        setError(err.message);
        setStats({ incoming: 0, completedToday: 0, urgent: 0, missed: 0, accepted: 0, pending: 0, createdToday: 0 });
      });

    // Fetch recent activities
    const today = getLastResetTime();
    const tomorrow = today.clone().add(1, 'day');
    fetch(`/api/documents/${user._id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch documents');
        return res.json();
      })
      .then(data => {
        const activities = data
          .filter(doc =>
            !doc.deleted && (
              doc.acceptedBy?.toString() === user._id ||
              (Array.isArray(doc.releaseTo) ? doc.releaseTo.includes(user.department) : doc.releaseTo === user.department) ||
              doc.userId.toString() === user._id
            )
          )
          .flatMap(doc =>
            (doc.history || [])
              .filter(event =>
                new Date(event.date) >= today.toDate() &&
                new Date(event.date) < tomorrow.toDate() &&
                event.department === user.department &&
                ['Created', 'Received', 'Viewed', 'Deleted', 'Archived', 'Restored', 'Edited', 'Accepted', 'Completed', 'Unarchived', 'Missed'].includes(event.action)
              )
              .map(event => ({
                documentId: doc.documentId,
                title: doc.title,
                action: event.action,
                date: new Date(event.date),
                department: event.department,
                createdByUsername: doc.createdByUsername,
                createdByDepartment: doc.department,
                mongoId: doc.documentId,
              }))
          )
          .sort((a, b) => b.date - a.date)
          .slice(0, 10);
        setRecentActivities(activities);
      })
      .catch(err => {
        console.error('Recent activities fetch error:', err.message);
        setError(err.message);
      });

    // Fetch documents for selected stat category
    if (selectedStat) {
      const endpoint = `/api/documents/${user._id}/${selectedStat}`;
      fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch ${selectedStat} documents: ${res.statusText}`);
          return res.json();
        })
        .then(data => {
          console.log(`${selectedStat} documents loaded:`, data);
          const today = getLastResetTime();
          const tomorrow = today.clone().add(1, 'day');
          const filteredData = selectedStat === 'missed'
            ? data.filter(doc => {
                // For missed documents: documents that were not viewed within 24 hours of creation and targeted to this user's department
                const isCreator = doc.userId === user._id;
                const isReceiver = doc.releaseTo && doc.releaseTo.includes(user.department);
                const createdAt = new Date(doc.createdAt);
                const now = new Date();
                const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
                
                return !recentlyAcceptedDocs.current.has(doc.documentId) && 
                       !doc.accepted && 
                       !doc.viewed &&
                       !isCreator && 
                       isReceiver &&
                       hoursSinceCreation >= 24; // Missed if not viewed after 24 hours
              })
            : selectedStat === 'urgent'
            ? data.filter(doc => {
                // For urgent documents, only show to receivers (not creators)
                const isCreator = doc.userId === user._id;
                const isReceiver = doc.releaseTo && doc.releaseTo.includes(user.department);
                return !recentlyAcceptedDocs.current.has(doc.documentId) && 
                       !doc.accepted && 
                       !isCreator && 
                       isReceiver;
              })
            : data.filter(doc => {
                const dateToCheck = new Date(selectedStat === 'completed-today' ? doc.updatedAt : doc.createdAt);
                return dateToCheck >= today.toDate() && 
                       dateToCheck < tomorrow.toDate() && 
                       !recentlyAcceptedDocs.current.has(doc.documentId);
              });
          console.log(`Filtered ${selectedStat} documents:`, filteredData);
          setCategoryDocuments(filteredData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        })
        .catch(err => {
          console.error(`Category documents fetch error for ${selectedStat}:`, err.message);
          setError(err.message);
        });
    }
  }, [user, setError, selectedStat]);

  useEffect(() => {
    const socket = io('http://localhost:5001');
    socket.on('documentUpdate', (data) => {
      // Refresh stats
      fetch(`/api/documents/${user._id}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch stats');
          return res.json();
        })
        .then(async (data) => {
          // For urgent count, we need to filter to only include receiver documents
          let urgentCount = data.urgent || 0;
          let missedCount = data.missed || 0;
          
          try {
            // Fetch urgent documents to get accurate count for receivers only
            const urgentResponse = await fetch(`/api/documents/${user._id}/urgent`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            });
            
            if (urgentResponse.ok) {
              const urgentDocs = await urgentResponse.json();
              // Filter to only count urgent documents for receivers (not creators)
              urgentCount = urgentDocs.filter(doc => {
                const isCreator = doc.userId === user._id;
                const isReceiver = doc.releaseTo && doc.releaseTo.includes(user.department);
                return !doc.accepted && !isCreator && isReceiver;
              }).length;
            }

            // Fetch missed documents to get accurate count for receivers only
            const missedResponse = await fetch(`/api/documents/${user._id}/missed`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            });
            
            if (missedResponse.ok) {
              const missedDocs = await missedResponse.json();
              // Filter to only count missed documents for receivers (not creators) that are unviewed after 24 hours
              missedCount = missedDocs.filter(doc => {
                const isCreator = doc.userId === user._id;
                const isReceiver = doc.releaseTo && doc.releaseTo.includes(user.department);
                const createdAt = new Date(doc.createdAt);
                const now = new Date();
                const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
                
                return !doc.accepted && 
                       !doc.viewed &&
                       !isCreator && 
                       isReceiver &&
                       hoursSinceCreation >= 24; // Missed if not viewed after 24 hours
              }).length;
            }
          } catch (err) {
            console.error('Error fetching urgent/missed documents for count (WebSocket):', err);
            // Fallback to backend count if fetch fails
          }

          setStats({
            incoming: data.incoming || 0,
            completedToday: data.completedToday || 0,
            urgent: urgentCount,
            missed: missedCount,
            accepted: data.accepted || 0,
            pending: data.pending || 0,
            createdToday: data.createdToday || 0,
          });
        })
        .catch(err => {
          console.error('Stats fetch error (WebSocket):', err.message);
          setError(err.message);
        });

      // Refresh recent activities
      const today = getLastResetTime();
      const tomorrow = today.clone().add(1, 'day');
      fetch(`/api/documents/${user._id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch documents');
          return res.json();
        })
        .then(data => {
          const activities = data
            .filter(doc =>
              !doc.deleted && (
                doc.userId.toString() === user._id ||
                doc.acceptedBy?.toString() === user._id ||
                (Array.isArray(doc.releaseTo) ? doc.releaseTo.includes(user.department) : doc.releaseTo === user.department)
              )
            )
            .flatMap(doc =>
              (doc.history || [])
                .filter(event =>
                  new Date(event.date) >= today.toDate() &&
                  new Date(event.date) < tomorrow.toDate() &&
                  event.department === user.department &&
                  ['Created', 'Received', 'Viewed', 'Deleted', 'Archived', 'Restored', 'Edited', 'Accepted', 'Completed', 'Unarchived', 'Missed'].includes(event.action)
                )
                .map(event => ({
                  documentId: doc.documentId,
                  title: doc.title,
                  action: event.action,
                  date: new Date(event.date),
                  department: event.department,
                  createdByUsername: doc.createdByUsername,
                  createdByDepartment: doc.department,
                  mongoId: doc.documentId,
                }))
            )
            .sort((a, b) => b.date - a.date)
            .slice(0, 10);
          setRecentActivities(activities);
        })
        .catch(err => {
          console.error('Recent activities fetch error (WebSocket):', err.message);
          setError(err.message);
        });

      // Refresh category documents
      if (selectedStat) {
        fetch(`/api/documents/${user._id}/${selectedStat}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        })
          .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch ${selectedStat} documents: ${res.statusText}`);
            return res.json();
          })
          .then(data => {
            const today = getLastResetTime();
            const tomorrow = today.clone().add(1, 'day');
            const filteredData = selectedStat === 'missed'
              ? data.filter(doc => {
                  // For missed documents: documents that were not viewed within 24 hours of creation and targeted to this user's department
                  const isCreator = doc.userId === user._id;
                  const isReceiver = doc.releaseTo && doc.releaseTo.includes(user.department);
                  const createdAt = new Date(doc.createdAt);
                  const now = new Date();
                  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
                  
                  return !recentlyAcceptedDocs.current.has(doc.documentId) && 
                         !doc.accepted && 
                         !doc.viewed &&
                         !isCreator && 
                         isReceiver &&
                         hoursSinceCreation >= 24; // Missed if not viewed after 24 hours
                })
              : selectedStat === 'urgent'
              ? data.filter(doc => {
                  // For urgent documents, only show to receivers (not creators)
                  const isCreator = doc.userId === user._id;
                  const isReceiver = doc.releaseTo && doc.releaseTo.includes(user.department);
                  return !recentlyAcceptedDocs.current.has(doc.documentId) && 
                         !doc.accepted && 
                         !isCreator && 
                         isReceiver;
                })
              : data.filter(doc => {
                  const dateToCheck = new Date(selectedStat === 'completed-today' ? doc.updatedAt : doc.createdAt);
                  return dateToCheck >= today.toDate() && 
                         dateToCheck < tomorrow.toDate() && 
                         !recentlyAcceptedDocs.current.has(doc.documentId);
              });
            setCategoryDocuments(filteredData.sort((a, b) => new Date(b.createdAt) - a.createdAt));
          })
          .catch(err => {
            console.error(`Category documents fetch error for ${selectedStat} (WebSocket):`, err.message);
            setError(err.message);
          });
      }
    });
    return () => socket.disconnect();
  }, [user, setError, selectedStat]);

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

  const handleStatClick = (category) => {
    const statMap = {
      incoming: 'incoming',
      completedToday: 'completed-today',
      urgent: 'urgent',
      missed: 'missed',
      createdToday: 'created-today',
    };
    const selectedCategory = statMap[category];
    setSelectedStat(selectedCategory);
    setSelectedDocument(null);
    setSelectedDocIds([]);
    setTrackingResult(null);
    setEditDocument(null);
  };

  const handleToggleSelect = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  const handleViewDocument = (doc) => {
    fetch(`/api/document/${doc.documentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.message || 'Failed to fetch document for viewing'); });
        }
        return res.json();
      })
      .then(fetchedDoc => {
        if (!fetchedDoc) {
          throw new Error('Document not found');
        }
        const trackingData = {
          id: fetchedDoc.documentId,
          documentId: fetchedDoc.documentId,
          title: fetchedDoc.title,
          description: fetchedDoc.description,
          status: fetchedDoc.status,
          currentLocation: fetchedDoc.department,
          lastUpdated: new Date(fetchedDoc.updatedAt || fetchedDoc.createdAt).toLocaleString(),
          documentType: fetchedDoc.documentType,
          purpose: fetchedDoc.purpose,
          releaseTo: fetchedDoc.releaseTo || 'Not specified',
          createdByUsername: fetchedDoc.createdByUsername || 'Unknown User',
          userId: fetchedDoc.userId,
          urgent: fetchedDoc.urgent,
          createdAt: fetchedDoc.createdAt,
          deletedAt: fetchedDoc.deletedAt ? new Date(fetchedDoc.deletedAt).toLocaleString() : null,
          routedByUsername: fetchedDoc.routedByUsername,
          history: fetchedDoc.history || [],
        };
        setTrackingResult(trackingData);
        setSelectedDocument(fetchedDoc);
        setEditDocument(null);
        setError(null);

        if (!(fetchedDoc.viewedBy || []).includes(user._id)) {
          fetch(`/api/document/${fetchedDoc.documentId}/view`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ userId: user._id }),
            credentials: 'include',
          })
            .then(res => {
              if (!res.ok) throw new Error('Failed to mark document as viewed');
              return res.json();
            })
            .then(updatedDoc => {
              setRecentActivities(prev => prev.map(activity =>
                activity.mongoId === updatedDoc.documentId && activity.action === 'Created'
                  ? { ...activity, viewedBy: updatedDoc.viewedBy }
                  : activity
              ));
              setCategoryDocuments(prev => prev.map(d => d.documentId === updatedDoc.documentId ? updatedDoc : d));
              if (selectedStat === 'missed') {
                fetch(`/api/documents/${user._id}/missed`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  },
                })
                  .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch missed documents');
                    return res.json();
                  })
                  .then(data => {
                    setCategoryDocuments(data.sort((a, b) => new Date(b.createdAt) - a.createdAt));
                    setStats(prev => ({
                      ...prev,
                      missed: data.length,
                    }));
                  })
                  .catch(err => {
                    console.error('Missed documents fetch error:', err.message);
                    setError(err.message);
                  });
              }
            })
            .catch(err => setError(err.message));
        }
      })
      .catch(err => {
        console.error('View document error:', err);
        setTrackingResult(null);
        setSelectedDocument(null);
        setError(`Failed to view document: ${err.message}`);
      });
  };

  const handleTrackDocument = (docId) => {
    fetch(`/api/document/${docId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.message || 'Failed to fetch document for tracking'); });
        }
        return res.json();
      })
      .then(doc => {
        if (!doc) {
          throw new Error('Document not found');
        }
        const trackingData = {
          id: doc.documentId,
          documentId: doc.documentId,
          title: doc.title,
          description: doc.description,
          status: doc.status,
          currentLocation: doc.department,
          lastUpdated: new Date(doc.updatedAt || doc.createdAt).toLocaleString(),
          documentType: doc.documentType,
          purpose: doc.purpose,
          releaseTo: doc.releaseTo || 'Not specified',
          createdByUsername: doc.createdByUsername || 'Unknown User',
          userId: doc.userId,
          urgent: doc.urgent,
          createdAt: doc.createdAt,
          deletedAt: doc.deletedAt ? new Date(doc.deletedAt).toLocaleString() : null,
          routedByUsername: doc.routedByUsername,
          history: doc.history || [],
        };
        setTrackingResult(trackingData);
        setSelectedDocument(doc);
        setError(null);
      })
      .catch(err => {
        console.error('Tracking error:', err);
        setTrackingResult(null);
        setError(`Failed to track document: ${err.message}`);
      });
  };

  const handleAcceptDocument = (doc) => {
    console.log('Attempting to accept document:', doc);
    console.log('Document ID being used:', doc.documentId);
    showConfirmationModal(
      'Are you sure you want to accept this document?',
      () => {
        console.log('Making API call to accept document:', `/api/document/${doc.documentId}/accept`);
        fetch(`/api/document/${doc.documentId}/accept`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ userId: user._id }),
          credentials: 'include',
        })
          .then(res => {
            console.log('Accept API response status:', res.status);
            if (!res.ok) {
              return res.json().then(err => { 
                console.error('Accept API error response:', err);
                // Display the full error message from backend
                const errorMessage = err.message || err.error || 'Failed to accept document';
                throw new Error(`Backend error: ${errorMessage}`); 
              }).catch(jsonErr => {
                // If response is not JSON, get the status text
                console.error('Non-JSON error response:', res.statusText);
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
              });
            }
            return res.json();
          })
          .then(updatedDoc => {
            console.log('Accept API success response:', updatedDoc);
            console.log('Document was from category:', selectedStat);
            console.log('Document being removed from list:', doc.documentId);
            console.log('Document urgent status:', doc.urgent);
            
            // Add to recently accepted set to prevent it from appearing in future fetches
            recentlyAcceptedDocs.current.add(doc.documentId);
            
            // Remove the document from the current category list when accepted
            setCategoryDocuments(prev => {
              const filtered = prev.filter(d => d.documentId !== doc.documentId);
              console.log('Documents remaining in category after removal:', filtered.length);
              return filtered;
            });
            
            
            setError(null);
            showConfirmationModal('Document accepted successfully', () => setIsModalOpen(false));
            setIsModalOpen(false);
          })
          .catch(err => {
            console.error('Accept document error:', err.message);
            setError(err.message);
            setIsModalOpen(false);
          });
      }
    );
  };

  const handleBulkAccept = async () => {
    if (selectedDocIds.length === 0) {
      setError('No documents selected');
      return;
    }
    showConfirmationModal(
      `Are you sure you want to accept ${selectedDocIds.length} document(s)?`,
      async () => {
        try {
          const promises = selectedDocIds.map((docId) =>
            fetch(`/api/document/${docId}/accept`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({ userId: user._id }),
              credentials: 'include',
            }).then(res => {
              if (!res.ok) {
                return res.json().then(err => { throw new Error(err.message || `Failed to accept document ${docId}`); });
              }
              return res.json();
            })
          );
          await Promise.all(promises);
          
          console.log('Bulk accept completed for category:', selectedStat);
          console.log('Documents being removed:', selectedDocIds);
          
          // Add all accepted documents to recently accepted set
          selectedDocIds.forEach(docId => recentlyAcceptedDocs.current.add(docId));
          
          // Remove the documents from the current category list when accepted
          setCategoryDocuments(prev => {
            const filtered = prev.filter(doc => !selectedDocIds.includes(doc.documentId));
            console.log('Documents remaining in category after bulk removal:', filtered.length);
            return filtered;
          });
          
          
          setSelectedDocIds([]);
          setError(null);
          showConfirmationModal(`${selectedDocIds.length} document(s) accepted successfully`, () => setIsModalOpen(false));
          setIsModalOpen(false);
        } catch (err) {
          console.error('Bulk accept error:', err.message);
          setError(err.message);
          setIsModalOpen(false);
        }
      }
    );
  };

  const handleArchiveDocument = (docId) => {
    showConfirmationModal(
      'Are you sure you want to archive this document?',
      () => {
        fetch(`/api/documents/${docId}/archive`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ userId: user._id, department: user.department }),
          credentials: 'include',
        })
          .then(res => {
            if (!res.ok) throw new Error('Failed to archive document');
            return res.json();
          })
          .then(updatedDoc => {
            setCategoryDocuments(prev => prev.filter(doc => doc.documentId !== docId));
            setSelectedDocument(null);
            setEditDocument(null);
            showConfirmationModal('Document archived successfully', () => setIsModalOpen(false));
            setIsModalOpen(false);
          })
          .catch(err => {
            setError(err.message);
            setIsModalOpen(false);
          });
      }
    );
  };

  const handleDeleteDocument = (docId) => {
    showConfirmationModal(
      'Are you sure you want to move this document to Trash? It will be permanently deleted after 30 days.',
      () => {
        fetch(`/api/documents/${docId}/delete`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          credentials: 'include',
        })
          .then(res => {
            if (!res.ok) throw new Error('Failed to delete document');
            return res.json();
          })
          .then(() => {
            setCategoryDocuments(prev => prev.filter(doc => doc.documentId !== docId));
            setStats(prev => ({
              ...prev,
              createdToday: prev.createdToday - 1,
            }));
            setSelectedDocument(null);
            setEditDocument(null);
            showConfirmationModal('Document moved to Trash', () => setIsModalOpen(false));
            setIsModalOpen(false);
          })
          .catch(err => {
            setError(err.message);
            setIsModalOpen(false);
          });
      }
    );
  };

  const handleEditDocument = (doc) => {
    setEditDocument({
      documentId: doc.documentId,
      title: doc.title,
      description: doc.description,
      documentType: doc.documentType,
      purpose: doc.purpose,
      releaseTo: Array.isArray(doc.releaseTo) ? doc.releaseTo : [doc.releaseTo],
      urgent: doc.urgent,
    });
  };

  const handleUpdateDocument = () => {
    if (!editDocument.title || !editDocument.description || !editDocument.documentType ||
        !editDocument.purpose || !editDocument.releaseTo || editDocument.releaseTo.length === 0) {
      setError('All fields are required and at least one destination must be selected');
      return;
    }
    showConfirmationModal(
      'Are you sure you want to update this document?',
      () => {
        fetch(`/api/documents/${editDocument.documentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          credentials: 'include',
          body: JSON.stringify({
            title: editDocument.title,
            description: editDocument.description,
            urgent: editDocument.urgent,
            documentType: editDocument.documentType,
            purpose: editDocument.purpose,
            releaseTo: editDocument.releaseTo,
            remarks: editDocument.remarks,
          }),
        })
          .then(res => {
            if (!res.ok) throw new Error('Failed to update document');
            return res.json();
          })
          .then(updatedDocument => {
            setCategoryDocuments(prev => prev.map(doc => doc.documentId === updatedDocument.documentId ? updatedDocument : doc));
            setSelectedDocument(null);
            setEditDocument(null);
            showConfirmationModal('Document updated successfully', () => setIsModalOpen(false));
            setIsModalOpen(false);
          })
          .catch(err => {
            setError(err.message);
            setIsModalOpen(false);
          });
      }
    );
  };

  const handleBack = () => {
    setSelectedStat(null);
    setSelectedDocument(null);
    setSelectedDocIds([]);
    setTrackingResult(null);
    setEditDocument(null);
    // Clear recently accepted documents when navigating back to dashboard
    recentlyAcceptedDocs.current.clear();
  };

  const renderEditDocument = () => (
    <div>
      <button className="action-button" onClick={handleBack}>
        <i className="fas fa-arrow-left"></i> Back
      </button>
      <h3>Edit Document</h3>
      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          className="input-field"
          value={editDocument.title}
          onChange={(e) => setEditDocument({ ...editDocument, title: e.target.value })}
          placeholder="Enter document title"
        />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          className="input-field textarea"
          rows="4"
          value={editDocument.description}
          onChange={(e) => setEditDocument({ ...editDocument, description: e.target.value })}
          placeholder="Enter document description"
        ></textarea>
      </div>
      <div className="form-group">
        <label>Document Type</label>
        <select
          className="input-field select"
          value={editDocument.documentType}
          onChange={(e) => setEditDocument({ ...editDocument, documentType: e.target.value })}
        >
          <option value="">Select Document Type</option>
          {documentTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Purpose</label>
        <select
          className="input-field select"
          value={editDocument.purpose}
          onChange={(e) => setEditDocument({ ...editDocument, purpose: e.target.value })}
        >
          <option value="">Select Purpose</option>
          {purposes.map(purpose => (
            <option key={purpose} value={purpose}>{purpose}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Release To</label>
        <MultiSelect
          options={releaseToOptions}
          selectedValues={editDocument.releaseTo}
          onChange={(selected) => setEditDocument({ ...editDocument, releaseTo: selected })}
          placeholder="Select destinations..."
          groupBy="prefix"
        />
      </div>
      <div className="form-group">
        <label>Remarks</label>
        <textarea
          className="input-field textarea"
          rows="3"
          value={editDocument.remarks || ''}
          onChange={(e) => setEditDocument({ ...editDocument, remarks: e.target.value })}
          placeholder="Enter any additional remarks or notes (optional)"
        ></textarea>
      </div>
      <div className="form-group">
        <label>Urgent</label>
        <input
          type="checkbox"
          checked={editDocument.urgent}
          onChange={(e) => setEditDocument({ ...editDocument, urgent: e.target.checked })}
        />
      </div>
      <button className="submit-button" onClick={handleUpdateDocument}>
        Update Document
      </button>
    </div>
  );

  const renderDocumentList = (title, docs) => (
    <div>
      <button className="action-button primary" onClick={handleBack}>
        <i className="fas fa-arrow-left"></i> Back to Dashboard
      </button>
      <h3 className="section-title">{title}</h3>
      {(title === 'Incoming Documents' || title === 'Missed Documents' || title === 'Urgent Requests') && docs.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
          <button
            className={`action-button ${docs.filter(doc => !doc.accepted && (Array.isArray(doc.releaseTo) ? doc.releaseTo.includes(user.department) : doc.releaseTo === user.department)).every(doc => selectedDocIds.includes(doc.documentId)) && docs.filter(doc => !doc.accepted && (Array.isArray(doc.releaseTo) ? doc.releaseTo.includes(user.department) : doc.releaseTo === user.department)).length > 0 ? 'danger' : 'success'}`}
            onClick={() => {
              const selectableDocs = docs.filter(doc => !doc.accepted && (Array.isArray(doc.releaseTo) ? doc.releaseTo.includes(user.department) : doc.releaseTo === user.department));
              const allSelected = selectableDocs.every(doc => selectedDocIds.includes(doc.documentId));
              if (allSelected) {
                setSelectedDocIds(prev => prev.filter(id => !selectableDocs.map(doc => doc.documentId).includes(id)));
              } else {
                setSelectedDocIds(prev => [...new Set([...prev, ...selectableDocs.map(doc => doc.documentId)])]);
              }
            }}
          >
            <i className="fas fa-check-square"></i> {docs.filter(doc => !doc.accepted && (Array.isArray(doc.releaseTo) ? doc.releaseTo.includes(user.department) : doc.releaseTo === user.department)).every(doc => selectedDocIds.includes(doc.documentId)) && docs.filter(doc => !doc.accepted && (Array.isArray(doc.releaseTo) ? doc.releaseTo.includes(user.department) : doc.releaseTo === user.department)).length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          {selectedDocIds.length > 0 && (
            <button
              className="action-button success"
              onClick={handleBulkAccept}
            >
              <i className="fas fa-check"></i> Accept Selected ({selectedDocIds.length})
            </button>
          )}
        </div>
      )}
      {title === 'Completed Today' && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            className="action-button"
            onClick={() => handlePrint(categoryDocuments, user.department)}
          >
            <i className="fas fa-print"></i> Print Completed Documents
          </button>
        </div>
      )}
      {title === 'Created Today' && docs.filter(doc => doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted).length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
          <button
            className={`action-button ${docs.filter(doc => doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted).every(doc => selectedDocIds.includes(doc.documentId)) && docs.filter(doc => doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted).length > 0 ? 'danger' : 'success'}`}
            onClick={() => {
              const selectableDocs = docs.filter(doc => doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted);
              const allSelected = selectableDocs.every(doc => selectedDocIds.includes(doc.documentId));
              if (allSelected) {
                setSelectedDocIds(prev => prev.filter(id => !selectableDocs.map(doc => doc.documentId).includes(id)));
              } else {
                setSelectedDocIds(prev => [...new Set([...prev, ...selectableDocs.map(doc => doc.documentId)])]);
              }
            }}
          >
            <i className="fas fa-check-square"></i> {docs.filter(doc => doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted).every(doc => selectedDocIds.includes(doc.documentId)) && docs.filter(doc => doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted).length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          {selectedDocIds.length > 0 && (
            <>
              <button
                className="action-button"
                onClick={() => {
                  const selectedCreatedDocs = docs.filter(doc => selectedDocIds.includes(doc.documentId) && doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted);
                  if (selectedCreatedDocs.length === 0) return;
                  showConfirmationModal(
                    `Are you sure you want to archive ${selectedCreatedDocs.length} document(s)?`,
                    async () => {
                      try {
                        const promises = selectedCreatedDocs.map((doc) =>
                          fetch(`/api/documents/${doc.documentId}/archive`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            },
                            body: JSON.stringify({ userId: user._id, department: user.department }),
                            credentials: 'include',
                          }).then(res => {
                            if (!res.ok) throw new Error('Failed to archive document');
                            return res.json();
                          })
                        );
                        await Promise.all(promises);
                        setCategoryDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
                        setSelectedDocIds([]);
                        setError(null);
                        setIsModalOpen(false);
                      } catch (err) {
                        setError(err.message);
                        setIsModalOpen(false);
                      }
                    }
                  );
                }}
              >
                <i className="fas fa-archive"></i> Archive Selected ({selectedDocIds.filter(id => docs.find(doc => doc.documentId === id && doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted)).length})
              </button>
              <button
                className="action-button danger"
                onClick={() => {
                  const selectedCreatedDocs = docs.filter(doc => selectedDocIds.includes(doc.documentId) && doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted);
                  if (selectedCreatedDocs.length === 0) return;
                  showConfirmationModal(
                    `Are you sure you want to move ${selectedCreatedDocs.length} document(s) to Trash? They will be permanently deleted after 30 days.`,
                    async () => {
                      try {
                        const promises = selectedCreatedDocs.map((doc) =>
                          fetch(`/api/documents/${doc.documentId}/delete`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            },
                          }).then(res => {
                            if (!res.ok) throw new Error('Failed to delete document');
                            return res.json();
                          })
                        );
                        await Promise.all(promises);
                        setCategoryDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
                        setSelectedDocIds([]);
                        setError(null);
                        setIsModalOpen(false);
                      } catch (err) {
                        setError(err.message);
                        setIsModalOpen(false);
                      }
                    }
                  );
                }}
              >
                <i className="fas fa-trash"></i> Delete Selected ({selectedDocIds.filter(id => docs.find(doc => doc.documentId === id && doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted)).length})
              </button>
            </>
          )}
        </div>
      )}
      {docs.length === 0 ? (
        <p>{title === 'Missed Documents' ? 'No missed documents found (unviewed documents older than 24 hours).' : `No ${title.toLowerCase()} found.`}</p>
      ) : (
        <ul className="document-list">
          {docs.map(doc => (
            <li
              key={doc.documentId}
              className={`document-item ${selectedStat === 'missed' ? 'missed' : ''}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '10px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                {(title === 'Incoming Documents' || title === 'Missed Documents' || title === 'Urgent Requests') && !doc.accepted && (Array.isArray(doc.releaseTo) ? doc.releaseTo.includes(user.department) : doc.releaseTo === user.department) && (
                  <input
                    type="checkbox"
                    checked={selectedDocIds.includes(doc.documentId)}
                    onChange={() => handleToggleSelect(doc.documentId)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                  />
                )}
                {title === 'Created Today' && doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted && (
                  <input
                    type="checkbox"
                    checked={selectedDocIds.includes(doc.documentId)}
                    onChange={() => handleToggleSelect(doc.documentId)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                  />
                )}
                <div
                  onClick={() => handleViewDocument(doc)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}><strong>{doc.title}</strong> (<span>{doc.documentId}</span>)</span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    <strong>Sent by:</strong> {doc.createdByUsername || 'Unknown User'} (<span>{doc.department}</span>)
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}><strong>Status:</strong> {doc.status}</span>
                  {doc.urgent && <span className="urgent-tag">Urgent</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {(title === 'Incoming Documents' || title === 'Missed Documents' || title === 'Urgent Requests') && !doc.accepted && (Array.isArray(doc.releaseTo) ? doc.releaseTo.includes(user.department) : doc.releaseTo === user.department) && (
                  <button className="action-button success" onClick={() => handleAcceptDocument(doc)}>
                    <i className="fas fa-check"></i> Accept
                  </button>
                )}
                {title === 'Created Today' && doc.userId.toString() === user._id && !doc.archived && !doc.completed && !doc.deleted && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="action-button warning"
                      onClick={() => handleEditDocument(doc)}
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>
                    <button
                      className="action-button"
                      onClick={() => handleArchiveDocument(doc.documentId)}
                    >
                      <i className="fas fa-archive"></i> Archive
                    </button>
                    <button
                      className="action-button danger"
                      onClick={() => handleDeleteDocument(doc.documentId)}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                )}
                {(title !== 'Created Today' || (title === 'Missed Documents' && doc.accepted) || (title === 'Urgent Requests' && doc.accepted)) && (
                  <button
                    className="action-button"
                    onClick={() => handleTrackDocument(doc.documentId)}
                  >
                    <i className="fas fa-search"></i> Track
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderDocumentDetails = () => {
    if (!trackingResult) return null;
    return (
      <div>
        <button className="action-button" onClick={() => { setSelectedDocument(null); setTrackingResult(null); }}>
          <i className="fas fa-arrow-left"></i> Back to List
        </button>
        <div className="tracking-results">
          <div className="tracking-header">
            <h3>Document: {trackingResult.title}</h3>
            <span className={`status-badge ${trackingResult.status.toLowerCase().replace(' ', '-')}`}>
              {trackingResult.status}
            </span>
          </div>
          <div className="tracking-info">
            <div className="info-item">
              <label>Document ID:</label>
              <span>{trackingResult.documentId}</span>
            </div>
            <div className="info-item">
              <label>Title:</label>
              <span>{trackingResult.title}</span>
            </div>
            <div className="info-item">
              <label>Description:</label>
              <span>{trackingResult.description}</span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span>{trackingResult.status}</span>
            </div>
            <div className="info-item">
              <label>Current Location:</label>
              <span>{trackingResult.currentLocation}</span>
            </div>
            <div className="info-item">
              <label>Created By:</label>
              <span>{trackingResult.createdByUsername}</span>
            </div>
            {trackingResult.routedByUsername && (
              <div className="info-item">
                <label>Routed By:</label>
                <span>{trackingResult.routedByUsername}</span>
              </div>
            )}
            <div className="info-item">
              <label>Document Type:</label>
              <span>{trackingResult.documentType}</span>
            </div>
            <div className="info-item">
              <label>Purpose:</label>
              <span>{trackingResult.purpose}</span>
            </div>
            <div className="info-item">
              <label>Release To:</label>
              <span>{trackingResult.releaseTo}</span>
            </div>
            <div className="info-item">
              <label>Created At:</label>
              <span>{new Date(trackingResult.createdAt).toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Urgent:</label>
              <span className={trackingResult.urgent ? 'urgent' : ''}>
                {trackingResult.urgent ? 'Yes' : 'No'}
              </span>
            </div>
            {trackingResult.deletedAt && (
              <div className="info-item">
                <label>Deleted At:</label>
                <span className="deleted">{trackingResult.deletedAt}</span>
              </div>
            )}
            <div className="info-item">
              <label>Last Updated:</label>
              <span>{trackingResult.lastUpdated}</span>
            </div>
          </div>
          <h4>Document History</h4>
          <div className="tracking-timeline">
            {trackingResult.history.length > 0 ? (
              trackingResult.history.map((event, index) => (
                <div key={index} className="timeline-event">
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
      </div>
    );
  };

  const renderContent = () => {
    if (editDocument) {
      return renderEditDocument();
    }
    if (trackingResult && selectedDocument) {
      return renderDocumentDetails();
    }
    if (selectedStat) {
      const titles = {
        incoming: 'Incoming Documents',
        'completed-today': 'Completed Today',
        urgent: 'Urgent Requests',
        missed: 'Missed Documents',
        'created-today': 'Created Today',
      };
      return renderDocumentList(titles[selectedStat], categoryDocuments);
    }

    return (
      <>
        <div className="welcome-banner">
          <h2>Welcome to SDOLC Tracking System</h2>
          <p>Manage your documents efficiently for the School Division of Laoag City</p>
        </div>
        {!stats && <p>Loading stats...</p>}
        {stats && (
          <div className="stats-container">
            <div className="stat-card" onClick={() => handleStatClick('incoming')}>
              <i className="fas fa-inbox"></i>
              <h3>{stats.incoming}</h3>
              <p>View and accept new documents assigned to you</p>
            </div>
            <div className="stat-card" onClick={() => handleStatClick('completedToday')}>
              <i className="fas fa-check-circle"></i>
              <h3>{stats.completedToday}</h3>
              <p>Completed Today</p>
            </div>
            <div className="stat-card" onClick={() => handleStatClick('urgent')}>
              <i className="fas fa-clock"></i>
              <h3>{stats.urgent}</h3>
              <p>Urgent Requests</p>
            </div>
            <div className="stat-card" onClick={() => handleStatClick('missed')}>
              <i className="fas fa-exclamation-triangle"></i>
              <h3>{stats.missed}</h3>
              <p>Missed Documents</p>
            </div>
            <div className="stat-card" onClick={() => handleStatClick('createdToday')}>
              <i className="fas fa-file-alt"></i>
              <h3>{stats.createdToday}</h3>
              <p>Created Today</p>
            </div>
          </div>
        )}
        <div className="recent-activity">
          <h3 className="section-title">Recent Activity (Today)</h3>
          <ul className="activity-list">
            {recentActivities.length === 0 ? (
              <li>
                <i className="fas fa-info-circle activity-icon"></i>
                <div>
                  <p>No recent activities found for today.</p>
                </div>
              </li>
            ) : (
              recentActivities.map((activity, index) => (
                <li
                  key={`${activity.mongoId}-${activity.date}-${index}`}
                  className="document-item"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/document/${activity.documentId}`, {
                        method: 'GET',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        },
                      });
                      if (!res.ok) throw new Error('Failed to fetch document details');
                      const doc = await res.json();
                      handleViewDocument(doc);
                    } catch (err) {
                      setError('Could not load document details');
                    }
                  }}
                >
                  <i className={`fas fa-file-import activity-icon ${activity.action.toLowerCase()}`}></i>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <p><strong>{activity.title}</strong> (<span>{activity.documentId}</span>)</p>
                      <span className="activity-time">
                        Origin: <strong>{activity.createdByUsername} ({activity.createdByDepartment})</strong>
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`activity-action ${activity.action.toLowerCase()}`}><strong>{activity.action}</strong></span>
                      <span style={{ display: 'block', color: '#888', fontSize: '0.9em' }}>
                        Date: {activity.date.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </>
    );
  };

  return (
    <div className="content-card">
      {renderContent()}
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

export default Home;
import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from './AppProvider';
import { documentTypes, purposes, releaseToOptions } from './constants';
import io from 'socket.io-client';
import DocumentTurnaround from './DocumentTurnaround';
import './index.css';
import ConfirmationModal from './ConfirmationModal';

// Multi-select component for destinations
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



const Documents = () => {
  const { user, setError } = useContext(AppContext);
  const [error, setErrorState] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [incomingDocuments, setIncomingDocuments] = useState([]);
  const [acceptedDocuments, setAcceptedDocuments] = useState([]);
  const [newDocument, setNewDocument] = useState({
    title: '', description: '', urgent: false, documentType: '', purpose: '', releaseTo: [], remarks: ''
  });
  const [editingDocument, setEditingDocument] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [trashedDocuments, setTrashedDocuments] = useState([]);
  const [archivedDocuments, setArchivedDocuments] = useState([]);
  const [completedDocuments, setCompletedDocuments] = useState([]);
  const [missedDocuments, setMissedDocuments] = useState([]);
  const [trackingResult, setTrackingResult] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [routingDocument, setRoutingDocument] = useState(null);
  const [routeTo, setRouteTo] = useState([]);
  const [routingRemarks, setRoutingRemarks] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); // Add processing state

  useEffect(() => {
    if (!user?._id) {
      setError('User not logged in. Please log in again.');
      return;
    }
    fetch(`/api/documents/${user._id}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch documents');
        return res.json();
      })
      .then(data => setDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .catch(err => setError(err.message));

    fetch(`/api/documents/${user._id}/incoming`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch incoming documents');
        return res.json();
      })
      .then(data => {
        console.log('Incoming documents loaded:', data);
        setIncomingDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      })
      .catch(err => setError(err.message));

    fetch(`/api/documents/${user._id}/accepted`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch accepted documents');
        return res.json();
      })
      .then(data => setAcceptedDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .catch(err => setError(err.message));

    fetch(`/api/documents/${user._id}/trash`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch trashed documents');
        return res.json();
      })
      .then(data => setTrashedDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .catch(err => setError(err.message));

    fetch(`/api/documents/${user._id}/archive`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    })
      .then(res => res.json())
      .then(data => setArchivedDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .catch(err => setError(err.message));

    fetch(`/api/documents/${user._id}/completed`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch completed documents');
        return res.json();
      })
      .then(data => setCompletedDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .catch(err => setError(err.message));

    fetch(`/api/documents/${user._id}/missed`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch missed documents');
        return res.json();
      })
      .then(data => {
        // Filter missed documents: documents that were not viewed within 24 hours of creation and targeted to this user's department
        const filteredMissedDocs = data.filter(doc => {
          const isCreator = doc.userId.toString() === user._id;
          const isReceiver = doc.releaseTo && doc.releaseTo.includes(user.department);
          const createdAt = new Date(doc.createdAt);
          const now = new Date();
          const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
          
          return !doc.accepted && 
                 !doc.viewed &&
                 !isCreator && 
                 isReceiver &&
                 hoursSinceCreation >= 24; // Missed if not viewed after 24 hours
        });
        setMissedDocuments(filteredMissedDocs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      })
      .catch(err => setError(err.message));
  }, [user, setError]);

 useEffect(() => {
  const socket = io('http://localhost:5001');
  socket.on('documentUpdate', (data) => {
    if (data.action === 'missed') {
      fetch(`/api/documents/${user._id}/missed`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch missed documents');
          return res.json();
        })
        .then(data => {
          // Filter missed documents: documents that were not viewed within 24 hours of creation and targeted to this user's department
          const filteredMissedDocs = data.filter(doc => {
            const isCreator = doc.userId.toString() === user._id;
            const isReceiver = doc.releaseTo && doc.releaseTo.includes(user.department);
            const createdAt = new Date(doc.createdAt);
            const now = new Date();
            const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
            
            return !doc.accepted && 
                   !doc.viewed &&
                   !isCreator && 
                   isReceiver &&
                   hoursSinceCreation >= 24; // Missed if not viewed after 24 hours
          });
          setMissedDocuments(filteredMissedDocs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        })
        .catch(err => setError(err.message));
    } else if (data.action === 'archived') {
      fetch(`/api/document/${data.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch archived document');
          return res.json();
        })
        .then(updatedDoc => {
          setDocuments(prev => prev.filter(doc => doc.documentId !== data.id));
          setAcceptedDocuments(prev => prev.filter(doc => doc.documentId !== data.id));
          setArchivedDocuments(prev => [updatedDoc, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        })
        .catch(err => setError(err.message));
    } else if (data.action === 'completed') {
      fetch(`/api/document/${data.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch completed document');
          return res.json();
        })
        .then(updatedDoc => {
          setAcceptedDocuments(prev => prev.filter(doc => doc.documentId !== data.id));
          setDocuments(prev => prev.filter(doc => doc.documentId !== data.id));
          setCompletedDocuments(prev => [updatedDoc, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        })
        .catch(err => setError(err.message));
    } else if (['accepted', 'edited', 'unarchived', 'routed'].includes(data.action)) {
      fetch(`/api/documents/${user._id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch documents');
          return res.json();
        })
        .then(data => setDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
        .catch(err => setError(err.message));

      fetch(`/api/documents/${user._id}/accepted`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch accepted documents');
          return res.json();
        })
        .then(data => setAcceptedDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
        .catch(err => setError(err.message));

      fetch(`/api/documents/${user._id}/archive`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch archived documents');
          return res.json();
        })
        .then(data => setArchivedDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
        .catch(err => setError(err.message));
    }
  });
  return () => socket.disconnect();
}, [user, setError]);

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
  const handleActionSelect = (action) => {
    setSelectedAction(action);
    setSelectedDocument(null);
    setEditingDocument(null);
    setTrackingResult(null);
    setRoutingDocument(null);
    setErrorState(null);
    setSelectedDocIds([]);
  };

  const handleBack = () => {
    setSelectedAction(null);
    setSelectedDocument(null);
    setEditingDocument(null);
    setTrackingResult(null);
    setRoutingDocument(null);
    setRouteTo([]);
    setRoutingRemarks('');
    setNewDocument({ title: '', description: '', urgent: false, documentType: '', purpose: '', releaseTo: [], remarks: '' });
    setErrorState(null);
    setSelectedDocIds([]);
  };

  const handleToggleSelect = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  const handleAddDocument = () => {
  if (!newDocument.title || !newDocument.description || !newDocument.documentType ||
      !newDocument.purpose || !newDocument.releaseTo || newDocument.releaseTo.length === 0) {
    setError('All fields are required and at least one destination must be selected');
    return;
  }
  if (!user?._id) {
    setError('User not logged in. Please log in again.');
    return;
  }
  showConfirmationModal(
    'Are you sure you want to submit this new document?',
    () => {
      const newDoc = {
        title: newDocument.title,
        description: newDocument.description,
        status: 'Pending',
        department: user.department,
        createdAt: new Date().toISOString(),
        userId: user._id,
        urgent: newDocument.urgent,
        documentType: newDocument.documentType,
        purpose: newDocument.purpose,
        releaseTo: newDocument.releaseTo,
        remarks: newDocument.remarks
      };
      
      console.log('Submitting document with releaseTo:', newDocument.releaseTo);
      console.log('Full document data:', newDoc);
      
      fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify(newDoc),
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to save document');
          return res.json();
        })
        .then(data => {
          setDocuments((prev) => [data, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
          setNewDocument({ title: '', description: '', urgent: false, documentType: '', purpose: '', releaseTo: [], remarks: '' });
          setSelectedAction(null);
          setError(null);
          showConfirmationModal('Document added successfully', () => setIsModalOpen(false));
          setIsModalOpen(false); // Close the confirmation modal
        })
        .catch(err => {
          console.error('Error saving document:', err);
          setError(err.message);
          setIsModalOpen(false);
        });
    }
  );
};

  const handleEditDocument = (doc) => {
    setEditingDocument({
      documentId: doc.documentId,
      title: doc.title,
      description: doc.description,
      urgent: doc.urgent,
      documentType: doc.documentType,
      purpose: doc.purpose,
      releaseTo: Array.isArray(doc.releaseTo) ? doc.releaseTo : [doc.releaseTo]
    });
    setSelectedAction('edit');
  };

  const handleRouteDocument = (doc) => {
    setRoutingDocument(doc);
    setRouteTo([]);
    setSelectedAction('route');
  };

  const handleSubmitRoute = () => {
  if (!routeTo || routeTo.length === 0) {
    setError('Please select at least one destination to route the document');
    return;
  }
  if (!user?._id) {
    setError('User not logged in. Please log in again.');
    return;
  }
  fetch(`/api/documents/${routingDocument.documentId}/route`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    credentials: 'include',
    body: JSON.stringify({
      routeTo,
      userId: user._id,
      remarks: routingRemarks
    }),
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to route document');
      return res.json();
    })
    .then(updatedDoc => {
      setAcceptedDocuments(prev => prev.filter(doc => doc.documentId !== routingDocument.documentId));
      setDocuments(prev => prev.map(doc => doc.documentId === updatedDoc.documentId ? updatedDoc : doc).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setRoutingDocument(null);
      setRouteTo([]);
      setRoutingRemarks('');
      setSelectedAction(null);
      setError(null);
      showConfirmationModal('Document routed successfully', () => setIsModalOpen(false));
    })
    .catch(err => {
      console.error('Error routing document:', err);
      setError(err.message);
    });
};

  const handleUpdateDocument = () => {
  if (!editingDocument.title || !editingDocument.description || !editingDocument.documentType ||
      !editingDocument.purpose || !editingDocument.releaseTo || editingDocument.releaseTo.length === 0) {
    setError('All fields are required and at least one destination must be selected');
    return;
  }
  if (!user?._id) {
    setError('User not logged in. Please log in again.');
    return;
  }
  showConfirmationModal(
    'Are you sure you want to update this document?',
    () => {
      fetch(`/api/documents/${editingDocument.documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({
          title: editingDocument.title,
          description: editingDocument.description,
          urgent: editingDocument.urgent,
          documentType: editingDocument.documentType,
          purpose: editingDocument.purpose,
          releaseTo: editingDocument.releaseTo,
          remarks: editingDocument.remarks
        }),
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to update document');
          return res.json();
        })
        .then(updatedDoc => {
          setDocuments(prev => prev.map(doc => doc.documentId === updatedDoc.documentId ? updatedDoc : doc).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
          setEditingDocument(null);
          setSelectedAction(null);
          setError(null);
          showConfirmationModal('Document updated successfully', () => setIsModalOpen(false));
          setIsModalOpen(false);
        })
        .catch(err => {
          console.error('Error updating document:', err);
          setError(err.message);
          setIsModalOpen(false);
        });
    }
  );
};

 const handleBulkDelete = async () => {
  if (selectedDocIds.length === 0) {
    setError('No documents selected');
    return;
  }
  showConfirmationModal(
    `Are you sure you want to move ${selectedDocIds.length} document(s) to Trash? They will be permanently deleted after 30 days.`,
    async () => {
      try {
        const promises = selectedDocIds.map((docId) =>
          fetch(`/api/documents/${docId}/delete`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to delete document ${docId}`);
            return res.json();
          })
        );
        await Promise.all(promises);
        setDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
        const trashedData = await fetch(`/api/documents/${user._id}/trash`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }).then(res => {
          if (!res.ok) throw new Error('Failed to fetch trashed documents');
          return res.json();
        });
        setTrashedDocuments(trashedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setSelectedDocIds([]);
        setError(null);
        showConfirmationModal(`${selectedDocIds.length} document(s) moved to Trash`, () => setIsModalOpen(false));
        setIsModalOpen(false);
      } catch (err) {
        setError(err.message);
        setIsModalOpen(false);
      }
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
            if (!res.ok) throw new Error(`Failed to accept document ${docId}`);
            return res.json();
          })
        );
        const updatedDocs = await Promise.all(promises);
        setIncomingDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
        setMissedDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
        setAcceptedDocuments(prev => [...updatedDocs, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setSelectedDocIds([]);
        setError(null);
        showConfirmationModal(`${selectedDocIds.length} document(s) accepted successfully`, () => setIsModalOpen(false));
        setIsModalOpen(false);
      } catch (err) {
        setError(err.message);
        setIsModalOpen(false);
      }
    }
  );
};

const handleBulkComplete = async () => {
  if (selectedDocIds.length === 0) {
    setError('No documents selected');
    return;
  }
  showConfirmationModal(
    `Are you sure you want to complete ${selectedDocIds.length} document(s)?`,
    async () => {
      try {
        const promises = selectedDocIds.map((docId) =>
          fetch(`/api/documents/${docId}/complete`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ userId: user._id, department: user.department }),
            credentials: 'include',
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to complete document ${docId}`);
            return res.json();
          })
        );
        const updatedDocs = await Promise.all(promises);
        setAcceptedDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
        setDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
        setCompletedDocuments(prev => [...updatedDocs, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setSelectedDocIds([]);
        setError(null);
        showConfirmationModal(`${selectedDocIds.length} document(s) completed successfully`, () => setIsModalOpen(false));
        setIsModalOpen(false);
      } catch (err) {
        setError(err.message);
        setIsModalOpen(false);
      }
    }
  );
};

  const handleBulkArchive = async () => {
  if (selectedDocIds.length === 0) {
    setError('No documents selected');
    return;
  }
  showConfirmationModal(
    `Are you sure you want to archive ${selectedDocIds.length} document(s)?`,
    async () => {
      try {
        const promises = selectedDocIds.map((docId) =>
          fetch(`/api/documents/${docId}/archive`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ userId: user._id, department: user.department }),
            credentials: 'include',
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to archive document ${docId}`);
            return res.json();
          })
        );
        const updatedDocs = await Promise.all(promises);
        setDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
        setAcceptedDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
        setArchivedDocuments(prev => [...updatedDocs, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setSelectedDocIds([]);
        setError(null);
        showConfirmationModal(`${selectedDocIds.length} document(s) archived successfully`, () => setIsModalOpen(false));
        setIsModalOpen(false);
      } catch (err) {
        setError(err.message);
        setIsModalOpen(false);
      }
    }
  );
};

const handleBulkUnarchive = async () => {
  if (selectedDocIds.length === 0) {
    setError('No documents selected');
    return;
  }
  showConfirmationModal(
    `Are you sure you want to unarchive ${selectedDocIds.length} document(s)?`,
    async () => {
      try {
        const promises = selectedDocIds.map((docId) =>
          fetch(`/api/documents/${docId}/unarchive`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ userId: user._id, department: user.department }),
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to unarchive document ${docId}`);
            return res.json();
          })
        );
        const updatedDocs = await Promise.all(promises);
        setArchivedDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
        setDocuments(prev => [...updatedDocs, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setAcceptedDocuments(prev => [...updatedDocs.filter(doc => doc.accepted), ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setSelectedDocIds([]);
        setError(null);
        showConfirmationModal(`${selectedDocIds.length} document(s) unarchived successfully`, () => setIsModalOpen(false));
        setIsModalOpen(false);
      } catch (err) {
        console.error('Bulk unarchive error:', err);
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
          setAcceptedDocuments(prev => prev.filter(doc => doc.documentId !== docId));
          setDocuments(prev => prev.filter(doc => doc.documentId !== docId));
          setArchivedDocuments(prev => [updatedDoc, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
          setSelectedDocument(null);
          setError(null);
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

const handleUnarchiveDocument = (docId) => {
  showConfirmationModal(
    'Are you sure you want to unarchive this document?',
    () => {
      fetch(`/api/documents/${docId}/unarchive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ userId: user._id, department: user.department }),
      })
        .then(res => {
          if (!res.ok) throw new Error(`Failed to unarchive document: ${res.statusText}`);
          return res.json();
        })
        .then(updatedDoc => {
          console.log('Unarchived document:', updatedDoc);
          setArchivedDocuments(prev => prev.filter(doc => doc.documentId !== docId));
          setDocuments(prev => [...prev, updatedDoc].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
          setAcceptedDocuments(prev => updatedDoc.accepted ? [updatedDoc, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : prev);
          setSelectedDocument(null);
          setError(null);
          showConfirmationModal('Document unarchived successfully', () => setIsModalOpen(false));
          setIsModalOpen(false);
        })
        .catch(err => {
          console.error('Unarchive error:', err);
          setError(err.message);
          setIsModalOpen(false);
        });
    }
  );
};

  const handleBulkPermanentDelete = async () => {
  if (selectedDocIds.length === 0) {
    setError('No documents selected');
    return;
  }
  showConfirmationModal(
    `Are you sure you want to permanently delete ${selectedDocIds.length} document(s)? This action cannot be undone.`,
    async () => {
      try {
        const promises = selectedDocIds.map((docId) =>
          fetch(`/api/documents/${docId}`, {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to permanently delete document ${docId}`);
            return res.json();
          })
        );
        await Promise.all(promises);
        setTrashedDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
        setSelectedDocIds([]);
        setError(null);
        showConfirmationModal(`${selectedDocIds.length} document(s) permanently deleted`, () => setIsModalOpen(false));
        setIsModalOpen(false);
      } catch (err) {
        setError(err.message);
        setIsModalOpen(false);
      }
    }
  );
};

  const handleBulkRestore = async () => {
  if (selectedDocIds.length === 0) {
    setError('No documents selected');
    return;
  }
  const expiredDocs = trashedDocuments
    .filter(doc => selectedDocIds.includes(doc.documentId))
    .filter(doc => {
      const daysSinceDeletion = Math.floor((new Date() - new Date(doc.deletedAt)) / (1000 * 60 * 60 * 24));
      return daysSinceDeletion >= 30;
    });
  if (expiredDocs.length > 0) {
    setError('Cannot restore some documents: They have been in Trash for over 30 days.');
    return;
  }
  showConfirmationModal(
    `Are you sure you want to restore ${selectedDocIds.length} document(s)?`,
    async () => {
      try {
        const promises = selectedDocIds.map((docId) =>
          fetch(`/api/documents/${docId}/restore`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to restore document ${docId}`);
            return res.json();
          })
        );
        await Promise.all(promises);
        setTrashedDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
        const documentsData = await fetch(`/api/documents/${user._id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }).then(res => res.json());
        setDocuments(documentsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        const acceptedData = await fetch(`/api/documents/${user._id}/accepted`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }).then(res => res.json());
        setAcceptedDocuments(acceptedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setSelectedDocIds([]);
        setError(null);
        alert(`${selectedDocIds.length} document(s) restored successfully`);
        setIsModalOpen(false);
      } catch (err) {
        setError(err.message);
        setIsModalOpen(false);
      }
    }
  );
};

 const handleAcceptDocument = (docId) => {
  console.log('Attempting to accept document with ID:', docId);
  showConfirmationModal(
    'Are you sure you want to accept this document?',
    () => {
      console.log('Making API call to accept document:', `/api/document/${docId}/accept`);
      fetch(`/api/document/${docId}/accept`, {
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
          setIncomingDocuments(prev => prev.filter(doc => doc.documentId !== docId));
          setMissedDocuments(prev => prev.filter(doc => doc.documentId !== docId));
          setAcceptedDocuments(prev => [updatedDoc, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
          setError(null);
          showConfirmationModal('Document accepted successfully', () => setIsModalOpen(false));
          setIsModalOpen(false);
        })
        .catch(err => {
          console.error('Accept document error:', err);
          setError(err.message);
          setIsModalOpen(false);
        });
    }
  );
};

 const handleCompleteDocument = (docId) => {
  showConfirmationModal(
    'Are you sure you want to complete this document?',
    () => {
      fetch(`/api/documents/${docId}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ userId: user._id, department: user.department }),
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to complete document');
          return res.json();
        })
        .then(updatedDoc => {
          setAcceptedDocuments(prev => prev.filter(doc => doc.documentId !== docId));
          setDocuments(prev => prev.filter(doc => doc.documentId !== docId));
          setCompletedDocuments(prev => [updatedDoc, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
          setSelectedDocument(null);
          setError(null);
          showConfirmationModal('Document completed successfully', () => setIsModalOpen(false));
          setIsModalOpen(false);
        })
        .catch(err => {
          setError(err.message);
          setIsModalOpen(false);
        });
    }
  );
};

  const handleViewDocument = (doc, isMissedDocument = false) => {
  fetch(`/api/document/${doc.documentId}`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
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
        remarks: fetchedDoc.remarks || '',
      };
      setTrackingResult(trackingData);
      setSelectedDocument(fetchedDoc);
      setError(null);

      // Only mark as viewed and route if it's NOT a missed document
      if (!isMissedDocument && !fetchedDoc.viewedBy.includes(user._id)) {
        fetch(`/api/document/${fetchedDoc.documentId}/view`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ userId: user._id }),
          credentials: 'include',
        })
          .then(res => {
            if (!res.ok) throw new Error('Failed to mark document as viewed');
            return res.json();
          })
          .then(updatedDoc => {
            setDocuments(prev => prev.map(d => d.documentId === updatedDoc.documentId ? updatedDoc : d).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setIncomingDocuments(prev => prev.map(d => d.documentId === updatedDoc.documentId ? updatedDoc : d));
            setAcceptedDocuments(prev => prev.map(d => d.documentId === updatedDoc.documentId ? updatedDoc : d));
            setMissedDocuments(prev => prev.filter(d => d.documentId !== updatedDoc.documentId));
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
      'Authorization': `Bearer ${localStorage.getItem('token')}`
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
        remarks: doc.remarks || '',
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

  const handleDeleteDocument = (docId) => {
  showConfirmationModal(
    'Are you sure you want to move this document to Trash? It will be permanently deleted after 30 days.',
    () => {
      fetch(`/api/documents/${docId}/delete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to delete document');
          return res.json();
        })
        .then(() => {
          setDocuments(prev => prev.filter(doc => !selectedDocIds.includes(doc.documentId)));
          setAcceptedDocuments(prev => prev.filter(doc => doc.documentId !== docId));
          fetch(`/api/documents/${user._id}/trash`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
            .then(res => res.json())
            .then(data => setTrashedDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))));
          setSelectedDocument(null);
          setError(null);
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

  const handlePermanentDelete = (docId) => {
  showConfirmationModal(
    'Are you sure you want to permanently delete this document? This action cannot be undone.',
    () => {
      fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to permanently delete document');
          return res.json();
        })
        .then(() => {
          setTrashedDocuments(prev => prev.filter(doc => doc.documentId !== docId));
          setSelectedDocument(null);
          setError(null);
          showConfirmationModal('Document permanently deleted', () => setIsModalOpen(false));
          setIsModalOpen(false);
        })
        .catch(err => {
          setError(err.message);
          setIsModalOpen(false);
        });
    }
  );
};

  const handleRestoreDocument = (docId, deletedAt) => {
  const daysSinceDeletion = Math.floor((new Date() - new Date(deletedAt)) / (1000 * 60 * 60 * 24));
  if (daysSinceDeletion >= 30) {
    setError('Cannot restore document: It has been in Trash for over 30 days and is scheduled for permanent deletion.');
    return;
  }
  showConfirmationModal(
    'Are you sure you want to restore this document?',
    () => {
      fetch(`/api/documents/${docId}/restore`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to restore document');
          return res.json();
        })
        .then(() => {
          setTrashedDocuments(prev => prev.filter(doc => doc.documentId !== docId));
          fetch(`/api/documents/${user._id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          })
            .then(res => res.json())
            .then(data => setDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))));
          fetch(`/api/documents/${user._id}/accepted`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          })
            .then(res => res.json())
            .then(data => setAcceptedDocuments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))));
          setSelectedDocument(null);
          setError(null);
          showConfirmationModal('Document restored successfully', () => setIsModalOpen(false));
          setIsModalOpen(false);
        })
        .catch(err => {
          setError(err.message);
          setIsModalOpen(false);
        });
    }
  );
};

  const getDaysUntilDeletion = (deletedAt) => {
    if (!deletedAt) return 'N/A';
    const deletionDate = new Date(deletedAt);
    deletionDate.setDate(deletionDate.getDate() + 30);
    const daysLeft = Math.floor((deletionDate - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft} days` : 'Expired';
  };

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
            <span>{trackingResult.documentId || trackingResult.id}</span>
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
            <span>
              {Array.isArray(trackingResult.releaseTo) 
                ? trackingResult.releaseTo.join(', ') 
                : trackingResult.releaseTo}
            </span>
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
          {trackingResult.remarks && (
            <div className="info-item">
              <label>Remarks:</label>
              <span>{trackingResult.remarks}</span>
            </div>
          )}
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
        {trackingResult.status === 'Completed' && (
          <DocumentTurnaround documentId={trackingResult.id} />
        )}
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
                  {event.remarks && (
                    <p className="event-remarks">
                      <strong>Remarks:</strong> {event.remarks}
                    </p>
                  )}
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
          value={editingDocument.title}
          onChange={(e) => setEditingDocument({ ...editingDocument, title: e.target.value })}
          placeholder="Enter document title"
        />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          className="input-field textarea"
          rows="4"
          value={editingDocument.description}
          onChange={(e) => setEditingDocument({ ...editingDocument, description: e.target.value })}
          placeholder="Enter document description"
        ></textarea>
      </div>
      <div className="form-group">
        <label>Document Type</label>
        <select
          className="input-field select"
          value={editingDocument.documentType}
          onChange={(e) => setEditingDocument({ ...editingDocument, documentType: e.target.value })}
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
          value={editingDocument.purpose}
          onChange={(e) => setEditingDocument({ ...editingDocument, purpose: e.target.value })}
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
          selectedValues={editingDocument.releaseTo}
          onChange={(selected) => setEditingDocument({ ...editingDocument, releaseTo: selected })}
          placeholder="Select destinations..."
          groupBy="prefix"
        />
      </div>
      <div className="form-group">
        <label>Remarks</label>
        <textarea
          className="input-field textarea"
          rows="3"
          value={editingDocument.remarks || ''}
          onChange={(e) => setEditingDocument({ ...editingDocument, remarks: e.target.value })}
          placeholder="Enter any additional remarks or notes (optional)"
        ></textarea>
      </div>
      <div className="form-group">
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
    Urgent
    <input
      type="checkbox"
      checked={editingDocument.urgent}
      onChange={(e) => setEditingDocument({ ...editingDocument, urgent: e.target.checked })}
    />
  </label>
</div>
      <button className="submit-button" onClick={handleUpdateDocument}>
        Update Document
      </button>
    </div>
  );

  const renderRouteDocument = () => (
    <div>
      <button className="action-button" onClick={handleBack}>
        <i className="fas fa-arrow-left"></i> Back
      </button>
      <h3>Route Document: {routingDocument.title}</h3>
      <div className="form-group">
        <label>Route To</label>
        <MultiSelect
          options={releaseToOptions}
          selectedValues={routeTo}
          onChange={setRouteTo}
          placeholder="Select destinations..."
          groupBy="prefix"
        />
      </div>
      <div className="form-group">
        <label>Routing Remarks</label>
        <textarea
          className="input-field textarea"
          rows="3"
          value={routingRemarks}
          onChange={(e) => setRoutingRemarks(e.target.value)}
          placeholder="Enter routing remarks or instructions (optional)"
        ></textarea>
      </div>
      <button className="submit-button" onClick={handleSubmitRoute}>
        Route Document
      </button>
    </div>
  );

  const renderActionContent = () => {
    if (trackingResult && selectedDocument) {
      return renderDocumentDetails();
    }
    if (selectedAction === 'edit') {
      return renderEditDocument();
    }
    if (selectedAction === 'route') {
      return renderRouteDocument();
    }
switch (selectedAction) {
      case 'incoming':
        return (
          <div>
            <button className="action-button" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h3>Incoming Documents</h3>
            {incomingDocuments.length > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <button
                  className={`action-button ${selectedDocIds.length === incomingDocuments.length ? 'danger' : 'success'}`}
                  onClick={() => {
                    const allSelected = incomingDocuments.every(doc => selectedDocIds.includes(doc.documentId));
                    const newSelectedDocIds = allSelected ? [] : incomingDocuments.map(doc => doc.documentId);
                    setSelectedDocIds(newSelectedDocIds);
                  }}
                >
                  <i className="fas fa-check-square"></i> {selectedDocIds.length === incomingDocuments.length ? 'Deselect All' : 'Select All'}
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
            {incomingDocuments.length === 0 ? (
              <p>No incoming documents found.</p>
            ) : (
              <ul className="document-list">
                {incomingDocuments.map((doc) => (
                  <li
                    key={doc.documentId}
                    className="document-item"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', padding: '10px' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.documentId)}
                      onChange={() => handleToggleSelect(doc.documentId)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                    />
                    <div
                      onClick={() => handleViewDocument(doc)}
                      style={{ flex: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                    >
                      <span style={{ whiteSpace: 'nowrap' }}><strong>{doc.title}</strong> (<span>{doc.documentId}</span>)</span>
                      <span style={{ whiteSpace: 'nowrap' }}>Sent by: <strong>{doc.createdByUsername}</strong> (<span>{doc.department}</span>)</span>
                      <span style={{ whiteSpace: 'nowrap' }}>Status: <strong>{doc.status}</strong></span>
                      {doc.urgent && <span className="urgent-tag">Urgent</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button
                        className="action-button success"
                        onClick={() => handleAcceptDocument(doc.documentId)}
                      >
                        <i className="fas fa-check"></i> Accept
                      </button>
                      <button
                        className="action-button"
                        onClick={() => handleTrackDocument(doc.documentId)}
                      >
                        <i className="fas fa-search"></i> Track
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
case 'accepted':
        return (
          <div>
            <button className="action-button" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h3>Accepted Documents</h3>
            {acceptedDocuments.length > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <button
                  className={`action-button ${selectedDocIds.length === acceptedDocuments.length ? 'danger' : 'success'}`}
                  onClick={() => {
                    const allSelected = acceptedDocuments.every(doc => selectedDocIds.includes(doc.documentId));
                    const newSelectedDocIds = allSelected ? [] : acceptedDocuments.map(doc => doc.documentId);
                    setSelectedDocIds(newSelectedDocIds);
                  }}
                >
                  <i className="fas fa-check-square"></i> {selectedDocIds.length === acceptedDocuments.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedDocIds.length > 0 && (
                  <>
                    <button
                      className="action-button"
                      onClick={handleBulkArchive}
                    >
                      <i className="fas fa-archive"></i> Archive Selected ({selectedDocIds.length})
                    </button>
                    <button
                      className="action-button success"
                      onClick={handleBulkComplete}
                    >
                      <i className="fas fa-check-circle"></i> Complete Selected ({selectedDocIds.length})
                    </button>
                  </>
                )}
              </div>
            )}
            {acceptedDocuments.length === 0 ? (
              <p>No accepted documents found.</p>
            ) : (
              <ul className="document-list">
                {acceptedDocuments.map((doc) => (
                  <li
                    key={doc.documentId}
                    className="document-item"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', padding: '10px' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.documentId)}
                      onChange={() => handleToggleSelect(doc.documentId)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                    />
                    <div
                      onClick={() => handleViewDocument(doc)}
                      style={{ flex: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                    >
                      <span style={{ whiteSpace: 'nowrap' }}><strong>{doc.title}</strong> (<span>{doc.documentId}</span>)</span>
                      <span style={{ whiteSpace: 'nowrap' }}>Sent by: <strong>{doc.createdByUsername}</strong> (<span>{doc.department}</span>)</span>
                      <span style={{ whiteSpace: 'nowrap' }}>Status: <strong>{doc.status}</strong></span>
                      {doc.urgent && <span className="urgent-tag">Urgent</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {doc.status !== 'Archived' && doc.status !== 'Completed' && (
                        <button
                          className="action-button"
                          onClick={() => handleArchiveDocument(doc.documentId)}
                        >
                          <i className="fas fa-archive"></i> Archive
                        </button>
                      )}
                      {doc.status !== 'Completed' && (
                        <>
                          <button
                            className="action-button success"
                            onClick={() => handleCompleteDocument(doc.documentId)}
                          >
                            <i className="fas fa-check-circle"></i> Complete
                          </button>
                          <button
                            className="action-button primary"
                            onClick={() => handleRouteDocument(doc)}
                          >
                            <i className="fas fa-share"></i> Route Document
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      case 'mydocs':
        const createdDocs = documents.filter(doc => doc.userId.toString() === user._id && !doc.accepted);
        return (
        <div>
  <button className="action-button" onClick={handleBack}>
    <i className="fas fa-arrow-left"></i> Back
  </button>
  <h3>My Documents</h3>
  {createdDocs.length > 0 && (
    <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
      <button
        className={`action-button ${selectedDocIds.length === createdDocs.length ? 'danger' : 'success'}`}
        onClick={() => {
          const allSelected = createdDocs.every(doc => selectedDocIds.includes(doc.documentId));
          const newSelectedDocIds = allSelected ? [] : createdDocs.map(doc => doc.documentId);
          setSelectedDocIds(newSelectedDocIds);
        }}
      >
        <i className="fas fa-check-square"></i> {selectedDocIds.length === createdDocs.length ? 'Deselect All' : 'Select All'}
      </button>
      {selectedDocIds.length > 0 && (
        <>
          <button
            className="action-button danger"
            onClick={handleBulkDelete}
          >
            <i className="fas fa-trash"></i> Delete Selected ({selectedDocIds.length})
          </button>
          <button
            className="action-button"
            onClick={handleBulkArchive}
          >
            <i className="fas fa-archive"></i> Archive Selected ({selectedDocIds.length})
          </button>
        </>
      )}
    </div>
  )}
  <h4>Created Documents</h4>
  {createdDocs.length === 0 ? (
    <p>No created documents found.</p>
  ) : (
    <ul className="document-list">
      {createdDocs.map((doc) => (
        <li
          key={doc.documentId}
          className="document-item"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', padding: '10px' }}
        >
          <input
            type="checkbox"
            checked={selectedDocIds.includes(doc.documentId)}
            onChange={() => handleToggleSelect(doc.documentId)}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer', marginRight: '0.5rem' }}
          />
          <div
            onClick={() => handleViewDocument(doc)}
            style={{ flex: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
          >
            <span style={{ whiteSpace: 'nowrap' }}><strong>{doc.title}</strong> (<span>{doc.documentId}</span>)</span>
            <span style={{ whiteSpace: 'nowrap' }}>Sent by: <strong>{doc.createdByUsername}</strong> (<span>{doc.department}</span>)</span>
            <span style={{ whiteSpace: 'nowrap' }}>Status: <strong>{doc.status}</strong></span>
            {doc.urgent && <span className="urgent-tag">Urgent</span>}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="action-button danger"
              onClick={() => handleDeleteDocument(doc.documentId)}
            >
              <i className="fas fa-trash"></i> Delete
            </button>
            {doc.status !== 'Archived' && doc.status !== 'Completed' && (
              <>
                <button
                  className="action-button"
                  onClick={() => handleArchiveDocument(doc.documentId)}
                >
                  <i className="fas fa-archive"></i> Archive
                </button>
                <button
                  className="action-button warning"
                  onClick={() => handleEditDocument(doc)}
                >
                  <i className="fas fa-edit"></i> Edit
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  )}
</div>
        );
      case 'add':
        return (
          <div>
            <button className="action-button" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h3>Add New Document</h3>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                className="input-field"
                value={newDocument.title}
                onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                placeholder="Enter document title"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                className="input-field textarea"
                rows="4"
                value={newDocument.description}
                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                placeholder="Enter document description"
              ></textarea>
            </div>
            <div className="form-group">
              <label>Document Type</label>
              <select
                className="input-field select"
                value={newDocument.documentType}
                onChange={(e) => setNewDocument({ ...newDocument, documentType: e.target.value })}
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
                value={newDocument.purpose}
                onChange={(e) => setNewDocument({ ...newDocument, purpose: e.target.value })}
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
                selectedValues={newDocument.releaseTo}
                onChange={(selected) => setNewDocument({ ...newDocument, releaseTo: selected })}
                placeholder="Select destinations..."
                groupBy="prefix"
              />
            </div>
            <div className="form-group">
              <label>Remarks</label>
              <textarea
                className="input-field textarea"
                rows="3"
                value={newDocument.remarks}
                onChange={(e) => setNewDocument({ ...newDocument, remarks: e.target.value })}
                placeholder="Enter any additional remarks or notes (optional)"
              ></textarea>
            </div>
            <div className="form-group">
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
    Urgent
    <input
      type="checkbox"
      checked={newDocument.urgent}
      onChange={(e) => setNewDocument({ ...newDocument, urgent: e.target.checked })}
    />
  </label>
</div>
            <button className="submit-button" onClick={handleAddDocument}>
              Submit Document
            </button>
          </div>
        );
        case 'archive':
        return (
          <div>
            <button className="action-button" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h3>My Archive</h3>
            {archivedDocuments.length > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <button
                  className={`action-button ${archivedDocuments.every(doc => selectedDocIds.includes(doc.documentId)) && archivedDocuments.length > 0 ? 'danger' : 'success'}`}
                  onClick={() => {
                    const allSelected = archivedDocuments.every(doc => selectedDocIds.includes(doc.documentId));
                    if (allSelected) {
                      // Deselect all archived documents
                      const archivedDocIds = archivedDocuments.map(doc => doc.documentId);
                      setSelectedDocIds(prev => prev.filter(id => !archivedDocIds.includes(id)));
                    } else {
                      // Select all archived documents (preserve existing selections from other tabs)
                      const archivedDocIds = archivedDocuments.map(doc => doc.documentId);
                      setSelectedDocIds(prev => {
                        const newIds = [...prev];
                        archivedDocIds.forEach(id => {
                          if (!newIds.includes(id)) {
                            newIds.push(id);
                          }
                        });
                        return newIds;
                      });
                    }
                  }}
                >
                  <i className="fas fa-check-square"></i> {archivedDocuments.every(doc => selectedDocIds.includes(doc.documentId)) && archivedDocuments.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
                {selectedDocIds.length > 0 && (
                  <button
                    className="action-button primary"
                    onClick={handleBulkUnarchive}
                  >
                    <i className="fas fa-undo"></i> Unarchive Selected ({selectedDocIds.length})
                  </button>
                )}
              </div>
            )}
            {archivedDocuments.length === 0 ? (
              <p>No archived documents found.</p>
            ) : (
              <ul className="document-list">
                {archivedDocuments.map((doc) => (
                  <li
                    key={doc.documentId}
                    className="document-item"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', padding: '10px' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.documentId)}
                      onChange={() => handleToggleSelect(doc.documentId)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                    />
                    <div
                      onClick={() => handleViewDocument(doc)}
                      style={{ flex: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                    >
                      <span style={{ whiteSpace: 'nowrap' }}><strong>{doc.title}</strong> (<span>{doc.documentId}</span>)</span>
                      <span style={{ whiteSpace: 'nowrap' }}>Sent by: <strong>{doc.createdByUsername}</strong> (<span>{doc.department}</span>)</span>
                      <span style={{ whiteSpace: 'nowrap' }}>Status: <strong>{doc.status}</strong></span>
                      {doc.urgent && <span className="urgent-tag">Urgent</span>}
                    </div>
                    <button
                      className="action-button primary"
                      onClick={() => handleUnarchiveDocument(doc.documentId)}
                    >
                      <i className="fas fa-undo"></i> Unarchive
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      case 'trash':
        const deletedCreatedDocs = trashedDocuments.filter(doc => doc.userId.toString() === user._id && !doc.accepted);
        const deletedAcceptedDocs = trashedDocuments.filter(doc => doc.acceptedBy && doc.acceptedBy.toString() === user._id);
        return (
          <div>
            <button className="action-button" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h3>Trash</h3>
            <p className="trash-info">Documents in Trash will be permanently deleted after 30 days.</p>
            {(deletedCreatedDocs.length > 0 || deletedAcceptedDocs.length > 0) && (
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <button
                  className={`action-button ${selectedDocIds.length === (deletedCreatedDocs.length + deletedAcceptedDocs.length) ? 'danger' : 'success'}`}
                  onClick={() => {
                    const allSelected = [...deletedCreatedDocs, ...deletedAcceptedDocs].every(doc => selectedDocIds.includes(doc.documentId));
                    const newSelectedDocIds = allSelected ? [] : [...deletedCreatedDocs, ...deletedAcceptedDocs].map(doc => doc.documentId);
                    setSelectedDocIds(newSelectedDocIds);
                  }}
                >
                  <i className="fas fa-check-square"></i> {selectedDocIds.length === (deletedCreatedDocs.length + deletedAcceptedDocs.length) ? 'Deselect All' : 'Select All'}
                </button>
                {selectedDocIds.length > 0 && (
                  <>
                    <button
                      className="action-button success"
                      onClick={handleBulkRestore}
                    >
                      <i className="fas fa-undo"></i> Restore Selected ({selectedDocIds.length})
                    </button>
                    <button
                      className="action-button danger"
                      onClick={handleBulkPermanentDelete}
                    >
                      <i className="fas fa-trash-alt"></i> Permanently Delete Selected ({selectedDocIds.length})
                    </button>
                  </>
                )}
              </div>
            )}
            <h4>Deleted Created Documents</h4>
            {deletedCreatedDocs.length === 0 ? (
              <p>No deleted created documents found.</p>
            ) : (
              <ul className="document-list">
                {deletedCreatedDocs.map((doc) => (
                  <li
                    key={doc.documentId}
                    className="document-item"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', padding: '10px' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.documentId)}
                      onChange={() => handleToggleSelect(doc.documentId)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                    />
                    <div
                      onClick={() => handleViewDocument(doc)}
                      style={{ flex: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                    >
                      <span style={{ whiteSpace: 'nowrap' }}><strong>{doc.title}</strong> (<span>{doc.documentId}</span>)</span>
                      <span style={{ whiteSpace: 'nowrap' }}>Sent by: <strong>{doc.createdByUsername}</strong> (<span>{doc.department}</span>)</span>
                      <span style={{ whiteSpace: 'nowrap' }}>Status: <strong>{doc.status}</strong></span>
                      <span style={{ marginLeft: '1rem' }}>
                        Time Until Deletion:{' '}
                        <span className={getDaysUntilDeletion(doc.deletedAt) === 'Expired' ? 'error-text' : ''}>
                          {getDaysUntilDeletion(doc.deletedAt)}
                        </span>
                      </span>
                    </div>
                    {getDaysUntilDeletion(doc.deletedAt) !== 'Expired' && (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                          className="action-button success"
                          onClick={() => handleRestoreDocument(doc.documentId, doc.deletedAt)}
                        >
                          <i className="fas fa-undo"></i> Restore
                        </button>
                        <button
                          className="action-button danger"
                          onClick={() => handlePermanentDelete(doc.documentId)}
                        >
                          <i className="fas fa-trash-alt"></i> Permanent Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <hr style={{ margin: '2rem 0', border: '1px solid #ccc' }} />
            <h4>Deleted Accepted Documents</h4>
            {deletedAcceptedDocs.length === 0 ? (
              <p>No deleted accepted documents found.</p>
            ) : (
              <ul className="document-list">
                {deletedAcceptedDocs.map((doc) => (
                  <li
                    key={doc.documentId}
                    className="document-item"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', padding: '10px' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.documentId)}
                      onChange={() => handleToggleSelect(doc.documentId)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                    />
                    <div
                      onClick={() => handleViewDocument(doc)}
                      style={{ flex: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                    >
                      <span style={{ whiteSpace: 'nowrap' }}><strong>{doc.title}</strong> (<span>{doc.documentId}</span>)</span>
                      <span style={{ whiteSpace: 'nowrap' }}>Sent by: <strong>{doc.createdByUsername}</strong> (<span>{doc.department}</span>)</span>
                      <span style={{ whiteSpace: 'nowrap' }}>Status: <strong>{doc.status}</strong></span>
                      <span style={{ marginLeft: '1rem' }}>
                        Time Until Deletion:{' '}
                        <span className={getDaysUntilDeletion(doc.deletedAt) === 'Expired' ? 'error-text' : ''}>
                          {getDaysUntilDeletion(doc.deletedAt)}
                        </span>
                      </span>
                    </div>
                    {getDaysUntilDeletion(doc.deletedAt) !== 'Expired' && (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                          className="action-button success"
                          onClick={() => handleRestoreDocument(doc.documentId, doc.deletedAt)}
                        >
                          <i className="fas fa-undo"></i> Restore
                        </button>
                        <button
                          className="action-button danger"
                          onClick={() => handlePermanentDelete(doc.documentId)}
                        >
                          <i className="fas fa-trash-alt"></i> Permanent Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      case 'completed':
    return (
      <div>
        <button className="action-button" onClick={handleBack}>
          <i className="fas fa-arrow-left"></i> Back
        </button>
        <h3>Completed Documents</h3>
        {completedDocuments.length === 0 ? (
          <p>No completed documents found.</p>
        ) : (
          <ul className="document-list">
            {completedDocuments.map((doc) => (
              <li key={doc.documentId} className="document-item">
                <div onClick={() => handleViewDocument(doc)} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ whiteSpace: 'nowrap' }}><strong>{doc.title}</strong> (<span>{doc.documentId}</span>)</span>
                  <span style={{ whiteSpace: 'nowrap' }}>Sent by: <strong>{doc.createdByUsername}</strong> (<span>{doc.department}</span>)</span>
                  <span style={{ whiteSpace: 'nowrap' }}>Status: <strong>{doc.status}</strong></span>
                  {doc.urgent && <span className="urgent-tag">Urgent</span>}
                </div>
                <button
                  className="action-button"
                  onClick={() => handleTrackDocument(doc.documentId)}
                >
                  <i className="fas fa-search"></i> Track
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
      case 'missed':
  return (
    <div>
      <button className="action-button" onClick={handleBack}>
        <i className="fas fa-arrow-left"></i> Back
      </button>
      <h3>Missed Documents</h3>
      {missedDocuments.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
          <button
            className={`action-button ${missedDocuments.every(doc => selectedDocIds.includes(doc.documentId)) && missedDocuments.length > 0 ? 'danger' : 'success'}`}
            onClick={() => {
              const allSelected = missedDocuments.every(doc => selectedDocIds.includes(doc.documentId));
              if (allSelected) {
                // Deselect all missed documents
                setSelectedDocIds(prev => prev.filter(id => !missedDocuments.some(doc => doc.documentId === id)));
              } else {
                // Select all missed documents
                const missedIds = missedDocuments.map(doc => doc.documentId);
                setSelectedDocIds(prev => [...new Set([...prev, ...missedIds])]);
              }
            }}
          >
            <i className="fas fa-check-square"></i> {missedDocuments.every(doc => selectedDocIds.includes(doc.documentId)) && missedDocuments.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          {selectedDocIds.length > 0 && (
            <button
              className="action-button success"
              onClick={handleBulkAccept}
            >
              <i className="fas fa-check"></i> Accept Selected ({selectedDocIds.filter(id => missedDocuments.some(doc => doc.documentId === id)).length})
            </button>
          )}
        </div>
      )}
      {missedDocuments.length === 0 ? (
        <p>No missed documents found (unviewed for 24 hours or more).</p>
      ) : (
        <ul className="document-list">
          {missedDocuments.map((doc) => (
            <li
              key={doc.documentId}
              className="document-item missed"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', padding: '10px' }}
            >
              <input
                type="checkbox"
                checked={selectedDocIds.includes(doc.documentId)}
                onChange={() => handleToggleSelect(doc.documentId)}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: 'pointer', marginRight: '0.5rem' }}
              />
              <div
                onClick={() => handleViewDocument(doc, true)}
                style={{ flex: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
              >
                <span style={{ whiteSpace: 'nowrap' }}><strong>{doc.title}</strong> (<span>{doc.documentId}</span>)</span>
                <span style={{ whiteSpace: 'nowrap' }}>Sent by: <strong>{doc.createdByUsername}</strong> (<span>{doc.department}</span>)</span>
                <span style={{ whiteSpace: 'nowrap' }}>Status: <strong>{doc.status}</strong></span>
                {doc.urgent && <span className="urgent-tag">Urgent</span>}
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  className="action-button success"
                  onClick={() => handleAcceptDocument(doc.documentId)}
                >
                  <i className="fas fa-check"></i> Accept
                </button>
                <button
                  className="action-button"
                  onClick={() => handleTrackDocument(doc.documentId)}
                >
                  <i className="fas fa-search"></i> Track
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
      default:
        return (
          <div className="document-grid">
           <div className="document-card">
              <div className="card-icon add">
                <i className="fas fa-plus-circle"></i>
              </div>
              <h3>Add Documents</h3>
              <p>Create new document entries</p>
              <button className="card-button" onClick={() => handleActionSelect('add')}>
                Add New
              </button>
            </div>
            <div className="document-card">
              <div className="card-icon incoming">
                <i className="fas fa-inbox"></i>
              </div>
              <h3>Incoming Documents</h3>
              <p>View and accept new documents assigned to you</p>
              <button className="card-button" onClick={() => handleActionSelect('incoming')}>
                View Documents
              </button>
            </div>
            <div className="document-card">
              <div className="card-icon mydocs">
                <i className="fas fa-folder-open"></i>
              </div>
              <h3>My Documents</h3>
              <p>Access your created documents</p>
              <button className="card-button" onClick={() => handleActionSelect('mydocs')}>
                Access Repository
              </button>
            </div>
            <div className="document-card">
              <div className="card-icon missed">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3>Missed Documents</h3>
              <p>View unviewed or unaccepted documents</p>
              <button className="card-button" onClick={() => handleActionSelect('missed')}>
                View Missed
              </button>
            </div>
            <div className="document-card">
              <div className="card-icon completed">
                <i className="fas fa-check-circle"></i>
              </div>
              <h3>Completed Documents</h3>
              <p>View and track completed documents</p>
              <button className="card-button" onClick={() => handleActionSelect('completed')}>
                View Completed
              </button>
            </div>
            <div className="document-card">
              <div className="card-icon accepted">
                <i className="fas fa-check-circle"></i>
              </div>
              <h3>Accepted Documents</h3>
              <p>View and manage documents you've accepted</p>
              <button className="card-button" onClick={() => handleActionSelect('accepted')}>
                View Accepted
              </button>
            </div>
            <div className="document-card">
              <div className="card-icon archive">
                <i className="fas fa-archive"></i>
              </div>
              <h3>My Archive</h3>
              <p>Access historical documents</p>
              <button className="card-button" onClick={() => handleActionSelect('archive')}>
                View Archive
              </button>
            </div>
            <div className="document-card">
              <div className="card-icon trash">
                <i className="fas fa-trash"></i>
              </div>
              <h3>Trash</h3>
              <p>View deleted documents</p>
              <button className="card-button" onClick={() => handleActionSelect('trash')}>
                View Trash
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    
    <div className="documents-container">
    <h2 className="section-title">Document Management</h2>
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}
      {renderActionContent()}
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

export default Documents;

import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from './AppProvider';

const DocumentTurnaround = ({ documentId }) => {
  const { setError } = useContext(AppContext);
  const [turnaroundData, setTurnaroundData] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatTurnaroundTime = (start, end) => {
    if (!start || !end) return 'N/A';
    const diffMs = new Date(end) - new Date(start);
    if (diffMs < 0) return 'Invalid';
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return days > 0
      ? `${days}d ${hours}h ${minutes}m ${seconds}s`
      : `${hours}h ${minutes}m ${seconds}s`;
  };

  useEffect(() => {
    const fetchTurnaroundData = async () => {
      try {
        const response = await fetch(`/api/document/${documentId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch document turnaround data');
        }
        const doc = await response.json();
        if (doc && doc.history) {
          const acceptEvent = doc.history.find(event => event.action === 'Accepted');
          const completeEvent = doc.history.find(event => event.action === 'Completed');
          setTurnaroundData({
            acceptedAt: acceptEvent ? acceptEvent.date : null,
            completedAt: completeEvent ? completeEvent.date : null,
            turnaroundTime: acceptEvent && completeEvent
              ? formatTurnaroundTime(acceptEvent.date, completeEvent.date)
              : 'N/A',
          });
        } else {
          setTurnaroundData({ turnaroundTime: 'N/A' });
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    if (documentId) {
      fetchTurnaroundData();
    }
  }, [documentId, setError]);

  if (loading) {
    return <div>Loading turnaround data...</div>;
  }

  return (
    <div className="turnaround-info">
      <h4>Turnaround Time</h4>
      <div className="info-item">
        <label>Time from Acceptance to Completion:</label>
        <span>{turnaroundData?.turnaroundTime || 'N/A'}</span>
      </div>
      {turnaroundData?.acceptedAt && (
        <div className="info-item">
          <label>Accepted At:</label>
          <span>{new Date(turnaroundData.acceptedAt).toLocaleString()}</span>
        </div>
      )}
      {turnaroundData?.completedAt && (
        <div className="info-item">
          <label>Completed At:</label>
          <span>{new Date(turnaroundData.completedAt).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default DocumentTurnaround;
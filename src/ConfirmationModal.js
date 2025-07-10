import React from 'react';
import './ConfirmationModal.css';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">Confirm Action</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="action-button" onClick={onClose}>
            Cancel
          </button>
          <button className="action-button danger" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
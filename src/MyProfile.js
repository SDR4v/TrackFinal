import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from './AppProvider';

const MyProfile = () => {
  const { user, setUser, setError } = useContext(AppContext);
  const [editMode, setEditMode] = useState({ username: false, email: false, password: false });
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }
    if (!user?._id) {
      setError('User ID is not available. Please log in again.');
      return;
    }
    try {
      const response = await fetch(`/api/user/${user._id}/username`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username.trim() }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update username: ${errorText}`);
      }
      const data = await response.json();
      setUser({ ...user, username: data.username });
      setEditMode((prev) => ({ ...prev, username: false }));
      setError(null);
      alert('Username updated successfully');
    } catch (err) {
      console.error('Update error:', err.message);
      setError(err.message);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!validateEmail(formData.email)) {
      setError('Invalid email format');
      return;
    }
    if (!user?._id) {
      setError('User ID is not available. Please log in again.');
      return;
    }
    try {
      const response = await fetch(`/api/user/${user._id}/email`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() }),
      });
      if (!response.ok) {
        throw new Error('Failed to update email');
      }
      const data = await response.json();
      setUser({ ...user, email: data.email });
      setEditMode((prev) => ({ ...prev, email: false }));
      setError(null);
      alert('Email updated successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All password fields are required');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    if (!user?._id) {
      setError('User ID is not available. Please log in again.');
      return;
    }
    try {
      const response = await fetch(`/api/user/${user._id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update password');
      }
      setEditMode((prev) => ({ ...prev, password: false }));
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setError(null);
      alert('Password updated successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelEdit = (field) => {
    setEditMode((prev) => ({ ...prev, [field]: false }));
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setError(null);
  };

  // Add this line for loading or redirect
  if (!user) return <div className="content-card">Loading...</div>; // Or redirect to login

  return (
    <div className="content-card profile-page">
      <h2 className="section-title">My Profile</h2>
      <div className="profile-header">
        <div className="avatar">
          <i className="fas fa-user-circle"></i>
        </div>
        <div className="profile-info">
          <h3>{user.username}</h3>
          <p>{user.role || 'N/A'}</p>
          <p>Schools Division of Laoag City</p>
        </div>
      </div>
      <div className="profile-sections">
        <div className="profile-section">
          <h4 className="section-subtitle">Personal Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>Username</label>
              {editMode.username ? (
                <div className="form-group">
                  <input
                    type="text"
                    name="username"
                    className="input-field"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter new username"
                    autoFocus
                  />
                  <div className="form-actions">
                    <button className="action-button primary" onClick={handleUpdateUsername}>
                      <i className="fas fa-save"></i> Save
                    </button>
                    <button className="action-button" onClick={() => cancelEdit('username')}>
                      <i className="fas fa-times"></i> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="info-display">
                  <span>{user.username || 'N/A'}</span>
                  <button
                    className="edit-button"
                    onClick={() => setEditMode((prev) => ({ ...prev, username: true }))}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                </div>
              )}
            </div>
            <div className="info-item">
              <label>Email</label>
              {editMode.email ? (
                <div className="form-group">
                  <input
                    type="email"
                    name="email"
                    className="input-field"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter new email"
                    autoFocus
                  />
                  <div className="form-actions">
                    <button className="action-button primary" onClick={handleUpdateEmail}>
                      <i className="fas fa-save"></i> Save
                    </button>
                    <button className="action-button" onClick={() => cancelEdit('email')}>
                      <i className="fas fa-times"></i> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="info-display">
                  <span>{user.email || 'N/A'}</span>
                  <button
                    className="edit-button"
                    onClick={() => setEditMode((prev) => ({ ...prev, email: true }))}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                </div>
              )}
            </div>
            <div className="info-item">
              <label>Office Origin</label>
              <span>{user.department || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Role</label>
              <span>{user.role || 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="profile-section">
          <h4 className="section-subtitle">Security Settings</h4>
          {editMode.password ? (
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                className="input-field"
                value={formData.currentPassword}
                onChange={handleInputChange}
                placeholder="Enter current password"
                autoFocus
              />
              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                className="input-field"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password"
              />
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                className="input-field"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
              />
              <div className="form-actions">
                <button className="action-button primary" onClick={handleUpdatePassword}>
                  <i className="fas fa-save"></i> Save
                </button>
                <button className="action-button" onClick={() => cancelEdit('password')}>
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className = "info-item">
              <label>Password</label>
              <div className="info-display">
                <span>*****</span>
                <button
                  className="edit-button"
                  onClick={() => setEditMode((prev) => ({ ...prev, password: true }))}
                >
                  <i className="fas fa-edit"></i> Change Password
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
import React, { useState } from 'react';
import api from '../api';
import { 
  KeyRound, 
  ShieldCheck, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

const Settings = ({ user }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const validate = () => {
    if (!formData.currentPassword) return "Current password is required";
    if (formData.newPassword.length < 4) return "New password must be at least 4 characters";
    if (formData.newPassword !== formData.confirmPassword) return "New passwords do not match";
    return null;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      setStatus({ type: 'error', message: error });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      // Use user.id from props if available, otherwise default to a known admin ID or handle error
      const userId = user?.id || 1; 

      const response = await api.updatePassword({
        userId: userId,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      if (response.success) {
        setStatus({ type: 'success', message: 'Password updated successfully!' });
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setStatus({ type: 'error', message: response.message || 'Failed to update password' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Server error. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="security-settings-wrapper">
      <div className="security-header">
        <div className="header-icon-box">
          <ShieldCheck size={32} />
        </div>
        <h1>Security Settings</h1>
        <p>Manage your account credentials and security preferences.</p>
      </div>

      <div className="security-card main-panel animate-fade-in">
        <div className="panel-header">
          <div className="title-row">
            <KeyRound size={20} />
            <h2>Change Password</h2>
          </div>
          <p>Ensure your account is using a strong, unique password.</p>
        </div>

        <form onSubmit={handlePasswordChange} className="password-form">
          {status.type && (
            <div className={`status-banner ${status.type}`}>
              {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              <span>{status.message}</span>
            </div>
          )}

          <div className="input-stack">
            <div className="input-group">
              <label>Current Password</label>
              <div className="pass-input-wrapper">
                <Lock className="field-icon" size={18} />
                <input 
                  type={showPasswords ? "text" : "password"} 
                  placeholder="Enter current password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="divider"></div>

            <div className="input-group">
              <label>New Password</label>
              <div className="pass-input-wrapper">
                <KeyRound className="field-icon" size={18} />
                <input 
                  type={showPasswords ? "text" : "password"} 
                  placeholder="Minimum 4 characters"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="input-group">
              <label>Confirm New Password</label>
              <div className="pass-input-wrapper">
                <CheckCircle2 className="field-icon" size={18} />
                <input 
                  type={showPasswords ? "text" : "password"} 
                  placeholder="Re-type new password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <div className="form-options">
            <button 
              type="button" 
              className="toggle-visibility"
              onClick={() => setShowPasswords(!showPasswords)}
            >
              {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              <span>{showPasswords ? 'Hide' : 'Show'} Passwords</span>
            </button>
          </div>

          <button type="submit" className="save-btn" disabled={loading}>
            {loading ? (
              <div className="btn-loader"></div>
            ) : (
              <>
                <Save size={20} />
                <span>Update Password</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="security-footer">
        <Lock size={14} />
        <span>End-to-end encryption active. Your tokens are stored securely.</span>
      </div>

      <style>{`
        .security-settings-wrapper {
          max-width: 650px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          padding: 1rem 0;
        }

        .animate-fade-in {
          animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .security-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .header-icon-box {
          width: 80px;
          height: 80px;
          background: #ecf3f0;
          color: #1b5e20;
          border-radius: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
          border: 1px solid #dcfce7;
        }

        .security-header h1 {
          font-size: 2.5rem;
          font-weight: 950;
          color: #1b4332;
          letter-spacing: -0.03em;
        }

        .security-header p {
          font-size: 1.125rem;
          color: #64748b;
          font-weight: 500;
        }

        .security-card {
          background: white;
          border-radius: 2.5rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .panel-header {
          padding: 2.5rem;
          border-bottom: 1px solid #f8fafc;
          background: #fdfdfb;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #1b4332;
          margin-bottom: 0.5rem;
        }

        .title-row h2 {
          font-size: 1.5rem;
          font-weight: 900;
        }

        .panel-header p {
          color: #64748b;
          font-weight: 500;
        }

        .password-form {
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .status-banner {
          padding: 1.25rem;
          border-radius: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          font-weight: 700;
          font-size: 0.95rem;
        }

        .status-banner.error { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
        .status-banner.success { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }

        .input-stack {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .divider {
          height: 1px;
          background: #f1f5f9;
          margin: 0.5rem 0;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .input-group label {
          font-size: 0.8125rem;
          font-weight: 850;
          color: #1b4332;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-left: 0.25rem;
        }

        .pass-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-icon {
          position: absolute;
          left: 1.25rem;
          color: #94a3b8;
        }

        .pass-input-wrapper input {
          width: 100%;
          padding: 1.125rem 1.25rem 1.125rem 3.25rem;
          border-radius: 1.25rem;
          border: 1px solid #e2e8f0;
          font-size: 1rem;
          font-weight: 600;
          background: #f8fafc;
          transition: all 0.2s;
        }

        .pass-input-wrapper input:focus {
          background: white;
          border-color: #1b5e20;
          box-shadow: 0 0 0 4px rgba(27, 94, 32, 0.05);
        }

        .form-options {
          display: flex;
          justify-content: flex-end;
          margin-top: -0.5rem;
        }

        .toggle-visibility {
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          transition: color 0.15s;
        }

        .toggle-visibility:hover {
          color: #1b5e20;
        }

        .save-btn {
          width: 100%;
          padding: 1.25rem;
          border-radius: 1.5rem;
          background: #1b5e20;
          color: white;
          border: none;
          font-size: 1.125rem;
          font-weight: 900;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.2);
          box-shadow: 0 10px 20px -5px rgba(27, 94, 32, 0.25);
        }

        .save-btn:hover {
          background: #234d20;
          transform: translateY(-4px);
          box-shadow: 0 15px 30px -10px rgba(27, 94, 32, 0.3);
        }

        .save-btn:active {
          transform: translateY(0);
        }

        .save-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .btn-loader {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .security-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          padding-bottom: 2rem;
          color: #94a3b8;
          font-size: 0.8125rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default Settings;

import React, { useState } from 'react';
import api from '../api';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.login({ username, password });
      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-wrapper">
            <div className="logo-placeholder">
              <span className="logo-leaf">T</span>
            </div>
          </div>
          <h1>AGRO TREE FERTILIZERS</h1>
          <p className="subtitle">Premium Tree Growth & Care Solutions</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-alert">
              <span>{error}</span>
            </div>
          )}
          
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              required 
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>&copy; 2026 AGRO TREE FERTILIZERS. All rights reserved.</p>
        </div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
        }

        .login-container::after {
          content: "";
          position: absolute;
          top: -10%;
          right: -10%;
          width: 400px;
          height: 400px;
          background: rgba(251, 192, 45, 0.15);
          filter: blur(80px);
          border-radius: 50%;
        }

        .login-card {
          background: white;
          width: 100%;
          max-width: 440px;
          padding: 3rem 2.5rem;
          border-radius: 2rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 10;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .logo-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .logo-placeholder {
          width: 72px;
          height: 72px;
          background: #fdfdfb;
          border: 3px solid #fbc02d;
          border-radius: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(-10deg);
        }

        .logo-leaf {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1b5e20;
          transform: rotate(10deg);
        }

        .login-header h1 {
          font-size: 1.75rem;
          color: #1b4332;
          font-weight: 800;
          letter-spacing: -0.025em;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: #64748b;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .error-alert {
          background: #fef2f2;
          border: 1px solid #fee2e2;
          color: #991b1b;
          padding: 0.875rem;
          border-radius: 0.875rem;
          font-size: 0.875rem;
          font-weight: 600;
          text-align: center;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1b4332;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-group input {
          width: 100%;
          padding: 0.875rem 1.125rem;
          font-size: 1rem;
          border: 2px solid #f1f5f9;
          border-radius: 1rem;
          background: #f8fafc;
          transition: all 0.2s;
        }

        .form-group input:focus {
          border-color: #fbc02d;
          background: white;
          box-shadow: 0 0 0 4px rgba(251, 192, 45, 0.1);
          outline: none;
        }

        .login-btn {
          margin-top: 1rem;
          padding: 1.125rem;
          background: #1b5e20;
          color: white;
          border: none;
          border-radius: 1rem;
          font-size: 1.125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 6px -1px rgba(27, 94, 32, 0.2);
        }

        .login-btn:hover:not(:disabled) {
          background: #2e7d32;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(27, 94, 32, 0.3);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 3rem;
          text-align: center;
        }

        .login-footer p {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }
      `}</style>
    </div>
  );

};

export default Login;

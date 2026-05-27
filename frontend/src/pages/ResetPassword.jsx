import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../api';
import '../styles/ResetPassword.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to reset password.');
        return;
      }

      setMessage(data.message || 'Password updated successfully.');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-card">
        <h1>Create a new password</h1>
        <p>Choose a secure password for your NU Laguna account.</p>

        <form onSubmit={handleSubmit} className="reset-password-form">
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />

          <button type="submit" disabled={loading || !token}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>

        {!token ? <p className="error-message">Missing reset token. Open the link from your email again.</p> : null}
        {message ? <p className="success-message">{message}</p> : null}
        {error ? <p className="error-message">{error}</p> : null}

        <Link to="/login" className="back-link">
          Back to login
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
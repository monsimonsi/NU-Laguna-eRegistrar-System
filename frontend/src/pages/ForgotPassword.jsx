import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../api';
import '../styles/ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to process your request.');
        return;
      }

      setMessage(data.message || 'If the email exists, reset instructions were sent.');
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">
        <h1>Reset your password</h1>
        <p>Enter the email address tied to your NU Laguna account.</p>

        <form onSubmit={handleSubmit} className="forgot-password-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@domain.edu.ph"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        {message ? <p className="success-message">{message}</p> : null}
        {error ? <p className="error-message">{error}</p> : null}

        <Link to="/login" className="back-link">
          Back to login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
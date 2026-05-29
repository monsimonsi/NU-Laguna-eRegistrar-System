import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/nu-logo-left.png';
import bg from '../assets/nubg.jpg';
import { API_BASE, getStoredToken, parseJwtPayload } from '../api';
import '../styles/Login.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    const payload = parseJwtPayload(token);
    const role = String(payload?.role || '').trim().toLowerCase();

    if (role === 'admin') {
      navigate('/admin-dashboard', { replace: true });
      return;
    }

    if (role === 'student' || role === 'alumni') {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsError(false);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin', email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setErrorMessage(data.message || 'Login failed. Please try again.');
        return;
      }

      try {
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch (storageError) {
        console.warn('Failed to persist session in localStorage', storageError);
      }

      const loggedInRole = String(data.user?.role || 'admin').trim().toLowerCase();
      if (loggedInRole === 'admin') {
        navigate('/admin-dashboard', { replace: true });
        return;
      }

      setIsError(true);
      setErrorMessage('This login is reserved for registrar accounts.');
    } catch (error) {
      setIsError(true);
      setErrorMessage('Cannot connect to server.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      <header className="top-logo">
        <img src={logo} alt="NU Logo" className="login-logo" />
      </header>

      <main className="login-main">
        <section className="login-heading">
          <h1>NU Laguna e-Registrar</h1>
          <p>Registrar access for document processing and verification</p>
        </section>

        <section className="login-card">
          <div className="featured-image">
            <img src={bg} alt="NU Laguna campus" />
          </div>

          <div className="login-form-panel">
            <h2>REGISTRAR LOGIN</h2>
            <p className="login-subtitle">Log in with your registrar credentials</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="login-options">
                <span className="login-options-note">Admin access only</span>
                <Link to="/login" className="forgot-link">
                  Student/Alumni login
                </Link>
              </div>

              <button type="submit" className="signin-btn">
                SIGN IN
              </button>

              {isError && (
                <p style={{ marginTop: '10px', color: 'red' }}>
                  {errorMessage || 'Login failed. Please try again.'}
                </p>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminLogin;
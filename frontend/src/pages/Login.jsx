import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/nu-logo-left.png';
import bg from '../assets/nubg.jpg';
import '../styles/Login.css';

const Login = () => {
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message || 'Login failed.');
        return;
      }

      setIsError(false);
      setMessage(data.message || 'Login successful.');
      console.log('Logged in user:', data.user);
    } catch (error) {
      setIsError(true);
      setMessage('Cannot connect to server.');
    }
  };

  return (
    <div className="login-page">
      <div className="bg-image" />

      <header className="top-logo">
          <img src={logo} alt="NU Logo" className="login-logo" />
      </header>

      <main className="login-main">
        <section className="login-heading">
          <h1>NU Laguna e-Registrar</h1>
          <p>Request your academic documents quickly and securely</p>
        </section>

        <section className="login-card">
          <div className="featured-image">
            <img src={bg} alt="NU Laguna campus" />
          </div>

          <div className="login-form-panel">
            <h2>WELCOME!</h2>
            <p className="login-subtitle">
              Log in using your National University credentials
            </p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Login As:</label>
                <div className="select-wrap">
                  <select value={role} onChange={(e) => setRole(e.target.value)} required>
                    <option value="" disabled>Select role</option>
                    <option value="student">Student</option>
                    <option value="alumni">Alumni</option>
                    <option value="admin">Registrar</option>
                  </select>
                </div>
              </div>

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
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>

                <a href="/" className="forgot-link">
                  Forgot Password?
                </a>
              </div>

              <button type="submit" className="signin-btn">
                SIGN IN
              </button>

              {message && (
                <p style={{ marginTop: '10px', color: isError ? 'red' : 'green' }}>
                  {message}
                </p>
              )}

              <div className="divider">
                <span>Alumni? Register here</span>
              </div>

              <Link to="/alumni-registration" className="register-btn">
                REGISTER
              </Link>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
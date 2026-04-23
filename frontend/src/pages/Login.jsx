import { Link } from 'react-router-dom';
import logo from '../assets/nu-logo-left.png';
import bg from '../assets/nubg.jpg';
import '../styles/Login.css';

const Login = () => {
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

            <form className="login-form">
              <div className="form-group">
                <label>Login As:</label>
                <div className="select-wrap">
                  <select defaultValue="">
                    <option value="" disabled></option>
                    <option>Student</option>
                    <option>Alumni</option>
                    <option>Registrar</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Email:</label>
                <input type="email" placeholder="Enter your email" />
              </div>

              <div className="form-group">
                <label>Password:</label>
                <input type="password" placeholder="********" />
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
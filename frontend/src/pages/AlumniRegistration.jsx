import { Link } from 'react-router-dom';
import logo from '../assets/nu-logo-left.png';
import bg from '../assets/nubg.jpg';
import '../styles/AlumniRegistration.css';

const AlumniRegistration = () => {
  return (
    <div className="alumni-page">
      <div className="bg-image" />

      <header className="top-logo">
        <img src={logo} alt="NU Logo" />
      </header>

      <main className="page-content">
        <section className="page-heading">
          <h1>NU Laguna e-Registrar</h1>
          <p>Request your academic documents quickly and securely</p>
        </section>

        <div className="back-link">
          <Link to="/login">&lsaquo; Back to Login</Link>
        </div>

        <section className="registration-card">
          <div className="featured-image">
            <img src={bg} alt="NU Laguna campus" />
          </div>

          <div className="form-side">
            <h2>Alumni Registration</h2>

            <form className="registration-form">
              <div className="row two-cols">
                <div className="field">
                  <label>First Name: *</label>
                  <input type="text" />
                </div>

                <div className="field">
                  <label>Last Name: *</label>
                  <input type="text" />
                </div>
              </div>

              <div className="row two-cols">
                <div className="field">
                  <label>Student ID: *</label>
                  <input type="text" />
                </div>

                <div className="field">
                  <label>Year Graduated: *</label>
                  <div className="select-wrap">
                    <select defaultValue="">
                      <option value="" disabled></option>
                      <option>2020</option>
                      <option>2021</option>
                      <option>2022</option>
                      <option>2023</option>
                      <option>2024</option>
                      <option>2025</option>
                      <option>2026</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="field full">
                  <label>Program: *</label>
                  <div className="select-wrap">
                    <select defaultValue="">
                      <option value="" disabled></option>
                      <option>BS Computer Science</option>
                      <option>BS Information Technology</option>
                      <option>BS Information Systems</option>
                      <option>BS Business Administration</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="field full">
                  <label>Enter your Email Address: *</label>
                  <input type="email" />
                </div>
              </div>

              <div className="row">
                <div className="field full">
                  <label>Enter Password: *</label>
                  <input type="password" />
                </div>
              </div>

              <div className="row">
                <div className="field full">
                  <label>Confirm Password: *</label>
                  <input type="password" />
                </div>
              </div>

              <button type="submit" className="submit-btn">
                SUBMIT REGISTRATION
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AlumniRegistration;
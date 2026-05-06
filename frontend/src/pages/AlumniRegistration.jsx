import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/nu-logo-left.png';
import bg from '../assets/nubg.jpg';
import { API_BASE } from '../api';
import '../styles/AlumniRegistration.css';

const YEAR_OPTIONS = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];

const PROGRAM_OPTIONS = [
  'BS Computer Science',
  'BS Information Technology',
  'BS Information Systems',
  'BS Business Administration',
  'Other'
];

const AlumniRegistration = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [yearGraduated, setYearGraduated] = useState('');
  const [program, setProgram] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/alumni/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          studentNumber,
          yearGraduated,
          program,
          email,
          password
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || 'Registration failed. Please try again.');
        return;
      }

      setSuccess(data.message || 'Registration submitted.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError('Cannot reach the server. Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  };

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

            <form className="registration-form" onSubmit={handleSubmit}>
              <div className="row two-cols">
                <div className="field">
                  <label>First Name: *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>Last Name: *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="row two-cols">
                <div className="field">
                  <label>Student ID: *</label>
                  <input
                    type="text"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>Year Graduated: *</label>
                  <div className="select-wrap">
                    <select
                      value={yearGraduated}
                      onChange={(e) => setYearGraduated(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Select year
                      </option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="field full">
                  <label>Program: *</label>
                  <div className="select-wrap">
                    <select
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Select program
                      </option>
                      {PROGRAM_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="field full">
                  <label>Enter your Email Address: *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="row">
                <div className="field full">
                  <label>Enter Password: *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="row">
                <div className="field full">
                  <label>Confirm Password: *</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {error && (
                <p style={{ color: '#b91c1c', marginBottom: '0.5rem' }}>{error}</p>
              )}
              {success && (
                <p style={{ color: '#15803d', marginBottom: '0.5rem' }}>{success}</p>
              )}

              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'SUBMITTING…' : 'SUBMIT REGISTRATION'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AlumniRegistration;

import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/nu-logo-left.png';
import bg from '../assets/nubg.jpg';
import '../styles/AlumniRegistration.css';

const YEAR_OPTIONS = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];

const PROGRAM_OPTIONS = [
  'BS Computer Science',
  'BS Information Technology',
  'BS Information Systems',
  'BS Business Administration',
  'Other',
];

const AlumniRegistration = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [yearGraduated, setYearGraduated] = useState('');
  const [course, setCourse] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    const fullName = `${String(firstName).trim()} ${String(lastName).trim()}`.trim();

    if (!firstName.trim() || !lastName.trim()) {
      setIsError(true);
      setMessage('First name and last name are required.');
      return;
    }

    if (!studentId.trim()) {
      setIsError(true);
      setMessage('Student ID is required.');
      return;
    }

    if (!yearGraduated) {
      setIsError(true);
      setMessage('Year graduated is required.');
      return;
    }

    if (!course) {
      setIsError(true);
      setMessage('Program is required.');
      return;
    }

    if (!email.trim()) {
      setIsError(true);
      setMessage('Email is required.');
      return;
    }

    if (!password || !confirmPassword) {
      setIsError(true);
      setMessage('Password and confirmation are required.');
      return;
    }

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage('Passwords do not match.');
      return;
    }

    setIsError(false);
    setMessage(`Registration ready for ${fullName}.`);

    setFirstName('');
    setLastName('');
    setStudentId('');
    setYearGraduated('');
    setCourse('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
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
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
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
                      {YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>
                          {year}
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
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Select program
                      </option>
                      {PROGRAM_OPTIONS.map((program) => (
                        <option key={program} value={program}>
                          {program}
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
                    required
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn">
                SUBMIT REGISTRATION
              </button>

              {message && (
                <p className={`registration-message ${isError ? 'error' : 'success'}`}>
                  {message}
                </p>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AlumniRegistration;
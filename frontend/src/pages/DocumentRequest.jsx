import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, FileText } from 'lucide-react';
import logo from '../assets/NU_shield.png';
import '../styles/DocumentRequest.css';

const DocumentRequest = () => {
  const [copies, setCopies] = useState(1);

  const decreaseCopies = () => {
    setCopies((prev) => Math.max(1, prev - 1));
  };

  const increaseCopies = () => {
    setCopies((prev) => prev + 1);
  };

  return (
    <div className="doc-page">
      <header className="doc-topbar">
        <button className="doc-menu-btn" aria-label="Menu">
          <Menu size={30} strokeWidth={2.5} />
        </button>

        <div className="doc-brand">
          <img src={logo} alt="NU Logo" className="doc-logo" />
          <span className="doc-title">NU Laguna e-Registrar</span>
        </div>
      </header>

      <main className="doc-main">
        <div className="doc-back-row">
          <Link to="/admin-dashboard" className="doc-back-link">
            &lsaquo; Back to Dashboard
          </Link>
        </div>

        <section className="doc-card">
          <div className="doc-card-header">
            <FileText className="doc-card-icon" size={34} strokeWidth={2.2} />
            <div>
              <h1>New Document Request</h1>
              <p>Fill out this form to request official documents from the registrar.</p>
            </div>
          </div>

          <form className="doc-form">
            <div className="doc-grid-top">
              <div className="doc-field">
                <label>Document Type *</label>
                <div className="select-wrap">
                  <select defaultValue="">
                    <option value="" disabled></option>
                    <option>Transcript of Records</option>
                    <option>Certificate of Registration</option>
                    <option>Certificate of Good Moral Character</option>
                    <option>Diploma</option>
                    <option>Certificates</option>
                  </select>
                </div>
              </div>

              <div className="doc-field">
                <label>Purpose *</label>
                <div className="select-wrap">
                  <select defaultValue="">
                    <option value="" disabled></option>
                    <option>Employment</option>
                    <option>Scholarship</option>
                    <option>Further Studies</option>
                    <option>Personal Record</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="doc-field copies-field">
                <label>No. of Copies *</label>
                <div className="copies-control">
                  <button
                    type="button"
                    className="copies-btn"
                    onClick={decreaseCopies}
                    aria-label="Decrease copies"
                  >
                    −
                  </button>
                  <span className="copies-value">{copies}</span>
                  <button
                    type="button"
                    className="copies-btn"
                    onClick={increaseCopies}
                    aria-label="Increase copies"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="doc-section">
              <label className="section-title">Delivery Method *</label>

              <label className="radio-row">
                <input type="radio" name="delivery" defaultChecked />
                <span>Pickup at Registrar's Office (Free of Charge)</span>
              </label>

              <label className="radio-row">
                <input type="radio" name="delivery" />
                <span>Deliver to Home Address (₱150 Additional Charge)</span>
              </label>
            </div>

            <div className="doc-field notes-field">
              <label>Additional Notes (Optional)</label>
              <textarea placeholder="Add personal notes or instructions if any" />
            </div>

            <div className="doc-actions">
              <button type="button" className="cancel-btn">
                CANCEL
              </button>
              <button type="submit" className="submit-btn">
                SUBMIT REQUEST
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default DocumentRequest;
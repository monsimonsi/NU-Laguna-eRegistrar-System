import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, FileText } from 'lucide-react';
import logo from '../assets/NU_shield.png';
import '../styles/DocumentRequest.css';

const DocumentRequest = ({ onBack }) => {
  const [copies, setCopies] = useState(1);
  const [succeedingPages, setSucceedingPages] = useState(0);
  const [documentType, setDocumentType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [createdRequest, setCreatedRequest] = useState(null);
  const navigate = useNavigate();

  const decreaseCopies = () => {
    setCopies((prev) => Math.max(1, prev - 1));
  };

  const increaseCopies = () => {
    setCopies((prev) => prev + 1);
  };

  const decreaseSucceedingPages = () => {
    setSucceedingPages((prev) => Math.max(0, prev - 1));
  };

  const increaseSucceedingPages = () => {
    setSucceedingPages((prev) => prev + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsError(false);
    setMessage('');

    const user = (() => {
      try { return JSON.parse(localStorage.getItem('user')); } catch (e) { return null; }
    })();

    if (!user) {
      setIsError(true);
      setMessage('You must be logged in to submit a request.');
      return;
    }

    if (deliveryMethod === 'delivery' && !String(address || '').trim()) {
      setIsError(true);
      setMessage('Delivery address is required for home delivery.');
      return;
    }

    const payload = {
      requesterId: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      documentType,
      purpose,
      copies,
      deliveryMethod,
      address,
      notes
    };

    if (documentType === 'Course Description 1st Page') {
      payload.succeedingPages = succeedingPages;
    }

    try {
      const res = await fetch('http://localhost:5000/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setIsError(true);
        setMessage(data.message || 'Failed to create request.');
        return;
      }

      setIsError(false);
      // store created request and show modal
      setCreatedRequest(data.request || null);
      setShowModal(true);
      setMessage('Request submitted successfully.');
      // reset form
      setDocumentType('');
      setPurpose('');
      setCopies(1);
      setSucceedingPages(0);
      setDeliveryMethod('pickup');
      setNotes('');
      setAddress('');
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMessage('Cannot connect to server.');
    }
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
          {onBack ? (
            <button onClick={onBack} className="doc-back-link doc-back-button">
              &lsaquo; Back to Dashboard
            </button>
          ) : (
            <Link to="/dashboard" className="doc-back-link">
              &lsaquo; Back to Dashboard
            </Link>
          )}
        </div>

        <section className="doc-card">
          <div className="doc-card-header">
            <FileText className="doc-card-icon" size={34} strokeWidth={2.2} />
            <div>
              <h1>New Document Request</h1>
              <p>Fill out this form to request official documents from the registrar.</p>
            </div>
          </div>

          <form className="doc-form" onSubmit={handleSubmit}>
            <div className="doc-grid-top">
              <div className="doc-field">
                <label>Document Type *</label>
                <div className="select-wrap">
                  <select value={documentType} onChange={(e) => { setDocumentType(e.target.value); setSucceedingPages(0); }} required>
                    <option value="" disabled>Select document</option>
                    <option>Transcript of Records (TOR)</option>
                    <option>Certificate of Registration (COR)</option>
                    <option>Certificates</option>
                    <option>Certificate of Good Moral Character</option>
                    <option>Completion of Grades</option>
                    <option>Copy of Grades</option>
                    <option>Course Curriculum</option>
                    <option>Course Description 1st Page</option>
                    <option>Load Revision Form & Processing</option>
                    <option>Shifting Form</option>
                    <option>SHS Report Card</option>
                    <option>SHS SF10 / Form 137A</option>
                  </select>
                </div>
              </div>

              <div className="doc-field">
                <label>Purpose *</label>
                <div className="select-wrap">
                  <select value={purpose} onChange={(e) => setPurpose(e.target.value)} required>
                    <option value="" disabled>Select purpose</option>
                    <option>Employment</option>
                    <option>Scholarship</option>
                    <option>Further Studies</option>
                    <option>Personal Record</option>
                    <option>Professional Licensure Exam</option>
                    <option>Immigration/Visa</option>
                    <option>Government Service</option>
                    <option>Course Transfer</option>
                    <option>Admission to University</option>
                    <option>Certification Program</option>
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

            {documentType === 'Course Description 1st Page' && (
              <div className="doc-grid-top doc-grid-top--spaced">
                <div className="doc-field copies-field">
                  <label>Succeeding Pages</label>
                  <div className="copies-control">
                    <button
                      type="button"
                      className="copies-btn"
                      onClick={decreaseSucceedingPages}
                      aria-label="Decrease succeeding pages"
                    >
                      −
                    </button>
                    <span className="copies-value">{succeedingPages}</span>
                    <button
                      type="button"
                      className="copies-btn"
                      onClick={increaseSucceedingPages}
                      aria-label="Increase succeeding pages"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="doc-section">
              <label className="section-title">Delivery Method *</label>

              <label className="radio-row">
                <input type="radio" name="delivery" value="pickup" checked={deliveryMethod === 'pickup'} onChange={() => setDeliveryMethod('pickup')} />
                <span>Pickup at Registrar's Office (Free of Charge)</span>
              </label>

              <label className="radio-row">
                <input type="radio" name="delivery" value="delivery" checked={deliveryMethod === 'delivery'} onChange={() => setDeliveryMethod('delivery')} />
                <span>Deliver to Home Address (₱150 Additional Charge)</span>
              </label>
            </div>

            {deliveryMethod === 'delivery' && (
              <div className="notes-field">
                <label className="section-title">Delivery Address *</label>
                <textarea
                  placeholder="Enter delivery address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="doc-field notes-field">
              <label>Additional Notes (Optional)</label>
              <textarea placeholder="Add personal notes or instructions if any" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="doc-actions">
              <button
  type="button"
  className="cancel-btn"
  onClick={() => {
    setDocumentType('');
    setPurpose('');
    setCopies(1);
    setSucceedingPages(0);
    setDeliveryMethod('pickup');
    setNotes('');
    setAddress('');
    setMessage('');
    if (onBack) onBack();
  }}
>
  CANCEL
</button>
              <button type="submit" className="submit-btn">
                SUBMIT REQUEST
              </button>
            </div>
          </form>
        </section>
      </main>
      {message && (
        <div className={`doc-message ${isError ? 'error' : 'success'} doc-message--spaced`}>
          {message}
        </div>
      )}

      {showModal && (
        <div className="doc-modal-overlay">
          <div className="doc-modal">
            <h3 className="doc-modal-title">Request Submitted</h3>
            <p className="doc-modal-subtitle">Your document request was created successfully.</p>
            {createdRequest && (
              <div className="doc-modal-details">
                <div><strong>ID:</strong> {createdRequest._id}</div>
                <div><strong>Document:</strong> {createdRequest.documentType}</div>
                <div><strong>Status:</strong> {createdRequest.status}</div>
              </div>
            )}

            <div className="doc-modal-actions">
              <button
                type="button"
                onClick={() => onBack ? onBack() : navigate('/dashboard')}
                className="doc-modal-btn doc-modal-btn--secondary"
              >
                Go to Dashboard
              </button>

              <button
                type="button"
                onClick={() => { setShowModal(false); setCreatedRequest(null); setMessage(''); }}
                className="doc-modal-btn doc-modal-btn--primary"
              >
                New Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentRequest;
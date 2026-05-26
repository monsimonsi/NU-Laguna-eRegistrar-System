import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, FileText } from 'lucide-react';
import logo from '../assets/NU_shield.png';
import settingslogo from '../assets/settings-icon.png';
import tracklogo from '../assets/track-icon.png';
import submitlogo from '../assets/submit-icon.png';
import logoutlogo from '../assets/logout-icon.png';
import { API_BASE, authHeaders, clearSession, formatPhp } from '../api';
import { estimateFees, findPriceForType } from '../utils/fees';
import '../styles/Dashboard.css';
import '../styles/DocumentRequest.css';

const DocumentRequest = ({ onBack }) => {
  const [isOpen, setIsOpen] = useState(false);
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
  const [createdPayment, setCreatedPayment] = useState(null);
  const [prices, setPrices] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/prices`);
        const data = await res.json();
        if (res.ok) setPrices(data.prices || []);
      } catch {
        /* optional preview */
      }
    })();
  }, []);

  const feeEstimate = useMemo(() => {
    const row = findPriceForType(prices, documentType);
    return estimateFees(row, { copies, succeedingPages, deliveryMethod });
  }, [prices, documentType, copies, succeedingPages, deliveryMethod]);

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

  const toggleSidebar = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const goToDashboard = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate('/dashboard');
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
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

    if (!documentType) {
      setIsError(true);
      setMessage('Please select a document type.');
      return;
    }

    if (!purpose) {
      setIsError(true);
      setMessage('Please select a purpose.');
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

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setIsError(true);
        setMessage(data.message || 'Failed to create request.');
        return;
      }

      setIsError(false);
      setCreatedRequest(data.request || null);
      setCreatedPayment(data.payment || null);

      setShowModal(true);
      setMessage(data.message || 'Request submitted successfully.');
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToPayment = Boolean(
    createdRequest?._id && !createdRequest.paymentConfirmed
  );

  return (
    <div className={`doc-page ${isOpen ? 'sidebar-open' : ''}`} onClick={closeSidebar}>
      <header className="doc-topbar">
        <button
          className="doc-menu-btn"
          aria-label="Menu"
          aria-expanded={isOpen}
          onClick={toggleSidebar}
        >
          <Menu size={30} strokeWidth={2.5} />
        </button>

        <button type="button" className="doc-brand" onClick={goToDashboard}>
          <img src={logo} alt="NU Logo" className="doc-logo" />
          <span className="doc-title">NU Laguna e-Registrar</span>
        </button>
      </header>

      <div className={`sidebar doc-sidebar ${isOpen ? 'active' : ''}`} onClick={(e) => e.stopPropagation()}>
        <nav className="sidebar-nav">
          <div className="sidebar-link" onClick={() => { setIsOpen(false); }}>
            <img src={submitlogo} alt="Submit Logo" className="sidebar-icon" />
            <span className="sidebar-label">Submit Document Requests</span>
          </div>
          <div className="sidebar-link" onClick={() => { setIsOpen(false); goToDashboard(); }}>
            <img src={tracklogo} alt="" className="sidebar-icon" />
            <span className="sidebar-label">Track Document Requests</span>
          </div>
          <div className="sidebar-link" onClick={() => { setIsOpen(false); goToDashboard(); }}>
            <img src={settingslogo} alt="" className="sidebar-icon" />
            <span className="sidebar-label">Account Settings</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-link logout-sidebar" onClick={handleLogout}>
            <img src={logoutlogo} alt="Logout Logo" className="sidebar-icon" />
            <span className="sidebar-label">LOG OUT</span>
          </div>
        </div>
      </div>

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

          <form className="doc-form" onSubmit={handleSubmit} noValidate>
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

            {documentType && (
              <div className="doc-fee-preview">
                <strong>Estimated total: {formatPhp(feeEstimate.total)}</strong>
                {feeEstimate.deliveryFee > 0 && <span> (includes delivery fee)</span>}
              </div>
            )}

            {message && (
              <div className={`doc-message ${isError ? 'error' : 'success'}`} role="status">
                <span>{message}</span>
              </div>
            )}

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
    if (onBack) {
      onBack();
      return;
    }
    navigate('/dashboard');
  }}
>
  CANCEL
</button>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REQUEST'}
              </button>
            </div>
          </form>
        </section>
      </main>

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
                onClick={() => onBack ? onBack() : navigate('/my-requests')}
                className="doc-modal-btn doc-modal-btn--secondary"
              >
                View my requests
              </button>

              {canProceedToPayment && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/payment?requestId=${encodeURIComponent(createdRequest._id)}`, {
                      state: { request: createdRequest, payment: createdPayment }
                    })
                  }
                  className="doc-modal-btn doc-modal-btn--accent"
                >
                  Proceed to payment
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setCreatedRequest(null);
                  setCreatedPayment(null);
                  setMessage('');
                }}
                className="doc-modal-btn doc-modal-btn--primary"
              >
                New request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentRequest;

import { Link } from 'react-router-dom';
import {
  Menu,
  FileText,
  Clock3,
  PackageOpen,
  ClipboardCheck,
  CircleDollarSign,
  CircleCheckBig,
  MapPin,
  CalendarDays,
  UserRound,
  BadgeDollarSign,
} from 'lucide-react';
import logo from '../assets/NU_shield.png';
import '../styles/DocumentTracking.css';

const DocumentTracking = () => {
  return (
    <div className="track-page">
      <header className="track-topbar">
        <button className="track-menu-btn" aria-label="Menu">
          <Menu size={30} strokeWidth={2.5} />
        </button>

        <div className="track-brand">
          <img src={logo} alt="NU Logo" className="track-logo" />
          <span className="track-title">NU Laguna e-Registrar</span>
        </div>
      </header>

      <main className="track-main">
        <div className="track-heading-row">
          <h1>Document Tracking</h1>
          <Link to="/document-request" className="track-back-link">
            &lsaquo; Back
          </Link>
        </div>

        <section className="track-card track-summary-card">
          <div className="track-summary-left">
            <div className="track-summary-header">
              <FileText className="track-summary-icon" size={34} strokeWidth={2.2} />
              <div>
                <h2>Transcript of Records (TOR)</h2>
              </div>
            </div>

            <div className="track-summary-meta">
              <p>Request ID: REQ-202604080001</p>
              <p>Request Date: 04/09/2026</p>
            </div>
          </div>

          <div className="track-status-stack">
            <span className="track-status-pill unpaid">
              <CircleDollarSign size={15} strokeWidth={2.2} />
              Unpaid
            </span>
            <span className="track-status-pill pending">
              <Clock3 size={15} strokeWidth={2.2} />
              Pending
            </span>
          </div>
        </section>

        <section className="track-card track-progress-card">
          <div className="track-card-head">
            <h3>Request Progress</h3>
            <p>Track the status of your document request</p>
          </div>

          <div className="track-bar">
            <div className="track-bar-fill" />
          </div>

          <div className="track-steps">
            <div className="track-step active">
              <div className="track-step-icon">
                <CircleDollarSign size={64} strokeWidth={2.2} />
              </div>
              <div className="track-step-label">Waiting for Payment</div>
            </div>

            <div className="track-step">
              <div className="track-step-icon">
                <Clock3 size={64} strokeWidth={2.2} />
              </div>
              <div className="track-step-label">Processing</div>
            </div>

            <div className="track-step">
              <div className="track-step-icon">
                <PackageOpen size={64} strokeWidth={2.2} />
              </div>
              <div className="track-step-label">Ready for<br />Pickup / Delivery</div>
            </div>

            <div className="track-step">
              <div className="track-step-icon">
                <ClipboardCheck size={64} strokeWidth={2.2} />
              </div>
              <div className="track-step-label">Completed</div>
            </div>
          </div>
        </section>

        <section className="track-card track-details-card">
          <div className="track-details-top">
            <h3>Request Details</h3>
            <button className="track-proceed-btn">PROCEED TO PAYMENT</button>
          </div>

          <div className="track-details-grid top-grid">
            <div className="detail-block">
              <div className="detail-label">
                <UserRound size={16} strokeWidth={2.2} />
                <span>Requested By</span>
              </div>
              <div className="detail-value strong">Juan Dela Cruz</div>
              <div className="detail-sub">2023-123456</div>
            </div>

            <div className="detail-block">
              <div className="detail-label">
                <CalendarDays size={16} strokeWidth={2.2} />
                <span>Request Date</span>
              </div>
              <div className="detail-value strong">04/09/2026 - 11:54 am</div>
            </div>

            <div className="detail-block">
              <div className="detail-label">
                <MapPin size={16} strokeWidth={2.2} />
                <span>Delivery Method</span>
              </div>
              <div className="detail-value strong">Pickup</div>
            </div>
          </div>

          <div className="track-divider" />

          <div className="track-details-grid bottom-grid">
            <div className="detail-block">
              <div className="detail-label">Document Type</div>
              <div className="detail-value strong">Transcript of Records (TOR)</div>

              <div className="detail-label small-gap">Purpose</div>
              <div className="detail-value strong">Employment</div>
            </div>

            <div className="detail-block">
              <div className="detail-label">Number of Copies</div>
              <div className="detail-value strong">1</div>

              <div className="detail-label small-gap">Document Fee</div>
              <div className="detail-value strong">₱1500</div>
            </div>

            <div className="detail-block">
              <div className="detail-label">Tracking Number</div>
              <div className="detail-value strong">NUL 2026-0409-001</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DocumentTracking;
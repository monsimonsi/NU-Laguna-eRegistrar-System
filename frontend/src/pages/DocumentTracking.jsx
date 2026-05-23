import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  FileText,
  Clock3,
  PackageOpen,
  ClipboardCheck,
  CircleDollarSign,
  MapPin,
  CalendarDays,
  UserRound
} from 'lucide-react';
import logo from '../assets/NU_shield.png';
import { API_BASE, authHeaders } from '../api';
import '../styles/DocumentTracking.css';

const STATUS_STEP_MAP = {
  pending: 1,
  processing: 2,
  'ready for pickup': 3,
  'out for delivery': 3,
  released: 4,
  completed: 4
};

const STATUS_CLASS_MAP = {
  pending: 'pending',
  processing: 'processing',
  'ready for pickup': 'ready',
  'out for delivery': 'delivery',
  released: 'released',
  completed: 'released'
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '-';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDeliveryMethod = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  return normalized === 'delivery' ? 'Delivery' : 'Pickup';
};

const DocumentTracking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const requestId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('id');
  }, [location.search]);

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setRequest(null);

    if (!requestId) {
      setLoading(false);
      setError('No request selected.');
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/requests/${encodeURIComponent(requestId)}`, {
          headers: authHeaders(false)
        });
        const data = await res.json();

        if (!res.ok) {
          if (!cancelled) {
            setError(data.message || 'Could not load request details.');
          }
          return;
        }

        if (!cancelled) {
          setRequest(data.request || null);
        }
      } catch (err) {
        if (!cancelled) setError('Cannot reach the server.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const statusLabel = request?.status || '-';
  const normalizedStatus = String(request?.status || 'pending').trim().toLowerCase();
  const statusStep = STATUS_STEP_MAP[normalizedStatus] || 1;
  const statusClass = STATUS_CLASS_MAP[normalizedStatus] || 'pending';
  const activeStep = statusStep;
  const statusKey = activeStep === 2 ? 'processing' : activeStep === 3 ? 'ready' : activeStep === 4 ? 'released' : 'pending';
  const progressPercent = `${(statusStep / 4) * 100}%`;
  const showDetails = Boolean(request) && !loading && !error;
  const isPaid = Boolean(request?.paymentConfirmed);
  const needsPayment = showDetails && !isPaid;

  return (
    <div className="track-page">
      <header className="track-topbar">
        <button className="track-menu-btn" aria-label="Menu">
          <Menu size={30} strokeWidth={2.5} />
        </button>

        <button type="button" className="track-brand" onClick={() => navigate('/dashboard')}>
          <img src={logo} alt="NU Logo" className="track-logo" />
          <span className="track-title">NU Laguna e-Registrar</span>
        </button>
      </header>

      <main className="track-main">
        <div className="track-heading-row">
          <h1>Document Tracking</h1>
          <Link to="/dashboard" className="track-back-link">
            &lsaquo; Back
          </Link>
        </div>

        {loading && (
          <section className="track-card" aria-live="polite">
            <p className="track-feedback">Loading request details...</p>
          </section>
        )}

        {error && !loading && (
          <section className="track-card" role="alert">
            <p className="track-feedback error">{error}</p>
          </section>
        )}

        {showDetails && (
          <>
            <section className="track-card track-summary-card">
              <div className="track-summary-left">
                <div className="track-summary-header">
                  <FileText className="track-summary-icon" size={34} strokeWidth={2.2} />
                  <div>
                    <h2>{request.documentType || 'Document request'}</h2>
                  </div>
                </div>

                <div className="track-summary-meta">
                  {request.documentType === 'Course Description 1st Page' && (
                    <div className="track-summary-badges">
                      <span className="track-summary-badge">
                        Succeeding Pages: {request.succeedingPages ?? '-'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="track-summary-right">
                {needsPayment && (
                  <button
                    className="track-proceed-btn"
                    type="button"
                    onClick={() =>
                      navigate(`/payment?requestId=${encodeURIComponent(request._id)}`, {
                        state: { request },
                      })
                    }
                  >
                    PROCEED TO PAYMENT
                  </button>
                )}
                <div className="track-status-row">
                  <span className={`track-status-pill ${isPaid ? 'paid' : 'unpaid'}`}>
                    <CircleDollarSign size={15} strokeWidth={2.2} />
                    {isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                  <span className={`track-status-pill ${statusClass}`}>
                    <Clock3 size={15} strokeWidth={2.2} />
                    {statusLabel}
                  </span>
                </div>
              </div>
            </section>

            <section className="track-card track-progress-card">
              <div className="track-card-head">
                <h3>Request Progress</h3>
                <p>Track the status of your document request</p>
              </div>

              <div className="track-bar">
                <div className="track-bar-fill" style={{ width: progressPercent }} />
              </div>

              <div className="track-steps" data-status={statusKey}>
                <div className={`track-step ${activeStep === 1 ? 'active' : ''}`} data-step="pending">
                  <div className="track-step-icon">
                    <CircleDollarSign size={64} strokeWidth={2.2} />
                  </div>
                  <div className="track-step-label">Waiting for Payment</div>
                </div>

                <div className={`track-step ${activeStep === 2 ? 'active' : ''}`} data-step="processing">
                  <div className="track-step-icon">
                    <Clock3 size={64} strokeWidth={2.2} />
                  </div>
                  <div className="track-step-label">Processing</div>
                </div>

                <div className={`track-step ${activeStep === 3 ? 'active' : ''}`} data-step="ready">
                  <div className="track-step-icon">
                    <PackageOpen size={64} strokeWidth={2.2} />
                  </div>
                  <div className="track-step-label">Ready for<br />Pickup / Delivery</div>
                </div>

                <div className={`track-step ${activeStep === 4 ? 'active' : ''}`} data-step="released">
                  <div className="track-step-icon">
                    <ClipboardCheck size={64} strokeWidth={2.2} />
                  </div>
                  <div className="track-step-label">Released</div>
                </div>
              </div>
            </section>

            <section className="track-card track-details-card">
              <div className="track-details-top">
                <h3>Request Details</h3>
              </div>

              <div className="track-details-grid top-grid">
                <div className="detail-block">
                  <div className="detail-label">
                    <UserRound size={16} strokeWidth={2.2} />
                    <span>Requested By</span>
                  </div>
                  <div className="detail-value strong">{request.full_name || '-'}</div>
                  <div className="detail-sub">{request.email || '-'}</div>
                </div>

                <div className="detail-block">
                  <div className="detail-label">
                    <CalendarDays size={16} strokeWidth={2.2} />
                    <span>Request Date</span>
                  </div>
                  <div className="detail-value strong">{formatDateTime(request.createdAt)}</div>
                </div>

                <div className="detail-block">
                  <div className="detail-label">
                    <MapPin size={16} strokeWidth={2.2} />
                    <span>Delivery Method</span>
                  </div>
                  <div className="detail-value strong">{formatDeliveryMethod(request.deliveryMethod)}</div>
                </div>
              </div>

              <div className="track-divider" />

              <div className="track-details-grid bottom-grid">
                <div className="detail-block">
                  <div className="detail-label">Document Type</div>
                  <div className="detail-value strong">{request.documentType || '-'}</div>

                  <div className="detail-label small-gap">Purpose</div>
                  <div className="detail-value strong">{request.purpose || '-'}</div>

                </div>

                <div className="detail-block">
                  <div className="detail-label">Number of Copies</div>
                  <div className="detail-value strong">{request.copies ?? '-'}</div>

                  <div className="detail-label small-gap">Total Fee</div>
                  <div className="detail-value strong">{formatCurrency(request.totalFee)}</div>
                </div>

                <div className="detail-block">
                  <div className="detail-label">Tracking Number</div>
                  <div className="detail-value strong">{request.trackingNumber || '-'}</div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default DocumentTracking;
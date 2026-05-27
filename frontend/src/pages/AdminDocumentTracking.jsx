import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/AdminDocumentTracking.css';
import {
  FileText,
  PackageOpen,
  Search,
  ChevronRight,
  RotateCcw,
  RefreshCw,
  ClipboardCheck,
  UserRound,
  CalendarDays,
  Truck,
  Hash,
  Copy,
  DollarSign,
} from 'lucide-react';
import { API_BASE, authHeaders, formatPhp } from '../api';
import AdminShell from '../components/AdminShell';

const STATUS_FLOW = [
  {
    key: 'pending',
    label: 'Pending',
    className: 'waiting',
    icon: RotateCcw,
  },
  {
    key: 'processing',
    label: 'Processing',
    className: 'processing',
    icon: RefreshCw,
  },
  {
    key: 'ready',
    label: 'Ready for Pickup / Delivery',
    className: 'ready',
    icon: PackageOpen,
  },
  {
    key: 'released',
    label: 'Released',
    className: 'completed',
    icon: ClipboardCheck,
  },
];

const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  'ready for pickup': 'Ready for Pickup',
  'out for delivery': 'Out for Delivery',
  released: 'Released',
  completed: 'Released',
};

const STATUS_FLOW_BY_METHOD = {
  pickup: ['Pending', 'Processing', 'Ready for Pickup', 'Released'],
  delivery: ['Pending', 'Processing', 'Out for Delivery', 'Released'],
};

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const toTitleCase = (value) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

const getStatusStepKey = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'processing') return 'processing';
  if (normalized === 'ready for pickup' || normalized === 'out for delivery') return 'ready';
  if (normalized === 'released' || normalized === 'completed') return 'released';
  return 'pending';
};

const getStatusLabel = (status) => {
  const normalized = normalizeStatus(status);
  return toTitleCase(STATUS_LABELS[normalized] || status || '-');
};

const getStatusClass = (status) => {
  const stepKey = getStatusStepKey(status);
  if (stepKey === 'processing') return 'processing';
  if (stepKey === 'ready') return 'ready';
  if (stepKey === 'released') return 'completed';
  return 'waiting';
};

const getNextStatus = (status, deliveryMethod) => {
  const method = String(deliveryMethod || '').trim().toLowerCase() === 'delivery'
    ? 'delivery'
    : 'pickup';
  const flow = STATUS_FLOW_BY_METHOD[method];
  const normalized = normalizeStatus(status);
  const currentIndex = flow.findIndex(
    (value) => normalizeStatus(value) === normalized
  );

  if (currentIndex < 0 || currentIndex >= flow.length - 1) return null;
  return flow[currentIndex + 1];
};

const getPreviousStatus = (status, deliveryMethod) => {
  const method = String(deliveryMethod || '').trim().toLowerCase() === 'delivery'
    ? 'delivery'
    : 'pickup';
  const flow = STATUS_FLOW_BY_METHOD[method];
  const normalized = normalizeStatus(status);
  const currentIndex = flow.findIndex(
    (value) => normalizeStatus(value) === normalized
  );

  if (currentIndex <= 0) return null;
  return flow[currentIndex - 1];
};

const getTrackingNumber = (request) => {
  if (String(request?.deliveryMethod || '').trim().toLowerCase() === 'pickup') {
    return 'N/A';
  }

  return request?.trackingNumber || request?._id || 'N/A';
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDeliveryMethod = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  return normalized === 'delivery' ? 'Delivery' : 'Pickup';
};

const MetaCell = ({ icon: Icon, label, primary, secondary, className = '' }) => (
  <div className={`detail-cell ${className}`.trim()}>
    <Icon className="detail-cell-icon" size={20} strokeWidth={2.1} />
    <div className="detail-cell-copy">
      <span className="detail-cell-label">{label}</span>
      <strong className="detail-cell-primary">{primary}</strong>
      {secondary ? <span className="detail-cell-secondary">{secondary}</span> : null}
    </div>
  </div>
);

const AdminDocumentTracking = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');
  const [confirmTargetStatus, setConfirmTargetStatus] = useState('');
  const autoSelectRef = useRef(null);
  const requestIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('id');
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/requests`, {
          headers: authHeaders(false),
        });
        const data = await res.json();

        if (!res.ok) {
          if (!cancelled) {
            setLoadError(data.message || 'Could not load requests.');
          }
          return;
        }

        if (!cancelled) {
          setRequests(data.requests || []);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError('Cannot reach the server.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedRequestId) return;
    const stillExists = requests.some((item) => item._id === selectedRequestId);
    if (!stillExists) {
      setSelectedRequestId(null);
    }
  }, [requests, selectedRequestId]);

  useEffect(() => {
    if (!requestIdFromQuery || loading) return;
    if (autoSelectRef.current === requestIdFromQuery) return;

    const match = requests.find((item) => item._id === requestIdFromQuery);
    if (match) {
      setSelectedRequestId(match._id);
    }
    autoSelectRef.current = requestIdFromQuery;
  }, [requestIdFromQuery, requests, loading]);

  useEffect(() => {
    setStatusMessage('');
    setStatusIsError(false);
    setShowToast(false);
    setConfirmOpen(false);
    setConfirmAction('');
    setConfirmTargetStatus('');
  }, [selectedRequestId]);

  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return requests;

    return requests.filter((item) => {
      const haystack = [
        item.documentType,
        item.full_name,
        item.email,
        item.trackingNumber,
        item._id,
      ];
      return haystack.some((value) =>
        String(value || '').toLowerCase().includes(q)
      );
    });
  }, [searchTerm, requests]);

  const selectedRequest = useMemo(() => {
    return requests.find((item) => item._id === selectedRequestId) || null;
  }, [requests, selectedRequestId]);

  const activeStatusIndex = useMemo(() => {
    if (!selectedRequest) return 0;
    const stepKey = getStatusStepKey(selectedRequest.status);
    const idx = STATUS_FLOW.findIndex((step) => step.key === stepKey);
    return idx >= 0 ? idx : 0;
  }, [selectedRequest]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    if (filteredRequests.length === 1) {
      setSelectedRequestId(filteredRequests[0]._id);
    }
  };

  const openConfirm = (action, targetStatus) => {
    if (!selectedRequest || !targetStatus) return;
    setConfirmAction(action);
    setConfirmTargetStatus(targetStatus);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmAction('');
    setConfirmTargetStatus('');
  };

  const applyStatusChange = async (targetStatus) => {
    if (!selectedRequest || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    setStatusIsError(false);
    setStatusMessage('');

    try {
      const res = await fetch(
        `${API_BASE}/api/requests/${encodeURIComponent(selectedRequest._id)}`,
        {
          method: 'PATCH',
          headers: authHeaders(true),
          body: JSON.stringify({ status: targetStatus }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setStatusIsError(true);
        setStatusMessage(data.message || 'Failed to update status.');
        return;
      }

      setRequests((prev) =>
        prev.map((item) => (item._id === selectedRequest._id ? data.request : item))
      );
      setShowToast(true);
    } catch (err) {
      setStatusIsError(true);
      setStatusMessage('Cannot connect to server.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAdvanceStatus = () => {
    const target = getNextStatus(selectedRequest?.status, selectedRequest?.deliveryMethod);
    if (!target) return;
    openConfirm('advance', target);
  };

  const handleRollbackStatus = () => {
    const target = getPreviousStatus(selectedRequest?.status, selectedRequest?.deliveryMethod);
    if (!target) return;
    openConfirm('rollback', target);
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmTargetStatus) return;
    await applyStatusChange(confirmTargetStatus);
    closeConfirm();
  };

  useEffect(() => {
    if (!showToast) return undefined;

    const timer = setTimeout(() => {
      setShowToast(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, [showToast, selectedRequestId]);

  const nextStatus = selectedRequest
    ? getNextStatus(selectedRequest.status, selectedRequest.deliveryMethod)
    : null;
  const previousStatus = selectedRequest
    ? getPreviousStatus(selectedRequest.status, selectedRequest.deliveryMethod)
    : null;
  const progressWidth = selectedRequest
    ? `${((activeStatusIndex + 1) / STATUS_FLOW.length) * 100}%`
    : `${(1 / STATUS_FLOW.length) * 100}%`;

  return (
    <AdminShell>
      <main className="admin-main">
          <section className="tracking-header">
            <h1>DOCUMENT TRACKING</h1>
            {!selectedRequest && (
              <p>Search and track document requests by tracking number</p>
            )}
          </section>

          {!selectedRequest ? (
            <>
              <section className="tracking-search-card">
                <form className="tracking-search-wrap" onSubmit={handleSearchSubmit}>
                  <div className="tracking-search-input-wrap">
                    <Search className="tracking-search-icon" size={26} strokeWidth={2.2} />
                    <input
                      type="text"
                      className="tracking-search-input"
                      placeholder="Search by name, email, tracking number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="tracking-search-btn">
                    Search
                  </button>
                </form>
              </section>

              <section className="tracking-list-section">
                <h2>Recent Document Requests</h2>

                <div className="tracking-list">
                  {loading && (
                    <div className="tracking-empty-card">Loading requests...</div>
                  )}
                  {!loading && loadError && (
                    <div className="tracking-empty-card error">{loadError}</div>
                  )}
                  {!loading && !loadError && filteredRequests.length > 0 ? (
                    filteredRequests.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        className="tracking-card tracking-card-button"
                        onClick={() => setSelectedRequestId(item._id)}
                      >
                        <div className="tracking-card-left">
                          <div className="tracking-card-icon">
                            <FileText size={28} strokeWidth={2.1} />
                          </div>

                          <div className="tracking-card-text">
                            <strong>{item.documentType || 'Document request'}</strong>
                            <span>
                              {(item.full_name || 'Unknown')} - {getTrackingNumber(item)}
                            </span>
                          </div>
                        </div>

                        <div className={`tracking-status-pill ${getStatusClass(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </div>
                      </button>
                    ))
                  ) : null}
                  {!loading && !loadError && filteredRequests.length === 0 && (
                    <div className="tracking-empty-card">
                      No matching requests found.
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="tracking-detail-view">
              <button
                type="button"
                className="tracking-back-btn"
                onClick={() => setSelectedRequestId(null)}
              >
                &lsaquo; Back to list
              </button>

              <section className="detail-summary-card">
                <div className="detail-summary-left">
                  <div className="detail-summary-icon">
                    <FileText size={34} strokeWidth={2.1} />
                  </div>

                  <div className="detail-summary-copy">
                    <h2>{selectedRequest.documentType || 'Document request'}</h2>
                    <p>Tracking #: {getTrackingNumber(selectedRequest)}</p>
                    <p>Request Date: {formatDate(selectedRequest.createdAt)}</p>
                  </div>
                </div>

                <div className={`tracking-status-pill detail-status-pill ${getStatusClass(selectedRequest.status)}`}>
                  {getStatusLabel(selectedRequest.status)}
                </div>
              </section>

              <section className="detail-progress-card">
                <div className="detail-progress-header">
                  <div>
                    <h3>Request Progress</h3>
                    <p>Track the status of your document request</p>
                  </div>

                  <div className="detail-progress-actions">
                    <button
                      type="button"
                      className="rollback-status-btn"
                      onClick={handleRollbackStatus}
                      disabled={!previousStatus || isUpdatingStatus}
                    >
                      Step Back
                    </button>
                    <button
                      type="button"
                      className="advance-status-btn"
                      onClick={handleAdvanceStatus}
                      disabled={!nextStatus || isUpdatingStatus}
                    >
                      {isUpdatingStatus ? 'UPDATING...' : 'ADVANCE STATUS'}
                      <ChevronRight size={18} strokeWidth={2.6} />
                    </button>
                  </div>
                </div>

                <div className="detail-progress-track">
                  <div className="detail-progress-fill" style={{ width: progressWidth }} />
                </div>

                {statusIsError && statusMessage && (
                  <p className="status-error" role="alert">{statusMessage}</p>
                )}

                <div className="status-steps">
                  {STATUS_FLOW.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === activeStatusIndex;

                    return (
                      <div
                        key={step.key}
                        className={`status-step ${step.className} ${isActive ? 'active' : ''}`}
                      >
                        <div className="status-step-icon">
                          <Icon size={isActive ? 58 : 48} strokeWidth={2.2} />
                        </div>
                        <div className="status-step-label">{step.label}</div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="detail-details-card">
                <h3>Request Details</h3>

                <div className="detail-row-grid">
                  <MetaCell
                    icon={UserRound}
                    label="Requested By"
                    primary={selectedRequest.full_name || '-'}
                    secondary={selectedRequest.email}
                  />
                  <MetaCell
                    icon={CalendarDays}
                    label="Request Date"
                    primary={formatDateTime(selectedRequest.createdAt)}
                  />
                  <MetaCell
                    icon={Truck}
                    label="Delivery Method"
                    primary={formatDeliveryMethod(selectedRequest.deliveryMethod)}
                  />
                </div>

                <div className="detail-row-divider" />

                <div className="detail-row-grid">
                  <MetaCell
                    icon={FileText}
                    label="Document Type"
                    primary={selectedRequest.documentType || '-'}
                  />
                  <MetaCell
                    icon={Copy}
                    label="Number of Copies"
                    primary={String(selectedRequest.copies ?? 1)}
                  />
                  <MetaCell
                    icon={Hash}
                    label="Tracking Number"
                    primary={getTrackingNumber(selectedRequest)}
                  />
                </div>

                <div className="detail-row-divider" />

                <div className="detail-row-grid detail-row-grid-last">
                  <MetaCell
                    icon={DollarSign}
                    label="Purpose"
                    primary={selectedRequest.purpose || '-'}
                  />
                  <MetaCell
                    icon={DollarSign}
                    label="Document Fee"
                    primary={formatPhp(selectedRequest.totalFee)}
                  />
                  <div className="detail-cell detail-cell-empty" aria-hidden="true" />
                </div>

                {showToast && (
                  <div className="status-toast">
                    <span className="status-toast-icon">✓</span>
                    <span>Status updated successfully</span>
                  </div>
                )}
              </section>
            </section>
          )}
      </main>

      {confirmOpen && selectedRequest && (
        <div className="status-modal-backdrop" role="dialog" aria-modal="true">
          <div className="status-modal">
            <div className="status-modal-header">
              <h4>{confirmAction === 'rollback' ? 'Step Back Status' : 'Advance Status'}</h4>
              <p>Confirm the status update for this request.</p>
            </div>

            <div className="status-modal-meta">
              <div className="status-modal-row">
                <span className="status-modal-label">Current</span>
                <span className="status-modal-value">{getStatusLabel(selectedRequest.status)}</span>
              </div>
              <div className="status-modal-row">
                <span className="status-modal-label">Target</span>
                <span className="status-modal-value">{getStatusLabel(confirmTargetStatus)}</span>
              </div>
            </div>

            <div className="status-modal-actions">
              <button type="button" className="status-modal-cancel" onClick={closeConfirm}>
                Cancel
              </button>
              <button
                type="button"
                className={`status-modal-confirm ${confirmAction === 'rollback' ? 'rollback' : 'advance'}`}
                onClick={handleConfirmStatusChange}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default AdminDocumentTracking;
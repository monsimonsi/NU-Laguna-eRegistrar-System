import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search } from 'lucide-react';
import { API_BASE, authHeaders } from '../api';
import StudentShell from '../components/StudentShell';
import '../styles/RequestTracking.css';

const PAYMENT_OPTIONS = [
  { value: '', label: 'All Payments' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
];

const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  ready: 'Ready for Pickup',
  'ready for pickup': 'Ready for Pickup',
  'out for delivery': 'Out for Delivery',
  released: 'Released',
  completed: 'Released',
};

const STATUS_ORDER = {
  pending: 0,
  processing: 1,
  'ready for pickup': 2,
  'out for delivery': 3,
  released: 4,
  completed: 4,
};

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const getStatusLabel = (status) => {
  const normalized = normalizeStatus(status);
  return STATUS_LABELS[normalized] || String(status || '-');
};

const getTrackingLabel = (request) => {
  if (String(request?.deliveryMethod || '').trim().toLowerCase() === 'pickup') {
    return 'N/A';
  }

  return request?.trackingNumber || 'N/A';
};

const getStatusCellClass = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'processing') return 'request-track-status-pill processing';
  if (normalized === 'pending') return 'request-track-status-pill pending';
  if (normalized === 'ready' || normalized === 'ready for pickup' || normalized === 'out for delivery') {
    return 'request-track-status-pill ready';
  }
  if (normalized === 'released' || normalized === 'completed') return 'request-track-status-pill completed';
  return 'request-track-status-pill pending';
};

const getPaymentCellClass = (paymentConfirmed) =>
  paymentConfirmed ? 'request-track-status-pill payment-paid' : 'request-track-status-pill payment-unpaid';

const RequestTracking = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [documentFilter, setDocumentFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/me/requests`, {
          headers: authHeaders(false),
        });
        const data = await res.json();

        if (!res.ok) {
          if (!cancelled) setError(data.message || 'Could not load requests.');
          return;
        }

        if (!cancelled) setRequests(data.requests || []);
      } catch {
        if (!cancelled) setError('Cannot reach the server.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const documentOptions = useMemo(() => {
    const uniqueDocuments = new Set();
    requests.forEach((request) => {
      if (request.documentType) uniqueDocuments.add(request.documentType);
    });
    return Array.from(uniqueDocuments).sort((a, b) => a.localeCompare(b));
  }, [requests]);

  const statusOptions = useMemo(() => {
    const uniqueStatuses = new Map();
    requests.forEach((request) => {
      const normalized = normalizeStatus(request.status);
      if (!normalized) return;
      if (!uniqueStatuses.has(normalized)) {
        uniqueStatuses.set(normalized, getStatusLabel(request.status));
      }
    });
    return Array.from(uniqueStatuses.entries())
      .sort(([left], [right]) => (STATUS_ORDER[left] ?? 99) - (STATUS_ORDER[right] ?? 99))
      .map(([value, label]) => ({ value, label }));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const documentValue = documentFilter.trim();
    const paymentValue = paymentFilter.trim();
    const statusValue = statusFilter.trim();

    return requests.filter((request) => {
      const matchesDocument = documentValue ? request.documentType === documentValue : true;
      const matchesPayment = paymentValue
        ? paymentValue === 'paid'
          ? request.paymentConfirmed
          : !request.paymentConfirmed
        : true;
      const matchesStatus = statusValue ? normalizeStatus(request.status) === statusValue : true;

      if (!term) return matchesDocument && matchesPayment && matchesStatus;

      const haystack = [
        request.trackingNumber,
        request.documentType,
        request.paymentConfirmed ? 'paid' : 'unpaid',
        getStatusLabel(request.status),
        request.status,
        request.createdAt,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesDocument && matchesPayment && matchesStatus && haystack.includes(term);
    });
  }, [documentFilter, paymentFilter, requests, searchTerm, statusFilter]);

  const formatRequestedDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  return (
    <StudentShell activeItem="track">
      <main className="doc-main request-tracking-main">

        <div className="request-tracking-back-row">
          <button
            type="button"
            className="request-tracking-back-link doc-back-button"
            onClick={() => navigate('/dashboard')}
            aria-label="Back to dashboard"
          >
            &lsaquo; Back to Dashboard
          </button>
        </div>

        <section className="doc-card request-tracking-card">
          <div className="doc-card-header request-tracking-header">
            <FileText className="doc-card-icon request-tracking-icon" size={40} strokeWidth={2.1} />
            <div>
              <h1>My Document Requests</h1>
              <p>Search and track every request in one view.</p>
            </div>
          </div>

          <div className="request-controls">
            <label className="request-search">
              <span>Search</span>
              <div className="request-search-input-wrap">
                <Search size={18} strokeWidth={2.2} className="request-search-icon" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search tracking number, document, payment, or status"
                />
              </div>
            </label>

            <label className="request-filter">
              <span>Document</span>
              <select value={documentFilter} onChange={(event) => setDocumentFilter(event.target.value)}>
                <option value="">All documents</option>
                {documentOptions.map((documentType) => (
                  <option key={documentType} value={documentType}>
                    {documentType}
                  </option>
                ))}
              </select>
            </label>

            <label className="request-filter">
              <span>Payment</span>
              <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
                {PAYMENT_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="request-filter">
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="request-summary">
            <span>
              {filteredRequests.length} request{filteredRequests.length === 1 ? '' : 's'} found
            </span>
          </div>

          {loading && <p className="request-state request-state-loading">Loading requests...</p>}
          {error && <p className="request-state request-state-error">{error}</p>}

          {!loading && !error && requests.length === 0 && (
            <p className="request-state request-state-empty">You have no requests yet.</p>
          )}

          {!loading && !error && requests.length > 0 && (
            <div className="table-wrap request-table-wrap">
              <table className="request-table request-tracking-table">
                <thead>
                  <tr>
                    <th>Tracking #</th>
                    <th>Document</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td className="request-table-empty" colSpan={5}>
                        No requests match your search and filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
                      <tr
                        key={request._id}
                        className="request-row"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          navigate(`/document-tracking?id=${encodeURIComponent(request._id)}`)
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/document-tracking?id=${encodeURIComponent(request._id)}`);
                          }
                        }}
                      >
                        <td className="request-tracking-cell">{getTrackingLabel(request)}</td>
                        <td>{request.documentType || '—'}</td>
                        <td>
                          <span className={getPaymentCellClass(request.paymentConfirmed)}>
                            {request.paymentConfirmed ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td>
                          <span className={getStatusCellClass(request.status)}>
                            {getStatusLabel(request.status)}
                          </span>
                        </td>
                        <td>{formatRequestedDate(request.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </StudentShell>
  );
};

export default RequestTracking;

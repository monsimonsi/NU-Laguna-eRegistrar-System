import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Dashboard.css'
import StudentShell from '../components/StudentShell'
import { API_BASE, authHeaders } from '../api'
import pluslogo from '../assets/plus-icon.png'

function App() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const STATUS_OPTIONS = [
    'Waiting for Payment',
    'Pending',
    'Processing',
    'Ready for Pickup',
    'Out for Delivery',
    'Released'
  ];

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch (err) {
      return null;
    }
  };

  const fetchRequests = useCallback(async () => {
    const user = getUser();
    if (!user || !user.email) {
      setError('You must be logged in to view your requests.');
      setRequests([]);
      return;
    }

    setIsLoading(true);
    setError('');
    setActionError('');

    try {
      const res = await fetch(`${API_BASE}/api/me/requests`, {
        headers: authHeaders(false)
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to load requests.');
        setRequests([]);
        return;
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      setError('Cannot connect to server.');
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const stats = useMemo(() => {
    const base = {
      total: requests.length,
      'Waiting for Payment': 0,
      Pending: 0,
      Processing: 0,
      'Ready for Pickup': 0,
      'Out for Delivery': 0,
      Released: 0
    };

    requests.forEach((req) => {
      const status = req.status === 'Completed' ? 'Released' : req.status;
      if (base[status] !== undefined) {
        base[status] += 1;
      }
    });

    return base;
  }, [requests]);

  const selectedRequest = useMemo(
    () => requests.find((req) => req._id === selectedRequestId) || null,
    [requests, selectedRequestId]
  );

  const filteredRequests = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    const status = String(statusFilter || '').trim();

    return requests.filter((req) => {
      const matchesStatus = status ? req.status === status : true;
      if (!term) return matchesStatus;

      const haystack = [req._id, req.documentType, req.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && haystack.includes(term);
    });
  }, [requests, searchTerm, statusFilter]);

    useEffect(() => {
      if (selectedRequestId && !requests.some((req) => req._id === selectedRequestId)) {
        setSelectedRequestId('');
      }
    }, [requests, selectedRequestId]);

    useEffect(() => {
      if (selectedRequestId && !filteredRequests.some((req) => req._id === selectedRequestId)) {
        setSelectedRequestId('');
      }
    }, [filteredRequests, selectedRequestId]);

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
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
    return normalized === 'delivery' ? 'Delivery (₱150 fee)' : 'Pickup';
  };

  const formatDocumentFee = (request) => {
    const base = Number(request?.basePrice);
    const extra = Number(request?.succeedingPagesFee);
    const hasBase = Number.isFinite(base);
    const hasExtra = Number.isFinite(extra);
    if (!hasBase && !hasExtra) return '-';
    const total = (hasBase ? base : 0) + (hasExtra ? extra : 0);
    return formatCurrency(total);
  };

  const formatSucceedingPages = (value) => {
    const pages = Number(value);
    if (!Number.isFinite(pages)) return '-';
    return pages;
  };

  const handleSelectRequest = (requestId) => {
    setSelectedRequestId((current) => (current === requestId ? '' : requestId));
    setActionError('');
  };

  const handleViewDetails = () => {
    if (!selectedRequestId) return;
    navigate(`/document-tracking?id=${encodeURIComponent(selectedRequestId)}`);
  };

  const handleDeleteClick = () => {
    if (!selectedRequest) return;
    if (String(selectedRequest.status || '').trim() !== 'Waiting for Payment') {
      setActionError('Only waiting-for-payment requests can be deleted.');
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRequest) return;

    setIsDeleting(true);
    setActionError('');

    try {
      const res = await fetch(
        `${API_BASE}/api/requests/${encodeURIComponent(selectedRequest._id)}`,
        {
          method: 'DELETE',
          headers: authHeaders(false)
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.message || 'Failed to delete request.');
        return;
      }

      setRequests((prev) => prev.filter((req) => req._id !== selectedRequest._id));
      setSelectedRequestId('');
      setIsConfirmOpen(false);
    } catch (err) {
      setActionError('Cannot connect to server.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsConfirmOpen(false);
  };

  const isViewDisabled = !selectedRequest;
  const isDeleteDisabled =
    !selectedRequest ||
    String(selectedRequest.status || '').trim() !== 'Waiting for Payment' ||
    isDeleting;

  return (
    <StudentShell>
        <main className="dashboard-wrapper" key="dashboard">
          <div className="dashboard-header-row">
            <h2 className="page-title">Document Requests Dashboard</h2>
            <button className="new-request-btn" onClick={() => navigate('/document-request')}>
              <img src={pluslogo} alt="Plus Logo" className="btn-plus-asset" />
              <span className="new-request-label">REQUEST A DOCUMENT</span>
            </button>
          </div>

          <div className="status-grid">
            <div className="stat-card"><span className="stat-label">Total Requests</span><span className="stat-value blue">{stats.total}</span></div>
            <div className="stat-card"><span className="stat-label">Waiting for Payment</span><span className="stat-value red">{stats['Waiting for Payment']}</span></div>
            <div className="stat-card"><span className="stat-label">Pending</span><span className="stat-value red">{stats.Pending}</span></div>
            <div className="stat-card"><span className="stat-label">Processing</span><span className="stat-value orange">{stats.Processing}</span></div>
            <div className="stat-card"><span className="stat-label">Ready for Pickup</span><span className="stat-value green">{stats['Ready for Pickup']}</span></div>
            <div className="stat-card"><span className="stat-label">Out for Delivery</span><span className="stat-value teal">{stats['Out for Delivery']}</span></div>
            <div className="stat-card"><span className="stat-label">Released</span><span className="stat-value yellow">{stats.Released}</span></div>
          </div>

          <div className="table-controls-row">
            <div className="control-item">
              <label>Search:</label>
              <input
                type="text"
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search requests"
              />
            </div>
            <div className="control-item">
              <label>Filter by:</label>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-outer-card">
            <div className="table-scroll-area">
              <table className="main-table">
                <thead>
                  <tr>
                    <th className="check-column-head">Select</th>
                    <th>Date Requested</th>
                    <th>Document Type</th>
                    <th>Document Fee</th>
                    <th>Succeeding Pages</th>
                    <th>Copies</th>
                    <th>Delivery Method</th>
                    <th>Total Fee</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td className="table-loading" colSpan="10">Loading requests...</td>
                    </tr>
                  )}
                  {!isLoading && error && (
                    <tr>
                      <td className="table-error" colSpan="10">{error}</td>
                    </tr>
                  )}
                  {!isLoading && !error && filteredRequests.length === 0 && (
                    <tr>
                      <td className="table-empty" colSpan="10">No requests found.</td>
                    </tr>
                  )}
                  {!isLoading && !error && filteredRequests.map((req) => (
                    <tr key={req._id} className={req._id === selectedRequestId ? 'selected-row' : ''}>
                      <td className="check-column-cell">
                        <input
                          type="checkbox"
                          aria-label="Select request"
                          checked={selectedRequestId === req._id}
                          onChange={() => handleSelectRequest(req._id)}
                        />
                      </td>
                      <td>{formatDate(req.createdAt)}</td>
                      <td>{req.documentType || '-'}</td>
                      <td>{formatDocumentFee(req)}</td>
                      <td>{formatSucceedingPages(req.succeedingPages)}</td>
                      <td>{req.copies ?? '-'}</td>
                      <td>{formatDeliveryMethod(req.deliveryMethod)}</td>
                      <td>{formatCurrency(req.totalFee)}</td>
                      <td>
                        {req.paymentConfirmed ? (
                          <span className="payment-tag paid">Paid</span>
                        ) : (
                          <span className="payment-tag unpaid">Unpaid</span>
                        )}
                      </td>
                      <td>{req.status === 'Completed' ? 'Released' : req.status || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* New Action Buttons Section */}
          <div className="dashboard-footer-actions">
            <div className="action-left">
              <div className="action-note">Select a request to enable View Details or Delete.</div>
              {actionError && <div className="action-error" role="alert">{actionError}</div>}
            </div>
            {/* Wrap the right-side buttons in a sub-container */}
            <div className="right-actions">
              <button
                className="action-btn view-btn"
                onClick={handleViewDetails}
                disabled={isViewDisabled}
              >
                VIEW DETAILS
              </button>
              <button
                className="action-btn delete-btn"
                onClick={handleDeleteClick}
                disabled={isDeleteDisabled}
              >
                {isDeleting ? 'DELETING...' : 'DELETE'}
              </button>
            </div>
          </div>
          {isConfirmOpen && (
            <div className="confirm-overlay" onClick={handleCancelDelete}>
              <div className="confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <h3 className="confirm-title">Delete this request?</h3>
                <p className="confirm-text">
                  This will remove the request from your list. You can only delete waiting-for-payment requests.
                </p>
                <div className="confirm-actions">
                  <button className="confirm-btn cancel" type="button" onClick={handleCancelDelete}>
                    Cancel
                  </button>
                  <button
                    className="confirm-btn delete"
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
    </StudentShell>
  )
}

export default App

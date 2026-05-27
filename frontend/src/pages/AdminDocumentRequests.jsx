import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDocumentRequests.css';
import { Search } from 'lucide-react';
import { API_BASE, authHeaders } from '../api';
import AdminShell from '../components/AdminShell';

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
  ready: 2,
  'ready for pickup': 2,
  'out for delivery': 2,
  released: 3,
  completed: 3,
};

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();
const normalizeDeliveryMethod = (value) => String(value || '').trim().toLowerCase();

const getStatusLabel = (status) => {
  const normalized = normalizeStatus(status);
  return STATUS_LABELS[normalized] || String(status || '-');
};

const formatDeliveryMethod = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  return normalized === 'delivery' ? 'Delivery' : 'Pickup';
};

const formatSucceedingPages = (request) => {
  const docType = String(request?.documentType || '').trim();
  if (!docType) return '-';
  if (docType === 'Course Description 1st Page') {
    const value = request?.succeedingPages;
    if (Number.isFinite(Number(value))) return String(value);
    return '0';
  }
  return '-';
};

const formatRequestDate = (request) => {
  const raw = request?.createdAt || request?.requestDate;
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const matchesSearch = (request, query) => {
  if (!query) return true;
  const haystack = [
    request.full_name,
    request.student_id,
    request.studentNumber,
    request.email,
    request.documentType,
    request.trackingNumber,
    request.deliveryMethod,
    request.status,
    request.requestDate,
    request.createdAt,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return haystack.some((value) => value.includes(query));
};

const sortRequests = (list) =>
  list.slice().sort((a, b) => {
    const sa = STATUS_ORDER[normalizeStatus(a.status)] ?? 99;
    const sb = STATUS_ORDER[normalizeStatus(b.status)] ?? 99;
    if (sa !== sb) return sa - sb;
    const dateA = new Date(a.createdAt || a.requestDate || 0).getTime();
    const dateB = new Date(b.createdAt || b.requestDate || 0).getTime();
    return dateB - dateA;
  });

const shouldHideStatus = (status) => normalizeStatus(status) === 'waiting for payment';

const AdminDocumentRequests = () => {
  const navigate = useNavigate();
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');
  const [allSearchTerm, setAllSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/requests`, {
        headers: authHeaders(false),
      });
      const data = await res.json();

      if (res.ok) {
        setRequests(data.requests || []);
      } else {
        setLoadError(data.message || 'Failed to load document requests.');
      }
    } catch (err) {
      console.error('Failed to fetch requests', err);
      setLoadError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const visibleRequests = useMemo(
    () => requests.filter((item) => !shouldHideStatus(item.status)),
    [requests]
  );

  const nonPendingRequests = useMemo(
    () => visibleRequests.filter((item) => normalizeStatus(item.status) !== 'pending'),
    [visibleRequests]
  );

  const statusFilterOptions = useMemo(() => {
    const options = new Map();
    nonPendingRequests.forEach((item) => {
      const normalized = normalizeStatus(item.status);
      if (!normalized) return;
      if (!options.has(normalized)) {
        options.set(normalized, getStatusLabel(item.status));
      }
    });
    return Array.from(options.entries())
      .sort((a, b) => (STATUS_ORDER[a[0]] ?? 99) - (STATUS_ORDER[b[0]] ?? 99))
      .map(([value, label]) => ({ value, label }));
  }, [nonPendingRequests]);

  const documentTypeOptions = useMemo(() => {
    const options = new Set();
    nonPendingRequests.forEach((item) => {
      if (item.documentType) options.add(item.documentType);
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [nonPendingRequests]);

  const deliveryOptions = useMemo(() => {
    const options = new Map();
    nonPendingRequests.forEach((item) => {
      const normalized = normalizeDeliveryMethod(item.deliveryMethod);
      if (!normalized) return;
      if (!options.has(normalized)) {
        options.set(normalized, normalized === 'delivery' ? 'Delivery' : 'Pickup');
      }
    });
    return Array.from(options.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [nonPendingRequests]);

  const filteredPendingRequests = useMemo(() => {
    const q = pendingSearchTerm.trim().toLowerCase();
    const pendingOnly = visibleRequests.filter(
      (item) => normalizeStatus(item.status) === 'pending'
    );
    const matched = pendingOnly.filter((item) => matchesSearch(item, q));
    return sortRequests(matched);
  }, [pendingSearchTerm, visibleRequests]);

  const filteredAllRequests = useMemo(() => {
    const q = allSearchTerm.trim().toLowerCase();
    let list = nonPendingRequests;

    if (statusFilter !== 'all') {
      list = list.filter((item) => normalizeStatus(item.status) === statusFilter);
    }

    if (documentTypeFilter !== 'all') {
      list = list.filter((item) => item.documentType === documentTypeFilter);
    }

    if (deliveryFilter !== 'all') {
      list = list.filter(
        (item) => normalizeDeliveryMethod(item.deliveryMethod) === deliveryFilter
      );
    }

    const matched = list.filter((item) => matchesSearch(item, q));
    return sortRequests(matched);
  }, [
    allSearchTerm,
    nonPendingRequests,
    statusFilter,
    documentTypeFilter,
    deliveryFilter,
  ]);

  const statusPillClass = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'processing') return 'status-pill processing';
    if (
      normalized === 'ready' ||
      normalized === 'ready for pickup' ||
      normalized === 'out for delivery'
    ) {
      return 'status-pill ready';
    }
    if (normalized === 'released' || normalized === 'completed') return 'status-pill completed';
    return 'status-pill pending';
  };

  const handleRowClick = (id) => {
    if (!id) return;
    navigate(`/admin-document-tracking?id=${encodeURIComponent(id)}`);
  };

  const renderTableRows = (items, emptyMessage) => {
    if (loading) {
      return (
        <tr>
          <td colSpan={7} className="table-empty">
            Loading requests...
          </td>
        </tr>
      );
    }

    if (loadError) {
      return (
        <tr>
          <td colSpan={7} className="table-empty">
            {loadError}
          </td>
        </tr>
      );
    }

    if (items.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="table-empty">
            {emptyMessage}
          </td>
        </tr>
      );
    }

    return items.map((r) => (
      <tr
        key={r._id || r.trackingNumber}
        className="request-row"
        role="button"
        tabIndex={0}
        onClick={() => handleRowClick(r._id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleRowClick(r._id);
          }
        }}
      >
        <td>{formatRequestDate(r)}</td>
        <td>{r.full_name || '-'}</td>
        <td>{r.documentType || '-'}</td>
        <td>{r.copies ?? '-'}</td>
        <td>{formatSucceedingPages(r)}</td>
        <td>{formatDeliveryMethod(r.deliveryMethod)}</td>
        <td>
          <span className={statusPillClass(r.status)}>{getStatusLabel(r.status)}</span>
        </td>
      </tr>
    ));
  };

  return (
    <AdminShell>
      <main className="admin-main">
          <section className="requests-header">
            <h1>DOCUMENT REQUESTS</h1>
            <p>Monitor and approve incoming document requests.</p>
          </section>

          <section className="requests-table-card">
            <div className="requests-table-heading">
              <div className="requests-table-heading-top">
                <div className="table-heading-text">
                  <h2>Pending Document Requests</h2>
                  <p>
                    {loading
                      ? 'Loading...'
                      : `${filteredPendingRequests.length} requests found`}
                  </p>
                </div>
                <div className="table-search">
                  <Search className="table-search-icon" size={20} strokeWidth={2.2} />
                  <input
                    type="text"
                    className="table-search-input"
                    placeholder="Search pending requests..."
                    value={pendingSearchTerm}
                    onChange={(e) => setPendingSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="table-wrap">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Request Date</th>
                    <th>Name</th>
                    <th>Document Type</th>
                    <th>Copies</th>
                    <th>Succeeding Pages</th>
                    <th>Delivery Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {renderTableRows(filteredPendingRequests, 'No pending requests.')}
                </tbody>
              </table>
            </div>
          </section>

          <section className="requests-table-card">
            <div className="requests-table-heading">
              <div className="requests-table-heading-top">
                <div className="table-heading-text">
                  <h2>All Document Requests</h2>
                  <p>
                    {loading
                      ? 'Loading...'
                      : `${filteredAllRequests.length} requests found`}
                  </p>
                </div>
                <div className="table-search">
                  <Search className="table-search-icon" size={20} strokeWidth={2.2} />
                  <input
                    type="text"
                    className="table-search-input"
                    placeholder="Search all requests..."
                    value={allSearchTerm}
                    onChange={(e) => setAllSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="table-controls">
                <div className="select-wrap table-filter">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    {statusFilterOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="select-wrap table-filter">
                  <select
                    value={documentTypeFilter}
                    onChange={(e) => setDocumentTypeFilter(e.target.value)}
                  >
                    <option value="all">All Document Types</option>
                    {documentTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="select-wrap table-filter">
                  <select
                    value={deliveryFilter}
                    onChange={(e) => setDeliveryFilter(e.target.value)}
                  >
                    <option value="all">All Delivery Methods</option>
                    {deliveryOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="table-wrap">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Request Date</th>
                    <th>Name</th>
                    <th>Document Type</th>
                    <th>Copies</th>
                    <th>Succeeding Pages</th>
                    <th>Delivery Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {renderTableRows(
                    filteredAllRequests,
                    'No document requests found.'
                  )}
                </tbody>
              </table>
            </div>
          </section>
      </main>
    </AdminShell>
  );
};

export default AdminDocumentRequests;
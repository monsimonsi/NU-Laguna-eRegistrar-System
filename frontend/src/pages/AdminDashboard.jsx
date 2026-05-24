import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/AdminDashboard.css';
import logo from '../assets/NU_shield.png';
import {
  Menu,
  LayoutGrid,
  FileText,
  Users,
  LogOut,
  Clock3,
  BadgeCheck,
  UsersRound,
  PackageOpen,
} from 'lucide-react';
import { API_BASE, authHeaders, clearSession } from '../api';
import NotificationsPanel from '../components/NotificationsPanel';

const STAT_CONFIG = [
  { label: 'Total Document Requests', key: 'totalRequests', sub: 'All-Time', icon: <FileText size={16} strokeWidth={2.2} />, colorClass: 'violet' },
  { label: 'Pending Document Requests', key: 'pendingRequests', sub: 'Awaiting Action', icon: <Clock3 size={16} strokeWidth={2.2} />, colorClass: 'yellow' },
  { label: 'Approved Alumni', key: 'approvedAlumni', sub: 'Verified', icon: <BadgeCheck size={16} strokeWidth={2.2} />, colorClass: 'green' },
  { label: 'Pending Alumni', key: 'pendingAlumni', sub: 'Needs Verification', icon: <UsersRound size={16} strokeWidth={2.2} />, colorClass: 'orange' },
];

const formatDateShort = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const formatDeliveryMethod = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  return normalized === 'delivery' ? 'Delivery' : 'Pickup';
};

const formatRole = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '-';
  return normalized.toUpperCase();
};

const formatStatusTitle = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const requestsTableRef = useRef(null);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [requests, setRequests] = useState([]);
  const [alumniRegistrations, setAlumniRegistrations] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [alumniMessage, setAlumniMessage] = useState('');
  const [alumniIsError, setAlumniIsError] = useState(false);

  const isSidebarOpen = sidebarPinned || sidebarHover;
  const isDashboardActive = location.pathname === '/admin-dashboard';
  const isAlumniVerificationActive = location.pathname === '/admin-alumni-verification';
  const isDocumentTrackingActive = location.pathname === '/admin-document-tracking';

  const stats = STAT_CONFIG.map((item) => ({
    ...item,
    value:
      dashboardStats && dashboardStats[item.key] != null
        ? String(dashboardStats[item.key])
        : '—',
  }));

  const pendingAlumniList = alumniRegistrations.filter(
    (r) => r.verificationStatus === 'pending'
  );

  const fetchAdminStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: authHeaders(false),
      });
      const data = await res.json();
      if (res.ok) {
        setDashboardStats(data);
      } else {
        setLoadError(data.message || 'Failed to load dashboard stats.');
      }
    } catch (err) {
      console.error('Failed to fetch admin stats', err);
      setLoadError('Cannot connect to server.');
    }
  }, []);

  const fetchRequests = useCallback(async () => {
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
    }
  }, []);

  const fetchAlumniRegistrations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alumni-registrations`, {
        headers: authHeaders(false),
      });
      const data = await res.json();

      if (res.ok) {
        setAlumniRegistrations(data.registrations || []);
      } else {
        console.error('Failed to fetch alumni registrations', data.message);
      }
    } catch (err) {
      console.error('Failed to fetch alumni registrations', err);
      setLoadError('Cannot connect to server.');
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoadError('');
    await Promise.all([fetchAdminStats(), fetchRequests(), fetchAlumniRegistrations()]);
  }, [fetchAdminStats, fetchRequests, fetchAlumniRegistrations]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSidebarToggle = () => {
    setSidebarPinned((prev) => !prev);
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const getCurrentAdminId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.id || null;
    } catch (e) {
      return null;
    }
  };

  const updateAlumniStatus = async (id, newStatus) => {
    setAlumniMessage('');
    setAlumniIsError(false);

    let rejectionReason = '';
    if (newStatus === 'rejected') {
      const reason = window.prompt('Enter rejection reason');
      if (reason === null) return;

      rejectionReason = String(reason).trim();
      if (!rejectionReason) {
        setAlumniIsError(true);
        setAlumniMessage('Rejection reason is required.');
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/alumni-registrations/${id}`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({
          verificationStatus: newStatus,
          reviewedBy: getCurrentAdminId(),
          rejectionReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAlumniIsError(true);
        setAlumniMessage(data.message || 'Failed to update status.');
        return;
      }

      setAlumniRegistrations((prev) =>
        prev.map((r) => (r._id === id ? data.registration : r))
      );
      setAlumniIsError(false);
      setAlumniMessage('Verification status updated.');
      fetchAdminStats();
    } catch (err) {
      console.error('Update alumni status error', err);
      setAlumniIsError(true);
      setAlumniMessage('Cannot connect to server.');
    }
  };

  const statusPillClass = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized.includes('processing')) return 'status-pill processing';
    if (normalized.includes('ready')) return 'status-pill ready';
    if (normalized.includes('out for delivery')) return 'status-pill ready';
    if (normalized.includes('released') || normalized.includes('completed')) return 'status-pill completed';
    return 'status-pill pending';
  };

  return (
    <div className="admin-page">
      <aside
        className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}
        onMouseEnter={() => setSidebarHover(true)}
        onMouseLeave={() => setSidebarHover(false)}
      >
        <button
          className="sidebar-toggle"
          aria-label="Toggle sidebar"
          aria-expanded={isSidebarOpen}
          onClick={handleSidebarToggle}
        >
          <Menu size={26} strokeWidth={2.4} />
        </button>

        <div className="sidebar-brand">
          <img src={logo} alt="NU Logo" className="sidebar-brand-logo" />
          <div className="sidebar-brand-text">
            <span className="brand-line1">NU-LAGUNA</span>
            <span className="brand-line2">e-registrar</span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            <Users size={24} strokeWidth={2.2} />
          </div>
          <span className="sidebar-user-label">ADMIN</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${isDashboardActive ? 'active' : ''}`}
            aria-label="Dashboard"
            onClick={() => navigate('/admin-dashboard')}
          >
            <LayoutGrid size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Dashboard</span>
          </button>

          <button className="sidebar-link" aria-label="Requests">
            <FileText size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Requests</span>
          </button>

          <button
            className={`sidebar-link ${isAlumniVerificationActive ? 'active' : ''}`}
            aria-label="Alumni Verification"
            onClick={() => navigate('/admin-alumni-verification')}
          >
            <Users size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Alumni Verification</span>
          </button>

          <button
            className={`sidebar-link ${isDocumentTrackingActive ? 'active' : ''}`}
            aria-label="Document Tracking"
            onClick={() => navigate('/admin-document-tracking')}
          >
            <PackageOpen size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Document Tracking</span>
          </button>
        </nav>

        <button type="button" className="logout-btn" aria-label="Logout" onClick={handleLogout}>
          <LogOut size={20} strokeWidth={2.2} />
          <span className="sidebar-text">LOG OUT</span>
        </button>
      </aside>

      <div className="admin-shell">
        <header className="admin-topbar">
          <button type="button" className="admin-brand" onClick={() => navigate('/admin-dashboard')}>
            <img src={logo} alt="NU Logo" className="admin-logo" />
            <span className="admin-title">ADMIN DASHBOARD</span>
          </button>

          <div className="admin-topbar-actions">
            <NotificationsPanel />
          </div>
        </header>

        <main className="admin-main">
          <section className="dashboard-header">
            <h1>DASHBOARD</h1>
            <p>Welcome back! Everything is under your control.</p>
            {loadError && <p className="dashboard-load-error">{loadError}</p>}
          </section>

          <section className="dashboard-stats-grid">
            {stats.map((item) => (
              <article key={item.label} className={`stat-card ${item.colorClass}`}>
                <div className="stat-top">
                  <h2>{item.label}</h2>
                  <span className={`stat-mini-icon ${item.colorClass}`}>
                    {item.icon}
                  </span>
                </div>
                <div className="stat-value">{item.value}</div>
                <div className="stat-sub">{item.sub}</div>
              </article>
            ))}
          </section>

          <section className="panel-grid">
            <article className="panel-card alumni-panel">
              <div className="panel-header">
                <div>
                  <h3>Alumni Verification</h3>
                  <p>Pending Alumni Verification Requests</p>
                </div>
                <button
                  type="button"
                  className="view-all-btn"
                  onClick={() => navigate('/admin-alumni-verification')}
                >
                  View All
                </button>
              </div>

              <div className="request-list">
                {pendingAlumniList.map((item) => (
                  <div className="request-card-compact alumni-card" key={item._id}>
                    <div className="request-card-top">
                      <div className="request-card-title">
                        <strong>{item.full_name}</strong>
                        <span>Pending alumni verification request</span>
                      </div>
                      <div className="request-card-top-actions">
                        <span className={`status-pill ${item.verificationStatus}`}>
                          {String(item.verificationStatus || '').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="request-card-meta alumni-card-meta">
                      <div className="request-meta-item">
                        <span className="request-meta-label">Student ID</span>
                        <span className="request-meta-value">{item.student_id || '-'}</span>
                      </div>
                      <div className="request-meta-item">
                        <span className="request-meta-label">Course</span>
                        <span className="request-meta-value">{item.course || '-'}</span>
                      </div>
                      <div className="request-meta-item">
                        <span className="request-meta-label">Year Graduated</span>
                        <span className="request-meta-value">{item.year_graduated || '-'}</span>
                      </div>
                      <div className="request-meta-item">
                        <span className="request-meta-label">Status</span>
                        <span className="request-meta-value">{formatStatusTitle(item.verificationStatus)}</span>
                      </div>
                    </div>

                    <div className="request-actions">
                      <button
                        className="approve-btn"
                        onClick={() => updateAlumniStatus(item._id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => updateAlumniStatus(item._id, 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {pendingAlumniList.length === 0 && (
                  <div className="request-card request-card-empty">
                    <div className="request-info">
                      <strong>No pending alumni verification requests.</strong>
                    </div>
                  </div>
                )}
              </div>

              {alumniMessage && (
                <div className={`alumni-message ${alumniIsError ? 'error' : 'success'}`}>
                  {alumniMessage}
                </div>
              )}
            </article>

            <article className="panel-card request-panel">
              <div className="panel-header">
                <div>
                  <h3>Request Management</h3>
                  <p>Recent Document Requests</p>
                </div>
                <button
                  type="button"
                  className="view-all-btn"
                  onClick={() =>
                    requestsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  View All
                </button>
              </div>

              <div className="request-list request-list-small">
                {requests.map((r) => (
                  <div className="request-card-compact" key={r._id}>
                    <div className="request-card-top">
                      <div className="request-card-title">
                        <strong>{r.full_name || 'Unknown'}</strong>
                        <span>{formatRole(r.role)} - {r.email || '-'}</span>
                      </div>
                      <div className="request-card-top-actions">
                        <span className={`${statusPillClass(r.status)} status-pill-compact`}>
                          {r.status || 'Pending'}
                        </span>
                        <button
                          type="button"
                          className="request-view-btn"
                          onClick={() =>
                            navigate(`/admin-document-tracking?id=${encodeURIComponent(r._id)}`)
                          }
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                    <div className="request-card-meta">
                      <div className="request-meta-item">
                        <span className="request-meta-label">Document</span>
                        <span className="request-meta-value">{r.documentType || '-'}</span>
                      </div>
                      <div className="request-meta-item">
                        <span className="request-meta-label">Copies</span>
                        <span className="request-meta-value">{r.copies ?? 1}</span>
                      </div>
                      {r.documentType === 'Course Description 1st Page' && (
                        <div className="request-meta-item">
                          <span className="request-meta-label">Succeeding Pages</span>
                          <span className="request-meta-value">{r.succeedingPages ?? 0}</span>
                        </div>
                      )}
                      <div className="request-meta-item">
                        <span className="request-meta-label">Delivery</span>
                        <span className="request-meta-value">{formatDeliveryMethod(r.deliveryMethod)}</span>
                      </div>
                      <div className="request-meta-item">
                        <span className="request-meta-label">Tracking #</span>
                        <span className="request-meta-value">{r.trackingNumber || r._id || '—'}</span>
                      </div>
                      <div className="request-meta-item">
                        <span className="request-meta-label">Requested</span>
                        <span className="request-meta-value">{formatDateShort(r.createdAt)}</span>
                      </div>
                      <div className="request-meta-item">
                        <span className="request-meta-label">Purpose</span>
                        <span className="request-meta-value">{r.purpose || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && (
                  <div className="request-card request-card-empty">
                    <div className="request-info">
                      <strong>No recent document requests.</strong>
                    </div>
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="table-card" ref={requestsTableRef}>
            <div className="table-header">
              <div className="table-header-left">
                <h3>Recent Document Requests</h3>
                <p>Latest Requests</p>
              </div>
            </div>

            <div className="table-wrap">
              <table className="request-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Document Type</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Tracking Number</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r._id}>
                      <td>{r.full_name}</td>
                      <td>{r.documentType}</td>
                      <td>{r.address || '-'}</td>
                      <td>
                        <span className={statusPillClass(r.status)}>
                          {r.status}
                        </span>
                      </td>
                      <td>{r.trackingNumber || r._id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

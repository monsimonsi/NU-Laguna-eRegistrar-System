import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboard.css';
import logo from '../assets/NU_shield.png';
import {
  Menu,
  LayoutGrid,
  FileText,
  Users,
  LogOut,
  ChevronDown,
  Clock3,
  BadgeCheck,
  UsersRound,
  PackageOpen,
} from 'lucide-react';
import { API_BASE, authHeaders, clearSession } from '../api';

const STAT_CONFIG = [
  { label: 'Total Requests', key: 'totalRequests', sub: 'All-Time', icon: <FileText size={16} strokeWidth={2.2} />, colorClass: 'violet' },
  { label: 'Pending', key: 'pendingRequests', sub: 'Awaiting Action', icon: <Clock3 size={16} strokeWidth={2.2} />, colorClass: 'yellow' },
  { label: 'Approved Alumni', key: 'approvedAlumni', sub: 'Verified', icon: <BadgeCheck size={16} strokeWidth={2.2} />, colorClass: 'green' },
  { label: 'Pending Alumni', key: 'pendingAlumni', sub: 'Needs Verification', icon: <UsersRound size={16} strokeWidth={2.2} />, colorClass: 'orange' },
];

function statusOptionsForRequest(request) {
  const method = String(request?.deliveryMethod || 'pickup').toLowerCase();
  if (method === 'delivery') {
    return ['Pending', 'Processing', 'Out for Delivery', 'Released'];
  }
  return ['Pending', 'Processing', 'Ready for Pickup', 'Released'];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const requestsTableRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [alumniRegistrations, setAlumniRegistrations] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [alumniMessage, setAlumniMessage] = useState('');
  const [alumniIsError, setAlumniIsError] = useState(false);

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

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/requests/${id}`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok) {
        setRequests((prev) => prev.map((r) => (r._id === id ? data.request : r)));
        fetchAdminStats();
      } else {
        console.error('Update failed', data.message);
      }
    } catch (err) {
      console.error('Update error', err);
    }
  };

  const statusPillClass = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized.includes('processing')) return 'status-pill processing';
    if (normalized.includes('ready')) return 'status-pill ready';
    if (normalized.includes('out for delivery')) return 'status-pill ready';
    if (normalized.includes('completed')) return 'status-pill completed';
    return 'status-pill pending';
  };

  return (
    <div className="admin-page">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button
          className="sidebar-toggle"
          aria-label="Toggle sidebar"
          onClick={() => setSidebarOpen((prev) => !prev)}
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
          <button className="sidebar-link active" aria-label="Dashboard">
            <LayoutGrid size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Dashboard</span>
          </button>

          <button className="sidebar-link" aria-label="Requests">
            <FileText size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Requests</span>
          </button>

          <button className="sidebar-link" aria-label="Alumni Verification">
            <Users size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Alumni Verification</span>
          </button>

          <button className="sidebar-link" aria-label="Document Tracking">
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

          <div className="admin-profile-wrap">
            <button
              type="button"
              className="admin-profile"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
            >
              <div className="avatar">A</div>
              <ChevronDown
                size={18}
                strokeWidth={2.4}
                className={`profile-caret ${profileOpen ? 'open' : ''}`}
              />
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <button type="button" className="profile-item">
                  Profile
                </button>
                <button type="button" className="profile-item">
                  Settings
                </button>
                <button type="button" className="profile-item" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="admin-main">
          <section className="dashboard-header">
            <h1>DASHBOARD</h1>
            <p>Welcome back! Everything is under your control.</p>
            {loadError && <p className="dashboard-load-error">{loadError}</p>}
          </section>

          <section className="stats-grid">
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
                  onClick={() =>
                    requestsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  View All
                </button>
              </div>

              <div className="request-list">
                {pendingAlumniList.map((item) => (
                  <div className="request-card" key={item._id}>
                    <div className="request-info">
                      <strong>{item.full_name}</strong>
                      <span>{item.student_id}</span>
                      <span>{item.course}</span>
                      <span>Year: {item.year_graduated}</span>
                      <span className={`alumni-status ${item.verificationStatus}`}>{item.verificationStatus}</span>
                    </div>

                    <div className="request-actions">
                      <button className="approve-btn" onClick={() => updateAlumniStatus(item._id, 'approved')}>Approve</button>
                      <button className="reject-btn" onClick={() => updateAlumniStatus(item._id, 'rejected')}>Reject</button>
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
                {requests.slice(0, 6).map((r) => (
                  (() => {
                    const options = statusOptionsForRequest(r);
                    const selected = options.includes(r.status) ? r.status : options[0];
                    return (
                  <div className="small-request-card" key={r._id}>
                    <div className="small-request-info">
                      <strong>{r.full_name}</strong>
                      <span>{r.documentType}</span>
                      <span>Copies: {r.copies ?? 1}</span>
                      {r.documentType === 'Course Description 1st Page' && (
                        <span>Succeeding Pages: {r.succeedingPages ?? 0}</span>
                      )}
                    </div>

                    <div className="status-row">
                      <label>Status:</label>
                      <div className="select-wrap">
                        <select
                          value={selected}
                          onChange={(e) => updateStatus(r._id, e.target.value)}
                        >
                          {options.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                    );
                  })()
                ))}
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
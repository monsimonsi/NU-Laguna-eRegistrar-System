import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { API_BASE, authHeaders, clearSession } from '../api';

const STAT_ITEMS = [
  { label: 'Total Requests', key: 'totalRequests', sub: 'All-Time', icon: <FileText size={16} strokeWidth={2.2} />, colorClass: 'violet' },
  { label: 'Pending', key: 'pendingRequests', sub: 'Awaiting Action', icon: <Clock3 size={16} strokeWidth={2.2} />, colorClass: 'yellow' },
  { label: 'Approved Alumni', key: 'approvedAlumni', sub: 'Verified', icon: <BadgeCheck size={16} strokeWidth={2.2} />, colorClass: 'green' },
  { label: 'Pending Alumni', key: 'pendingAlumni', sub: 'Needs Verification', icon: <UsersRound size={16} strokeWidth={2.2} />, colorClass: 'orange' },
];

const STATUS_OPTIONS = [
  'Pending',
  'Processing',
  'Ready for Pickup',
  'Out for Delivery',
  'Released'
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [pendingAlumni, setPendingAlumni] = useState([]);
  const [statsData, setStatsData] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedAlumni: 0,
    pendingAlumni: 0
  });

  useEffect(() => {
    fetchRequests();
    fetchPendingAlumni();
    fetchStats();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/requests`, {
        headers: authHeaders(false)
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch requests', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: authHeaders(false)
      });
      const data = await res.json();
      if (res.ok) {
        setStatsData({
          totalRequests: data.totalRequests ?? 0,
          pendingRequests: data.pendingRequests ?? 0,
          approvedAlumni: data.approvedAlumni ?? 0,
          pendingAlumni: data.pendingAlumni ?? 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchPendingAlumni = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alumni/pending-verifications`, {
        headers: authHeaders(false)
      });
      const data = await res.json();
      if (res.ok) {
        setPendingAlumni(data.pending || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending alumni', err);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const verifyAlumni = async (userId, action, rejectionReason) => {
    try {
      const body = { action };
      if (action === 'reject' && rejectionReason) {
        body.rejectionReason = rejectionReason;
      }
      const res = await fetch(`${API_BASE}/api/alumni/${userId}/verify`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        await fetchPendingAlumni();
        await fetchStats();
      } else {
        window.alert(data.message || 'Update failed');
      }
    } catch (err) {
      console.error('Verify alumni error', err);
    }
  };

  const handleApprove = (userId) => {
    verifyAlumni(userId, 'approve');
  };

  const handleReject = (userId) => {
    const reason = window.prompt('Reason for rejection (required):');
    if (reason === null) return;
    if (!String(reason).trim()) {
      window.alert('A reason is required.');
      return;
    }
    verifyAlumni(userId, 'reject', String(reason).trim());
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/requests/${id}`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setRequests((prev) => prev.map((r) => (r._id === id ? data.request : r)));
        await fetchStats();
      } else {
        console.error('Update failed', data.message);
      }
    } catch (err) {
      console.error('Update error', err);
    }
  };

  const statusPillClass = (status) =>
    `status-pill ${String(status || '')
      .toLowerCase()
      .replace(/ /g, '-')}`;

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <button className="sidebar-toggle" aria-label="Menu">
          <Menu size={26} strokeWidth={2.4} />
        </button>

        <nav className="sidebar-nav">
          <button className="sidebar-icon active" aria-label="Dashboard">
            <LayoutGrid size={20} strokeWidth={2.2} />
          </button>
          <button className="sidebar-icon" aria-label="Documents">
            <FileText size={20} strokeWidth={2.2} />
          </button>
          <button className="sidebar-icon" aria-label="Users">
            <Users size={20} strokeWidth={2.2} />
          </button>
        </nav>

        <button type="button" className="logout-btn" aria-label="Logout" onClick={handleLogout}>
          <LogOut size={20} strokeWidth={2.2} />
        </button>
      </aside>

      <div className="admin-shell">
        <header className="admin-topbar">
          <div className="admin-brand">
            <img src={logo} alt="NU Logo" className="admin-logo" />
            <span className="admin-title">ADMIN DASHBOARD</span>
          </div>

          <div className="admin-profile-wrap">
            <button
              type="button"
              className="admin-profile"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
            >
              <div className="avatar">A</div>
              <ChevronDown size={18} strokeWidth={2.4} className={`profile-caret ${profileOpen ? 'open' : ''}`} />
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <button type="button" className="profile-item">Profile</button>
                <button type="button" className="profile-item">Settings</button>
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
          </section>

          <section className="stats-grid">
            {STAT_ITEMS.map((item) => (
              <article key={item.label} className={`stat-card ${item.colorClass}`}>
                <div className="stat-top">
                  <h2>{item.label}</h2>
                  <span className={`stat-mini-icon ${item.colorClass}`}>
                    {item.icon}
                  </span>
                </div>
                <div className="stat-value">{statsData[item.key]}</div>
                <div className="stat-sub">{item.sub}</div>
              </article>
            ))}
          </section>

          <section className="panel-grid">
            <article className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Alumni Verification</h3>
                  <p>Pending Alumni Verification Requests</p>
                </div>
                <button type="button" className="view-all-btn">View All</button>
              </div>

              <div className="request-list">
                {pendingAlumni.length === 0 && (
                  <p className="empty-hint" style={{ padding: '1rem', color: '#64748b' }}>
                    No pending alumni verifications.
                  </p>
                )}
                {pendingAlumni.map((item) => (
                  <div className="request-card" key={item.userId}>
                    <div className="request-info">
                      <strong>{item.full_name}</strong>
                      <span>{item.student_number}</span>
                      <span>{item.course}</span>
                      <span>Year: {item.year_graduated}</span>
                      <span style={{ fontSize: '0.85em', color: '#64748b' }}>{item.email}</span>
                    </div>

                    <div className="request-actions">
                      <button
                        type="button"
                        className="approve-btn"
                        onClick={() => handleApprove(item.userId)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="reject-btn"
                        onClick={() => handleReject(item.userId)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Request Management</h3>
                  <p>Recent Document Requests</p>
                </div>
                <button type="button" className="view-all-btn">View All</button>
              </div>

              <div className="request-list request-list-small">
                {requests.slice(0, 6).map((r) => (
                  <div className="small-request-card" key={r._id}>
                    <div className="small-request-info">
                      <strong>{r.full_name}</strong>
                      <span>{r.documentType}</span>
                      <span>{r.trackingNumber || r._id}</span>
                    </div>

                    <div className="status-row">
                      <label>Status:</label>
                      <div className="select-wrap">
                        <select
                          value={STATUS_OPTIONS.includes(r.status) ? r.status : 'Pending'}
                          onChange={(e) => updateStatus(r._id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="table-card">
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
                        <div className={statusPillClass(r.status)}>{r.status}</div>
                      </td>
                      <td>{r.trackingNumber || '—'}</td>
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

import { useState, useEffect } from 'react';
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

const STATUS_OPTIONS = ['Pending', 'Processing', 'Ready for Pickup', 'Out for Delivery', 'Completed'];

const AdminDashboard = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [alumniRegistrations, setAlumniRegistrations] = useState([]);
  const [alumniMessage, setAlumniMessage] = useState('');
  const [alumniIsError, setAlumniIsError] = useState(false);

  const pendingRequests = requests.filter((r) => r.status === 'Pending').length;
  const approvedAlumni = alumniRegistrations.filter((r) => r.verificationStatus === 'approved').length;
  const pendingAlumni = alumniRegistrations.filter((r) => r.verificationStatus === 'pending').length;

  const stats = [
    { label: 'Total Requests', value: String(requests.length), sub: 'All-Time', icon: <FileText size={16} strokeWidth={2.2} />, colorClass: 'violet' },
    { label: 'Pending', value: String(pendingRequests), sub: 'Awaiting Action', icon: <Clock3 size={16} strokeWidth={2.2} />, colorClass: 'yellow' },
    { label: 'Approved Alumni', value: String(approvedAlumni), sub: 'Verified', icon: <BadgeCheck size={16} strokeWidth={2.2} />, colorClass: 'green' },
    { label: 'Pending Alumni', value: String(pendingAlumni), sub: 'Needs Verification', icon: <UsersRound size={16} strokeWidth={2.2} />, colorClass: 'orange' },
  ];

  useEffect(() => {
    fetchRequests();
    fetchAlumniRegistrations();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/requests');
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch requests', err);
    }
  };

  const getCurrentAdminId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.id || null;
    } catch (e) {
      return null;
    }
  };

  const fetchAlumniRegistrations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/alumni-registrations');
      const data = await res.json();
      if (res.ok) {
        setAlumniRegistrations(data.registrations || []);
      }
    } catch (err) {
      console.error('Failed to fetch alumni registrations', err);
    }
  };

  const updateAlumniStatus = async (id, newStatus) => {
    setAlumniMessage('');
    setAlumniIsError(false);

    let rejectionReason = '';
    if (newStatus === 'rejected') {
      const reason = window.prompt('Enter rejection reason');
      if (reason === null) {
        return;
      }
      rejectionReason = String(reason).trim();
      if (!rejectionReason) {
        setAlumniIsError(true);
        setAlumniMessage('Rejection reason is required.');
        return;
      }
    }

    try {
      const res = await fetch(`http://localhost:5000/api/alumni-registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationStatus: newStatus,
          reviewedBy: getCurrentAdminId(),
          rejectionReason
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAlumniIsError(true);
        setAlumniMessage(data.message || 'Failed to update status.');
        return;
      }

      setAlumniRegistrations((prev) => prev.map((r) => (r._id === id ? data.registration : r)));
      setAlumniIsError(false);
      setAlumniMessage('Verification status updated.');
    } catch (err) {
      console.error('Update alumni status error', err);
      setAlumniIsError(true);
      setAlumniMessage('Cannot connect to server.');
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setRequests((prev) => prev.map(r => (r._id === id ? data.request : r)));
      } else {
        console.error('Update failed', data.message);
      }
    } catch (err) {
      console.error('Update error', err);
    }
  };

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

        <button className="logout-btn" aria-label="Logout">
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
                <button type="button" className="profile-item">Logout</button>
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
            <article className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Alumni Verification</h3>
                  <p>Pending Alumni Verification Requests</p>
                </div>
                <button className="view-all-btn">View All</button>
              </div>

              <div className="request-list">
                {alumniRegistrations.map((item) => (
                  <div className="request-card" key={item._id}>
                    <div className="request-info">
                      <strong>{item.full_name}</strong>
                      <span>{item.student_id}</span>
                      <span>{item.course}</span>
                      <span>Year: {item.year_graduated}</span>
                      <span className={`alumni-status ${item.verificationStatus}`}>{item.verificationStatus}</span>
                      {item.verificationStatus === 'rejected' && item.rejectionReason && (
                        <span className="alumni-reason">Reason: {item.rejectionReason}</span>
                      )}
                    </div>

                    {item.verificationStatus === 'pending' && (
                      <div className="request-actions">
                        <button className="approve-btn" onClick={() => updateAlumniStatus(item._id, 'approved')}>Approve</button>
                        <button className="reject-btn" onClick={() => updateAlumniStatus(item._id, 'rejected')}>Reject</button>
                      </div>
                    )}
                  </div>
                ))}
                {alumniRegistrations.length === 0 && (
                  <div className="request-card request-card-empty">
                    <div className="request-info">
                      <strong>No alumni registrations yet.</strong>
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

            <article className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Request Management</h3>
                  <p>Recent Document Requests</p>
                </div>
                <button className="view-all-btn">View All</button>
              </div>

              <div className="request-list request-list-small">
                {requests.slice(0, 6).map((r) => (
                  <div className="small-request-card" key={r._id}>
                    <div className="small-request-info">
                      <strong>{r.full_name}</strong>
                      <span>{r.documentType}</span>
                      <span>{r._id}</span>
                    </div>

                    <div className="status-row">
                      <label>Status:</label>
                      <div className="select-wrap">
                        <select value={r.status} onChange={(e) => updateStatus(r._id, e.target.value)}>
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
                        <div className={`status-pill ${r.status.toLowerCase().replace(/ /g, '-')}`}>{r.status}</div>
                      </td>
                      <td>{r._id}</td>
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
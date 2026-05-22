import { useState } from 'react';
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

const STATUS_OPTIONS = [
  'Pending',
  'Processing',
  'Ready for Pickup',
  'Out for Delivery',
  'Completed',
];

const STAT_CONFIG = [
  {
    label: 'Total Requests',
    value: '156',
    sub: 'All-Time',
    icon: <FileText size={16} strokeWidth={2.2} />,
    colorClass: 'violet',
  },
  {
    label: 'Pending',
    value: '16',
    sub: 'Awaiting Action',
    icon: <Clock3 size={16} strokeWidth={2.2} />,
    colorClass: 'yellow',
  },
  {
    label: 'Approved Alumni',
    value: '67',
    sub: 'Verified',
    icon: <BadgeCheck size={16} strokeWidth={2.2} />,
    colorClass: 'green',
  },
  {
    label: 'Pending Alumni',
    value: '13',
    sub: 'Needs Verification',
    icon: <UsersRound size={16} strokeWidth={2.2} />,
    colorClass: 'orange',
  },
];

const ALUMNI_REQUESTS = [
  {
    _id: '1',
    full_name: 'Juan Dela Cruz',
    student_id: '2022-80123',
    course: 'BS Computer Science',
    year_graduated: '2024',
    verificationStatus: 'pending',
  },
  {
    _id: '2',
    full_name: 'Dubai Chewy E. Cookie',
    student_id: '2019-88161',
    course: 'BS Civil Engineering',
    year_graduated: '2023',
    verificationStatus: 'pending',
  },
  {
    _id: '3',
    full_name: 'Ilocos A. Empanada',
    student_id: '2019-12395',
    course: 'BS Psychology',
    year_graduated: '2023',
    verificationStatus: 'pending',
  },
];

const REQUESTS = [
  {
    _id: 'r1',
    full_name: 'Juan Dela Cruz',
    documentType: 'Transcript of Records',
    address: 'Laguna',
    status: 'Pending',
    trackingNumber: 'NUL 2026-0409-001',
    copies: 1,
    deliveryMethod: 'pickup',
  },
  {
    _id: 'r2',
    full_name: 'Dubai Chewy E. Cookie',
    documentType: 'Diploma',
    address: 'Calamba',
    status: 'Processing',
    trackingNumber: 'NUL 2026-0408-002',
    copies: 1,
    deliveryMethod: 'pickup',
  },
  {
    _id: 'r3',
    full_name: 'Ilocos A. Empanada',
    documentType: 'Certificate of Good Moral Character',
    address: 'Sta. Cruz',
    status: 'Ready for Pickup',
    trackingNumber: 'NUL 2026-0407-003',
    copies: 2,
    deliveryMethod: 'pickup',
  },
  {
    _id: 'r4',
    full_name: 'Frank Dagat',
    documentType: 'Certificate of Registration',
    address: 'Los Banos',
    status: 'Completed',
    trackingNumber: 'NUL 2026-0406-002',
    copies: 1,
    deliveryMethod: 'delivery',
  },
  {
    _id: 'r5',
    full_name: 'Sabrina Karpintero',
    documentType: 'Certificates',
    address: 'Binan',
    status: 'Completed',
    trackingNumber: 'NUL 2026-0405-001',
    copies: 1,
    deliveryMethod: 'delivery',
  },
  {
    _id: 'r6',
    full_name: 'Chappell Roan',
    documentType: 'Diploma',
    address: 'San Pedro',
    status: 'Out for Delivery',
    trackingNumber: 'NUL 2026-0404-099',
    copies: 1,
    deliveryMethod: 'delivery',
  },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState(REQUESTS);
  const [alumniRegistrations, setAlumniRegistrations] = useState(ALUMNI_REQUESTS);
  const [alumniMessage, setAlumniMessage] = useState('');
  const [alumniIsError, setAlumniIsError] = useState(false);

  const pendingRequests = requests.filter((r) => r.status === 'Pending').length;
  const approvedAlumni = alumniRegistrations.filter(
    (r) => r.verificationStatus === 'approved'
  ).length;
  const pendingAlumni = alumniRegistrations.filter(
    (r) => r.verificationStatus === 'pending'
  ).length;

  const stats = STAT_CONFIG.map((item) => ({
    ...item,
    value:
      item.label === 'Total Requests'
        ? String(requests.length)
        : item.label === 'Pending'
          ? String(pendingRequests)
          : item.label === 'Approved Alumni'
            ? String(approvedAlumni)
            : String(pendingAlumni),
  }));

  const handleLogout = () => {
    navigate('/login');
  };

  const getCurrentAdminId = () => 'admin';

  const updateAlumniStatus = (id, newStatus) => {
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

    setAlumniRegistrations((prev) =>
      prev.map((r) =>
        r._id === id
          ? {
              ...r,
              verificationStatus: newStatus,
              reviewedBy: getCurrentAdminId(),
              rejectionReason,
            }
          : r
      )
    );

    setAlumniMessage('Verification status updated.');
  };

  const updateStatus = (id, newStatus) => {
    setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r)));
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
                <button type="button" className="view-all-btn">
                  View All
                </button>
              </div>

              <div className="request-list">
                {alumniRegistrations.map((item) => (
                  <div className="request-card" key={item._id}>
                    <div className="request-info">
                      <strong>{item.full_name}</strong>
                      <span>{item.student_id}</span>
                      <span>{item.course}</span>
                      <span>Year: {item.year_graduated}</span>
                      <span className={`alumni-status ${item.verificationStatus}`}>
                        {item.verificationStatus}
                      </span>
                      {item.verificationStatus === 'rejected' && item.rejectionReason && (
                        <span className="alumni-reason">
                          Reason: {item.rejectionReason}
                        </span>
                      )}
                    </div>

                    {item.verificationStatus === 'pending' && (
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

            <article className="panel-card request-panel">
              <div className="panel-header">
                <div>
                  <h3>Request Management</h3>
                  <p>Recent Document Requests</p>
                </div>
                <button type="button" className="view-all-btn">
                  View All
                </button>
              </div>

              <div className="request-list request-list-small">
                {requests.slice(0, 6).map((r) => {
                  const options = STATUS_OPTIONS;
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
                            {options.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
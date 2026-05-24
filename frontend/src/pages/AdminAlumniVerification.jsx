import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/AdminAlumniVerification.css';
import logo from '../assets/NU_shield.png';
import approveIcon from '../assets/approve-icon.png';
import rejectIcon from '../assets/reject-icon.png';
import {
  Menu,
  LayoutGrid,
  FileText,
  Users,
  LogOut,
  ChevronDown,
  PackageOpen,
  Clock,
  UserCheck,
} from 'lucide-react';
import { apiFetch, clearSession } from '../api';

const formatDateShort = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const mapAlumniRegistration = (record) => ({
  _id: record._id,
  name: record.full_name || '-',
  studentId: record.student_id || '-',
  program: record.course || '-',
  yearGraduated: record.year_graduated || '-',
  submitted: formatDateShort(record.createdAt),
  status: String(record.verificationStatus || 'pending').toLowerCase(),
  rejectionReason: record.rejectionReason || '',
  reviewedBy: record.reviewedBy || null,
});

const formatStatusLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const StatCard = ({ icon: Icon, title, count, subtitle, color = 'blue' }) => (
  <div className={`stat-card stat-card-${color}`}>
    <div className="stat-card-header">
      <h3>{title}</h3>
      <Icon className="stat-card-icon" size={24} strokeWidth={2.2} />
    </div>
    <div className="stat-card-content">
      <div className="stat-count">{count}</div>
      {subtitle && <p className="stat-subtitle">{subtitle}</p>}
    </div>
  </div>
);

const AlumniVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarHover, setSidebarHover] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [alumni, setAlumni] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [alumniMessage, setAlumniMessage] = useState('');
  const [alumniIsError, setAlumniIsError] = useState(false);
  const isSidebarOpen = sidebarPinned || sidebarHover;
  const isDashboardActive = location.pathname === '/admin-dashboard';
  const isAlumniVerificationActive = location.pathname === '/admin-alumni-verification';
  const isDocumentTrackingActive = location.pathname === '/admin-document-tracking';

  const pendingAlumni = alumni.filter((item) => item.status === 'pending');
  const resolvedAlumni = alumni.filter(
    (item) => item.status === 'approved' || item.status === 'rejected'
  );

  const completedCount = resolvedAlumni.length;
  const pendingCount = pendingAlumni.length;
  const approvedCount = alumni.filter((item) => item.status === 'approved').length;

  const fetchAlumniRegistrations = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const { res, data } = await apiFetch('/api/alumni-registrations', { auth: true });

      if (!res.ok) {
        setLoadError(data.message || 'Failed to load alumni verification records.');
        return;
      }

      setAlumni((data.registrations || []).map(mapAlumniRegistration));
    } catch (error) {
      console.error('Failed to fetch alumni registrations', error);
      setLoadError('Cannot connect to server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlumniRegistrations();
  }, [fetchAlumniRegistrations]);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
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
      const { res, data } = await apiFetch(`/api/alumni-registrations/${id}`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({
          verificationStatus: newStatus,
          rejectionReason,
        }),
      });

      if (!res.ok) {
        setAlumniIsError(true);
        setAlumniMessage(data.message || 'Failed to update status.');
        return;
      }

      setAlumni((prev) =>
        prev.map((item) => (item._id === id ? mapAlumniRegistration(data.registration) : item))
      );
      setAlumniMessage('Verification status updated.');
    } catch (error) {
      console.error('Update alumni status error', error);
      setAlumniIsError(true);
      setAlumniMessage('Cannot connect to server.');
    }
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
          onClick={() => setSidebarPinned((prev) => !prev)}
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

          <button
            className="sidebar-link"
            aria-label="Requests"
            onClick={() => navigate('/admin-dashboard')}
          >
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

        <button
          type="button"
          className="logout-btn"
          aria-label="Logout"
          onClick={handleLogout}
        >
          <LogOut size={20} strokeWidth={2.2} />
          <span className="sidebar-text">LOG OUT</span>
        </button>
      </aside>

      <div className="admin-shell">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-brand"
            onClick={() => navigate('/admin-dashboard')}
          >
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
          <section className="page-header">
            <h1>ALUMNI VERIFICATION</h1>
            <p>Review and approve alumni verification requests from the database.</p>
            {loadError && <p className="dashboard-load-error">{loadError}</p>}
            {alumniMessage && (
              <p className={`dashboard-load-error ${alumniIsError ? 'error' : 'success'}`}>
                {alumniMessage}
              </p>
            )}
          </section>

          <section className="stats-grid">
            <StatCard
              icon={FileText}
              title="Completed Requests"
              count={completedCount}
              color="blue"
            />
            <StatCard
              icon={Clock}
              title="Pending Verification"
              count={pendingCount}
              subtitle="Awaiting action"
              color="yellow"
            />
            <StatCard
              icon={UserCheck}
              title="Approved Alumni"
              count={approvedCount}
              subtitle="Verified"
              color="green"
            />
          </section>

          <section className="verification-table-section">
            <h2>Pending Alumni Verification</h2>
            <p className="table-subtitle">{pendingCount} Alumni waiting for verification</p>

            {isLoading ? (
              <div className="empty-state">
                <p>Loading alumni verification records...</p>
              </div>
            ) : pendingAlumni.length > 0 ? (
              <div className="table-wrapper">
                <table className="verification-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Student ID</th>
                      <th>Program</th>
                      <th>Year Graduated</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAlumni.map((item) => (
                      <tr key={item._id}>
                        <td className="name-cell">
                          <strong>{item.name}</strong>
                        </td>
                        <td>{item.studentId}</td>
                        <td>{item.program}</td>
                        <td className="center">{item.yearGraduated}</td>
                        <td>{item.submitted}</td>
                        <td className="actions-cell">
                          <button
                            className="action-btn approve-btn"
                            onClick={() => updateAlumniStatus(item._id, 'approved')}
                          >
                            <img src={approveIcon} alt="Approve" className="action-icon" />
                            <span>Approve</span>
                          </button>
                          <button
                            className="action-btn reject-btn"
                            onClick={() => updateAlumniStatus(item._id, 'rejected')}
                          >
                            <img src={rejectIcon} alt="Reject" className="action-icon" />
                            <span>Reject</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>No pending alumni verification requests</p>
              </div>
            )}
          </section>

          <section className="records-section">
            <h2>All Alumni Records</h2>
            <p className="table-subtitle">Approved and rejected alumni verification records</p>

            <div className="table-wrapper records-table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Student ID</th>
                    <th>Program</th>
                    <th>Year Graduated</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedAlumni.map((item) => (
                    <tr key={item._id}>
                      <td className="name-cell">
                        <strong>{item.name}</strong>
                      </td>
                      <td>{item.studentId}</td>
                      <td>{item.program}</td>
                      <td className="center">{item.yearGraduated}</td>
                      <td>
                        <span className={`status-pill records-status-pill ${item.status}`}>
                          {formatStatusLabel(item.status)}
                        </span>
                      </td>
                      <td>{item.submitted}</td>
                    </tr>
                  ))}
                  {!isLoading && resolvedAlumni.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        <p>No resolved alumni verification records yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AlumniVerification;

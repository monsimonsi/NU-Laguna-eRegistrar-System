import { useState } from 'react';
import '../styles/AlumniVerification.css';
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

const SAMPLE_ALUMNI = [
  {
    _id: 'a1',
    name: 'Juan Dela Cruz',
    studentId: '2020-000123',
    program: 'BS Computer Science',
    yearGraduated: 2024,
    submitted: 'April 09, 2026 2:30 PM',
    status: 'pending',
  },
  {
    _id: 'a2',
    name: 'Dubai Chewy E. Cookie',
    studentId: '2019-000169',
    program: 'BS Civil Engineering',
    yearGraduated: 2023,
    submitted: 'April 08, 2026 3:16 PM',
    status: 'pending',
  },
  {
    _id: 'a3',
    name: 'Ilocos A. Empanada',
    studentId: '2019-123525',
    program: 'BS Psychology',
    yearGraduated: 2023,
    submitted: 'April 07, 2026 7:05 AM',
    status: 'pending',
  },
  {
    _id: 'a4',
    name: 'Frank Dagat',
    studentId: '2018-127536',
    program: 'BS Architecture',
    yearGraduated: 2023,
    submitted: 'April 06, 2026 2:06 PM',
    status: 'approved',
  },
  {
    _id: 'a5',
    name: 'Sabrina Karpentero',
    studentId: '2020-125634',
    program: 'BS Accountancy',
    yearGraduated: 2024,
    submitted: 'April 06, 2026 2:30 PM',
    status: 'approved',
  },
];

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [alumni, setAlumni] = useState(SAMPLE_ALUMNI);

  const completedCount = alumni.length;
  const pendingCount = alumni.filter((a) => a.status === 'pending').length;
  const approvedCount = alumni.filter((a) => a.status === 'approved').length;

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleApprove = (id) => {
    setAlumni((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, status: 'approved' } : item
      )
    );
  };

  const handleReject = (id) => {
    setAlumni((prev) => prev.filter((item) => item._id !== id));
  };

  const pendingAlumni = alumni.filter((a) => a.status === 'pending');

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
          <button
            type="button"
            className="sidebar-link"
            aria-label="Dashboard"
            onClick={() => console.log('Dashboard clicked')}
          >
            <LayoutGrid size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Dashboard</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            aria-label="Requests"
            onClick={() => console.log('Requests clicked')}
          >
            <FileText size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Requests</span>
          </button>

          <button
            type="button"
            className="sidebar-link active"
            aria-label="Alumni Verification"
            onClick={() => console.log('Alumni Verification clicked')}
          >
            <Users size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Alumni Verification</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            aria-label="Document Tracking"
            onClick={() => console.log('Document Tracking clicked')}
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
            onClick={() => console.log('Dashboard clicked')}
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
            <p>Review and approve alumni verification requests</p>
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

            {pendingAlumni.length > 0 ? (
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
                            onClick={() => handleApprove(item._id)}
                          >
                            <img src={approveIcon} alt="Approve" className="action-icon" />
                            <span>Approve</span>
                          </button>
                          <button
                            className="action-btn reject-btn"
                            onClick={() => handleReject(item._id)}
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
            <p className="table-subtitle">Complete list of all alumni verification records</p>

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
                  {alumni.map((item) => (
                    <tr key={item._id}>
                      <td className="name-cell">
                        <strong>{item.name}</strong>
                      </td>
                      <td>{item.studentId}</td>
                      <td>{item.program}</td>
                      <td className="center">{item.yearGraduated}</td>
                      <td>
                        <span className={`status-pill ${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.submitted}</td>
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

export default AlumniVerification;

import { useState } from 'react';
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

const stats = [
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

const alumniRequests = [
  {
    name: 'Juan Dela Cruz',
    id: '2022-80123',
    program: 'BS Computer Science',
    year: 'Year: 2024',
  },
  {
    name: 'Dubai Chewy E. Cookie',
    id: '2019-88161',
    program: 'BS Civil Engineering',
    year: 'Year: 2023',
  },
  {
    name: 'Ilocos A. Empanada',
    id: '2019-12395',
    program: 'BS Psychology',
    year: 'Year: 2023',
  },
];

const AdminDashboard = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

        <button className="logout-btn" aria-label="Logout">
          <LogOut size={22} strokeWidth={2.2} />
          <span className="sidebar-text">LOG OUT</span>
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
                <button type="button" className="profile-item">
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
            <article className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Alumni Verification</h3>
                  <p>Pending Alumni Verification Requests</p>
                </div>
                <button className="view-all-btn">View All</button>
              </div>

              <div className="request-list">
                {alumniRequests.map((item) => (
                  <div className="request-card" key={item.name}>
                    <div className="request-info">
                      <strong>{item.name}</strong>
                      <span>{item.id}</span>
                      <span>{item.program}</span>
                      <span>{item.year}</span>
                    </div>

                    <div className="request-actions">
                      <button className="approve-btn">Approve</button>
                      <button className="reject-btn">Reject</button>
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
                <button className="view-all-btn">View All</button>
              </div>

              <div className="request-list request-list-small">
                <div className="small-request-card">
                  <div className="small-request-info">
                    <strong>Juan Dela Cruz</strong>
                    <span>Transcript of Records</span>
                    <span>TRK 2026-0409-001</span>
                  </div>

                  <div className="status-row">
                    <label>Status:</label>
                    <div className="select-wrap">
                      <select defaultValue="Ready">
                        <option>Pending</option>
                        <option>Processing</option>
                        <option>Ready</option>
                        <option>Completed</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="small-request-card">
                  <div className="small-request-info">
                    <strong>Dubai Chewy A. Cookie</strong>
                    <span>Diploma</span>
                    <span>TRK 2026-0408-002</span>
                  </div>

                  <div className="status-row">
                    <label>Status:</label>
                    <div className="select-wrap">
                      <select defaultValue="Pending">
                        <option>Pending</option>
                        <option>Processing</option>
                        <option>Ready</option>
                        <option>Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
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
                    <th>Status</th>
                    <th>Tracking Number</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Juan Dela Cruz</td>
                    <td>Transcript of Records</td>
                    <td>
                      <span className="status-pill pending">pending</span>
                    </td>
                    <td>NUL 2026-0409-001</td>
                  </tr>
                  <tr>
                    <td>Dubai Chewy E. Cookie</td>
                    <td>Diploma</td>
                    <td>
                      <span className="status-pill processing">processing</span>
                    </td>
                    <td>NUL 2026-0408-002</td>
                  </tr>
                  <tr>
                    <td>Ilocos A. Empanada</td>
                    <td>Certificate of Good Moral Character</td>
                    <td>
                      <span className="status-pill ready">ready</span>
                    </td>
                    <td>NUL 2026-0407-003</td>
                  </tr>
                  <tr>
                    <td>Frank Dagat</td>
                    <td>Certificate of Registration</td>
                    <td>
                      <span className="status-pill completed">completed</span>
                    </td>
                    <td>NUL 2026-0406-002</td>
                  </tr>
                  <tr>
                    <td>Sabrina Karpintero</td>
                    <td>Certificates</td>
                    <td>
                      <span className="status-pill completed">completed</span>
                    </td>
                    <td>NUL 2026-0405-001</td>
                  </tr>
                  <tr>
                    <td>Chappell Roan</td>
                    <td>Diploma</td>
                    <td>
                      <span className="status-pill ready">ready</span>
                    </td>
                    <td>NUL 2026-0404-099</td>
                  </tr>
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
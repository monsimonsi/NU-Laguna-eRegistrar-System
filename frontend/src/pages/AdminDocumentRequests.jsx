import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDocumentRequests.css';
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
  Search,
} from 'lucide-react';

const STATUS_OPTIONS = ['Pending', 'Processing', 'Ready', 'Completed'];

const FILTER_OPTIONS = [
  'All statuses',
  'Waiting for payment',
  'Processing',
  'Ready',
  'Completed',
];

const STAT_CONFIG = [
  {
    label: 'Total Request',
    key: 'total',
    sub: 'All time',
    icon: <FileText size={16} strokeWidth={2.2} />,
    colorClass: 'violet',
  },
  {
    label: 'Pendings',
    key: 'pending',
    sub: 'Awaiting action',
    icon: <Clock3 size={16} strokeWidth={2.2} />,
    colorClass: 'yellow',
  },
  {
    label: 'Approved Alumni',
    key: 'approved',
    sub: 'Verified',
    icon: <BadgeCheck size={16} strokeWidth={2.2} />,
    colorClass: 'green',
  },
  {
    label: 'Pending Alumni',
    key: 'pendingAlumni',
    sub: 'Need verification',
    icon: <UsersRound size={16} strokeWidth={2.2} />,
    colorClass: 'orange',
  },
];

const REQUESTS = [
  {
    _id: 'r1',
    full_name: 'Juan Dela Cruz',
    student_id: '2020-000123',
    documentType: 'Transcript of Records',
    requestDate: 'April 09, 2026 08:30 AM',
    status: 'Pending',
    trackingNumber: 'NUL 2026-0409-001',
  },
  {
    _id: 'r2',
    full_name: 'Dubai Chewy E. Cookie',
    student_id: '2019-000169',
    documentType: 'Diploma',
    requestDate: 'April 08, 2026 09:30 AM',
    status: 'Processing',
    trackingNumber: 'NUL 2026-0408-002',
  },
  {
    _id: 'r3',
    full_name: 'Ilocos A. Empanada',
    student_id: '2019-123525',
    documentType: 'Good Moral Certificate',
    requestDate: 'April 07, 2026 07:05 AM',
    status: 'Ready',
    trackingNumber: 'NUL 2026-0407-003',
  },
  {
    _id: 'r4',
    full_name: 'Frank Dagat',
    student_id: '2018-127536',
    documentType: 'Certificate of Completion',
    requestDate: 'April 06, 2026 10:30 AM',
    status: 'Completed',
    trackingNumber: 'NUL 2026-0406-002',
  },
  {
    _id: 'r5',
    full_name: 'Sabrina Karpintero',
    student_id: '2020-125634',
    documentType: 'Certificates',
    requestDate: 'April 06, 2026 2:30 PM',
    status: 'Ready',
    trackingNumber: 'NUL 2026-0405-001',
  },
  {
    _id: 'r6',
    full_name: 'Chappell Roan',
    student_id: '2021-562145',
    documentType: 'Diploma',
    requestDate: 'April 05, 2026 11:22 AM',
    status: 'Ready',
    trackingNumber: 'NUL 2026-0404-099',
  },
  {
    _id: 'r7',
    full_name: 'Doja Cat',
    student_id: '2021-123909',
    documentType: 'Copy of Grades',
    requestDate: 'April 05, 2026 1:15 PM',
    status: 'Ready',
    trackingNumber: 'NUL 2026-0403-008',
  },
  {
    _id: 'r8',
    full_name: 'Brent Faiyaz',
    student_id: '2020-124568',
    documentType: 'SHS Report Card',
    requestDate: 'April 02, 2026 3:17 PM',
    status: 'Pending',
    trackingNumber: 'NUL 2026-0402-017',
  },
  {
    _id: 'r9',
    full_name: 'Lara Larson',
    student_id: '2020-128542',
    documentType: 'Good Moral Certificate',
    requestDate: 'April 01, 2026 8:17 AM',
    status: 'Ready',
    trackingNumber: 'NUL 2026-0401-004',
  },
  {
    _id: 'r10',
    full_name: 'Daniel Caesar',
    student_id: '2018-000235',
    documentType: 'Transcript of Records',
    requestDate: 'May 28, 2026 2:30 PM',
    status: 'Completed',
    trackingNumber: 'NUL 2026-0528-001',
  },
];

const AdminDocumentRequests = () => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All statuses');
  const [requests, setRequests] = useState(REQUESTS);

  const pendingRequests = requests.filter((r) => r.status === 'Pending').length;
  const approvedAlumni = 3;
  const pendingAlumni = 2;

  const stats = STAT_CONFIG.map((item) => ({
    ...item,
    value:
      item.key === 'total'
        ? String(requests.length)
        : item.key === 'pending'
          ? String(pendingRequests)
          : item.key === 'approved'
            ? String(approvedAlumni)
            : String(pendingAlumni),
  }));

  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const statusOrder = {
    pending: 0,
    processing: 1,
    ready: 2,
    completed: 3,
  };

  const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

  const filterStatusKey = (label) => {
    const normalized = String(label || '').toLowerCase();
    if (normalized === 'waiting for payment') return 'pending';
    if (normalized === 'processing') return 'processing';
    if (normalized === 'ready') return 'ready';
    if (normalized === 'completed') return 'completed';
    return '';
  };

  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filterKey = filterStatusKey(selectedFilter);

    const list = requests.filter((item) => {
      const matchesSearch =
        !q ||
        item.full_name.toLowerCase().includes(q) ||
        item.student_id.toLowerCase().includes(q) ||
        item.documentType.toLowerCase().includes(q) ||
        item.requestDate.toLowerCase().includes(q) ||
        item.trackingNumber.toLowerCase().includes(q);

      const itemStatus = normalizeStatus(item.status);
      const matchesFilter = !filterKey || itemStatus === filterKey;

      return matchesSearch && matchesFilter;
    });

    return list.sort((a, b) => {
      const sa = statusOrder[normalizeStatus(a.status)] ?? 99;
      const sb = statusOrder[normalizeStatus(b.status)] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.requestDate.localeCompare(b.requestDate);
    });
  }, [requests, searchTerm, selectedFilter]);

  const updateStatus = (id, newStatus) => {
    setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r)));
  };

  const statusPillClass = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'processing') return 'status-pill processing';
    if (normalized === 'ready') return 'status-pill ready';
    if (normalized === 'completed') return 'status-pill completed';
    return 'status-pill pending';
  };

  return (
    <div className="admin-page">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button
          className="sidebar-toggle"
          aria-label="Toggle sidebar"
          aria-expanded={sidebarOpen}
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
            className="sidebar-link"
            aria-label="Dashboard"
            onClick={() => navigate('/admin-dashboard')}
          >
            <LayoutGrid size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Dashboard</span>
          </button>

          <button
            className="sidebar-link active"
            aria-label="Requests"
            onClick={() => navigate('/admin-document-requests')}
          >
            <FileText size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Requests</span>
          </button>

          <button
            className="sidebar-link"
            aria-label="Alumni Verification"
            onClick={() => navigate('/admin-alumni-verification')}
          >
            <Users size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Alumni Verification</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
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
          <section className="requests-header">
            <h1>DOCUMENT REQUESTS</h1>
            <p>Monitor and approve incoming document requests.</p>
          </section>

          <section className="stats-grid">
            {stats.map((item) => (
              <article key={item.label} className={`stat-card ${item.colorClass}`}>
                <div className="stat-top">
                  <h2>{item.label}</h2>
                  <span className={`stat-mini-icon ${item.colorClass}`}>{item.icon}</span>
                </div>
                <div className="stat-value">{item.value}</div>
                <div className="stat-sub">{item.sub}</div>
              </article>
            ))}
          </section>

          <section className="request-filter-card">
            <div className="request-filter-wrap">
              <div className="request-search-wrap">
                <Search className="request-search-icon" size={22} strokeWidth={2.2} />
                <input
                  type="text"
                  className="request-search-input"
                  placeholder="Search by Name, ID, tracking number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="select-wrap request-filter-select-wrap">
                <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}>
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="requests-table-card">
            <div className="requests-table-heading">
              <h2>All Document Requests</h2>
              <p>{filteredRequests.length} requests found</p>
            </div>

            <div className="table-wrap">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Student ID</th>
                    <th>Document Type</th>
                    <th>Request Date</th>
                    <th>Status</th>
                    <th>Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((r) => (
                    <tr key={r._id}>
                      <td>{r.full_name}</td>
                      <td>{r.student_id}</td>
                      <td>{r.documentType}</td>
                      <td>{r.requestDate}</td>
                      <td>
                        <span className={statusPillClass(r.status)}>{normalizeStatus(r.status)}</span>
                      </td>
                      <td>
                        <div className="select-wrap update-status-wrap">
                          <select
                            value={STATUS_OPTIONS.includes(r.status) ? r.status : 'Pending'}
                            onChange={(e) => updateStatus(r._id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
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

export default AdminDocumentRequests;
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Dashboard.css'
import DocumentRequest from './DocumentRequest'
import { clearSession } from '../api'
import logo from '../assets/NU_shield.png'
import settingslogo from '../assets/settings-icon.png'
import tracklogo from '../assets/track-icon.png'
import pluslogo from '../assets/plus-icon.png'
import submitlogo from '../assets/submit-icon.png'
import logoutlogo from '../assets/logout-icon.png'

function App() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('dashboard');
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const STATUS_OPTIONS = [
    'Pending',
    'Processing',
    'Ready for Pickup',
    'Out for Delivery',
    'Completed'
  ];

  const toggleSidebar = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch (err) {
      return null;
    }
  };

  const fetchRequests = async () => {
    const user = getUser();
    if (!user || !user.email) {
      setError('You must be logged in to view your requests.');
      setRequests([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`http://localhost:5000/api/requests?email=${encodeURIComponent(user.email)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to load requests.');
        setRequests([]);
        return;
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      setError('Cannot connect to server.');
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'dashboard') {
      fetchRequests();
    }
  }, [view]);

  const stats = useMemo(() => {
    const base = {
      total: requests.length,
      Pending: 0,
      Processing: 0,
      'Ready for Pickup': 0,
      'Out for Delivery': 0,
      Completed: 0
    };

    requests.forEach((req) => {
      if (base[req.status] !== undefined) {
        base[req.status] += 1;
      }
    });

    return base;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    const status = String(statusFilter || '').trim();

    return requests.filter((req) => {
      const matchesStatus = status ? req.status === status : true;
      if (!term) return matchesStatus;

      const haystack = [req._id, req.documentType, req.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && haystack.includes(term);
    });
  }, [requests, searchTerm, statusFilter]);

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '-';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDeliveryMethod = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return '-';
    return normalized === 'delivery' ? 'Delivery (₱150 fee)' : 'Pickup';
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className={`app-container ${isOpen ? 'sidebar-open' : ''}`} onClick={() => setIsOpen(false)}>
      
      {/* Overlay background */}
      {view === 'dashboard' && (
        <div className={`overlay ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(false)}></div>
      )}

      {view === 'dashboard' && (
        <>
          {/* Header */}
          <header className="main-header">
            <div className="header-left">
              <div className="menu-burger" onClick={toggleSidebar}>☰</div>
              <img src={logo} alt="Logo" className="nav-logo" />
              <span className="system-name">NU Laguna e-Registrar</span>
            </div>
          </header>

          {/* Sidebar */}
          <div className={`sidebar ${isOpen ? 'active' : ''}`} onClick={(e) => e.stopPropagation()}>
        <nav className="sidebar-nav">
          <div className="sidebar-link" onClick={() => { setView('new-request'); setIsOpen(false); }}>
            <img src={submitlogo} alt="Submit Logo" className="sidebar-icon" />
            <span className="sidebar-label">Submit Document Requests</span>
          </div>
          <div className="sidebar-link" onClick={() => { setView('dashboard'); setIsOpen(false); }}>
            <img src={tracklogo} alt="" className="sidebar-icon" />
            <span className="sidebar-label">Track Document Requests</span>
          </div>
          <div className="sidebar-link" onClick={() => { setView('dashboard'); setIsOpen(false); }}>
            <img src={settingslogo} alt="" className="sidebar-icon" />
            <span className="sidebar-label">Account Settings</span>
          </div>
        </nav>
        
        <div className="sidebar-footer">
          <div className="sidebar-link logout-sidebar" onClick={handleLogout}>
            <img src={logoutlogo} alt="Logout Logo" className="sidebar-icon" />
            <span className="sidebar-label">LOG OUT</span>
          </div>
        </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      {view === 'dashboard' ? (
        <main className="dashboard-wrapper" key="dashboard">
          <div className="dashboard-header-row">
            <h2 className="page-title">Document Requests Dashboard</h2>
            <button className="new-request-btn" onClick={() => setView('new-request')}>
              <img src={pluslogo} alt="Plus Logo" className="btn-plus-asset" />
              REQUEST A DOCUMENT
            </button>
          </div>

          <div className="status-grid">
            <div className="stat-card"><span className="stat-label">Total Requests</span><span className="stat-value blue">{stats.total}</span></div>
            <div className="stat-card"><span className="stat-label">Pending</span><span className="stat-value red">{stats.Pending}</span></div>
            <div className="stat-card"><span className="stat-label">Processing</span><span className="stat-value orange">{stats.Processing}</span></div>
            <div className="stat-card"><span className="stat-label">Ready for Pickup</span><span className="stat-value green">{stats['Ready for Pickup']}</span></div>
            <div className="stat-card"><span className="stat-label">Out for Delivery</span><span className="stat-value teal">{stats['Out for Delivery']}</span></div>
            <div className="stat-card"><span className="stat-label">Completed</span><span className="stat-value yellow">{stats.Completed}</span></div>
          </div>

          <div className="table-controls-row">
            <div className="control-item">
              <label>Search:</label>
              <input
                type="text"
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search requests"
              />
            </div>
            <div className="control-item">
              <label>Filter by:</label>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-outer-card">
            <div className="table-scroll-area">
              <table className="main-table">
                <thead>
                  <tr>
                    <th className="check-column-head"></th>
                    <th>Request ID</th>
                    <th>Document Type</th>
                    <th>Copies</th>
                    <th>Delivery Method</th>
                    <th>Total Fee</th>
                    <th>Date Requested</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td className="table-loading" colSpan="8">Loading requests...</td>
                    </tr>
                  )}
                  {!isLoading && error && (
                    <tr>
                      <td className="table-error" colSpan="8">{error}</td>
                    </tr>
                  )}
                  {!isLoading && !error && filteredRequests.length === 0 && (
                    <tr>
                      <td className="table-empty" colSpan="8">No requests found.</td>
                    </tr>
                  )}
                  {!isLoading && !error && filteredRequests.map((req) => (
                    <tr key={req._id}>
                      <td className="check-column-cell"><input type="checkbox" /></td>
                      <td>{req._id}</td>
                      <td>{req.documentType || '-'}</td>
                      <td>{req.copies ?? '-'}</td>
                      <td>{formatDeliveryMethod(req.deliveryMethod)}</td>
                      <td>{formatCurrency(req.totalFee)}</td>
                      <td>{formatDate(req.createdAt)}</td>
                      <td>{req.status || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* New Action Buttons Section */}
          <div className="dashboard-footer-actions">
            {/* Wrap the right-side buttons in a sub-container */}
            <div className="right-actions">
              <button className="action-btn view-btn">VIEW DETAILS</button>
              <button className="action-btn delete-btn">DELETE</button>
            </div>
          </div>
        </main>
      ) : (
        <DocumentRequest onBack={() => setView('dashboard')} />
      )}
    </div>
  )
}

export default App
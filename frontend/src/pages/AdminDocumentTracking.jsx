import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDocumentTracking.css';
import logo from '../assets/NU_shield.png';
import {
  Menu,
  LayoutGrid,
  FileText,
  Users,
  LogOut,
  ChevronDown,
  PackageOpen,
  Search,
  ChevronRight,
  RotateCcw,
  RefreshCw,
  ClipboardCheck,
  UserRound,
  CalendarDays,
  Truck,
  Hash,
  Copy,
  DollarSign,
} from 'lucide-react';

const STATUS_FLOW = [
  {
    key: 'waiting for payment',
    label: 'Waiting for Payment',
    className: 'waiting',
    icon: RotateCcw,
  },
  {
    key: 'processing',
    label: 'Processing',
    className: 'processing',
    icon: RefreshCw,
  },
  {
    key: 'ready for pickup / delivery',
    label: 'Ready for Pickup / Delivery',
    className: 'ready',
    icon: PackageOpen,
  },
  {
    key: 'completed',
    label: 'Completed',
    className: 'completed',
    icon: ClipboardCheck,
  },
];

const STATUS_LABELS = {
  'waiting for payment': 'Waiting for Payment',
  processing: 'Processing',
  'ready for pickup / delivery': 'Ready for Pickup / Delivery',
  completed: 'Completed',
};

const SAMPLE_REQUESTS = [
  {
    _id: 'r1',
    documentType: 'Transcript of Records (TOR)',
    full_name: 'Juan Dela Cruz',
    studentId: '2020-000123',
    trackingNumber: 'NUL 2026-0409-001',
    requestId: 'NUL 2026-0409-001',
    requestDateShort: '04/09/2026',
    requestDateLong: 'April 9, 2026 - 2:30 PM',
    status: 'waiting for payment',
    requestedBy: 'Juan Dela Cruz',
    deliveryMethod: 'Pick-up',
    purpose: 'Employment',
    copies: 1,
    documentFee: '₱1,060',
  },
  {
    _id: 'r2',
    documentType: 'Diploma',
    full_name: 'Dubai Chewy A. Cookie',
    studentId: '2019-88161',
    trackingNumber: 'NUL 2026-0408-100',
    requestId: 'NUL 2026-0408-100',
    requestDateShort: '04/08/2026',
    requestDateLong: 'April 8, 2026 - 11:54 AM',
    status: 'processing',
    requestedBy: 'Dubai Chewy A. Cookie',
    deliveryMethod: 'Delivery',
    purpose: 'Scholarship',
    copies: 1,
    documentFee: '₱1,500',
  },
  {
    _id: 'r3',
    documentType: 'Good Moral Certificate',
    full_name: 'Ilocos A. Empanada',
    studentId: '2019-12395',
    trackingNumber: 'NUL 2026-0408-099',
    requestId: 'NUL 2026-0408-099',
    requestDateShort: '04/08/2026',
    requestDateLong: 'April 8, 2026 - 09:20 AM',
    status: 'ready for pickup / delivery',
    requestedBy: 'Ilocos A. Empanada',
    deliveryMethod: 'Pick-up',
    purpose: 'Further Studies',
    copies: 2,
    documentFee: '₱1,060',
  },
  {
    _id: 'r4',
    documentType: 'Certificate of Completion',
    full_name: 'Frank Dagat',
    studentId: '2018-55671',
    trackingNumber: 'NUL 2026-0408-098',
    requestId: 'NUL 2026-0408-098',
    requestDateShort: '04/07/2026',
    requestDateLong: 'April 7, 2026 - 01:10 PM',
    status: 'completed',
    requestedBy: 'Frank Dagat',
    deliveryMethod: 'Delivery',
    purpose: 'Personal Record',
    copies: 1,
    documentFee: '₱1,060',
  },
];

const MetaCell = ({ icon: Icon, label, primary, secondary, className = '' }) => (
  <div className={`detail-cell ${className}`.trim()}>
    <Icon className="detail-cell-icon" size={20} strokeWidth={2.1} />
    <div className="detail-cell-copy">
      <span className="detail-cell-label">{label}</span>
      <strong className="detail-cell-primary">{primary}</strong>
      {secondary ? <span className="detail-cell-secondary">{secondary}</span> : null}
    </div>
  </div>
);

const AdminDocumentTracking = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState(SAMPLE_REQUESTS);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showToast, setShowToast] = useState(false);

  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return requests;

    return requests.filter((item) => {
      return (
        item.documentType.toLowerCase().includes(q) ||
        item.full_name.toLowerCase().includes(q) ||
        item.studentId.toLowerCase().includes(q) ||
        item.trackingNumber.toLowerCase().includes(q) ||
        item.requestId.toLowerCase().includes(q)
      );
    });
  }, [searchTerm, requests]);

  const selectedRequest = useMemo(() => {
    return requests.find((item) => item._id === selectedRequestId) || null;
  }, [requests, selectedRequestId]);

  const activeStatusIndex = useMemo(() => {
    if (!selectedRequest) return 0;
    const idx = STATUS_FLOW.findIndex(
      (step) => step.key === String(selectedRequest.status || '').toLowerCase()
    );
    return idx >= 0 ? idx : 0;
  }, [selectedRequest]);

  const handleLogout = () => {
    navigate('/login');
  };

  const statusClass = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('waiting')) return 'waiting';
    if (normalized.includes('processing')) return 'processing';
    if (normalized.includes('ready')) return 'ready';
    if (normalized.includes('completed')) return 'completed';
    return 'waiting';
  };

  const getStatusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();
    return STATUS_LABELS[normalized] || String(status || '');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    if (filteredRequests.length === 1) {
      setSelectedRequestId(filteredRequests[0]._id);
    }
  };

  const handleAdvanceStatus = () => {
    if (!selectedRequest) return;

    const currentIndex = STATUS_FLOW.findIndex(
      (step) => step.key === String(selectedRequest.status || '').toLowerCase()
    );

    if (currentIndex < 0 || currentIndex >= STATUS_FLOW.length - 1) {
      return;
    }

    const nextStatus = STATUS_FLOW[currentIndex + 1].key;

    setRequests((prev) =>
      prev.map((item) =>
        item._id === selectedRequest._id ? { ...item, status: nextStatus } : item
      )
    );

    setShowToast(true);
  };

  useEffect(() => {
    if (!showToast) return undefined;

    const timer = setTimeout(() => {
      setShowToast(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, [showToast, selectedRequestId]);

  const progressWidth = selectedRequest
    ? `${Math.min((activeStatusIndex + 1) * 25, 100)}%`
    : '25%';

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
            onClick={() => navigate('/admin-dashboard')}
          >
            <LayoutGrid size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Dashboard</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            aria-label="Requests"
            onClick={() => navigate('/admin-document-requests')}
          >
            <FileText size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Requests</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            aria-label="Alumni Verification"
            onClick={() => navigate('/admin-alumni-verification')}
          >
            <Users size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Alumni Verification</span>
          </button>

          <button
            type="button"
            className="sidebar-link active"
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
          <section className="tracking-header">
            <h1>DOCUMENT TRACKING</h1>
            {!selectedRequest && (
              <p>Search and track document requests by tracking number</p>
            )}
          </section>

          {!selectedRequest ? (
            <>
              <section className="tracking-search-card">
                <form className="tracking-search-wrap" onSubmit={handleSearchSubmit}>
                  <div className="tracking-search-input-wrap">
                    <Search className="tracking-search-icon" size={26} strokeWidth={2.2} />
                    <input
                      type="text"
                      className="tracking-search-input"
                      placeholder="Search by Name, ID, tracking number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="tracking-search-btn">
                    Search
                  </button>
                </form>
              </section>

              <section className="tracking-list-section">
                <h2>Recent Document Requests</h2>

                <div className="tracking-list">
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        className="tracking-card tracking-card-button"
                        onClick={() => setSelectedRequestId(item._id)}
                      >
                        <div className="tracking-card-left">
                          <div className="tracking-card-icon">
                            <FileText size={28} strokeWidth={2.1} />
                          </div>

                          <div className="tracking-card-text">
                            <strong>{item.documentType}</strong>
                            <span>
                              {item.full_name} &nbsp;&nbsp; {item.trackingNumber}
                            </span>
                          </div>
                        </div>

                        <div className={`tracking-status-pill ${statusClass(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="tracking-empty-card">
                      No matching requests found.
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="tracking-detail-view">
              <button
                type="button"
                className="tracking-back-btn"
                onClick={() => setSelectedRequestId(null)}
              >
                &lsaquo; Back to list
              </button>

              <section className="detail-summary-card">
                <div className="detail-summary-left">
                  <div className="detail-summary-icon">
                    <FileText size={34} strokeWidth={2.1} />
                  </div>

                  <div className="detail-summary-copy">
                    <h2>{selectedRequest.documentType}</h2>
                    <p>Request ID: {selectedRequest.requestId}</p>
                    <p>Request Date: {selectedRequest.requestDateShort}</p>
                  </div>
                </div>

                <div className={`tracking-status-pill detail-status-pill ${statusClass(selectedRequest.status)}`}>
                  {getStatusLabel(selectedRequest.status)}
                </div>
              </section>

              <section className="detail-progress-card">
                <div className="detail-progress-header">
                  <div>
                    <h3>Request Progress</h3>
                    <p>Track the status of your document request</p>
                  </div>

                  <button
                    type="button"
                    className="advance-status-btn"
                    onClick={handleAdvanceStatus}
                    disabled={activeStatusIndex >= STATUS_FLOW.length - 1}
                  >
                    ADVANCE STATUS
                    <ChevronRight size={18} strokeWidth={2.6} />
                  </button>
                </div>

                <div className="detail-progress-track">
                  <div className="detail-progress-fill" style={{ width: progressWidth }} />
                </div>

                <div className="status-steps">
                  {STATUS_FLOW.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === activeStatusIndex;

                    return (
                      <div
                        key={step.key}
                        className={`status-step ${step.className} ${isActive ? 'active' : ''}`}
                      >
                        <div className="status-step-icon">
                          <Icon size={isActive ? 58 : 48} strokeWidth={2.2} />
                        </div>
                        <div className="status-step-label">{step.label}</div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="detail-details-card">
                <h3>Request Details</h3>

                <div className="detail-row-grid">
                  <MetaCell
                    icon={UserRound}
                    label="Requested By"
                    primary={selectedRequest.requestedBy}
                    secondary={selectedRequest.studentId}
                  />
                  <MetaCell
                    icon={CalendarDays}
                    label="Request Date"
                    primary={selectedRequest.requestDateLong}
                  />
                  <MetaCell
                    icon={Truck}
                    label="Delivery Method"
                    primary={selectedRequest.deliveryMethod}
                  />
                </div>

                <div className="detail-row-divider" />

                <div className="detail-row-grid">
                  <MetaCell
                    icon={FileText}
                    label="Document Type"
                    primary={selectedRequest.documentType}
                  />
                  <MetaCell
                    icon={Copy}
                    label="Number of Copies"
                    primary={String(selectedRequest.copies)}
                  />
                  <MetaCell
                    icon={Hash}
                    label="Tracking Number"
                    primary={selectedRequest.trackingNumber}
                  />
                </div>

                <div className="detail-row-divider" />

                <div className="detail-row-grid detail-row-grid-last">
                  <MetaCell
                    icon={DollarSign}
                    label="Purpose"
                    primary={selectedRequest.purpose}
                  />
                  <MetaCell
                    icon={DollarSign}
                    label="Document Fee"
                    primary={selectedRequest.documentFee}
                  />
                  <div className="detail-cell detail-cell-empty" aria-hidden="true" />
                </div>

                {showToast && (
                  <div className="status-toast">
                    <span className="status-toast-icon">✓</span>
                    <span>Status updated successfully</span>
                  </div>
                )}
              </section>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDocumentTracking;
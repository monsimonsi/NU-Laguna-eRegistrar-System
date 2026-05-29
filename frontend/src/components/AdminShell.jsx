import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/AdminShell.css';
import logo from '../assets/NU_shield.png';
import {
  Menu,
  LayoutGrid,
  FileText,
  Users,
  LogOut,
  PackageOpen,
} from 'lucide-react';
import { apiFetch, clearSession, getStoredUser } from '../api';
import NotificationsPanel from './NotificationsPanel';

const AdminShell = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarHover, setSidebarHover] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [adminName, setAdminName] = useState(() => getStoredUser()?.full_name || 'ADMIN');

  const isSidebarOpen = sidebarPinned || sidebarHover;
  const isDashboardActive = location.pathname === '/admin-dashboard';
  const isRequestsActive = location.pathname === '/admin-document-requests';
  const isAlumniVerificationActive = location.pathname === '/admin-alumni-verification';
  const isDocumentTrackingActive = location.pathname === '/admin-document-tracking';

  const handleSidebarToggle = () => {
    setSidebarPinned((prev) => !prev);
  };

  const handleLogout = () => {
    clearSession();
    navigate('/admin-login');
  };

  useEffect(() => {
    let isActive = true;

    const loadCurrentUser = async () => {
      const { res, data } = await apiFetch('/api/users/me');
      if (!res.ok) return;
      const name = String(data?.user?.full_name || '').trim();
      if (isActive && name) {
        setAdminName(name);
      }
    };

    loadCurrentUser();

    return () => {
      isActive = false;
    };
  }, []);

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
          <span className="sidebar-user-label">{adminName}</span>
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
            className={`sidebar-link ${isRequestsActive ? 'active' : ''}`}
            aria-label="Document Requests"
            onClick={() => navigate('/admin-document-requests')}
          >
            <FileText size={24} strokeWidth={2.2} />
            <span className="sidebar-text">Document Requests</span>
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
            type="button"
            className={`sidebar-link ${isDocumentTrackingActive ? 'active' : ''}`}
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

          <div className="admin-topbar-actions">
            <NotificationsPanel />
          </div>
        </header>

        {children}
      </div>
    </div>
  );
};

export default AdminShell;

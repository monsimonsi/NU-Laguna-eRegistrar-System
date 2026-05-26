import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import logo from '../assets/NU_shield.png';
import settingslogo from '../assets/settings-icon.png';
import tracklogo from '../assets/track-icon.png';
import submitlogo from '../assets/submit-icon.png';
import logoutlogo from '../assets/logout-icon.png';
import { clearSession } from '../api';

const StudentShell = ({ activeItem = '', children }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = (event) => {
    event.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const navClass = (key) =>
    `sidebar-link${activeItem === key ? ' active-link' : ''}`;

  return (
    <div
      className={`app-container ${isOpen ? 'sidebar-open' : ''}`}
      onClick={closeSidebar}
    >
      <div
        className={`overlay ${isOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      <header className="main-header">
        <div className="header-left">
          <div className="menu-burger" onClick={toggleSidebar}>
            ☰
          </div>
          <button
            type="button"
            className="header-brand"
            onClick={() => handleNavigate('/dashboard')}
          >
            <img src={logo} alt="Logo" className="nav-logo" />
            <span className="system-name">NU Laguna e-Registrar</span>
          </button>
        </div>
      </header>

      <div
        className={`sidebar ${isOpen ? 'active' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <nav className="sidebar-nav">
          {/* Fix 3: tabIndex={-1} prevents focus ring on click */}
          <div
            className={navClass('submit')}
            tabIndex={-1}
            onClick={() => handleNavigate('/document-request')}
          >
            <img src={submitlogo} alt="Submit Logo" className="sidebar-icon" />
            <span className="sidebar-label">Submit Document Requests</span>
          </div>
          <div
            className={navClass('track')}
            tabIndex={-1}
            onClick={() => handleNavigate('/my-requests')}
          >
            <img src={tracklogo} alt="Track Logo" className="sidebar-icon" />
            <span className="sidebar-label">Track Document Requests</span>
          </div>
          <div
            className={navClass('profile')}
            tabIndex={-1}
            onClick={() => handleNavigate('/account-profile')}
          >
            <img src={settingslogo} alt="Settings Logo" className="sidebar-icon" />
            <span className="sidebar-label">Account Profile</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div
            className="sidebar-link logout-sidebar"
            tabIndex={-1}
            onClick={handleLogout}
          >
            <img src={logoutlogo} alt="Logout Logo" className="sidebar-icon" />
            <span className="sidebar-label">LOG OUT</span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
};

export default StudentShell;
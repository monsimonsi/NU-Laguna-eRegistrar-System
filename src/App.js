import { useState } from 'react';
import './App.css';
import PaymentPage from './PaymentPage';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('dashboard');

  const toggleSidebar = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className={`app-container ${isOpen ? 'sidebar-open' : ''}`} onClick={() => setIsOpen(false)}>
      <header className="main-header">
        <div className="header-left">
          <div className="menu-burger" onClick={toggleSidebar}>☰</div>
          <img src="/assets/nu-logo-left.png" alt="Logo" className="nav-logo" />
          <span className="system-name">NU Laguna e-Registrar</span>
        </div>
      </header>

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? 'active' : ''}`} onClick={(e) => e.stopPropagation()}>
        <nav className="sidebar-nav">
          <div className="sidebar-link" onClick={() => { setView('dashboard'); setIsOpen(false); }}>
            <img src="/assets/submit-icon.png" alt="" className="sidebar-icon" />
            Submit Document Requests
          </div>
          <div className="sidebar-link" onClick={() => { setView('dashboard'); setIsOpen(false); }}>
            <img src="/assets/track-icon.png" alt="" className="sidebar-icon" />
            Track Document Requests
          </div>
          <div className="sidebar-link">
            <img src="/assets/settings-icon.png" alt="" className="sidebar-icon" />
            Account Settings
          </div>
        </nav>
        
        <div className="sidebar-footer">
          <div className="sidebar-link logout-sidebar" onClick={() => { /* Logout Logic */ }}>
            <img src="/assets/logout-icon.png" alt="" className="sidebar-icon" />
            LOG OUT
          </div>
        </div>
      </div>

      <div className="content-area">
        <PaymentPage />
      </div>
    </div>
  );
}

export default App;
import { useState } from 'react'
import '../styles/Dashboard.css'
import DocumentRequest from './DocumentRequest'
import logo from '../assets/NU_shield.png'
import settingslogo from '../assets/settings-icon.png'
import tracklogo from '../assets/track-icon.png'
import pluslogo from '../assets/plus-icon.png'
import submitlogo from '../assets/submit-icon.png'
import logoutlogo from '../assets/logout-icon.png'

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('dashboard');

  const toggleSidebar = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
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
          <div className="sidebar-link" onClick={() => { setView('dashboard'); setIsOpen(false); }}>
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
          <div className="sidebar-link logout-sidebar" onClick={() => { /* Logout Logic */ }}>
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
            <h2 className="page-title">Document Requests List</h2>
            <button className="new-request-btn" onClick={() => setView('new-request')}>
              <img src={pluslogo} alt="Plus Logo" className="btn-plus-asset" />
              NEW REQUEST
            </button>
          </div>

          <div className="status-grid">
            <div className="stat-card"><span className="stat-label">Total Requests</span><span className="stat-value blue">0</span></div>
            <div className="stat-card"><span className="stat-label">Pending</span><span className="stat-value red">0</span></div>
            <div className="stat-card"><span className="stat-label">Processing</span><span className="stat-value orange">0</span></div>
            <div className="stat-card"><span className="stat-label">Ready</span><span className="stat-value green">0</span></div>
            <div className="stat-card"><span className="stat-label">Completed</span><span className="stat-value yellow">0</span></div>
          </div>

          <div className="table-controls-row">
            <div className="control-item">
              <label>Search:</label>
              <input type="text" className="search-input" />
            </div>
            <div className="control-item">
              <label>Filter by:</label>
              <select className="filter-select"><option></option></select>
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
                    <th>Document Fee</th>
                    <th>Copies</th>
                    <th>Date Requested</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td className="check-column-cell"><input type="checkbox" /></td>
                      <td></td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* New Action Buttons Section */}
          <div className="dashboard-footer-actions">
            <button className="action-btn back-btn">BACK</button>
  {/* Wrap the right-side buttons in a sub-container */}
  <div className="right-actions">
            <button className="action-btn view-btn">VIEW</button>
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
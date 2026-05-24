import React, { useState } from 'react';
import '../styles/AccountProfile.css';
import submitIcon from '../assets/submit-icon.png';
import trackIcon from '../assets/track-icon.png';
import settingsIcon from '../assets/settings-icon.png';
import logoutIcon from '../assets/logout-icon.png';
import profileIcon from '../assets/profile-icon.png';
import nuLogoLeft from '../assets/nu-logo-left.png';
import idNumberIcon from '../assets/idnumber-icon.png';
import departmentIcon from '../assets/department-icon.png';
import emailAddressIcon from '../assets/emailaddress-icon.png';

const AccountProfile = ({ onBack }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <div className="header-left">
          <span className="menu-burger" onClick={toggleSidebar}>☰</span>
          <img src={nuLogoLeft} alt="NU" className="nav-logo" />
          <span className="system-name">NU Laguna e-Registrar</span>
        </div>
      </header>

      <aside className={`sidebar ${sidebarOpen ? 'active' : ''}`}>
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            <div className="sidebar-link">
              <img src={submitIcon} alt="submit" className="sidebar-icon" />
              <span>Submit Document Requests</span>
            </div>
            <div className="sidebar-link">
              <img src={trackIcon} alt="track" className="sidebar-icon" />
              <span>Track Document Requests</span>
            </div>
            <div className="sidebar-link active-link">
              <img src={settingsIcon} alt="settings" className="sidebar-icon" />
              <span>Account Settings</span>
            </div>
          </nav>
        </div>
        <footer className="sidebar-footer">
          <div className="logout-sidebar">
            <img src={logoutIcon} alt="logout" className="sidebar-icon" />
            <span>LOG OUT</span>
          </div>
        </footer>
      </aside>

      <main className="alumni-page">
        <div className="container">
          <div className="back-nav">
            <span onClick={() => onBack && onBack()}>&lt; Back to Dashboard</span>
          </div>

          <div className="profile-card">
            <div className="profile-top">
              <img src={profileIcon} alt="avatar" className="avatar" />

              <div className="profile-info">
                <h2 className="name">Dela Cruz, Juan</h2>
                <ul className="meta-list">
                  <li>
                    <img src={idNumberIcon} alt="id" className="meta-icon" />
                    <span className="meta-key">ID Number</span>
                    <span className="meta-val">2023-123456</span>
                  </li>
                  <li>
                    <img src={departmentIcon} alt="department" className="meta-icon" />
                    <span className="meta-key">Department</span>
                    <span className="meta-val">School of Computer Studies</span>
                  </li>
                  <li>
                    <img src={emailAddressIcon} alt="email" className="meta-icon" />
                    <span className="meta-key">Email Address</span>
                    <span className="meta-val">juandelacruz@gmail.com</span>
                  </li>
                </ul>
              </div>

              <button className="edit-btn">EDIT</button>
            </div>

            <div className="divider" />

            <section className="about-me">
              <h4>About Me</h4>
              <div className="about-grid">
                <label>First Name</label>
                <div className="input-box" />

                <label>Last Name</label>
                <div className="input-box" />

                <label>Student ID</label>
                <div className="input-box" />

                <label>Program</label>
                <div className="input-box" />

                <label>Year Graduated</label>
                <div className="input-box" />

                <label>Email Address</label>
                <div className="input-box" />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AccountProfile;

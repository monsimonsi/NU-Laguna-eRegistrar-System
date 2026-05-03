import React from 'react';
import '../styles/login.css';

import nuLogo from '../assets/nu logo left.png';
import bgImg from '../assets/nubg.jpg';
import studentBtn from '../assets/student login button.png';
import alumniBtn from '../assets/alumni login button.png';
import adminBtn from '../assets/admin login button.png';

const Login = () => {
  return (
    <div className="login-wrapper">
      <div className="bg-image" style={{ backgroundImage: `linear-gradient(rgba(191, 194, 230, 0.5), rgba(191, 194, 230, 0.5)), url(${bgImg})` }}></div>
      <div className="top-logo">
        <img src={nuLogo} alt="Logo" />
      </div>
      <div className="login-card">
        <h2>LOG IN</h2>
        <div className="icon-container">
          <div className="icon-box"><img src={studentBtn} alt="Student" /></div>
          <div className="divider"></div>
          <div className="icon-box"><img src={alumniBtn} alt="Alumni" /></div>
          <div className="divider"></div>
          <div className="icon-box"><img src={adminBtn} alt="Admin" /></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
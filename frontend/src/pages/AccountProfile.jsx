import React, { useCallback, useEffect, useState } from 'react';
import '../styles/AccountProfile.css';
import { apiFetch } from '../api';
import StudentShell from '../components/StudentShell';
import profileIcon from '../assets/profile-icon.png';
import idNumberIcon from '../assets/idnumber-icon.png';
import departmentIcon from '../assets/department-icon.png';
import emailAddressIcon from '../assets/emailaddress-icon.png';
import { useNavigate } from 'react-router-dom';

const formatRole = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const AccountProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    fullName: '-',
    email: '-',
    idNum: '-',
    department: '-',
    program: '-',
    role: '-'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const isAlumni = String(profile.role || '').trim().toLowerCase() === 'alumni';

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const { res, data } = await apiFetch('/api/users/me', { auth: true });

      if (!res.ok) {
        setLoadError(data.message || 'Failed to load profile.');
        return;
      }

      const user = data.user || {};
      setProfile({
        fullName: user.full_name || '-',
        email: user.email || '-',
        idNum: user.id_num || '-',
        department: user.department || '-',
        program: user.program || '-', 
        role: formatRole(user.role)
      });
    } catch (error) {
      console.error('Failed to load profile', error);
      setLoadError('Cannot connect to server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <StudentShell>
      <main className="account-profile-main">
        <div className="profile-back-row">
          <button className="back-btn" onClick={() => navigate(-1)}>
            &lsaquo; Back
          </button>
        </div>

        <div className="container profile-centered">
          <div className="profile-card">
            <div className="profile-top">
              <img src={profileIcon} alt="avatar" className="avatar" />

              <div className="profile-info">
                <h2 className="name">{profile.fullName}</h2>
                <ul className="meta-list">
                  {!isAlumni && (
                    <li>
                      <img src={idNumberIcon} alt="id" className="meta-icon" />
                      <span className="meta-key">ID Number</span>
                      <span className="meta-val">{profile.idNum}</span>
                    </li>
                  )}
                  {!isAlumni && (
                    <li>
                      <img src={departmentIcon} alt="department" className="meta-icon" />
                      <span className="meta-key">Department</span>
                      <span className="meta-val">{profile.department}</span>
                    </li>
                  )}
                  <li>
                    <img src={emailAddressIcon} alt="email" className="meta-icon" />
                    <span className="meta-key">Email Address</span>
                    <span className="meta-val">{profile.email}</span>
                  </li>
                </ul>
                {loadError && <p className="profile-error">{loadError}</p>}
                {isLoading && <p className="profile-loading">Loading profile...</p>}
              </div>
            </div>

            <div className="divider" />

            <section className="about-me">
              <h4>About Me</h4>
              <div className="about-grid">
                <label>Full Name</label>
                <div className="input-box">{profile.fullName}</div>

                {!isAlumni && (
                  <>
                    <label>Student ID</label>
                    <div className="input-box">{profile.idNum}</div>
                  </>
                )}

                {!isAlumni && (
                  <>
                    <label>Program</label>
                    <div className="input-box">{profile.program}</div>
                  </>
                )}

                <label>Role</label>
                <div className="input-box">{profile.role}</div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </StudentShell>
  );
};

export default AccountProfile;
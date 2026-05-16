import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, FileText } from 'lucide-react';
import logo from '../assets/NU_shield.png';
import { API_BASE, authHeaders } from '../api';
import '../styles/DocumentRequest.css';

const RequestTracking = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/me/requests`, {
          headers: authHeaders(false)
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || 'Could not load requests.');
          return;
        }
        if (!cancelled) setRequests(data.requests || []);
      } catch {
        if (!cancelled) setError('Cannot reach the server.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="doc-page">
      <header className="doc-topbar">
        <button className="doc-menu-btn" aria-label="Menu" type="button">
          <Menu size={30} strokeWidth={2.5} />
        </button>

        <button type="button" className="doc-brand" onClick={() => navigate('/dashboard')}>
          <img src={logo} alt="NU Logo" className="doc-logo" />
          <span className="doc-title">NU Laguna e-Registrar</span>
        </button>
      </header>

      <main className="doc-main">
        <div className="doc-back-row">
          <Link to="/document-request" className="doc-back-link">
            &lsaquo; New request
          </Link>
        </div>

        <section className="doc-card">
          <div className="doc-card-header">
            <FileText className="doc-card-icon" size={34} strokeWidth={2.2} />
            <div>
              <h1>My document requests</h1>
              <p>Track status using your tracking number.</p>
            </div>
          </div>

          {loading && <p style={{ padding: '1rem' }}>Loading…</p>}
          {error && <p style={{ padding: '1rem', color: '#b91c1c' }}>{error}</p>}

          {!loading && !error && requests.length === 0 && (
            <p style={{ padding: '1rem', color: '#64748b' }}>You have no requests yet.</p>
          )}

          {!loading && requests.length > 0 && (
            <div className="table-wrap" style={{ overflowX: 'auto', padding: '0 0 1rem' }}>
              <table className="request-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 6px' }}>Tracking #</th>
                    <th style={{ padding: '8px 6px' }}>Document</th>
                    <th style={{ padding: '8px 6px' }}>Status</th>
                    <th style={{ padding: '8px 6px' }}>Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 6px', fontWeight: 600 }}>{r.trackingNumber || '—'}</td>
                      <td style={{ padding: '10px 6px' }}>{r.documentType}</td>
                      <td style={{ padding: '10px 6px' }}>{r.status}</td>
                      <td style={{ padding: '10px 6px', color: '#64748b' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default RequestTracking;

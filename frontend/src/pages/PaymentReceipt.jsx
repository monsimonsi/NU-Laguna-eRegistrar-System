import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logo from '../assets/NU_shield.png';
import { API_BASE, apiFetch, formatPhp, getStoredToken } from '../api';
import '../styles/PaymentReceipt.css';

const PaymentReceipt = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');

  const loadReceipt = useCallback(async () => {
    if (!requestId) {
      setLoading(false);
      setError('Missing request reference.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { res, data } = await apiFetch(
        `/api/requests/${encodeURIComponent(requestId)}/payment/receipt`,
        { method: 'GET', auth: true, json: false }
      );

      if (!res.ok) {
        setError(data.message || 'Receipt not available.');
        return;
      }

      setReceipt(data.receipt || null);
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadReceipt();
  }, [loadReceipt]);

  const downloadPdf = async () => {
    if (!requestId || !receipt) return;

    setDownloading(true);
    setDownloadError('');

    try {
      const token = getStoredToken();
      const res = await fetch(
        `${API_BASE}/api/requests/${encodeURIComponent(requestId)}/payment/receipt/pdf`,
        {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDownloadError(data.message || 'Could not download PDF.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${receipt.receiptNumber || requestId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Cannot connect to server.');
    } finally {
      setDownloading(false);
    }
  };

  const paidDate = receipt?.paidAt
    ? new Date(receipt.paidAt).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '—';

  const amountPhp =
    receipt?.amountCentavos != null ? Number(receipt.amountCentavos) / 100 : null;

  return (
    <div className="payment-page receipt-page">
      <header className="payment-topbar">
        <button type="button" className="payment-brand" onClick={() => navigate('/dashboard')}>
          <img src={logo} alt="NU Logo" className="payment-logo" />
          <span className="payment-brand-title">NU Laguna e-Registrar</span>
        </button>
      </header>

      <div className="payment-container">
        <div className="payment-wrapper receipt-wrapper">
          {loading && <p className="payment-feedback">Loading receipt…</p>}
          {error && <p className="payment-feedback payment-feedback--error">{error}</p>}

          {!loading && receipt && (
            <div className="receipt-card">
              <div className="receipt-header">
                <img src={logo} alt="NU" className="receipt-logo" />
                <div>
                  <h1 className="receipt-title">Official Payment Receipt</h1>
                  <p className="receipt-subtitle">NU Laguna e-Registrar System</p>
                </div>
              </div>

              <div className="receipt-meta">
                <div>
                  <span className="receipt-label">Receipt No.</span>
                  <strong>{receipt.receiptNumber}</strong>
                </div>
                <div>
                  <span className="receipt-label">Date paid</span>
                  <strong>{paidDate}</strong>
                </div>
              </div>

              <hr className="receipt-divider" />

              <div className="receipt-section">
                <h2>Payer details</h2>
                <div className="receipt-row">
                  <span>Name</span>
                  <strong>{receipt.payerName || '—'}</strong>
                </div>
                <div className="receipt-row">
                  <span>{receipt.paymentMethod?.includes('Maya') ? 'Maya' : 'GCash'} number</span>
                  <strong>{receipt.payerMobile || '—'}</strong>
                </div>
                <div className="receipt-row">
                  <span>Email</span>
                  <strong>{receipt.payerEmail || '—'}</strong>
                </div>
              </div>

              <div className="receipt-section">
                <h2>Payment details</h2>
                <div className="receipt-row">
                  <span>Document</span>
                  <strong>{receipt.documentType}</strong>
                </div>
                <div className="receipt-row">
                  <span>Tracking no.</span>
                  <strong>{receipt.trackingNumber || receipt.requestId}</strong>
                </div>
                <div className="receipt-row">
                  <span>Payment method</span>
                  <strong>{receipt.paymentMethod || '—'}</strong>
                </div>
                <div className="receipt-row">
                  <span>Transaction ref.</span>
                  <strong className="receipt-ref">{receipt.transactionReference || '—'}</strong>
                </div>
                <div className="receipt-row receipt-total">
                  <span>Amount paid</span>
                  <strong>{formatPhp(amountPhp)}</strong>
                </div>
              </div>

              <p className="receipt-footer">
                Download a PDF copy for your records, or return to your dashboard.
              </p>
            </div>
          )}

          {!loading && receipt && (
            <div className="receipt-actions">
              <button
                type="button"
                className="receipt-download-btn"
                disabled={downloading}
                onClick={downloadPdf}
              >
                {downloading ? 'PREPARING PDF…' : 'DOWNLOAD RECEIPT (PDF)'}
              </button>
              <button type="button" className="receipt-dashboard-btn" onClick={() => navigate('/dashboard')}>
                BACK TO DASHBOARD
              </button>
              {downloadError && (
                <p className="payment-feedback payment-feedback--error receipt-download-error">
                  {downloadError}
                </p>
              )}
            </div>
          )}

          {!loading && error && (
            <div className="receipt-actions">
              <button type="button" className="receipt-dashboard-btn" onClick={() => navigate('/dashboard')}>
                GO TO DASHBOARD
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentReceipt;

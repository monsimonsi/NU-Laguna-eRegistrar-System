import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, formatPhp } from '../api';
import '../styles/PaymentMock.css';
import '../styles/PaymentReceipt.css';

const providerFromPath = (pathname) => {
  if (pathname.includes('/maya')) return 'maya';
  return 'gcash';
};

const PaymentMock = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session') || '';

  const provider = providerFromPath(location.pathname);
  const apiPrefix = provider === 'maya' ? '/api/mock/maya/v1' : '/api/mock/gcash/v1';
  const walletLabel = provider === 'maya' ? 'Maya' : 'GCash';

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerMobile, setPayerMobile] = useState('');

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      setError('Invalid payment session.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { res, data } = await apiFetch(`${apiPrefix}/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        auth: true,
        json: false
      });

      if (!res.ok) {
        setError(data.message || 'Could not load payment session.');
        return;
      }

      const attrs = data.data?.attributes || data;
      setSession(attrs);

      if (attrs.paymentConfirmed || attrs.status === 'paid') {
        navigate(
          `/payment/receipt?requestId=${encodeURIComponent(attrs.requestId || '')}`
        );
      }
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, sessionId, navigate]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const goToReceipt = (requestId) => {
    if (requestId) {
      navigate(`/payment/receipt?requestId=${encodeURIComponent(requestId)}`);
      return;
    }
    navigate('/dashboard');
  };

  const confirmPayment = async () => {
    const digits = payerMobile.replace(/\D/g, '');
    if (!(digits.length === 11 && digits.startsWith('09'))) {
      setError(`Enter a valid ${walletLabel} number (09XXXXXXXXX).`);
      return;
    }

    setActing(true);
    setError('');
    try {
      const { res, data } = await apiFetch(
        `${apiPrefix}/sessions/${encodeURIComponent(sessionId)}/pay`,
        {
          method: 'POST',
          auth: true,
          body: JSON.stringify({
            payerMobile: digits,
            payerName: payerName.trim()
          })
        }
      );

      if (!res.ok) {
        setError(data.message || 'Payment could not be completed.');
        return;
      }

      const requestId = session?.requestId || data.request?._id;
      goToReceipt(requestId);
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setActing(false);
    }
  };

  const cancelPayment = async () => {
    setActing(true);
    setError('');
    try {
      const { res, data } = await apiFetch(
        `${apiPrefix}/sessions/${encodeURIComponent(sessionId)}/cancel`,
        { method: 'POST', auth: true }
      );

      if (!res.ok) {
        setError(data.message || 'Could not cancel payment.');
        return;
      }

      const requestId = session?.requestId;
      if (requestId) {
        navigate(`/payment?requestId=${encodeURIComponent(requestId)}`);
        return;
      }
      navigate('/dashboard');
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setActing(false);
    }
  };

  const amountPhp =
    session?.amountCentavos != null ? Number(session.amountCentavos) / 100 : 0;

  return (
    <div className={`mock-wallet mock-wallet--${provider}`}>
      <div className="mock-wallet-card">
        <div className="mock-wallet-header">
          <span className="mock-wallet-badge">SANDBOX</span>
          <h1 className="mock-wallet-title">{walletLabel}</h1>
          <p className="mock-wallet-subtitle">Imitation payment gateway for testing</p>
        </div>

        {loading && <p className="mock-wallet-message">Loading payment…</p>}
        {error && <p className="mock-wallet-message mock-wallet-message--error">{error}</p>}

        {!loading && session && (
          <>
            <div className="mock-wallet-amount-block">
              <p className="mock-wallet-label">Amount to pay</p>
              <p className="mock-wallet-amount">{formatPhp(amountPhp)}</p>
            </div>
            <div className="mock-wallet-details">
              <div className="mock-wallet-row">
                <span>Merchant</span>
                <strong>{session.merchantName || 'NU Laguna e-Registrar'}</strong>
              </div>
              <div className="mock-wallet-row">
                <span>For</span>
                <strong>{session.description || '—'}</strong>
              </div>
              {session.trackingNumber && (
                <div className="mock-wallet-row">
                  <span>Reference</span>
                  <strong>{session.trackingNumber}</strong>
                </div>
              )}
            </div>

            <div className="payer-details-card mock-payer-card">
              <h3 className="payer-details-title">{walletLabel} account details</h3>
              <div className="payer-field">
                <label htmlFor="mockPayerName">Account name</label>
                <input
                  id="mockPayerName"
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Name registered on e-wallet"
                />
              </div>
              <div className="payer-field">
                <label htmlFor="mockPayerMobile">{walletLabel} mobile number</label>
                <input
                  id="mockPayerMobile"
                  type="tel"
                  inputMode="numeric"
                  value={payerMobile}
                  onChange={(e) => setPayerMobile(e.target.value)}
                  placeholder="09XXXXXXXXX"
                  maxLength={11}
                />
              </div>
            </div>

            <p className="mock-wallet-hint">
              Enter your {walletLabel} details, then confirm. A receipt will be generated after payment.
            </p>
            <div className="mock-wallet-actions">
              <button
                type="button"
                className="mock-wallet-btn mock-wallet-btn--primary"
                disabled={acting}
                onClick={confirmPayment}
              >
                {acting ? 'Processing…' : `Pay with ${walletLabel}`}
              </button>
              <button
                type="button"
                className="mock-wallet-btn mock-wallet-btn--secondary"
                disabled={acting}
                onClick={cancelPayment}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentMock;

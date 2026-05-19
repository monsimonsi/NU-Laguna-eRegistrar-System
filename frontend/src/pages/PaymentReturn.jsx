import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logo from '../assets/NU_shield.png';
import { apiFetch } from '../api';
import '../styles/Payment.css';

const PaymentReturn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('Confirming your payment…');

  useEffect(() => {
    if (!requestId) {
      setStatus('error');
      setMessage('Missing request reference.');
      return;
    }

    let attempts = 0;
    let timer;

    const poll = async () => {
      attempts += 1;
      try {
        const { res, data } = await apiFetch(
          `/api/requests/${encodeURIComponent(requestId)}/payment`,
          { method: 'GET', auth: true, json: false }
        );

        if (res.ok && data.paymentConfirmed) {
          setStatus('success');
          setMessage('Payment successful! Your request is now with the registrar.');
          return;
        }

        if (attempts >= 12) {
          setStatus('pending');
          setMessage(
            'Payment is still processing. Check your dashboard in a moment or retry payment if needed.'
          );
          return;
        }

        timer = setTimeout(poll, 2500);
      } catch {
        setStatus('error');
        setMessage('Cannot connect to server.');
      }
    };

    poll();
    return () => clearTimeout(timer);
  }, [requestId]);

  return (
    <div className="payment-page">
      <header className="payment-topbar">
        <button type="button" className="payment-brand" onClick={() => navigate('/dashboard')}>
          <img src={logo} alt="NU Logo" className="payment-logo" />
          <span className="payment-brand-title">NU Laguna e-Registrar</span>
        </button>
      </header>
      <div className="payment-container">
        <div className="payment-wrapper payment-return-wrap">
          <h1 className="payment-title">Payment Status</h1>
          <p
            className={`payment-feedback payment-feedback--${
              status === 'success' ? 'success' : status === 'error' ? 'error' : ''
            }`}
          >
            {message}
          </p>
          <div className="payment-return-actions">
            {status === 'pending' && requestId && (
              <button
                type="button"
                className="pay-btn"
                onClick={() =>
                  navigate(`/payment?requestId=${encodeURIComponent(requestId)}`)
                }
              >
                RETRY PAYMENT
              </button>
            )}
            <button type="button" className="methods-back-btn" onClick={() => navigate('/dashboard')}>
              GO TO DASHBOARD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReturn;

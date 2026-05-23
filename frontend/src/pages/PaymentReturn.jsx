import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  ReceiptText,
  RefreshCw
} from 'lucide-react';
import logo from '../assets/NU_shield.png';
import { apiFetch } from '../api';
import '../styles/Payment.css';

const STATUS_VIEW = {
  checking: {
    eyebrow: 'Payment verification',
    title: 'Confirming your payment',
    icon: Loader2,
    tone: 'checking',
    note: 'This usually takes a few seconds.'
  },
  success: {
    eyebrow: 'Payment confirmed',
    title: 'Payment successful',
    icon: CheckCircle2,
    tone: 'success',
    note: 'Your receipt is ready.'
  },
  pending: {
    eyebrow: 'Still processing',
    title: 'Payment is taking longer',
    icon: Clock3,
    tone: 'pending',
    note: 'You may retry payment or check again from your dashboard.'
  },
  error: {
    eyebrow: 'Payment status unavailable',
    title: 'We could not confirm payment',
    icon: AlertCircle,
    tone: 'error',
    note: 'Please check your connection or return to the dashboard.'
  }
};

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
        if (attempts === 1) {
          await apiFetch(`/api/requests/${encodeURIComponent(requestId)}/payment/sync`, {
            method: 'POST',
            auth: true
          });
        }

        const { res, data } = await apiFetch(
          `/api/requests/${encodeURIComponent(requestId)}/payment`,
          { method: 'GET', auth: true, json: false }
        );

        if (res.ok && data.paymentConfirmed) {
          setStatus('success');
          setMessage('Payment successful! You can now view your receipt.');
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

  const view = STATUS_VIEW[status] || STATUS_VIEW.checking;
  const StatusIcon = view.icon;
  const showRetry = (status === 'pending' || status === 'error') && requestId;
  const showReceipt = status === 'success' && requestId;

  return (
    <div className="payment-page">
      <header className="payment-topbar">
        <button type="button" className="payment-brand" onClick={() => navigate('/dashboard')}>
          <img src={logo} alt="NU Logo" className="payment-logo" />
          <span className="payment-brand-title">NU Laguna e-Registrar</span>
        </button>
      </header>
      <div className="payment-container">
        <div className="payment-wrapper payment-return-wrap payment-status-wrap">
          <section className={`payment-status-card payment-status-card--${view.tone}`}>
            <div className="payment-status-main">
              <div className={`payment-status-icon payment-status-icon--${view.tone}`}>
                <StatusIcon size={36} strokeWidth={2.2} />
              </div>

              <div className="payment-status-copy">
                <p className="payment-status-eyebrow">{view.eyebrow}</p>
                <h1>{view.title}</h1>
                <p className="payment-status-message">{message}</p>
                <p className="payment-status-note">{view.note}</p>
              </div>
            </div>

            <div className="payment-status-steps" aria-label="Payment progress">
              <div className="payment-status-step complete">
                <span>1</span>
                <strong>Submitted</strong>
              </div>
              <div className={`payment-status-line ${status !== 'checking' ? 'complete' : ''}`} />
              <div className={`payment-status-step ${status === 'checking' ? 'active' : status === 'error' ? 'error' : 'complete'}`}>
                <span>2</span>
                <strong>{status === 'error' ? 'Review' : 'Confirm'}</strong>
              </div>
              <div className={`payment-status-line ${status === 'success' ? 'complete' : ''}`} />
              <div className={`payment-status-step ${status === 'success' ? 'complete' : ''}`}>
                <span>3</span>
                <strong>Receipt</strong>
              </div>
            </div>

            <div className="payment-status-actions">
              {showReceipt && (
                <button
                  type="button"
                  className="payment-status-btn primary"
                  onClick={() =>
                    navigate(`/payment/receipt?requestId=${encodeURIComponent(requestId)}`)
                  }
                >
                  <ReceiptText size={18} strokeWidth={2.3} />
                  View Receipt
                </button>
              )}

              {showRetry && (
                <button
                  type="button"
                  className="payment-status-btn primary"
                  onClick={() =>
                    navigate(`/payment?requestId=${encodeURIComponent(requestId)}`)
                  }
                >
                  <RefreshCw size={18} strokeWidth={2.3} />
                  Retry Payment
                </button>
              )}

              <button
                type="button"
                className="payment-status-btn secondary"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft size={18} strokeWidth={2.3} />
                Dashboard
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PaymentReturn;

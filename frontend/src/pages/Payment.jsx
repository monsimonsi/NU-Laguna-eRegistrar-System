import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/Payment.css';
import orderIcon from '../assets/order-icon.png';
import logo from '../assets/NU_shield.png';
import { apiFetch, formatPhp } from '../api';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const requestId =
    searchParams.get('requestId') ||
    location.state?.requestId ||
    location.state?.request?._id ||
    '';

  const [request, setRequest] = useState(location.state?.request || null);
  const [payment, setPayment] = useState(null);
  const [paymongoEnabled, setPaymongoEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadPaymentContext = useCallback(async () => {
    if (!requestId) {
      setLoading(false);
      setError('No request selected for payment.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { res, data } = await apiFetch(
        `/api/requests/${encodeURIComponent(requestId)}/payment`,
        { method: 'GET', auth: true, json: false }
      );

      if (!res.ok) {
        setError(data.message || 'Could not load payment details.');
        return;
      }

      setRequest(data.request || null);
      setPayment(data.payment || null);
      setPaymongoEnabled(data.paymongoEnabled !== false);

      if (data.paymentConfirmed) {
        setMessage('This request is already paid. The registrar will process it shortly.');
      }
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadPaymentContext();
  }, [loadPaymentContext]);

  const feeBreakdown = useMemo(() => {
    if (!request) return null;
    const base = Number(request.basePrice) || 0;
    const succeeding = Number(request.succeedingPagesFee) || 0;
    const delivery = Number(request.deliveryFee) || 0;
    const total = Number(request.totalFee) || base + succeeding + delivery;
    return { base, succeeding, delivery, total };
  }, [request]);

  const startCheckout = async (method) => {
    if (!requestId || request?.paymentConfirmed) return;

    setPaying(true);
    setError('');
    setMessage('');

    try {
      const { res, data } = await apiFetch(
        `/api/requests/${encodeURIComponent(requestId)}/payment/checkout`,
        { method: 'POST', body: JSON.stringify({ method }) }
      );

      if (!res.ok) {
        setError(data.message || data.detail || 'Could not start payment.');
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      setError('Payment provider did not return a checkout link.');
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setPaying(false);
    }
  };

  const isPaid = Boolean(request?.paymentConfirmed);

  return (
    <div className="payment-page">
      <header className="payment-topbar">
        <button type="button" className="payment-brand" onClick={() => navigate('/dashboard')}>
          <img src={logo} alt="NU Logo" className="payment-logo" />
          <span className="payment-brand-title">NU Laguna e-Registrar</span>
        </button>
      </header>

      <div className="payment-container">
        <div className="payment-wrapper">
          <h1 className="payment-title">Payment</h1>

          {loading && <p className="payment-feedback">Loading payment details…</p>}
          {error && <p className="payment-feedback payment-feedback--error">{error}</p>}
          {message && !error && (
            <p className="payment-feedback payment-feedback--success">{message}</p>
          )}

          {!loading && request && (
            <div className="cards-container">
              <div className="order-summary-card">
                <h2 className="summary-title">
                  <img src={orderIcon} alt="Order" className="title-icon" />
                  Order Summary
                </h2>
                <div className="summary-content">
                  <p className="doc-name">
                    <strong>{request.documentType}</strong>
                  </p>
                  <p className="summary-text">
                    Tracking: {request.trackingNumber || request._id}
                  </p>
                  <p className="summary-text">
                    Request Date:{' '}
                    {request.createdAt
                      ? new Date(request.createdAt).toLocaleDateString()
                      : '—'}
                  </p>
                  <hr className="divider" />
                  <div className="field-group">
                    <span className="label">Document Fee</span>
                    <span className="value">{formatPhp(feeBreakdown?.base)}</span>
                  </div>
                  {(feeBreakdown?.succeeding || 0) > 0 && (
                    <div className="field-group">
                      <span className="label">Succeeding Pages</span>
                      <span className="value">{formatPhp(feeBreakdown?.succeeding)}</span>
                    </div>
                  )}
                  {(feeBreakdown?.delivery || 0) > 0 && (
                    <div className="field-group">
                      <span className="label">Delivery Fee</span>
                      <span className="value">{formatPhp(feeBreakdown?.delivery)}</span>
                    </div>
                  )}
                  <hr className="divider" />
                  <div className="field-group total-group">
                    <span className="label">Total Amount</span>
                    <span className="total-price">{formatPhp(feeBreakdown?.total)}</span>
                  </div>
                </div>

                {isPaid ? (
                  <button type="button" className="pay-btn" onClick={() => navigate('/dashboard')}>
                    BACK TO DASHBOARD
                  </button>
                ) : paymongoEnabled ? (
                  <button
                    type="button"
                    className="pay-btn"
                    disabled={paying}
                    onClick={() => startCheckout('gcash')}
                  >
                    {paying ? 'STARTING…' : 'PAY WITH GCASH'}
                  </button>
                ) : (
                  <button type="button" className="pay-btn" onClick={() => navigate('/dashboard')}>
                    CONTINUE (DEV MODE)
                  </button>
                )}
              </div>

              <div className="payment-methods-wrapper">
                <button type="button" className="methods-back-btn" onClick={() => navigate('/dashboard')}>
                  BACK
                </button>
                <div className="payment-methods-card">
                  <div className="payment-summary-left">
                    <p className="amount-label">Payment amount</p>
                    <p className="amount-value">{formatPhp(feeBreakdown?.total)}</p>
                    <div className="total-divider-line" />
                    <div className="payment-details">
                      <p className="detail-label">Payment for</p>
                      <p className="detail-value">{request.documentType}</p>
                      <p className="detail-label">Status</p>
                      <p className="detail-value">
                        {isPaid ? 'Paid' : payment?.paymentStatus || 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="payment-methods-right">
                    <h2 className="methods-title">Choose your payment method</h2>
                    {!isPaid && paymongoEnabled && (
                      <div className="methods-content">
                        <button
                          type="button"
                          className="payment-method payment-method-btn"
                          disabled={paying}
                          onClick={() => startCheckout('gcash')}
                        >
                          <div className="method-icon">📱</div>
                          <div className="method-info">
                            <p className="method-name">GCash</p>
                            <p className="method-desc">Pay via GCash e-wallet (sandbox)</p>
                          </div>
                          <span className="chevron">›</span>
                        </button>
                        <button
                          type="button"
                          className="payment-method payment-method-btn"
                          disabled={paying}
                          onClick={() => startCheckout('paymaya')}
                        >
                          <div className="method-icon">📱</div>
                          <div className="method-info">
                            <p className="method-name">Maya</p>
                            <p className="method-desc">Pay via Maya e-wallet (sandbox)</p>
                          </div>
                          <span className="chevron">›</span>
                        </button>
                      </div>
                    )}
                    {isPaid && (
                      <p className="payment-paid-note">
                        Payment confirmed. You will receive email updates as your request is processed.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !request && !error && (
            <p className="payment-feedback">
              <button type="button" className="methods-back-btn" onClick={() => navigate('/dashboard')}>
                Return to dashboard
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;


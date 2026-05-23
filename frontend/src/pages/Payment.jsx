import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import '../styles/Payment.css';
import '../styles/PaymentReceipt.css';
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
  const [payerName, setPayerName] = useState('');
  const [payerMobile, setPayerMobile] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

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
      setPayerName(data.payment?.payerName || data.request?.full_name || '');
      setPayerMobile(data.payment?.payerMobile || '');
      setSelectedMethod(data.payment?.method || '');

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

  const normalizeMobile = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('09')) return digits;
    if (digits.length === 10 && digits.startsWith('9')) return `0${digits}`;
    if (digits.length === 12 && digits.startsWith('639')) return `0${digits.slice(2)}`;
    return null;
  };

  const paymentMethods = useMemo(
    () => [
      {
        id: 'gcash',
        name: 'GCash',
        description: paymongoEnabled
          ? 'Pay using your GCash mobile wallet.'
          : 'Open the imitation GCash checkout for testing.'
      },
      {
        id: 'paymaya',
        name: 'Maya',
        description: paymongoEnabled
          ? 'Pay using your Maya mobile wallet.'
          : 'Open the imitation Maya checkout for testing.'
      }
    ],
    [paymongoEnabled]
  );

  const selectedMethodName =
    paymentMethods.find((method) => method.id === selectedMethod)?.name || '';

  const selectPaymentMethod = (method) => {
    setSelectedMethod(method);
    setError('');
    setMessage('');
  };

  const startCheckout = async () => {
    if (!requestId || request?.paymentConfirmed) return;

    if (!selectedMethod) {
      setError('Choose GCash or Maya before clicking Pay Now.');
      return;
    }

    const mobile = normalizeMobile(payerMobile);
    if (!mobile) {
      setError('Enter a valid GCash/Maya mobile number (09XXXXXXXXX).');
      return;
    }

    setPaying(true);
    setError('');
    setMessage('');

    try {
      const { res, data } = await apiFetch(
        `/api/requests/${encodeURIComponent(requestId)}/payment/checkout`,
        {
          method: 'POST',
          body: JSON.stringify({
            method: selectedMethod,
            payerMobile: mobile,
            payerName: payerName.trim() || request?.full_name || ''
          })
        }
      );

      if (!res.ok) {
        setError(data.detail || data.message || 'Could not start payment.');
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
                <div className="summary-card-head">
                  <h2 className="summary-title">
                    <img src={orderIcon} alt="Order" className="title-icon" />
                    Order Summary
                  </h2>
                  <span className={`summary-status-pill ${isPaid ? 'paid' : 'pending'}`}>
                    {isPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
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
                  <div className="summary-actions">
                    <button
                      type="button"
                      className="pay-btn"
                      onClick={() =>
                        navigate(`/payment/receipt?requestId=${encodeURIComponent(requestId)}`)
                      }
                    >
                      VIEW RECEIPT
                    </button>
                    <button type="button" className="pay-btn secondary" onClick={() => navigate('/dashboard')}>
                      BACK TO DASHBOARD
                    </button>
                  </div>
                ) : (
                  <div className="summary-payment-note">
                    <ReceiptText size={18} />
                    <span>Review the amount, choose a wallet, then confirm with Pay Now.</span>
                  </div>
                )}
              </div>

              <div className="payment-methods-wrapper">
                <button type="button" className="methods-back-btn" onClick={() => navigate('/dashboard')}>
                  <ArrowLeft size={16} />
                  BACK
                </button>
                <div className="payment-methods-card">
                  <div className="payment-summary-left">
                    <div className="amount-panel">
                      <p className="amount-label">Amount due</p>
                      <p className="amount-value">{formatPhp(feeBreakdown?.total)}</p>
                      <span className={`summary-status-pill ${isPaid ? 'paid' : 'pending'}`}>
                        {isPaid ? 'Payment confirmed' : 'Awaiting payment'}
                      </span>
                    </div>
                    <div className="total-divider-line" />
                    <div className="payment-details">
                      <p className="detail-label">Payment for</p>
                      <p className="detail-value">{request.documentType}</p>
                      <p className="detail-label">Status</p>
                      <p className="detail-value">
                        {isPaid ? 'Paid' : payment?.paymentStatus || 'Pending'}
                      </p>
                    </div>
                    {!isPaid && (
                      <div className="payment-secure-note">
                        <ShieldCheck size={18} />
                        <span>Your e-wallet details are only used for this payment and receipt.</span>
                      </div>
                    )}
                  </div>
                  <div className="payment-methods-right">
                    <div className="methods-heading">
                      <p className="methods-eyebrow">Payment method</p>
                      <h2 className="methods-title">Choose your e-wallet</h2>
                    </div>
                    {!isPaid && !paymongoEnabled && (
                      <p className="payment-sandbox-hint">
                        PayMongo is not configured. GCash and Maya open imitation checkout pages for testing.
                      </p>
                    )}
                    {!isPaid && (
                      <>
                      <div className="payer-details-card">
                        <h3 className="payer-details-title">Your e-wallet details</h3>
                        <div className="payer-field">
                          <label htmlFor="payerName">Account name</label>
                          <input
                            id="payerName"
                            type="text"
                            value={payerName}
                            onChange={(e) => setPayerName(e.target.value)}
                            placeholder="Name on GCash / Maya account"
                          />
                        </div>
                        <div className="payer-field">
                          <label htmlFor="payerMobile">Mobile number</label>
                          <input
                            id="payerMobile"
                            type="tel"
                            inputMode="numeric"
                            value={payerMobile}
                            onChange={(e) => setPayerMobile(e.target.value)}
                            placeholder="09XXXXXXXXX"
                            maxLength={11}
                          />
                          <p className="payer-field-hint">
                            Used for GCash/Maya payment and shown on your receipt after payment.
                          </p>
                        </div>
                      </div>
                      <div className="methods-content" role="radiogroup" aria-label="Payment method">
                        {paymentMethods.map((method) => {
                          const selected = selectedMethod === method.id;

                          return (
                            <button
                              key={method.id}
                              type="button"
                              className={`payment-method payment-method-btn ${selected ? 'selected' : ''}`}
                              disabled={paying}
                              onClick={() => selectPaymentMethod(method.id)}
                              aria-pressed={selected}
                            >
                              <span className={`method-icon method-icon--${method.id}`}>
                                <CreditCard size={20} />
                              </span>
                              <span className="method-info">
                                <span className="method-name">{method.name}</span>
                                <span className="method-desc">{method.description}</span>
                              </span>
                              {selected ? (
                                <CheckCircle2 className="method-check" size={22} />
                              ) : (
                                <span className="method-radio" aria-hidden="true" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="payment-confirm-panel">
                        <div className="selected-payment-copy">
                          <Smartphone size={18} />
                          <span>
                            {selectedMethodName
                              ? `${selectedMethodName} selected`
                              : 'Select GCash or Maya to continue'}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="payment-pay-now-btn"
                          disabled={paying || !selectedMethod}
                          onClick={startCheckout}
                        >
                          {paying ? 'PROCESSING...' : 'PAY NOW'}
                        </button>
                      </div>
                      </>
                    )}
                    {isPaid && (
                      <button
                        type="button"
                        className="pay-btn"
                        style={{ marginTop: 12 }}
                        onClick={() =>
                          navigate(`/payment/receipt?requestId=${encodeURIComponent(requestId)}`)
                        }
                      >
                        VIEW PAYMENT RECEIPT
                      </button>
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


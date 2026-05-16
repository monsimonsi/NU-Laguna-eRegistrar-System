import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Payment.css';
import orderIcon from '../assets/order-icon.png';
import logo from '../assets/NU_shield.png';

const PaymentPage = () => {
  const navigate = useNavigate();

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
          <div className="cards-container">
            <div className="order-summary-card">
              <h2 className="summary-title">
                <img src={orderIcon} alt="Order" className="title-icon" />
                Order Summary
              </h2>
              <div className="summary-content">
                <p className="doc-name"><strong>Transcript of Records (TOR)</strong></p>
                <p className="summary-text">Request ID: REQ-202604080001</p>
                <p className="summary-text">Request Date: 04/09/2026</p>
                <hr className="divider" />
                <div className="field-group">
                  <span className="label">Document Fee</span>
                  <span className="value">1500</span>
                </div>
                <div className="field-group">
                  <span className="label">Additional Fee</span>
                  <span className="value">0</span>
                </div>
                <hr className="divider" />
                <div className="field-group total-group">
                  <span className="label">Total Amount</span>
                  <span className="total-price">₱ 1500.00</span>
                </div>
              </div>
              <button className="pay-btn">PAY</button>
            </div>
            <div className="payment-methods-wrapper">
              <button className="methods-back-btn">BACK</button>
              <div className="payment-methods-card">
                <div className="payment-summary-left">
                  <p className="amount-label">Payment amount</p>
                  <p className="amount-value">₱ 150.00</p>
                <div className="total-divider-line"></div>
                <div className="payment-details">
                  <p className="detail-label">Payment for</p>
                  <p className="detail-value">Payment</p>
                  <table className="payment-table">
                    <thead>
                      <tr>
                        <th>ITEM NAME</th>
                        <th>QTY</th>
                        <th>PRICE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Payment</td>
                        <td>1</td>
                        <td>₱ 150.00</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="total-divider-line"></div>
                  <div className="payment-total">
                    <span>Total:</span>
                    <span className='payment-total-value'>₱ 150.00</span>
                  </div>
                </div>
              </div>
              <div className="payment-methods-right">
                <h2 className="methods-title">Choose your payment method</h2>
                <div className="qr-scan-box">
                  <p className="qr-scan-text">Scan <span className="qr-logo">QR Ph</span> code to pay</p>
                </div>
                <div className="divider-line">
                  <span>or pay using</span>
                </div>
                <div className="methods-content">
                  <div className="payment-method">
                    <div className="method-icon">💳</div>
                    <div className="method-info">
                      <p className="method-name">Credit or Debit Card</p>
                    </div>
                    <span className="chevron">›</span>
                  </div>
                  <div className="payment-method">
                    <div className="method-icon">📱</div>
                    <div className="method-info">
                      <p className="method-name">E-Wallets</p>
                      <p className="method-desc">GCash, GrabPay, and more</p>
                    </div>
                    <span className="chevron">›</span>
                  </div>
                  <div className="payment-method">
                    <div className="method-icon">🏦</div>
                    <div className="method-info">
                      <p className="method-name">Online Banking</p>
                      <p className="method-desc">BDO, BPI, and more</p>
                    </div>
                    <span className="chevron">›</span>
                  </div>
                  <div className="payment-method">
                    <div className="method-icon">📦</div>
                    <div className="method-info">
                      <p className="method-name">Buy Now, Pay Later</p>
                      <p className="method-desc">BillEase</p>
                    </div>
                    <span className="chevron">›</span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
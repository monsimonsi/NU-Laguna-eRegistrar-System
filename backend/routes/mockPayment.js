const express = require('express');
const DocumentRequest = require('../models/DocumentRequest');
const mockEwallet = require('../services/mockEwallet');

function createMockPaymentRouter({ authMiddleware, requireStudentOrAlumni, isRequestOwner }) {
  const router = express.Router();

  function authEmail(req) {
    return String(req.auth?.email || '').trim().toLowerCase();
  }

  function authUserId(req) {
    return String(req.auth?.sub || '');
  }

  async function loadOwnedRequest(req, res, requestId) {
    const id = requestId || req.params.id;
    if (!id) {
      res.status(400).json({ message: 'requestId is required.' });
      return null;
    }
    const doc = await DocumentRequest.findById(id);
    if (!doc) {
      res.status(404).json({ message: 'Request not found' });
      return null;
    }
    if (!isRequestOwner(req, doc)) {
      res.status(403).json({ message: 'You can only pay for your own requests.' });
      return null;
    }
    return doc;
  }

  async function handleProviderCheckout(req, res, method) {
    try {
      if (!mockEwallet.isMockEwalletEnabled()) {
        return res.status(503).json({
          message: 'Mock e-wallet is disabled while PayMongo is configured.'
        });
      }

      const doc = await loadOwnedRequest(req, res, req.body?.requestId);
      if (!doc) return;

      if (doc.paymentConfirmed) {
        return res.status(400).json({ message: 'This request is already paid.' });
      }

      const frontendBase = String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(
        /\/$/,
        ''
      );
      const returnUrl =
        req.body?.returnUrl ||
        `${frontendBase}/payment/return?requestId=${encodeURIComponent(String(doc._id))}`;

      const checkout = await mockEwallet.startMockCheckout(doc, method, returnUrl);

      return res.status(200).json({
        data: {
          id: checkout.sessionId,
          type: 'checkout_session',
          attributes: {
            redirect_url: checkout.redirectUrl,
            return_url: checkout.returnUrl,
            amount: checkout.amountCentavos,
            currency: checkout.currency,
            provider: checkout.provider,
            merchant_name: checkout.merchantName,
            description: checkout.description,
            status: 'awaiting_payment'
          }
        },
        redirectUrl: checkout.redirectUrl,
        sessionId: checkout.sessionId
      });
    } catch (err) {
      console.error(`Mock ${method} checkout error:`, err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }

  router.post(
    '/gcash/v1/checkout',
    authMiddleware,
    requireStudentOrAlumni,
    (req, res) => handleProviderCheckout(req, res, 'gcash')
  );

  router.get(
    '/gcash/v1/sessions/:sessionId',
    authMiddleware,
    requireStudentOrAlumni,
    async (req, res) => {
      try {
        const session = await mockEwallet.getMockSession(
          req.params.sessionId,
          authUserId(req),
          authEmail(req)
        );
        return res.status(200).json({ data: { type: 'payment_session', attributes: session } });
      } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Server error' });
      }
    }
  );

  router.post(
    '/gcash/v1/sessions/:sessionId/pay',
    authMiddleware,
    requireStudentOrAlumni,
    async (req, res) => {
      try {
        const result = await mockEwallet.completeMockSession(
          req.params.sessionId,
          authUserId(req),
          authEmail(req),
          {
            payerMobile: req.body?.payerMobile,
            payerName: req.body?.payerName
          }
        );
        return res.status(200).json({
          data: {
            type: 'payment',
            attributes: {
              status: 'succeeded',
              transaction_reference: result.transactionReference,
              receipt_number: result.receiptNumber
            }
          },
          payment: result.payment,
          request: result.request,
          receiptNumber: result.receiptNumber
        });
      } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Server error' });
      }
    }
  );

  router.post(
    '/gcash/v1/sessions/:sessionId/cancel',
    authMiddleware,
    requireStudentOrAlumni,
    async (req, res) => {
      try {
        await mockEwallet.cancelMockSession(
          req.params.sessionId,
          authUserId(req),
          authEmail(req)
        );
        return res.status(200).json({
          data: { type: 'payment_session', attributes: { status: 'cancelled' } }
        });
      } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Server error' });
      }
    }
  );
  router.post(
    '/maya/v1/checkout',
    authMiddleware,
    requireStudentOrAlumni,
    (req, res) => handleProviderCheckout(req, res, 'paymaya')
  );

  router.get(
    '/maya/v1/sessions/:sessionId',
    authMiddleware,
    requireStudentOrAlumni,
    async (req, res) => {
      try {
        const session = await mockEwallet.getMockSession(
          req.params.sessionId,
          authUserId(req),
          authEmail(req)
        );
        return res.status(200).json({ data: { type: 'payment_session', attributes: session } });
      } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Server error' });
      }
    }
  );

  router.post(
    '/maya/v1/sessions/:sessionId/pay',
    authMiddleware,
    requireStudentOrAlumni,
    async (req, res) => {
      try {
        const result = await mockEwallet.completeMockSession(
          req.params.sessionId,
          authUserId(req),
          authEmail(req),
          {
            payerMobile: req.body?.payerMobile,
            payerName: req.body?.payerName
          }
        );
        return res.status(200).json({
          data: {
            type: 'payment',
            attributes: {
              status: 'succeeded',
              transaction_reference: result.transactionReference,
              receipt_number: result.receiptNumber
            }
          },
          payment: result.payment,
          request: result.request,
          receiptNumber: result.receiptNumber
        });
      } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Server error' });
      }
    }
  );

  router.post(
    '/maya/v1/sessions/:sessionId/cancel',
    authMiddleware,
    requireStudentOrAlumni,
    async (req, res) => {
      try {
        await mockEwallet.cancelMockSession(
          req.params.sessionId,
          authUserId(req),
          authEmail(req)
        );
        return res.status(200).json({
          data: { type: 'payment_session', attributes: { status: 'cancelled' } }
        });
      } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ message: err.message || 'Server error' });
      }
    }
  );

  return router;
}

module.exports = { createMockPaymentRouter };

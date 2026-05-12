require('dotenv').config();

const express = require('express');
const dns = require('dns'); // Lets Node use custom DNS resolvers.
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const DocumentRequest = require('./models/DocumentRequest');
const Payment = require('./models/Payment');
const AlumniVerification = require('./models/AlumniVerification');
const payments = require('./services/payments');
const {
  createNotification,
  listForUser: listNotificationsForUser,
  markRead: markNotificationRead
} = require('./services/notifications');
const {
  signToken,
  authMiddleware,
  requireAdmin,
  requireStudentOrAlumni
} = require('./middleware/auth');
const mail = require('./services/mail');
const { hashPassword, verifyPassword } = require('./services/passwords');

const app = express();

// Force reliable DNS resolvers for Atlas SRV lookups on restricted networks.
dns.setServers(['8.8.8.8', '1.1.1.1']); // Uses public DNS to resolve Atlas SRV records.

// Middleware
app.use(cors());
app.post(
  '/api/webhooks/paymongo',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    payments.handlePayMongoWebhook(req, res).catch((err) => {
      console.error('PayMongo webhook error:', err);
      if (!res.headersSent) res.status(500).json({ message: 'Server error' });
    });
  }
);
app.use(express.json());

const ALLOWED_STATUSES = DocumentRequest.REQUEST_STATUSES || [
  'Pending',
  'Processing',
  'Ready for Pickup',
  'Out for Delivery',
  'Released'
];
const DUPLICATE_WINDOW_DAYS = Number(process.env.DUPLICATE_REQUEST_DAYS || 30);
const UNPAID_DUPLICATE_WINDOW_DAYS = Number(process.env.UNPAID_REQUEST_DUPLICATE_DAYS || 7);

const ACTIVE_REQUEST_STATUSES = ['Pending', 'Processing', 'Ready for Pickup', 'Out for Delivery'];

function allowedStatusesForRequest(request) {
  const method = String(request?.deliveryMethod || 'pickup').toLowerCase();
  if (method === 'delivery') {
    return ['Pending', 'Processing', 'Out for Delivery', 'Released'];
  }
  return ['Pending', 'Processing', 'Ready for Pickup', 'Released'];
}

function userStatusMessage(request, status) {
  const method = String(request?.deliveryMethod || 'pickup').toLowerCase();
  const doc = request?.documentType || 'document';
  if (status === 'Ready for Pickup') {
    return `Your ${doc} is now ready for pickup at the Registrar office.`;
  }
  if (status === 'Out for Delivery') {
    return `Your ${doc} is now out for delivery to your provided address.`;
  }
  if (status === 'Released') {
    return method === 'delivery'
      ? `Your ${doc} has been delivered and marked as released.`
      : `Your ${doc} has been claimed and marked as released.`;
  }
  return `Your ${doc} request is now ${status}.`;
}

function makeTrackingNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NUL-${y}${m}${day}-${rand}`;
}

// Login API
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');
    const normalizedRole = String(role || '').trim().toLowerCase();

    if (!normalizedEmail || !normalizedPassword || !normalizedRole) {
      return res.status(400).json({
        approved: false,
        message: 'Email, password, and role are required.'
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
      role: normalizedRole
    });

    if (!user) {
      return res.status(401).json({
        approved: false,
        message: 'Login rejected. Invalid email, password, or role.'
      });
    }

    const passwordMatch = await verifyPassword(normalizedPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        approved: false,
        message: 'Login rejected. Invalid email, password, or role.'
      });
    }
    if (passwordMatch === 'legacy') {
      user.password = await hashPassword(normalizedPassword);
      await user.save();
    }

    const studentSuffixes = String(process.env.STUDENT_EMAIL_SUFFIXES || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (normalizedRole === 'student' && studentSuffixes.length > 0) {
      const emailOk = studentSuffixes.some((suf) => {
        const suffix = suf.startsWith('@') ? suf : `@${suf}`;
        return normalizedEmail.endsWith(suffix);
      });
      if (!emailOk) {
        return res.status(403).json({
          approved: false,
          message: 'Student login requires a registered university email address.'
        });
      }
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        approved: false,
        message:
          'Your alumni account is pending registrar verification. You cannot log in yet.'
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        approved: false,
        message:
          'Your alumni registration was not approved. Please register again with corrected information.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        approved: false,
        message: 'This account is inactive.'
      });
    }

    const token = signToken(user);

    return res.status(200).json({
      approved: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      approved: false,
      message: 'Server error.'
    });
  }
});

/**
 * Alumni self-registration — creates User (pending) + AlumniVerification (pending).
 * Rejected alumni may reapply with the same email (updates record, resets to pending).
 */
app.post('/api/alumni/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      studentNumber,
      yearGraduated,
      program,
      email,
      password
    } = req.body;

    const first = String(firstName || '').trim();
    const last = String(lastName || '').trim();
    const student_number = String(studentNumber || '').trim();
    const year_graduated = String(yearGraduated || '').trim();
    const course = String(program || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const plainPassword = String(password || '');

    if (!first || !last || !student_number || !year_graduated || !course || !normalizedEmail || !plainPassword) {
      return res.status(400).json({
        message: 'All fields are required.'
      });
    }

    if (plainPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters.'
      });
    }

    const full_name = `${first} ${last}`.trim();

    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      if (existing.role !== 'alumni') {
        return res.status(409).json({
          message: 'This email is already registered under a different account type.'
        });
      }

      if (existing.status === 'pending') {
        return res.status(409).json({
          message:
            'You already have a pending alumni registration. Please wait for the registrar to verify your account.'
        });
      }

      if (existing.status === 'active') {
        return res.status(409).json({
          message: 'This alumni account is already active. Please log in.'
        });
      }

      // rejected — reapplication
      existing.full_name = full_name;
      existing.password = await hashPassword(plainPassword);
      existing.status = 'pending';
      await existing.save();

      await AlumniVerification.findOneAndUpdate(
        { user_id: existing._id },
        {
          student_number,
          course,
          year_graduated,
          verification_status: 'pending',
          reviewed_by: null,
          rejection_reason: ''
        },
        { new: true, upsert: true }
      );

      void Promise.all([
        mail.notifyAlumniRegistrationPending({
          to: normalizedEmail,
          fullName: full_name,
          isReapplication: true
        }),
        mail.notifyRegistrarAlumniPending({
          email: normalizedEmail,
          fullName: full_name,
          studentNumber: student_number,
          course,
          yearGraduated: year_graduated,
          isReapplication: true
        })
      ]);

      return res.status(200).json({
        message:
          'Your registration has been resubmitted and is pending verification.',
        userId: existing._id
      });
    }

    const user = new User({
      full_name,
      email: normalizedEmail,
      password: await hashPassword(plainPassword),
      role: 'alumni',
      status: 'pending'
    });
    await user.save();

    await AlumniVerification.create({
      user_id: user._id,
      student_number,
      course,
      year_graduated,
      verification_status: 'pending'
    });

    void Promise.all([
      mail.notifyAlumniRegistrationPending({
        to: normalizedEmail,
        fullName: full_name,
        isReapplication: false
      }),
      mail.notifyRegistrarAlumniPending({
        email: normalizedEmail,
        fullName: full_name,
        studentNumber: student_number,
        course,
        yearGraduated: year_graduated,
        isReapplication: false
      })
    ]);

    return res.status(201).json({
      message: 'Registration submitted. Your account is pending registrar verification.',
      userId: user._id
    });
  } catch (error) {
    console.error('Alumni register error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email or verification record already exists.' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// Pending alumni verifications (registrar)
app.get('/api/alumni/pending-verifications', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const rows = await AlumniVerification.find({ verification_status: 'pending' })
      .populate('user_id', 'full_name email status role')
      .sort({ createdAt: -1 })
      .lean();

    const list = rows
      .filter((r) => r.user_id && r.user_id.role === 'alumni' && r.user_id.status === 'pending')
      .map((r) => ({
        _id: r._id,
        userId: r.user_id._id,
        full_name: r.user_id.full_name,
        email: r.user_id.email,
        student_number: r.student_number,
        course: r.course,
        year_graduated: r.year_graduated,
        submittedAt: r.createdAt
      }));

    return res.status(200).json({ pending: list });
  } catch (error) {
    console.error('Pending verifications error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Approve or reject alumni (registrar) — uses JWT; reviewed_by = authenticated admin
app.patch('/api/alumni/:userId/verify', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, rejectionReason } = req.body;

    const admin = await User.findById(req.auth.sub);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: 'Registrar account invalid.' });
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ message: 'action must be "approve" or "reject".' });
    }

    if (action === 'reject') {
      const reason = String(rejectionReason || '').trim();
      if (!reason) {
        return res.status(400).json({ message: 'rejectionReason is required when rejecting.' });
      }
    }

    const alum = await User.findById(userId);
    if (!alum || alum.role !== 'alumni') {
      return res.status(404).json({ message: 'Alumni user not found.' });
    }

    const verification = await AlumniVerification.findOne({ user_id: userId });
    if (!verification) {
      return res.status(404).json({ message: 'Verification record not found.' });
    }

    if (action === 'approve') {
      alum.status = 'active';
      await alum.save();
      verification.verification_status = 'approved';
      verification.reviewed_by = admin._id;
      verification.rejection_reason = '';
      await verification.save();

      void mail.notifyAlumniApproved({
        to: alum.email,
        fullName: alum.full_name
      });

      return res.status(200).json({
        message: 'Alumni account approved.',
        user: { id: alum._id, email: alum.email, status: alum.status }
      });
    }

    alum.status = 'rejected';
    await alum.save();
    verification.verification_status = 'rejected';
    verification.reviewed_by = admin._id;
    verification.rejection_reason = String(rejectionReason || '').trim();
    await verification.save();

    void mail.notifyAlumniRejected({
      to: alum.email,
      fullName: alum.full_name,
      reason: verification.rejection_reason
    });

    return res.status(200).json({
      message: 'Alumni registration rejected.',
      user: { id: alum._id, email: alum.email, status: alum.status }
    });
  } catch (error) {
    console.error('Verify alumni error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard metrics (registrar)
app.get('/api/admin/stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [totalRequests, pendingRequests, approvedAlumni, pendingAlumni] = await Promise.all([
      DocumentRequest.countDocuments({ paymentConfirmed: true }),
      DocumentRequest.countDocuments({ status: 'Pending', paymentConfirmed: true }),
      User.countDocuments({ role: 'alumni', status: 'active' }),
      User.countDocuments({ role: 'alumni', status: 'pending' })
    ]);

    return res.status(200).json({
      totalRequests,
      pendingRequests,
      approvedAlumni,
      pendingAlumni
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Create a new document request (student / alumni only)
app.post('/api/requests', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const {
      requesterId,
      full_name,
      email,
      role,
      documentType,
      purpose,
      copies,
      deliveryMethod,
      address,
      succeedingPages,
      notes
    } = req.body;

    if (!full_name || !email || !role || !documentType) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const emailNorm = String(email).trim().toLowerCase();
    if (emailNorm !== String(req.auth.email).trim().toLowerCase()) {
      return res.status(403).json({ message: 'Email must match your logged-in account.' });
    }

    if (requesterId && String(requesterId) !== String(req.auth.sub)) {
      return res.status(403).json({ message: 'Requester does not match your account.' });
    }

    if (String(role).toLowerCase() !== String(req.auth.role).toLowerCase()) {
      return res.status(403).json({ message: 'Role must match your logged-in account.' });
    }

    // #region agent log
    fetch('http://127.0.0.1:7628/ingest/62e4f0b3-75d5-4fd9-af53-9ecd41c96937',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'58ccd3'},body:JSON.stringify({sessionId:'58ccd3',runId:'pre-fix',hypothesisId:'H1',location:'server.js:/api/requests:before-duplicate-check',message:'Starting duplicate request check',data:{userId:String(req.auth.sub),role:String(req.auth.role),documentType:String(documentType||'')},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const cutoff = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const unpaidCutoff = new Date(Date.now() - UNPAID_DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const duplicate = await DocumentRequest.findOne({
      requesterId: req.auth.sub,
      documentType,
      $or: [
        {
          createdAt: { $gte: cutoff },
          paymentConfirmed: true,
          status: { $in: ACTIVE_REQUEST_STATUSES }
        },
        {
          createdAt: { $gte: unpaidCutoff },
          paymentConfirmed: false
        }
      ]
    }).sort({ createdAt: -1 });

    // #region agent log
    fetch('http://127.0.0.1:7628/ingest/62e4f0b3-75d5-4fd9-af53-9ecd41c96937',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'58ccd3'},body:JSON.stringify({sessionId:'58ccd3',runId:'pre-fix',hypothesisId:'H1',location:'server.js:/api/requests:after-duplicate-query',message:'Duplicate query result',data:{foundDuplicate:!!duplicate,duplicateId:duplicate?String(duplicate._id):null,cutoffIso:cutoff.toISOString()},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (duplicate) {
      // #region agent log
      fetch('http://127.0.0.1:7628/ingest/62e4f0b3-75d5-4fd9-af53-9ecd41c96937',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'58ccd3'},body:JSON.stringify({sessionId:'58ccd3',runId:'pre-fix',hypothesisId:'H2',location:'server.js:/api/requests:duplicate-blocked',message:'Blocking duplicate request submission',data:{existingTrackingNumber:String(duplicate.trackingNumber||'')},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!duplicate.paymentConfirmed) {
        return res.status(409).json({
          message: `You already have a ${documentType} request waiting for payment. Use 'Retry payment' on that request or wait before submitting again.`,
          duplicateRequestId: duplicate._id,
          trackingNumber: duplicate.trackingNumber || null,
          pendingPayment: true
        });
      }
      return res.status(409).json({
        message: `A recent ${documentType} request already exists and is still being processed.`,
        duplicateRequestId: duplicate._id,
        trackingNumber: duplicate.trackingNumber || null
      });
    }

    const skipOnlinePayment = !payments.isPaymongoConfigured();
    if (!skipOnlinePayment && !process.env.PAYMONGO_WEBHOOK_SECRET) {
      console.warn(
        '[payments] PAYMONGO_SECRET_KEY is set but PAYMONGO_WEBHOOK_SECRET is missing — paid requests will not unlock until webhooks are configured.'
      );
    }

    const newRequest = new DocumentRequest({
      requesterId: requesterId ? requesterId : req.auth.sub,
      full_name,
      email: emailNorm,
      role,
      documentType,
      purpose,
      copies: copies ? Number(copies) : 1,
      deliveryMethod: deliveryMethod || 'pickup',
      address: address || '',
      succeedingPages: succeedingPages ? Number(succeedingPages) : 0,
      notes: notes || '',
      trackingNumber: makeTrackingNumber(),
      paymentConfirmed: skipOnlinePayment
    });

    await newRequest.save();

    if (skipOnlinePayment) {
      console.warn(
        '[payments] PAYMONGO_SECRET_KEY is not set — new requests are treated as paid (development fallback).'
      );
      await createNotification({
        userId: req.auth.sub,
        category: 'request_submitted',
        message: `Your request for ${newRequest.documentType} was submitted successfully.`,
        meta: {
          requestId: String(newRequest._id),
          trackingNumber: newRequest.trackingNumber || ''
        }
      });
      // #region agent log
      fetch('http://127.0.0.1:7628/ingest/62e4f0b3-75d5-4fd9-af53-9ecd41c96937',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'58ccd3'},body:JSON.stringify({sessionId:'58ccd3',runId:'pre-fix',hypothesisId:'H3',location:'server.js:/api/requests:notification-created',message:'Created notification row for request submission',data:{userId:String(req.auth.sub),requestId:String(newRequest._id)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      void mail.notifyDocumentRequestSubmitted({
        to: newRequest.email,
        fullName: newRequest.full_name,
        trackingNumber: newRequest.trackingNumber || '',
        documentType: newRequest.documentType
      });

      return res.status(201).json({
        message: 'Request created',
        request: newRequest,
        payment: null,
        paymentMode: 'skipped'
      });
    }

    try {
      const intent = await payments.createOrRefreshPaymentIntent(newRequest, null);
      // #region agent log
      fetch('http://127.0.0.1:7628/ingest/62e4f0b3-75d5-4fd9-af53-9ecd41c96937',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'58ccd3'},body:JSON.stringify({sessionId:'58ccd3',runId:'pre-fix',hypothesisId:'H3',location:'server.js:/api/requests:payment-intent-created',message:'PayMongo payment intent created for new request',data:{userId:String(req.auth.sub),requestId:String(newRequest._id)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      return res.status(201).json({
        message:
          'Request saved. Complete GCash or Maya payment in the app; the registrar will see this request after payment succeeds.',
        request: newRequest,
        payment: {
          status: intent.payment.paymentStatus,
          amountCentavos: intent.amountCentavos,
          currency: intent.currency,
          clientKey: intent.clientKey,
          paymentIntentId: intent.paymentIntentId
        },
        paymentMode: 'paymongo'
      });
    } catch (payErr) {
      console.error('PayMongo payment intent error:', payErr);
      await Payment.deleteMany({ documentRequestId: newRequest._id });
      await DocumentRequest.findByIdAndDelete(newRequest._id);
      const detail =
        payErr.errors && Array.isArray(payErr.errors)
          ? payErr.errors.map((e) => e.detail || e.code).join('; ')
          : payErr.message || '';
      return res.status(502).json({
        message: 'Could not start payment. Your request was not saved. Try again shortly.',
        detail
      });
    }
  } catch (error) {
    console.error('Create request error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Current user's requests (student / alumni)
app.get('/api/me/requests', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const email = String(req.auth.email).trim().toLowerCase();
    const requests = await DocumentRequest.find({ email })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ requests });
  } catch (error) {
    console.error('List my requests error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// In-app notifications for the current user (student / alumni)
app.get('/api/me/notifications', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const skip = Number(req.query.skip) || 0;
    const rows = await listNotificationsForUser(req.auth.sub, { limit, skip });
    return res.status(200).json({ notifications: rows });
  } catch (error) {
    console.error('List notifications error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/me/notifications/:id/read', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const result = await markNotificationRead(req.auth.sub, req.params.id);
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return res.status(404).json({ message: 'Notification not found.' });
      }
      return res.status(400).json({ message: 'Invalid notification id.' });
    }
    return res.status(200).json({ notification: result.notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Refresh PayMongo client credentials for an unpaid request (retry / resume checkout)
app.post('/api/requests/:id/payment/intent', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await DocumentRequest.findById(id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });

    if (String(doc.requesterId || '') !== String(req.auth.sub)) {
      return res.status(403).json({ message: 'You can only pay for your own requests.' });
    }

    const email = String(req.auth.email).trim().toLowerCase();
    if (String(doc.email).trim().toLowerCase() !== email) {
      return res.status(403).json({ message: 'Email does not match this request.' });
    }

    if (doc.paymentConfirmed) {
      return res.status(400).json({ message: 'This request is already paid.' });
    }

    if (!payments.isPaymongoConfigured()) {
      return res.status(503).json({ message: 'Online payment is not configured on the server.' });
    }

    const existingPayment = await Payment.findOne({ documentRequestId: doc._id });
    const intent = await payments.createOrRefreshPaymentIntent(doc, existingPayment);

    return res.status(200).json({
      payment: {
        status: intent.payment.paymentStatus,
        amountCentavos: intent.amountCentavos,
        currency: intent.currency,
        clientKey: intent.clientKey,
        paymentIntentId: intent.paymentIntentId
      }
    });
  } catch (err) {
    console.error('Payment intent refresh error:', err);
    const detail =
      err.errors && Array.isArray(err.errors)
        ? err.errors.map((e) => e.detail || e.code).join('; ')
        : err.message || '';
    return res.status(502).json({ message: 'Payment provider error.', detail });
  }
});

// All requests (registrar) — optional ?email= filter
app.get('/api/requests', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { email } = req.query;
    const filter = { paymentConfirmed: true };
    if (email) filter.email = String(email).trim().toLowerCase();

    const requests = await DocumentRequest.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ requests });
  } catch (error) {
    console.error('List requests error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update request status (registrar)
app.patch('/api/requests/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const previous = await DocumentRequest.findById(id);
    if (!previous) return res.status(404).json({ message: 'Request not found' });

    if (!previous.paymentConfirmed) {
      return res.status(400).json({
        message: 'This request is not in the registrar queue until payment succeeds.'
      });
    }

    const allowedForMethod = allowedStatusesForRequest(previous);
    if (!allowedForMethod.includes(status)) {
      return res.status(400).json({
        message:
          previous.deliveryMethod === 'delivery'
            ? 'Invalid status for delivery request. Allowed: Pending, Processing, Out for Delivery, Released.'
            : 'Invalid status for pickup request. Allowed: Pending, Processing, Ready for Pickup, Released.'
      });
    }

    const updated = await DocumentRequest.findByIdAndUpdate(id, { status }, { new: true });

    if (previous.status !== status) {
      await createNotification({
        userId: updated.requesterId,
        category: 'request_status',
        message: userStatusMessage(updated, status),
        meta: {
          requestId: String(updated._id),
          trackingNumber: updated.trackingNumber || '',
          status,
          deliveryMethod: updated.deliveryMethod || 'pickup'
        }
      });
      // #region agent log
      fetch('http://127.0.0.1:7628/ingest/62e4f0b3-75d5-4fd9-af53-9ecd41c96937',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'58ccd3'},body:JSON.stringify({sessionId:'58ccd3',runId:'pre-fix',hypothesisId:'H4',location:'server.js:/api/requests/:id:status-notification-created',message:'Created notification row for status change',data:{requestId:String(updated._id),status:String(status)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      void mail.notifyDocumentRequestStatus({
        to: updated.email,
        fullName: updated.full_name,
        trackingNumber: updated.trackingNumber || '',
        documentType: updated.documentType,
        status,
        deliveryMethod: updated.deliveryMethod || 'pickup'
      });
    }

    return res.status(200).json({ message: 'Status updated', request: updated });
  } catch (error) {
    console.error('Update request error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DB connect + server start
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME
  })
  .then(async () => {
    console.log('Connected to MongoDB database:', process.env.DB_NAME);
    // Migrate legacy status label to spec-aligned "Released"
    const legacy = await DocumentRequest.updateMany(
      { status: 'Completed' },
      { $set: { status: 'Released' } }
    );
    if (legacy.modifiedCount > 0) {
      console.log('Migrated request statuses: Completed → Released (', legacy.modifiedCount, 'docs)');
    }
    const payMig = await DocumentRequest.updateMany(
      { paymentConfirmed: { $exists: false } },
      { $set: { paymentConfirmed: true } }
    );
    if (payMig.modifiedCount > 0) {
      console.log('Migrated request payment flags: paymentConfirmed=true (', payMig.modifiedCount, 'docs)');
    }
    app.listen(process.env.PORT, () => {
      console.log('Server is running on port', process.env.PORT);
      if (mail.isMailConfigured()) {
        console.log('SMTP email: enabled (transactional notifications will be sent)');
      } else {
        console.log('SMTP email: disabled — set MAIL_HOST, MAIL_USER, MAIL_PASS to enable');
      }
      if (payments.isPaymongoConfigured()) {
        console.log('PayMongo: enabled (document requests require successful payment before registrar queue)');
      } else {
        console.log('PayMongo: disabled — set PAYMONGO_SECRET_KEY to require GCash/Maya checkout');
      }
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB', error);
  });

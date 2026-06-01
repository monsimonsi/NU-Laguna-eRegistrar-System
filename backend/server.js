require('dotenv').config({ override: true });

const express = require('express');
const dns = require('dns'); // Lets Node use custom DNS resolvers.
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const User = require('./models/User');
const AlumniRegistration = require('./models/AlumniRegistration');
const DocumentRequest = require('./models/DocumentRequest');
const Payment = require('./models/Payment');
const payments = require('./services/payments');
const mockEwallet = require('./services/mockEwallet');
const { createMockPaymentRouter } = require('./routes/mockPayment');
const {
  createNotification,
  listForUser: listNotificationsForUser,
  markRead: markNotificationRead,
  markAllRead: markAllNotificationsRead
} = require('./services/notifications');
const DocumentPrice = require('./models/DocumentPrice');
const {
  signToken,
  authMiddleware,
  requireAdmin,
  requireStudentOrAlumni
} = require('./middleware/auth');
const mail = require('./services/mail');
const { generateReceiptPdfBuffer } = require('./services/receiptPdf');
const { hashPassword, verifyPassword } = require('./services/passwords');
const {
  validateDocumentRequestInput,
  normalizeDeliveryMethod,
  validateStatusTransition
} = require('./utils/requestLogic');

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

app.use(
  '/api/mock',
  createMockPaymentRouter({
    authMiddleware,
    requireStudentOrAlumni,
    isRequestOwner
  })
);

app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const paymongoKeyStatus = payments.getPaymongoKeyStatus();
  const paymongoOk = paymongoKeyStatus === 'missing' || paymongoKeyStatus === 'secret';
  res.status(dbConnected && paymongoOk ? 200 : 503).json({
    ok: dbConnected && paymongoOk,
    database: dbConnected ? 'connected' : 'disconnected',
    paymongo: {
      configured: payments.isPaymongoConfigured(),
      keyStatus: paymongoKeyStatus,
      hint:
        paymongoKeyStatus === 'public'
          ? 'PAYMONGO_SECRET_KEY is pk_ (public). Use sk_test_ secret key in backend/.env and restart the backend.'
          : paymongoKeyStatus === 'invalid'
            ? 'PAYMONGO_SECRET_KEY must start with sk_test_ or sk_live_.'
            : null
    },
    hint: !dbConnected
      ? 'Allow your IP in MongoDB Atlas → Network Access, or use 0.0.0.0/0 for development.'
      : paymongoKeyStatus === 'public'
        ? 'Restart backend after fixing PAYMONGO_SECRET_KEY in backend/.env (use sk_test_, not pk_test_).'
        : null
  });
});

function getFrontendBaseUrl() {
  return String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

function getPasswordResetExpiryMinutes() {
  const raw = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 60);
  return Number.isFinite(raw) && raw > 0 ? raw : 60;
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

async function saveDocumentRequestWithTracking(requestData, maxAttempts = 5) {
  const deliveryMethod = normalizeDeliveryMethod(requestData?.deliveryMethod) || 'pickup';

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const request = new DocumentRequest({
      ...requestData,
      trackingNumber: deliveryMethod === 'pickup' ? null : makeTrackingNumber()
    });

    try {
      await request.save();
      return request;
    } catch (err) {
      const duplicateTracking =
        err?.code === 11000 &&
        (err?.keyPattern?.trackingNumber || err?.keyValue?.trackingNumber);
      if (duplicateTracking && attempt < maxAttempts - 1) {
        continue;
      }
      throw err;
    }
  }

  throw new Error('Could not generate a unique tracking number.');
}

function isRequestOwner(req, request) {
  const authEmail = String(req.auth?.email || '').trim().toLowerCase();
  const requestEmail = String(request.email || '').trim().toLowerCase();
  if (authEmail && requestEmail && authEmail === requestEmail) return true;

  const authId = String(req.auth?.sub || '');
  const requesterId = request.requesterId ? String(request.requesterId) : '';
  return Boolean(authId && requesterId && authId === requesterId);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseNonNegativeNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseOptionalNonNegativeNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  return parseNonNegativeNumber(value);
}

function parseBooleanInput(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
}

// Login API
app.post('/api/login', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        approved: false,
        message:
          'Database is not connected. In MongoDB Atlas, open Network Access and add your current IP (or 0.0.0.0/0 for dev), then restart the backend.'
      });
    }

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

app.post('/api/forgot-password', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database is not connected.' });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (user) {
      const { token, tokenHash } = createPasswordResetToken();
      const expiresInMinutes = getPasswordResetExpiryMinutes();
      user.password_reset_token = tokenHash;
      user.password_reset_expires_at = new Date(Date.now() + expiresInMinutes * 60 * 1000);
      await user.save();

      const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
      void mail.notifyPasswordResetRequested({
        to: user.email,
        fullName: user.full_name,
        resetUrl,
        expiresInMinutes
      });
    }

    return res.status(200).json({
      message:
        'If the email address exists in our system, password reset instructions have been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database is not connected.' });
    }

    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      password_reset_token: tokenHash,
      password_reset_expires_at: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    }

    user.password = await hashPassword(password);
    user.password_reset_token = '';
    user.password_reset_expires_at = null;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Current user profile
app.get('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const user = await User.findById(userId)
      .select('full_name email role id_num department program')
      .lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let program = user.program || null;

    if (user.role === 'alumni') {
      const registration = await AlumniRegistration.findOne({ userId: user._id })
        .select('course')
        .lean();
      program = registration?.course || null;
    }

    return res.status(200).json({
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        id_num: user.id_num || null,
        department: user.department || null,
        program
      }
    });
  } catch (error) {
    console.error('Fetch current user error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Alumni registration
app.post('/api/alumni-registrations', async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      confirm_password,
      student_id,
      year_graduated,
      course
    } = req.body;

    const normalizedFullName = String(full_name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');
    const normalizedConfirm = String(confirm_password || '');
    const normalizedStudentId = String(student_id || '').trim();
    const normalizedCourse = String(course || '').trim();
    const normalizedYear = Number(year_graduated);

    if (!normalizedFullName || !normalizedEmail || !normalizedPassword || !normalizedStudentId || !normalizedCourse) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    if (!Number.isFinite(normalizedYear)) {
      return res.status(400).json({ message: 'Year graduated must be a number.' });
    }

    if (normalizedPassword !== normalizedConfirm) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    const existingRegistration = await AlumniRegistration.findOne({
      $or: [{ email: normalizedEmail }, { student_id: normalizedStudentId }]
    }).lean();

    if (existingUser && existingUser.role !== 'alumni') {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    if (existingRegistration && existingRegistration.verificationStatus !== 'rejected') {
      return res.status(409).json({ message: 'Registration already exists.' });
    }

    if (existingUser && existingUser.status !== 'rejected') {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    if (existingUser && existingUser.status === 'rejected') {
      existingUser.full_name = normalizedFullName;
      existingUser.password = await hashPassword(normalizedPassword);
      existingUser.status = 'pending';
      await existingUser.save();

      await AlumniRegistration.findOneAndUpdate(
        { userId: existingUser._id },
        {
          full_name: normalizedFullName,
          email: normalizedEmail,
          student_id: normalizedStudentId,
          year_graduated: normalizedYear,
          course: normalizedCourse,
          verificationStatus: 'pending',
          reviewedBy: null,
          rejectionReason: ''
        },
        { upsert: true, returnDocument: 'after' }
      );

      void Promise.all([
        mail.notifyAlumniRegistrationPending({
          to: normalizedEmail,
          fullName: normalizedFullName,
          isReapplication: true
        }),
        mail.notifyRegistrarAlumniPending({
          email: normalizedEmail,
          fullName: normalizedFullName,
          studentNumber: normalizedStudentId,
          course: normalizedCourse,
          yearGraduated: normalizedYear,
          isReapplication: true
        })
      ]);

      return res.status(200).json({
        message: 'Your registration has been resubmitted and is pending verification.',
        userId: existingUser._id
      });
    }

    const newUser = new User({
      full_name: normalizedFullName,
      email: normalizedEmail,
      password: await hashPassword(normalizedPassword),
      role: 'alumni',
      status: 'pending'
    });

    await newUser.save();

    const newRegistration = new AlumniRegistration({
      userId: newUser._id,
      full_name: normalizedFullName,
      email: normalizedEmail,
      student_id: normalizedStudentId,
      year_graduated: normalizedYear,
      course: normalizedCourse,
      verificationStatus: 'pending',
      reviewedBy: null,
      rejectionReason: ''
    });

    void Promise.all([
      mail.notifyAlumniRegistrationPending({
        to: normalizedEmail,
        fullName: normalizedFullName,
        isReapplication: false
      }),
      mail.notifyRegistrarAlumniPending({
        email: normalizedEmail,
        fullName: normalizedFullName,
        studentNumber: normalizedStudentId,
        course: normalizedCourse,
        yearGraduated: normalizedYear,
        isReapplication: false
      })
    ]);
    await newRegistration.save();

    return res.status(201).json({
      message: 'Alumni registration submitted.',
      registration: newRegistration
    });
  } catch (error) {
    console.error('Alumni registration error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// List alumni registrations (admin)
app.get('/api/alumni-registrations', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const registrations = await AlumniRegistration.find()
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ registrations });
  } catch (error) {
    console.error('List alumni registrations error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Update alumni verification status (admin)
app.patch('/api/alumni-registrations/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus, rejectionReason } = req.body;

    const normalizedStatus = String(verificationStatus || '').trim().toLowerCase();
    const normalizedReason = String(rejectionReason || '').trim();
    const reviewerId = req.auth?.sub || null;

    const allowed = ['pending', 'approved', 'rejected'];
    if (!allowed.includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Invalid verification status.' });
    }

    if (normalizedStatus === 'rejected' && !normalizedReason) {
      return res.status(400).json({ message: 'Rejection reason is required.' });
    }

    const existing = await AlumniRegistration.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    const update = {
      verificationStatus: normalizedStatus,
      rejectionReason: normalizedStatus === 'rejected' ? normalizedReason : '',
      reviewedBy: reviewerId
    };

    const updated = await AlumniRegistration.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    if (normalizedStatus === 'approved') {
      await User.findByIdAndUpdate(updated.userId, { status: 'active' });
    } else if (normalizedStatus === 'rejected') {
      await User.findByIdAndUpdate(updated.userId, { status: 'rejected' });
    }

    const alum = await User.findById(updated.userId).lean();
    if (alum) {
      if (normalizedStatus === 'approved') {
        void mail.notifyAlumniApproved({
          to: alum.email,
          fullName: alum.full_name
        });
      } else if (normalizedStatus === 'rejected') {
        void mail.notifyAlumniRejected({
          to: alum.email,
          fullName: alum.full_name,
          reason: normalizedReason
        });
      }
    }

    return res.status(200).json({
      message: 'Verification status updated.',
      registration: updated
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
    console.error('Update alumni registration error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Create a new document request
app.post('/api/requests', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const requestedDocumentType = String(req.body?.documentType || '').trim();
    if (!requestedDocumentType) {
      return res.status(400).json({ message: 'Document type is required.', field: 'documentType' });
    }

    const price = await DocumentPrice.findOne({
      documentType: requestedDocumentType,
      active: true
    }).lean();

    const validation = validateDocumentRequestInput({
      body: req.body,
      auth: req.auth,
      price
    });
    if (!validation.ok) {
      return res.status(validation.status || 400).json({
        message: validation.message,
        field: validation.field
      });
    }

    const requestData = validation.value;

    const skipOnlinePayment = !payments.isPaymongoConfigured();
    if (!skipOnlinePayment && !process.env.PAYMONGO_WEBHOOK_SECRET) {
      console.warn(
        '[payments] PAYMONGO_SECRET_KEY is set but PAYMONGO_WEBHOOK_SECRET is missing — paid requests will not unlock until webhooks are configured.'
      );
    }

    const newRequest = await saveDocumentRequestWithTracking({
      ...requestData,
      paymentConfirmed: false
    });

    const notifyRequestSubmitted = () =>
      (async () => {
        try {
          if (newRequest.requesterId) {
            try {
              await createNotification({
                userId: newRequest.requesterId,
                category: 'request_submitted',
                message: `Your request for ${newRequest.documentType} was submitted successfully.`,
                meta: {
                  requestId: String(newRequest._id),
                  trackingNumber: newRequest.trackingNumber || ''
                }
              });
            } catch (e) {
              console.error('[notifications] create on submit failed:', e && e.message ? e.message : e);
            }
          }
        } finally {
          void mail.notifyDocumentRequestSubmitted({
            to: newRequest.email,
            fullName: newRequest.full_name,
            trackingNumber: newRequest.trackingNumber || '',
            documentType: newRequest.documentType
          });
        }
      })();

    if (skipOnlinePayment) {
      console.warn(
        '[payments] PAYMONGO_SECRET_KEY is not set — complete payment on the Payment page (sandbox mode).'
      );

      void notifyRequestSubmitted();

      return res.status(201).json({
        message:
          'Request saved. Proceed to payment to complete your order (sandbox mode until PayMongo keys are set).',
        request: newRequest,
        payment: null,
        paymentMode: 'sandbox'
      });
    }

    try {
      const intent = await payments.createOrRefreshPaymentIntent(newRequest, null);

      void notifyRequestSubmitted();

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

// Admin: list all document prices (active + inactive)
app.get('/api/admin/prices', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const prices = await DocumentPrice.find({})
      .sort({ documentType: 1 })
      .lean();
    return res.status(200).json({ prices });
  } catch (error) {
    console.error('Admin list prices error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin: create a new document price
app.post('/api/admin/prices', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const documentType = String(req.body?.documentType || '').trim();
    if (!documentType) {
      return res.status(400).json({ message: 'Document type is required.', field: 'documentType' });
    }

    const basePrice = parseNonNegativeNumber(req.body?.basePrice);
    if (basePrice === null) {
      return res.status(400).json({ message: 'Base price must be a non-negative number.', field: 'basePrice' });
    }

    const perSucceedingPageFeeRaw = parseOptionalNonNegativeNumber(req.body?.perSucceedingPageFee);
    if (perSucceedingPageFeeRaw === null) {
      return res.status(400).json({
        message: 'Succeeding page fee must be a non-negative number.',
        field: 'perSucceedingPageFee'
      });
    }

    const deliveryFeeRaw = parseOptionalNonNegativeNumber(req.body?.deliveryFee);
    if (deliveryFeeRaw === null) {
      return res.status(400).json({ message: 'Delivery fee must be a non-negative number.', field: 'deliveryFee' });
    }

    const existing = await DocumentPrice.findOne({
      documentType: new RegExp(`^${escapeRegex(documentType)}$`, 'i')
    });
    if (existing) {
      return res.status(409).json({ message: 'Document type already exists.' });
    }

    let deliveryFee = deliveryFeeRaw;
    if (deliveryFee === undefined) {
      const fallback = await DocumentPrice.findOne({}).sort({ createdAt: 1 }).lean();
      deliveryFee = parseNonNegativeNumber(fallback?.deliveryFee) ?? 150;
    }

    const price = await DocumentPrice.create({
      documentType,
      basePrice,
      perSucceedingPageFee: perSucceedingPageFeeRaw ?? 0,
      deliveryFee,
      active: true
    });

    return res.status(201).json({ price });
  } catch (error) {
    console.error('Admin create price error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin: update delivery fee globally
app.patch('/api/admin/prices/delivery-fee', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const deliveryFee = parseNonNegativeNumber(req.body?.deliveryFee);
    if (deliveryFee === null) {
      return res.status(400).json({ message: 'Delivery fee must be a non-negative number.', field: 'deliveryFee' });
    }

    const result = await DocumentPrice.updateMany({}, { $set: { deliveryFee } });
    return res.status(200).json({
      deliveryFee,
      updatedCount: result?.modifiedCount ?? 0
    });
  } catch (error) {
    console.error('Admin update delivery fee error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin: update a document price (base/succeeding/delivery/active)
app.patch('/api/admin/prices/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const update = {};

    if (Object.prototype.hasOwnProperty.call(req.body, 'basePrice')) {
      const basePrice = parseNonNegativeNumber(req.body?.basePrice);
      if (basePrice === null) {
        return res.status(400).json({ message: 'Base price must be a non-negative number.', field: 'basePrice' });
      }
      update.basePrice = basePrice;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'perSucceedingPageFee')) {
      const perSucceedingPageFee = parseNonNegativeNumber(req.body?.perSucceedingPageFee);
      if (perSucceedingPageFee === null) {
        return res.status(400).json({
          message: 'Succeeding page fee must be a non-negative number.',
          field: 'perSucceedingPageFee'
        });
      }
      update.perSucceedingPageFee = perSucceedingPageFee;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'deliveryFee')) {
      const deliveryFee = parseNonNegativeNumber(req.body?.deliveryFee);
      if (deliveryFee === null) {
        return res.status(400).json({ message: 'Delivery fee must be a non-negative number.', field: 'deliveryFee' });
      }
      update.deliveryFee = deliveryFee;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'active')) {
      const active = parseBooleanInput(req.body?.active);
      if (active === null) {
        return res.status(400).json({ message: 'Active must be true or false.', field: 'active' });
      }
      update.active = active;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No updates provided.' });
    }

    const price = await DocumentPrice.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });

    if (!price) {
      return res.status(404).json({ message: 'Price not found.' });
    }

    return res.status(200).json({ price });
  } catch (error) {
    console.error('Admin update price error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get all document prices
app.get('/api/prices', async (req, res) => {
  try {
    const prices = await DocumentPrice.find({ active: true })
      .sort({ documentType: 1 })
      .lean();
    return res.status(200).json({ prices });
  } catch (error) {
    console.error('List prices error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get price by document type
app.get('/api/prices/:documentType', async (req, res) => {
  try {
    const documentType = String(req.params.documentType || '').trim();
    const price = await DocumentPrice.findOne({ documentType, active: true }).lean();
    if (!price) return res.status(404).json({ message: 'Price not found' });
    return res.status(200).json({ price });
  } catch (error) {
    console.error('Get price error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// In-app notifications for the current authenticated user.
app.get('/api/me/notifications', authMiddleware, async (req, res) => {
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

app.patch('/api/me/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    const result = await markAllNotificationsRead(req.auth.sub);
    if (!result.ok) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }
    return res.status(200).json({ updated: result.modifiedCount });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/me/notifications/:id/read', authMiddleware, async (req, res) => {
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

// Payment status for a request (student/alumni owner)
app.get('/api/requests/:id/payment', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    let doc = await DocumentRequest.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (!isRequestOwner(req, doc)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (!doc.paymentConfirmed && payments.isPaymongoConfigured()) {
      try {
        await payments.syncPaymentFromPaymongo(doc._id);
        doc = await DocumentRequest.findById(req.params.id).lean();
      } catch (syncErr) {
        console.warn('[payments] sync on payment status read:', syncErr.message || syncErr);
      }
    }

    const payment = await payments.getPaymentForRequest(doc._id);
    return res.status(200).json({
      request: doc,
      payment,
      paymentConfirmed: Boolean(doc.paymentConfirmed),
      paymongoEnabled: payments.isPaymongoConfigured(),
      mockEwalletEnabled: mockEwallet.isMockEwalletEnabled()
    });
  } catch (err) {
    console.error('Get payment status error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Payment receipt (paid requests only)
app.get('/api/requests/:id/payment/receipt', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const doc = await DocumentRequest.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (!isRequestOwner(req, doc)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const receipt = await payments.getPaymentReceipt(doc._id);
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not available. Payment may still be pending.' });
    }

    return res.status(200).json({ receipt });
  } catch (err) {
    console.error('Payment receipt error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

app.get(
  '/api/requests/:id/payment/receipt/pdf',
  authMiddleware,
  requireStudentOrAlumni,
  async (req, res) => {
    try {
      const doc = await DocumentRequest.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ message: 'Request not found' });
      if (!isRequestOwner(req, doc)) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      const receipt = await payments.getPaymentReceipt(doc._id);
      if (!receipt) {
        return res
          .status(404)
          .json({ message: 'Receipt not available. Payment may still be pending.' });
      }

      const pdfBuffer = await generateReceiptPdfBuffer(receipt);
      const filename = `receipt-${receipt.receiptNumber || doc._id}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error('Payment receipt PDF error:', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  }
);

// After PayMongo redirect: force sync payment intent (return page)
app.post('/api/requests/:id/payment/sync', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const doc = await DocumentRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (!isRequestOwner(req, doc)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const result = await payments.syncPaymentFromPaymongo(doc._id);
    const updated = await DocumentRequest.findById(doc._id).lean();
    const payment = await payments.getPaymentForRequest(doc._id);

    return res.status(200).json({
      ...result,
      paymentConfirmed: Boolean(updated?.paymentConfirmed),
      payment
    });
  } catch (err) {
    console.error('Payment sync error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Sandbox payment confirmation (when PayMongo is not configured)
app.post('/api/requests/:id/payment/confirm-sandbox', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const { id } = req.params;
    const { method } = req.body;

    const doc = await DocumentRequest.findById(id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });

    if (!isRequestOwner(req, doc)) {
      return res.status(403).json({ message: 'You can only pay for your own requests.' });
    }

    if (payments.isPaymongoConfigured()) {
      return res.status(400).json({
        message: 'Use GCash or Maya checkout. Sandbox confirmation is only for development without PayMongo.'
      });
    }

    const result = await payments.confirmSandboxPayment(doc, method);
    const payment = await payments.getPaymentForRequest(doc._id);

    return res.status(200).json({
      message: 'Payment recorded. Your request is now with the registrar.',
      request: result.request,
      payment
    });
  } catch (err) {
    console.error('Sandbox payment confirm error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Mock GCash / Maya checkout (imitation APIs — when PayMongo is not configured)
app.post('/api/requests/:id/payment/mock/checkout', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const { id } = req.params;
    const { method } = req.body;

    const doc = await DocumentRequest.findById(id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });

    if (!isRequestOwner(req, doc)) {
      return res.status(403).json({ message: 'You can only pay for your own requests.' });
    }

    if (doc.paymentConfirmed) {
      return res.status(400).json({ message: 'This request is already paid.' });
    }

    if (!mockEwallet.isMockEwalletEnabled()) {
      return res.status(503).json({
        message: 'Mock e-wallet is disabled while PayMongo is configured.'
      });
    }

    const { payerMobile, payerName } = req.body;
    if (payerMobile) {
      await payments.savePayerDetails(doc, { payerMobile, payerName });
    }

    const frontendBase = String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const returnUrl = `${frontendBase}/payment/return?requestId=${encodeURIComponent(String(doc._id))}`;
    const checkout = await mockEwallet.startMockCheckout(doc, method, returnUrl);

    return res.status(200).json({
      redirectUrl: checkout.redirectUrl,
      sessionId: checkout.sessionId,
      payment: {
        status: checkout.payment.paymentStatus,
        amountCentavos: checkout.amountCentavos,
        currency: checkout.currency,
        provider: checkout.provider
      }
    });
  } catch (err) {
    console.error('Mock payment checkout error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Start GCash / Maya checkout (redirect URL — PayMongo or mock fallback)
app.post('/api/requests/:id/payment/checkout', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const { id } = req.params;
    const { method, payerMobile, payerName } = req.body;

    const doc = await DocumentRequest.findById(id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });

    if (!isRequestOwner(req, doc)) {
      return res.status(403).json({ message: 'You can only pay for your own requests.' });
    }

    if (doc.paymentConfirmed) {
      return res.status(400).json({ message: 'This request is already paid.' });
    }

    if (payerMobile) {
      await payments.savePayerDetails(doc, { payerMobile, payerName });
    }

    const frontendBase = String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const returnUrl = `${frontendBase}/payment/return?requestId=${encodeURIComponent(String(doc._id))}`;

    if (!payments.isPaymongoConfigured()) {
      const checkout = await mockEwallet.startMockCheckout(doc, method, returnUrl);
      return res.status(200).json({
        redirectUrl: checkout.redirectUrl,
        sessionId: checkout.sessionId,
        paymentMode: 'mock',
        payment: {
          status: checkout.payment.paymentStatus,
          amountCentavos: checkout.amountCentavos,
          currency: checkout.currency,
          provider: checkout.provider
        }
      });
    }

    const existingPayment = await payments.getPaymentForRequest(doc._id);
    const checkout = await payments.startEwalletCheckout(doc, existingPayment, method, returnUrl);

    if (!checkout.redirectUrl) {
      return res.status(502).json({ message: 'Payment provider did not return a checkout URL.' });
    }

    return res.status(200).json({
      redirectUrl: checkout.redirectUrl,
      paymentMode: 'paymongo',
      payment: {
        status: checkout.payment?.paymentStatus || 'pending',
        amountCentavos: checkout.amountCentavos,
        currency: checkout.currency,
        clientKey: checkout.clientKey,
        paymentIntentId: checkout.paymentIntentId
      }
    });
  } catch (err) {
    console.error('Payment checkout error:', err);
    const detail =
      err.errors && Array.isArray(err.errors)
        ? err.errors.map((e) => e.detail || e.code).join('; ')
        : err.message || '';
    return res.status(502).json({ message: 'Payment provider error.', detail });
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

// Current user's requests (student/alumni)
app.get('/api/me/requests', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const authEmail = String(req.auth?.email || '').trim().toLowerCase();
    const authId = String(req.auth?.sub || '').trim();
    const filter = {};

    if (authEmail && authId) {
      filter.$or = [{ requesterId: authId }, { email: authEmail }];
    } else if (authEmail) {
      filter.email = authEmail;
    } else if (authId) {
      filter.requesterId = authId;
    } else {
      return res.status(400).json({ message: 'User context not found.' });
    }

    const requests = await DocumentRequest.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ requests });
  } catch (error) {
    console.error('List my requests error:', error);
    return res.status(500).json({ message: 'Server error' });
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

// Get a single request (student/alumni only)
app.get('/api/requests/:id', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await DocumentRequest.findById(id).lean();
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (!isRequestOwner(req, request)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return res.status(200).json({ request });
  } catch (error) {
    console.error('Get request error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete a request (student/alumni only, waiting for payment or pending status)
app.delete('/api/requests/:id', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await DocumentRequest.findById(id).lean();
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (!isRequestOwner(req, request)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const allowedDeleteStatuses = new Set(['Waiting for Payment', 'Pending']);
    if (!allowedDeleteStatuses.has(String(request.status || '').trim())) {
      return res.status(409).json({ message: 'Only waiting-for-payment or pending requests can be deleted.' });
    }

    await DocumentRequest.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Request deleted.' });
  } catch (error) {
    console.error('Delete request error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update request status (registrar)
app.patch('/api/requests/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const previous = await DocumentRequest.findById(id);
    if (!previous) return res.status(404).json({ message: 'Request not found' });

    if (!previous.paymentConfirmed) {
      return res.status(400).json({
        message: 'This request is not in the registrar queue until payment succeeds.'
      });
    }

    const transition = validateStatusTransition({
      currentStatus: previous.status,
      nextStatus: status,
      request: previous
    });
    if (!transition.ok) {
      return res.status(400).json({
        message: transition.message,
        allowedStatuses: transition.allowedStatuses || []
      });
    }

    const nextStatus = transition.status;
    const updated = await DocumentRequest.findByIdAndUpdate(id, { status: nextStatus }, { new: true });

    if (previous.status !== nextStatus) {
      await createNotification({
        userId: updated.requesterId,
        category: 'request_status',
        message: userStatusMessage(updated, nextStatus),
        meta: {
          requestId: String(updated._id),
          trackingNumber: updated.trackingNumber || '',
          status: nextStatus,
          deliveryMethod: updated.deliveryMethod || 'pickup'
        }
      });
      void mail.notifyDocumentRequestStatus({
        to: updated.email,
        fullName: updated.full_name,
        trackingNumber: updated.trackingNumber || '',
        documentType: updated.documentType,
        status: nextStatus,
        deliveryMethod: updated.deliveryMethod || 'pickup'
      });
    }

    return res.status(200).json({ message: 'Status updated', request: updated });
  } catch (error) {
    console.error('Update request error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

function logServerReady() {
  console.log('Server is running on port', process.env.PORT);
  console.log('Health check: http://localhost:' + process.env.PORT + '/api/health');
  if (mail.isMailConfigured()) {
    console.log('SMTP email: enabled (transactional notifications will be sent)');
  } else {
    console.log('SMTP email: disabled — set MAIL_HOST, MAIL_USER, MAIL_PASS to enable');
  }
  const pmStatus = payments.getPaymongoKeyStatus();
  if (pmStatus === 'secret') {
    console.log('PayMongo: enabled (secret key loaded — GCash/Maya checkout ready)');
  } else if (pmStatus === 'public') {
    console.warn(
      'PayMongo: PAYMONGO_SECRET_KEY is still pk_ (public). Put sk_test_ in backend/.env and restart (Ctrl+C, npm run dev).'
    );
  } else if (pmStatus === 'invalid') {
    console.warn('PayMongo: PAYMONGO_SECRET_KEY is set but invalid (must start with sk_test_ or sk_live_).');
  } else {
    console.log('PayMongo: disabled — mock GCash/Maya checkout at /api/mock/gcash|maya/v1/*');
  }
}

// Start HTTP immediately so the frontend gets responses even while DB is connecting
app.listen(process.env.PORT, () => {
  logServerReady();
});

// DB connect (login and all data routes need this)
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME
  })
  .then(async () => {
    console.log('Connected to MongoDB database:', process.env.DB_NAME);
    const syncedIndexes = await DocumentRequest.syncIndexes();
    if (syncedIndexes?.length) {
      console.log('DocumentRequest indexes synchronized:', JSON.stringify(syncedIndexes));
    }
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
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message || error);
    console.error(
      'Fix: MongoDB Atlas → Network Access → Add IP Address (your current IP or 0.0.0.0/0 for dev).'
    );
  });

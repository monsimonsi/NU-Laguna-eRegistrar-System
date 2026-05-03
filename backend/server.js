require('dotenv').config();

const express = require('express');
const dns = require('dns'); // Lets Node use custom DNS resolvers.
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const DocumentRequest = require('./models/DocumentRequest');
const AlumniVerification = require('./models/AlumniVerification');
const {
  signToken,
  authMiddleware,
  requireAdmin,
  requireStudentOrAlumni
} = require('./middleware/auth');

const app = express();

// Force reliable DNS resolvers for Atlas SRV lookups on restricted networks.
dns.setServers(['8.8.8.8', '1.1.1.1']); // Uses public DNS to resolve Atlas SRV records.

// Middleware
app.use(cors());
app.use(express.json());

const ALLOWED_STATUSES = DocumentRequest.REQUEST_STATUSES || [
  'Pending',
  'Processing',
  'Ready for Pickup',
  'Out for Delivery',
  'Released'
];

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

    if (!user || user.password !== normalizedPassword) {
      return res.status(401).json({
        approved: false,
        message: 'Login rejected. Invalid email, password, or role.'
      });
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
      existing.password = plainPassword;
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

      return res.status(200).json({
        message:
          'Your registration has been resubmitted and is pending verification.',
        userId: existing._id
      });
    }

    const user = new User({
      full_name,
      email: normalizedEmail,
      password: plainPassword,
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
      DocumentRequest.countDocuments(),
      DocumentRequest.countDocuments({ status: 'Pending' }),
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
      trackingNumber: makeTrackingNumber()
    });

    await newRequest.save();

    return res.status(201).json({ message: 'Request created', request: newRequest });
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

// All requests (registrar) — optional ?email= filter
app.get('/api/requests', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { email } = req.query;
    const filter = {};
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

    const updated = await DocumentRequest.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Request not found' });

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
    app.listen(process.env.PORT, () => {
      console.log('Server is running on port', process.env.PORT);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB', error);
  });

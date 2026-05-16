require('dotenv').config();

const express = require('express');
const dns = require('dns'); // Lets Node use custom DNS resolvers.
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const AlumniRegistration = require('./models/AlumniRegistration');
const DocumentRequest = require('./models/DocumentRequest');
const DocumentPrice = require('./models/DocumentPrice');
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

function isRequestOwner(req, request) {
  const authEmail = String(req.auth?.email || '').trim().toLowerCase();
  const requestEmail = String(request.email || '').trim().toLowerCase();
  if (authEmail && requestEmail && authEmail === requestEmail) return true;

  const authId = String(req.auth?.sub || '');
  const requesterId = request.requesterId ? String(request.requesterId) : '';
  return Boolean(authId && requesterId && authId === requesterId);
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

    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    const existingRegistration = await AlumniRegistration.findOne({
      $or: [{ email: normalizedEmail }, { student_id: normalizedStudentId }]
    }).lean();

    if (existingRegistration) {
      return res.status(409).json({ message: 'Registration already exists for this email or student ID.' });
    }

    const newUser = new User({
      full_name: normalizedFullName,
      email: normalizedEmail,
      password: normalizedPassword,
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
app.get('/api/alumni-registrations', async (req, res) => {
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
app.patch('/api/alumni-registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus, reviewedBy, rejectionReason } = req.body;

    const normalizedStatus = String(verificationStatus || '').trim().toLowerCase();
    const normalizedReason = String(rejectionReason || '').trim();

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
      rejectionReason: normalizedStatus === 'rejected' ? normalizedReason : ''
    };

    if (reviewedBy) {
      update.reviewedBy = reviewedBy;
    }

    const updated = await AlumniRegistration.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    if (normalizedStatus === 'approved') {
      await User.findByIdAndUpdate(updated.userId, { status: 'active' });
    }

    return res.status(200).json({
      message: 'Verification status updated.',
      registration: updated
    });
  } catch (error) {
    console.error('Update alumni registration error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Create a new document request
app.post('/api/requests', async (req, res) => {
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

    const normalizedDocumentType = String(documentType || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!full_name || !email || !role || !normalizedDocumentType) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const price = await DocumentPrice.findOne({
      documentType: normalizedDocumentType,
      active: true
    }).lean();

    if (!price) {
      return res.status(400).json({ message: 'No pricing found for this document type.' });
    }

    const normalizedCopies = Math.max(1, Number(copies) || 1);
    const normalizedSucceedingPages = normalizedDocumentType === 'Course Description 1st Page'
      ? Math.max(0, Number(succeedingPages) || 0)
      : 0;

    const basePrice = Number(price.basePrice) || 0;
    const perSucceedingPageFee = Number(price.perSucceedingPageFee) || 0;
    const succeedingPagesFee = normalizedSucceedingPages * perSucceedingPageFee;
    const subtotal = (basePrice + succeedingPagesFee) * normalizedCopies;
    const deliveryFee = deliveryMethod === 'delivery' ? Number(price.deliveryFee) || 150 : 0;
    const totalFee = subtotal + deliveryFee;

    const newRequest = new DocumentRequest({
      requesterId: requesterId ? requesterId : req.auth.sub,
      full_name,
      email: normalizedEmail,
      role,
      documentType: normalizedDocumentType,
      purpose,
      copies: normalizedCopies,
      deliveryMethod: deliveryMethod || 'pickup',
      address: address || '',
      succeedingPages: normalizedSucceedingPages,
      notes: notes || '',
      basePrice,
      perSucceedingPageFee,
      succeedingPagesFee,
      deliveryFee,
      totalFee
    });

    await newRequest.save();

    return res.status(201).json({ message: 'Request created', request: newRequest });
  } catch (error) {
    console.error('Create request error:', error);
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

// Get all requests (admin) or filter by email (user)
app.get('/api/requests', async (req, res) => {
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

// Delete a request (student/alumni only, pending status)
app.delete('/api/requests/:id', authMiddleware, requireStudentOrAlumni, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await DocumentRequest.findById(id).lean();
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (!isRequestOwner(req, request)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (request.status !== 'Pending') {
      return res.status(409).json({ message: 'Only pending requests can be deleted.' });
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

require('dotenv').config();

const express = require('express');
const dns = require('dns'); // Lets Node use custom DNS resolvers.
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const DocumentRequest = require('./models/DocumentRequest');

const app = express();

// Force reliable DNS resolvers for Atlas SRV lookups on restricted networks.
dns.setServers(['8.8.8.8', '1.1.1.1']); // Uses public DNS to resolve Atlas SRV records.

// Middleware
app.use(cors());
app.use(express.json());

// Login API
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');
    const normalizedRole = String(role || '').trim().toLowerCase();

    // Basic validation
    if (!normalizedEmail || !normalizedPassword || !normalizedRole) {
      return res.status(400).json({
        approved: false,
        message: 'Email, password, and role are required.'
      });
    }

    // Exact-match login: email + password + role + active status.
    const user = await User.findOne({
      email: normalizedEmail,
      password: normalizedPassword,
      role: normalizedRole,
      status: 'active'
    });

    if (!user) {
      return res.status(401).json({
        approved: false,
        message: 'Login rejected. Invalid email, password, role, or inactive account.'
      });
    }

    return res.status(200).json({
      approved: true,
      message: 'Login successful.',
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

    if (!full_name || !email || !role || !documentType) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const newRequest = new DocumentRequest({
      requesterId: requesterId || undefined,
      full_name,
      email,
      role,
      documentType,
      purpose,
      copies: copies ? Number(copies) : 1,
      deliveryMethod: deliveryMethod || 'pickup',
      address: address || '',
      succeedingPages: succeedingPages ? Number(succeedingPages) : 0,
      notes: notes || ''
    });

    await newRequest.save();

    return res.status(201).json({ message: 'Request created', request: newRequest });
  } catch (error) {
    console.error('Create request error:', error);
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

// Update request status
app.patch('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['Pending', 'Processing', 'Ready for Pickup', 'Out for Delivery', 'Completed'];
    if (!allowed.includes(status)) {
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
mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.DB_NAME
})
  .then(() => {
    console.log('Connected to MongoDB database:', process.env.DB_NAME);
    app.listen(process.env.PORT, () => {
      console.log('Server is running on port', process.env.PORT);
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB', error);
  });

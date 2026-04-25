const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../../config/mail');
const Driver = require('../../models/Driver');
const Owner = require('../../models/Owner');
const Load = require('../../models/Load');
const Notification = require('../../models/Notification');
const Vehicle = require('../../models/Vehicle'); // Standardized PascalCase

const { protect, restrictTo } = require('../../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const sendApprovalEmailToOwner = async (owner, driver) => {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const approveUrl = `${baseUrl}/api/driver/approve/${driver._id}`;
  const rejectUrl = `${baseUrl}/api/driver/reject/${driver._id}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:30px;border:1px solid #e0e0e0;border-radius:12px;background:#fff;">
      <h2 style="color:#1a1a2e;text-align:center;">
        <span style="font-size:32px;margin-right:10px;">📚</span>
        Truck Management System
      </h2>
      <hr style="border:1px solid #e0e0e0;" />
      <p>Hello <strong>${owner.username}</strong>,</p>
      <p>A new driver has requested to join your transport: <strong>${owner.transportName}</strong></p>
      <h3 style="color:#ff6b00;border-bottom:2px solid #ff6b00;padding-bottom:5px;display:inline-block;">Driver Details</h3>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#fcfcfc;border:1px solid #eee;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:12px;color:#555;font-weight:600;width:140px;border-bottom:1px solid #eee;">Username</td><td style="padding:12px;border-bottom:1px solid #eee;">${driver.username}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:12px;color:#555;font-weight:600;border-bottom:1px solid #eee;">Mobile</td><td style="padding:12px;border-bottom:1px solid #eee;">${driver.mobile}</td></tr>
        <tr><td style="padding:12px;color:#555;font-weight:600;border-bottom:1px solid #eee;">Email</td><td style="padding:12px;border-bottom:1px solid #eee;">${driver.email}</td></tr>
        <tr style="background:#fff7ed;"><td style="padding:12px;color:#555;font-weight:600;border-bottom:1px solid #eee;">License</td><td style="padding:12px;border-bottom:1px solid #eee;"><a href="${baseUrl}/api/driver/document/${driver._id}/drivingLicense" target="_blank" style="color:#ff6b00;font-weight:600;text-decoration:none;">View Document 📄</a></td></tr>
        <tr style="background:#fff7ed;"><td style="padding:12px;color:#555;font-weight:600;">Aadhaar</td><td style="padding:12px;"><a href="${baseUrl}/api/driver/document/${driver._id}/aadhaar" target="_blank" style="color:#ff6b00;font-weight:600;text-decoration:none;">View Document 📄</a></td></tr>
      </table>
      <div style="text-align:center;margin:30px 0;">
        <a href="${approveUrl}" style="background:#22c55e;color:white;padding:12px 25px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin-right:10px;display:inline-block;">Approve Driver</a>
        <a href="${rejectUrl}" style="background:#ef4444;color:white;padding:12px 25px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">Reject Request</a>
      </div>
    </div>`;
  await sendEmail({ to: owner.email, subject: `New Driver Registration - ${driver.username}`, html });
};

const sendStatusEmailToDriver = async (driver, status) => {
  const isApproved = status === 'APPROVED';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #e0e0e0;border-radius:12px;background:#fff;">
      <h2 style="color:#1a1a2e;text-align:center;">
        <img src="https://img.icons8.com/color/48/truck.png" style="vertical-align:middle;margin-right:10px;width:32px;height:32px;" />
        Truck Management System
      </h2>
      <p>Hello <strong>${driver.username}</strong>,</p>
      ${isApproved
      ? `<div style="padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;text-align:center;color:#166534;">
           <img src="https://img.icons8.com/color/48/verified-badge.png" style="margin-bottom:10px;" /><br/>
           Your account has been <strong>APPROVED</strong>! You can now login to your dashboard.
         </div>`
      : `<div style="padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;text-align:center;color:#991b1b;">
           <img src="https://img.icons8.com/color/48/cancel.png" style="margin-bottom:10px;" /><br/>
           Your account has been <strong>REJECTED</strong>. Please contact the Transport Owner.
         </div>`}
    </div>`;
  await sendEmail({ to: driver.email, subject: isApproved ? 'Driver Account Approved!' : 'Driver Account Rejected', html });
};

// ─── AUTH ───────────────────────────────────────────

router.post('/register', upload.fields([{ name: 'drivingLicense', maxCount: 1 }, { name: 'aadhaar', maxCount: 1 }]), async (req, res) => {
  try {
    const { transportName, username, mobile, email, password, confirmPassword } = req.body;
    if (!transportName || !username || !mobile || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password !== confirmPassword)
      return res.status(400).json({ success: false, message: 'Passwords do not match' });

    if (!req.files || !req.files['drivingLicense'] || !req.files['aadhaar'])
      return res.status(400).json({ success: false, message: 'Documents are required' });

    const existing = await Driver.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
    const owner = await Owner.findOne({ transportName: { $regex: new RegExp(`^${transportName}$`, 'i') } });
    if (!owner) return res.status(400).json({ success: false, message: 'Transport not found.' });

    const driver = await Driver.create({
      transportName,
      username,
      mobile,
      email,
      password,
      status: 'PENDING',
      drivingLicense: {
        data: req.files['drivingLicense'][0].buffer,
        contentType: req.files['drivingLicense'][0].mimetype
      },
      aadhaar: {
        data: req.files['aadhaar'][0].buffer,
        contentType: req.files['aadhaar'][0].mimetype
      }
    });

    try { await sendApprovalEmailToOwner(owner, driver); } catch (e) { console.error('Approval email error:', e.message); }

    // ✅ Add real-time notification for Owner
    try {
      const io = req.app.get('io');
      const notifPayload = {
        title: 'New Driver Registration',
        message: `${driver.username} has requested to join your transport: ${transportName}`,
        type: 'DRIVER_REGISTERED',
        timestamp: new Date()
      };

      await Notification.create({
        recipient: owner._id,
        recipientModel: 'Owner',
        title: notifPayload.title,
        message: notifPayload.message,
        type: notifPayload.type
      });

      if (io) {
        io.to(owner._id.toString()).emit('notification', notifPayload);
        console.log(`🔔 Notified owner ${owner._id} about new driver`);
      }
    } catch (err) {
      console.error('❌ Notification Error:', err.message);
    }

    res.status(201).json({ success: true, message: 'Registration submitted! Waiting for owner approval.', data: { status: 'PENDING' } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// ✅ GET document from MongoDB
router.get('/document/:id/:type', async (req, res) => {
  try {
    const { id, type } = req.params;
    const driver = await Driver.findById(id);
    if (!driver || !driver[type] || !driver[type].data) {
      return res.status(404).send('Document not found');
    }
    res.set('Content-Type', driver[type].contentType);
    res.send(driver[type].data);
  } catch (err) {
    res.status(500).send('Error fetching document');
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const user = await Driver.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'Email not found' });
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/driver/${resetToken}`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #e0e0e0;border-radius:10px;">
      <h2 style="color:#1a1a2e;text-align:center;"><span style="font-size:32px;margin-right:10px;">📚</span>Truck Management</h2>
      <hr/><p>Hello,</p><p>You requested a password reset. Click the button below to reset it (valid for 15 minutes):</p>
      <div style="text-align:center;margin:30px 0;"><a href="${resetUrl}" style="background:#ff6b00;color:#fff;padding:15px 25px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">RESET PASSWORD</a></div>
      <p style="color:#666;font-size:12px;">If you didn't request this, ignore this email.</p>
    </div>`;
    await sendEmail({ to: user.email, subject: 'Truck Management - Password Reset', html });
    res.json({ success: true, message: 'Reset link sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error sending reset link' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await Driver.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { transportName, identifier, password } = req.body;
    if (!transportName || !identifier || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });
    const driver = await Driver.findOne({
      transportName,
      $or: [{ email: identifier.toLowerCase() }, { mobile: identifier }, { username: identifier }],
    });
    if (!driver) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const isMatch = await driver.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (driver.status === 'PENDING')
      return res.status(403).json({ success: false, statusCode: 'PENDING', message: 'Waiting for owner approval.' });
    if (driver.status === 'REJECTED')
      return res.status(403).json({ success: false, statusCode: 'REJECTED', message: 'Your account has been rejected.' });
    const token = signToken(driver._id, 'driver');
    res.json({
      success: true, message: 'Login successful', token,
      data: { id: driver._id, username: driver.username, email: driver.email, transportName: driver.transportName, role: 'driver' },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

router.get('/notifications', protect, restrictTo('driver'), async (req, res) => {
  try {
    const history = await Notification.find({ recipient: req.user.id, recipientModel: 'Driver' })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notification history' });
  }
});

router.patch('/notifications/read', protect, restrictTo('driver'), async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, recipientModel: 'Driver', isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
  }
});

router.get('/approve/:id', async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, { status: 'APPROVED' }, { new: true });
    if (!driver) return res.status(404).send('<h2>Driver not found.</h2>');
    try { await sendStatusEmailToDriver(driver, 'APPROVED'); } catch (e) { console.error(e); }
    res.send(`<html><body style="font-family:Arial;text-align:center;padding:80px;background:#0a0a14;color:#f0f0f0;">
      <div style="max-width:400px;margin:auto;background:#0f0f20;border-radius:16px;padding:40px;border:1px solid #2ed573;">
        <div style="margin-bottom:20px;"><img src="https://img.icons8.com/color/96/verified-badge.png" /></div>
        <h1 style="color:#2ed573;font-family:Rajdhani,Arial;text-transform:uppercase;letter-spacing:2px;">Driver Approved!</h1>
        <p style="color:#aaa;"><strong>${driver.username}</strong> has been successfully approved and can now login.</p>
      </div></body></html>`);
  } catch (err) { res.status(500).send('<h2>Something went wrong.</h2>'); }
});

router.get('/reject/:id', async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, { status: 'REJECTED' }, { new: true });
    if (!driver) return res.status(404).send('<h2>Driver not found.</h2>');
    try { await sendStatusEmailToDriver(driver, 'REJECTED'); } catch (e) { console.error(e); }
    res.send(`<html><body style="font-family:Arial;text-align:center;padding:80px;background:#0a0a14;color:#f0f0f0;">
      <div style="max-width:400px;margin:auto;background:#0f0f20;border-radius:16px;padding:40px;border:1px solid #ff4757;">
        <div style="margin-bottom:20px;"><img src="https://img.icons8.com/color/96/cancel.png" /></div>
        <h1 style="color:#ff4757;font-family:Rajdhani,Arial;text-transform:uppercase;letter-spacing:2px;">Driver Rejected</h1>
        <p style="color:#aaa;"><strong>${driver.username}</strong> has been rejected and notified.</p>
      </div></body></html>`);
  } catch (err) { res.status(500).send('<h2>Something went wrong.</h2>'); }
});

// ─── PROFILE ────────────────────────────────────────

router.get('/profile', protect, restrictTo('driver'), async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id).select('-password');
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    let wheelType = '';
    if (driver.vehicleNumber) {
      // Use case-insensitive regex lookup for robustness
      const vehicle = await Vehicle.findOne({ 
        vehicleNo: { $regex: new RegExp(`^${driver.vehicleNumber.trim()}$`, 'i') } 
      });
      if (vehicle) wheelType = vehicle.wheelType;
    }

    res.json({ success: true, data: { ...driver.toObject(), wheelType } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// ─── LOADS ──────────────────────────────────────────

router.get('/loads', protect, restrictTo('driver'), async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    let query = { status: 'Waiting', driverId: null };

    // ✅ NEW: Apply filter if driver has an assigned vehicle
    if (driver.vehicleNumber) {
      const vehicle = await Vehicle.findOne({ 
        vehicleNo: { $regex: new RegExp(`^${driver.vehicleNumber.trim()}$`, 'i') } 
      });
      if (vehicle) {
        query.vehicleRequired = vehicle.wheelType;
      }
    }

    const loads = await Load.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: loads });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch loads' });
  }
});

router.get('/my-load', protect, restrictTo('driver'), async (req, res) => {
  try {
    const load = await Load.findOne({
      driverId: req.user.id,
      status: { $in: ['Booked', 'In Transit'] },
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: load || null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch active load' });
  }
});

router.get('/history', protect, restrictTo('driver'), async (req, res) => {
  try {
    const loads = await Load.find({ driverId: req.user.id, status: 'Completed' }).sort({ createdAt: -1 });
    res.json({ success: true, data: loads });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

// ✅ UPDATED: Accept load + notify Owner & Loader
router.patch('/loads/:id/accept', protect, restrictTo('driver'), async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    const load = await Load.findByIdAndUpdate(
      req.params.id,
      {
        driverId: req.user.id,
        driverName: driver.username,
        driverPhone: driver.mobile,
        vehicleNumber: driver.vehicleNumber || '',
        status: 'Booked',
        stage: 'Approved',
      },
      { new: true }
    );
    if (!load) return res.status(404).json({ success: false, message: 'Load not found' });

    const io = req.app.get('io');

    // ✅ Notify Loader
    if (load.loaderId) {
      const notifPayload = {
        type: 'LOAD_ACCEPTED',
        title: '🚛 Driver Accepted Your Load!',
        message: `${driver.username} accepted load ${load.loadId} (${load.material} ${load.weight}T). Route: ${load.pickup} → ${load.drop}.`,
        loadId: load.loadId,
        timestamp: new Date(),
      };
      
      // ✅ Persist
      await Notification.create({
        recipient: load.loaderId,
        recipientModel: 'Loader',
        title: notifPayload.title,
        message: notifPayload.message,
        type: notifPayload.type,
        loadId: notifPayload.loadId,
      });

      io.to(load.loaderId.toString()).emit('notification', notifPayload);
    }

    // ✅ Notify Owner(s) of this transport (Case-Insensitive Match)
    const owners = await Owner.find({ transportName: { $regex: new RegExp(`^${driver.transportName}$`, 'i') } });
    owners.forEach(async (owner) => {
      const notifPayload = {
        type: 'LOAD_ACCEPTED',
        title: '🚛 Driver Accepted a Load!',
        message: `${driver.username} accepted load ${load.loadId} (${load.material} ${load.weight}T). Route: ${load.pickup} → ${load.drop}.`,
        loadId: load.loadId,
        timestamp: new Date(),
      };

      // ✅ Persist
      await Notification.create({
        recipient: owner._id,
        recipientModel: 'Owner',
        title: notifPayload.title,
        message: notifPayload.message,
        type: notifPayload.type,
        loadId: notifPayload.loadId,
      });

      io.to(owner._id.toString()).emit('notification', notifPayload);
    });

    console.log(`🔔 Load accepted → notified loader + ${owners.length} owner(s)`);
    res.json({ success: true, message: 'Load accepted', data: load });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to accept load' });
  }
});

// ✅ UPDATED: Stage update + notify Owner & Loader
router.patch('/loads/:id/stage', protect, restrictTo('driver'), async (req, res) => {
  try {
    const { stage } = req.body;
    const validStages = ['Approved', 'Loading', 'In Transit', 'Unloading', 'Completed'];
    if (!validStages.includes(stage))
      return res.status(400).json({ success: false, message: 'Invalid stage' });

    const updateData = { stage };
    if (stage === 'In Transit') updateData.status = 'In Transit';
    if (stage === 'Completed')  updateData.status = 'Completed';

    const load = await Load.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!load) return res.status(404).json({ success: false, message: 'Load not found' });

    const driver = await Driver.findById(req.user.id);
    const io = req.app.get('io');

    const stageEmoji = {
      'Approved':   '📍 Arrived at Pickup',
      'Loading':    '📦 Loading Started',
      'In Transit': '🚛 In Transit',
      'Unloading':  '📍 Arrived at Drop',
      'Completed':  '✅ Delivery Completed',
    };

    const notifPayload = {
      type: 'STAGE_UPDATE',
      title: stageEmoji[stage] || stage,
      message: `Load ${load.loadId} (${load.material} ${load.weight}T | ${load.pickup} → ${load.drop}) updated to [${stage}] by ${driver.username}.`,
      loadId: load.loadId,
      stage,
      timestamp: new Date(),
    };

    // ✅ Notify Loader
    if (load.loaderId) {
      // ✅ Persist
      await Notification.create({
        recipient: load.loaderId,
        recipientModel: 'Loader',
        title: notifPayload.title,
        message: notifPayload.message,
        type: notifPayload.type,
        loadId: notifPayload.loadId,
      });
      io.to(load.loaderId.toString()).emit('notification', notifPayload);
    }

    // ✅ Notify Owner(s) (Case-Insensitive Match)
    const owners = await Owner.find({ transportName: { $regex: new RegExp(`^${driver.transportName}$`, 'i') } });
    owners.forEach(async (owner) => {
      // ✅ Persist
      await Notification.create({
        recipient: owner._id,
        recipientModel: 'Owner',
        title: notifPayload.title,
        message: notifPayload.message,
        type: notifPayload.type,
        loadId: notifPayload.loadId,
      });
      io.to(owner._id.toString()).emit('notification', notifPayload);
    });

    console.log(`🔔 Stage [${stage}] → notified loader + ${owners.length} owner(s)`);
    res.json({ success: true, message: `Stage updated to ${stage}`, data: load });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update stage' });
  }
});

router.get('/stats', protect, restrictTo('driver'), async (req, res) => {
  try {
    const completed = await Load.countDocuments({ driverId: req.user.id, status: 'Completed' });
    const active    = await Load.countDocuments({ driverId: req.user.id, status: { $in: ['Booked', 'In Transit'] } });
    const total     = await Load.countDocuments({ driverId: req.user.id });
    const available = await Load.countDocuments({ status: 'Waiting', driverId: null });
    res.json({ success: true, data: { completed, active, total, available } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});


module.exports = router;
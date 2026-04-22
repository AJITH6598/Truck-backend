const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sendEmail } = require('../../config/mail');
const jwt = require('jsonwebtoken');
const Owner = require('../../models/Owner');
const Driver = require('../../models/Driver');
const Vehicle = require('../../models/Vehicle');
const Load = require('../../models/Load');
const Notification = require('../../models/Notification'); // ✅ NEW
const { protect, restrictTo } = require('../../middleware/authMiddleware');
const { generateOTP, storeOTP, verifyOTP, sendOTPEmail } = require('../../config/otp');

router.get('/debug-health', (req, res) => {
  res.json({ success: true, message: 'Owner router is reachable' });
});

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// ─── AUTH ───────────────────────────────────────────

router.post('/send-otp', async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const existingEmail = await Owner.findOne({ email: email.toLowerCase() });
    if (existingEmail) return res.status(400).json({ success: false, message: 'Email already registered' });
    if (username) {
      const existingUsername = await Owner.findOne({ username: username.toLowerCase() });
      if (existingUsername) return res.status(400).json({ success: false, message: 'Username already taken' });
    }
    const otp = generateOTP();
    storeOTP(email.toLowerCase(), otp);
    await sendOTPEmail(email, otp, username || 'Owner');
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Check email config.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { transportName, username, mobile, email, password, confirmPassword, otp } = req.body;
    if (!transportName || !username || !mobile || !email || !password || !otp)
      return res.status(400).json({ success: false, message: 'All fields are required' });
    if (password !== confirmPassword)
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    const otpResult = verifyOTP(email.toLowerCase(), otp);
    if (!otpResult.valid) return res.status(400).json({ success: false, message: otpResult.message });
    const existing = await Owner.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (existing) return res.status(400).json({ success: false, message: 'Email or username already exists' });
    const owner = await Owner.create({ transportName, username, mobile, email, password });
    res.status(201).json({ success: true, message: 'Owner registered successfully', data: { id: owner._id, username: owner.username, role: 'owner' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const user = await Owner.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'Email not found' });
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/owner/${resetToken}`;
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
    const user = await Owner.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } });
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
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });
    const owner = await Owner.findOne({ $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }] });
    if (!owner) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const isMatch = await owner.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signToken(owner._id, 'owner');
    res.json({
      success: true, message: 'Login successful', token,
      data: { id: owner._id, username: owner.username, transportName: owner.transportName, role: 'owner' },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

router.get('/transports', async (req, res) => {
  try {
    const transports = await Owner.find({}, 'transportName');
    res.json({ success: true, data: transports.map((o) => o.transportName) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch transports' });
  }
});

// ─── DRIVERS ────────────────────────────────────────

router.get('/drivers', protect, restrictTo('owner'), async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    const drivers = await Driver.find({ transportName: owner.transportName }, '-password');
    res.json({ success: true, data: drivers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
  }
});

router.get('/notifications', protect, restrictTo('owner'), async (req, res) => {
  try {
    const history = await Notification.find({ recipient: req.user.id, recipientModel: 'Owner' })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notification history' });
  }
});

router.patch('/notifications/read', protect, restrictTo('owner'), async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, recipientModel: 'Owner', isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
  }
});

// ─── FLEET / VEHICLES ───────────────────────────────

router.get('/vehicles', protect, restrictTo('owner'), async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ ownerId: req.user.id });
    res.json({ success: true, data: vehicles });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch vehicles' });
  }
});

// ✅ UPDATED: Auto-links vehicleNumber to Driver + sends Socket.io notification
router.post('/vehicles', protect, restrictTo('owner'), async (req, res) => {
  try {
    const { vehicleNo, wheelType, capacity, driverName, driverId, status } = req.body;
    if (!vehicleNo || !wheelType || !capacity)
      return res.status(400).json({ success: false, message: 'Vehicle number, wheel type and capacity are required' });

    const existing = await Vehicle.findOne({ vehicleNo: vehicleNo.toUpperCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Vehicle already exists' });

    const owner = await Owner.findById(req.user.id);

    const vehicle = await Vehicle.create({
      vehicleNo: vehicleNo.toUpperCase(),
      wheelType,
      capacity,
      ownerId: req.user.id,
      driverName: driverName || '',
      driverId: driverId || null,
      status: status || 'Idle',
    });

    // ✅ Auto-assign vehicleNumber to driver + send notification
    if (driverName && driverName.trim() !== '') {
      const updatedDriver = await Driver.findOneAndUpdate(
        {
          username: { $regex: new RegExp(`^${driverName.trim()}$`, 'i') },
          transportName: owner.transportName,
        },
        { vehicleNumber: vehicleNo.toUpperCase() },
        { new: true }
      );

      // ✅ Send real-time notification to driver via Socket.io
      if (updatedDriver) {
        const io = req.app.get('io');
        const notifPayload = {
          type: 'VEHICLE_ASSIGNED',
          title: '🚛 Vehicle Assigned!',
          message: `Vehicle ${vehicleNo.toUpperCase()} (${wheelType}) has been assigned to you by ${owner.transportName}.`,
          vehicleNo: vehicleNo.toUpperCase(),
          wheelType,
          timestamp: new Date(),
        };

        // ✅ Persist to DB
        await Notification.create({
          recipient: updatedDriver._id,
          recipientModel: 'Driver',
          title: notifPayload.title,
          message: notifPayload.message,
          type: notifPayload.type,
          timestamp: notifPayload.timestamp,
        });

        io.to(updatedDriver._id.toString()).emit('notification', notifPayload);
        console.log(`🔔 Notification sent to driver: ${updatedDriver.username}`);
      }
    }

    res.status(201).json({ success: true, message: 'Vehicle added successfully', data: vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add vehicle' });
  }
});

router.delete('/vehicles/:id', protect, restrictTo('owner'), async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (vehicle && vehicle.driverName) {
      const driver = await Driver.findOneAndUpdate(
        { username: { $regex: new RegExp(`^${vehicle.driverName}$`, 'i') } },
        { vehicleNumber: '' },
        { new: true }
      );
      // ✅ Notify driver that vehicle was removed
      if (driver) {
        const io = req.app.get('io');
        const notifPayload = {
          type: 'VEHICLE_REMOVED',
          title: '⚠️ Vehicle Unassigned',
          message: `Vehicle ${vehicle.vehicleNo} has been removed from your profile.`,
          timestamp: new Date(),
        };
        
        // ✅ Persist to DB
        await Notification.create({
          recipient: driver._id,
          recipientModel: 'Driver',
          title: notifPayload.title,
          message: notifPayload.message,
          type: notifPayload.type,
          timestamp: notifPayload.timestamp,
        });

        io.to(driver._id.toString()).emit('notification', notifPayload);
      }
    }
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete vehicle' });
  }
});

// ─── LOADS ──────────────────────────────────────────

router.get('/loads', protect, restrictTo('owner'), async (req, res) => {
  try {
    const loads = await Load.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: loads });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch loads' });
  }
});

// ─── DASHBOARD STATS ────────────────────────────────

router.get('/stats', protect, restrictTo('owner'), async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    const drivers = await Driver.find({ transportName: owner.transportName });
    const vehicles = await Vehicle.find({ ownerId: req.user.id });
    const loads = await Load.find({});
    const totalCapacity = vehicles.reduce((sum, v) => sum + (v.capacity || 0), 0);
    res.json({
      success: true,
      data: {
        totalDrivers: drivers.length,
        totalVehicles: vehicles.length,
        totalLoads: loads.length,
        activeLoads: loads.filter(l => l.status !== 'Completed').length,
        completedLoads: loads.filter(l => l.status === 'Completed').length,
        fleetCapacity: totalCapacity,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});


module.exports = router;
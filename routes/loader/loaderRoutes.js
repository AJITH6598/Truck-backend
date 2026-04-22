const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sendEmail } = require('../../config/mail');
const jwt = require('jsonwebtoken');
const Loader = require('../../models/Loader');
const Driver = require('../../models/Driver'); // ✅ NEW
const Load = require('../../models/Load');
const Notification = require('../../models/Notification');
const Owner = require('../../models/Owner');
const { protect, restrictTo } = require('../../middleware/authMiddleware');
const { generateOTP, storeOTP, verifyOTP, sendOTPEmail } = require('../../config/otp');

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// ─── AUTH ───────────────────────────────────────────

router.post('/send-otp', async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const existingEmail = await Loader.findOne({ email: email.toLowerCase() });
    if (existingEmail) return res.status(400).json({ success: false, message: 'Email already registered' });
    const otp = generateOTP();
    storeOTP(email.toLowerCase(), otp);
    await sendOTPEmail(email, otp, username || 'Loader');
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send OTP. Check email config.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { officeName, username, mobile, email, password, confirmPassword, otp } = req.body;
    if (!officeName || !username || !mobile || !email || !password || !otp)
      return res.status(400).json({ success: false, message: 'All fields are required' });
    if (password !== confirmPassword)
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    const otpResult = verifyOTP(email.toLowerCase(), otp);
    if (!otpResult.valid) return res.status(400).json({ success: false, message: otpResult.message });
    const existing = await Loader.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (existing) return res.status(400).json({ success: false, message: 'Email or username already exists' });
    const loader = await Loader.create({ officeName, username, mobile, email, password });
    res.status(201).json({ success: true, message: 'Loader registered successfully', data: { id: loader._id, username: loader.username, role: 'loader' } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const user = await Loader.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'Email not found' });
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/loader/${resetToken}`;
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
    const user = await Loader.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } });
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
    const loader = await Loader.findOne({ $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }] });
    if (!loader) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const isMatch = await loader.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signToken(loader._id, 'loader');
    res.json({
      success: true, message: 'Login successful', token,
      data: { id: loader._id, username: loader.username, officeName: loader.officeName, role: 'loader' },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

router.get('/notifications', protect, restrictTo('loader'), async (req, res) => {
  try {
    const history = await Notification.find({ recipient: req.user.id, recipientModel: 'Loader' })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notification history' });
  }
});

router.patch('/notifications/read', protect, restrictTo('loader'), async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, recipientModel: 'Loader', isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
  }
});

// ─── LOADS ──────────────────────────────────────────

// ✅ UPDATED: Notify ALL approved drivers when new load is posted
router.post('/loads', protect, restrictTo('loader'), async (req, res) => {
  try {
    const { material, weight, vehicleRequired, pickup, drop, pickupDate, notes, cost, perTonCost, commission, finalAmount, distance, duration, pickupCoords, dropCoords } = req.body;

    if (!material || !weight || !vehicleRequired || !pickup || !drop || !cost || !finalAmount)
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });

    const loader = await Loader.findById(req.user.id);

    const load = await Load.create({
      material, weight, vehicleRequired, pickup, drop, cost,
      perTonCost: perTonCost || 0,
      commission: commission || 0,
      finalAmount: finalAmount || cost,
      distance: distance || 0,
      duration: duration || 0,
      pickupCoords: pickupCoords || [],
      dropCoords: dropCoords || [],
      pickupDate: pickupDate || '',
      notes: notes || '',
      loaderId: req.user.id,
      loaderName: loader.username,
      loaderOffice: loader.officeName,
    });

    // ✅ Notify ALL approved drivers about new load
    const io = req.app.get('io');
    const approvedDrivers = await Driver.find({ status: 'APPROVED' }, '_id');

    const notificationPayload = {
      type: 'NEW_LOAD',
      title: '📦 New Load Available!',
      message: `${material} (${weight}T) from ${pickup} → ${drop}. Distance: ${distance || 0}KM. Vehicle: ${vehicleRequired}. Reward: ₹${cost}.`,
      loadId: load._id, // Use load._id for the newly created load
      pickup,
      drop,
      material,
      weight,
      vehicleRequired,
      cost, // Include cost in the payload
      distance: distance || 0,
      duration: duration || 0,
      pickupCoords: pickupCoords || [],
      dropCoords: dropCoords || [],
      timestamp: new Date(),
    };

    approvedDrivers.forEach(async (driver) => {
      // ✅ Persist to DB
      await Notification.create({
        recipient: driver._id,
        recipientModel: 'Driver',
        title: notificationPayload.title,
        message: notificationPayload.message,
        type: notificationPayload.type,
        loadId: notificationPayload.loadId,
      });

      // ✅ Real-time
      io.to(driver._id.toString()).emit('notification', notificationPayload);
    });

    // ✅ ALSO Notify all Owners (who might want to pick up this load)
    const owners = await Owner.find({}, '_id');
    owners.forEach(async (owner) => {
      // ✅ Persist
      await Notification.create({
        recipient: owner._id,
        recipientModel: 'Owner',
        title: notificationPayload.title,
        message: notificationPayload.message,
        type: notificationPayload.type,
        loadId: notificationPayload.loadId,
      });
      // ✅ Real-time
      io.to(owner._id.toString()).emit('notification', notificationPayload);
    });

    console.log(`🔔 New load notification sent to ${approvedDrivers.length} drivers & ${owners.length} owners`);

    res.status(201).json({ success: true, message: 'Load posted and all notified!', data: load });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create load' });
  }
});

router.get('/loads', protect, restrictTo('loader'), async (req, res) => {
  try {
    const loads = await Load.find({ loaderId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: loads });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch loads' });
  }
});

router.get('/stats', protect, restrictTo('loader'), async (req, res) => {
  try {
    const loads = await Load.find({ loaderId: req.user.id });
    res.json({
      success: true,
      data: {
        total: loads.length,
        waiting: loads.filter(l => l.status === 'Waiting').length,
        booked: loads.filter(l => l.status === 'Booked').length,
        inTransit: loads.filter(l => l.status === 'In Transit').length,
        completed: loads.filter(l => l.status === 'Completed').length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});


module.exports = router;
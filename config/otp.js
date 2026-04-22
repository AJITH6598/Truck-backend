const { sendEmail } = require('./mail');

const otpStore = new Map();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const storeOTP = (email, otp) => {
  otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
};

const verifyOTP = (email, otp) => {
  const record = otpStore.get(email);
  if (!record) return { valid: false, message: 'OTP not found. Please request again.' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return { valid: false, message: 'OTP expired. Please request again.' };
  }
  if (record.otp !== otp) return { valid: false, message: 'Invalid OTP.' };
  otpStore.delete(email);
  return { valid: true };
};

const sendOTPEmail = async (email, otp, name = 'User') => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #e0e0e0;border-radius:10px;">
      <h2 style="color:#1a1a2e;text-align:center;">
        <span style="font-size:32px;margin-right:10px;">📚</span>
        Truck Management System
      </h2>
      <hr style="border:1px solid #e0e0e0;" />
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your OTP for registration is:</p>
      <div style="text-align:center;margin:20px 0;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#ff6b00;background:#fff7f0;padding:15px 25px;border-radius:12px;border:1px solid #ff6b00;">${otp}</span>
      </div>
      <p style="color:#666;">Valid for <strong>10 minutes</strong>. Do not share it.</p>
      <hr style="border:1px solid #e0e0e0;" />
      <p style="color:#999;font-size:12px;text-align:center;">Truck Management System &copy; ${new Date().getFullYear()}</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Truck Management System - OTP Verification',
    html
  });
};

module.exports = { generateOTP, storeOTP, verifyOTP, sendOTPEmail };
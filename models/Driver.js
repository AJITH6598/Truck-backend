const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema(
  {
    transportName: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, default: 'driver' },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    // ✅ NEW: Vehicle assigned by Owner
    vehicleNumber: { type: String, default: '' },
    // ✅ NEW: Documents stored natively in DB
    drivingLicense: {
      data: Buffer,
      contentType: String
    },
    aadhaar: {
      data: Buffer,
      contentType: String
    },
  },
  { timestamps: true }
);

driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

driverSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Driver', driverSchema);
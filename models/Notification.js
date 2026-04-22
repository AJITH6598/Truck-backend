const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipientModel',
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ['Owner', 'Loader', 'Driver'],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true }, // e.g., 'NEW_LOAD', 'STAGE_UPDATE', etc.
    loadId: { type: String },
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);

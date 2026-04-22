const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
    {
        vehicleNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
        wheelType: {
            type: String,
            required: true,
            enum: ['6 Wheel', '10 Wheel', '12 Wheel', '14 Wheel', '16 Wheel'],
        },
        capacity: { type: Number, required: true },

        // Owner who added this vehicle
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },

        // Assigned driver (optional)
        driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
        driverName: { type: String, default: '' },

        status: {
            type: String,
            enum: ['Active', 'On Trip', 'Idle', 'Maintenance'],
            default: 'Idle',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);

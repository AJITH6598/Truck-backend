const mongoose = require('mongoose');

const loadSchema = new mongoose.Schema(
    {
        loadId: { type: String, unique: true },
        material: { type: String, required: true, trim: true },
        weight: { type: Number, required: true },
        vehicleRequired: { type: String, required: true },
        pickup: { type: String, required: true, trim: true },
        drop: { type: String, required: true, trim: true },
        pickupDate: { type: String },
        cost: { type: Number, required: true },
        perTonCost: { type: Number, default: 0 },
        commission: { type: Number, default: 0 },
        finalAmount: { type: Number, required: true },
        distance: { type: Number, default: 0 },
        duration: { type: String, default: '' }, // e.g. "1 hr 55 mins"
        pickupCoords: { type: [Number], default: [] }, // [lat, lng]
        dropCoords: { type: [Number], default: [] }, // [lat, lng]
        notes: { type: String, default: '' },

        // Loader who created this load
        loaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loader', required: true },
        loaderName: { type: String },
        loaderOffice: { type: String },

        // Driver assigned
        driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
        driverName: { type: String, default: '' },
        driverPhone: { type: String, default: '' },
        vehicleNumber: { type: String, default: '' },

        // Owner of the driver
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', default: null },

        // Status & Stage
        status: {
            type: String,
            enum: ['Waiting', 'Booked', 'In Transit', 'Completed'],
            default: 'Waiting',
        },
        stage: {
            type: String,
            enum: ['Waiting', 'Approved', 'Loading', 'In Transit', 'Unloading', 'Completed'],
            default: 'Waiting',
        },
    },
    { timestamps: true }
);

// Auto-generate loadId before saving
loadSchema.pre('save', async function (next) {
    if (!this.loadId) {
        const count = await mongoose.model('Load').countDocuments();
        this.loadId = `LD${String(count + 101).padStart(3, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Load', loadSchema);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Load = require('../models/Load'); // Standardized PascalCase
const connectDB = require('../config/db');

const migrateDuration = async () => {
    try {
        await connectDB();
        console.log('🔄 Starting Universal Duration Migration (Number -> HR/MIN String)...');

        const loads = await Load.find({});
        console.log(`📋 Processing ${loads.length} loads...`);

        let updatedCount = 0;
        for (const load of loads) {
            const raw = load.duration;

            // 1️⃣ Skip if already formatted correctly (e.g., "1 hr 55 mins")
            if (typeof raw === 'string' && (raw.includes('hr') || raw.includes('mins'))) {
                console.log(`⏩ [${load.loadId}] Already formatted: "${raw}"`);
                continue;
            }

            let minutes = 0;
            const value = parseFloat(raw) || 0;

            if (value === 0) {
                console.log(`⏩ [${load.loadId}] Duration is empty/zero, skipping.`);
                continue;
            }

            // 2️⃣ Detect if it's legacy seconds (usually > 500 for a trip) or minutes
            // Trips are typically > 100km, so > 1 hour. 
            // 3600s = 1hr. 60m = 1hr.
            // If it's > 500, it's almost certainly seconds.
            if (value > 500) {
                minutes = Math.round(value / 60);
                console.log(`⏱️ [${load.loadId}] Detected Seconds: ${value}s -> ${minutes}m`);
            } else {
                minutes = Math.round(value);
                console.log(`⏱️ [${load.loadId}] Detected Minutes: ${minutes}m`);
            }

            // 3️⃣ Convert to final string format "X hr Y mins"
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            const durStr = h > 0 ? `${h} hr ${m} mins` : `${m} mins`;

            await Load.updateOne(
                { _id: load._id },
                { $set: { duration: durStr } }
            );
            
            console.log(`✅ [${load.loadId}] Updated to: "${durStr}"`);
            updatedCount++;
        }

        console.log(`\n🎉 Migration Complete! Total updated: ${updatedCount}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
};

migrateDuration();

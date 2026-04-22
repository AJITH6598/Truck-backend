// Re-export from auth.js so routes that import 'authMiddleware' work seamlessly
const { protect, restrictTo } = require('./auth');
module.exports = { protect, restrictTo };

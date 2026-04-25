require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const fs = require('fs');

const ownerRoutes = require('./routes/owner/ownerRoutes');
const loaderRoutes = require('./routes/loader/loaderRoutes');
const driverRoutes = require('./routes/driver/driverRoutes');

connectDB();

const app = express();
const server = http.createServer(app); // ✅ wrap express in http server

// ✅ Socket.io setup
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', credentials: true }
});

// ✅ Make io accessible in all route files
app.set('io', io);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Client joins their own room by userId
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
});

app.use(limiter);
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['*'];
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/owner', ownerRoutes);
app.use('/api/loader', loaderRoutes);
app.use('/api/driver', driverRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Truck Management API is running!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => { // ✅ use server.listen not app.listen
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔔 Socket.io ready for real-time notifications`);
});
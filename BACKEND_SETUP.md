# Backend Setup & Troubleshooting Guide

## Prerequisites
Ensure you have:
- Node.js (v14 or higher)
- MongoDB connected (check `MONGO_URI` in `.env`)
- Port 5000 available

## Installation

```bash
cd backend
npm install
```

## Environment Setup

Make sure `.env` file exists with these variables:

```env
PORT=5000
MONGO_URI=mongodb+srv://AJITH:Ajith1234@cluster0.e50fqfv.mongodb.net/lorrydb?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=lorry_management_secret_key_2024
JWT_EXPIRE=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=ajithbtechcsbs@gmail.com
EMAIL_PASS=wtfzaqwkqcbagbdz
EMAIL_FROM=ajithbtechcsbs@gmail.com

CLIENT_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

## Starting the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## Testing Endpoints

After the server starts, run the test script:

```bash
node test-endpoints.js
```

## Common Issues & Fixes

### 1. MongoDB Connection Error
**Error:** `MongoDB Connection Failed`

**Fix:**
- Check if `MONGO_URI` in `.env` is correct
- Verify your MongoDB Atlas cluster is active
- Check IP whitelist in MongoDB Atlas

### 2. SMTP/Email Error
**Error:** `Email operation failed: connect ECONNREFUSED`

**Fix:**
- Verify Gmail credentials are correct
- Use [App Password](https://support.google.com/accounts/answer/185833) instead of regular password
- Check if 2FA is enabled on Gmail account

### 3. Port Already in Use
**Error:** `EADDRINUSE: address already in use :::5000`

**Fix:**
```bash
# Find and kill process on port 5000
lsof -i :5000  # On Mac/Linux
netstat -ano | findstr :5000  # On Windows
```

### 4. Missing Dependencies
**Error:** `Cannot find module 'express'`

**Fix:**
```bash
npm install
npm install --legacy-peer-deps  # If conflicts occur
```

## API Endpoints

### Auth (Public)
- `POST /api/owner/send-otp` - Send OTP to email
- `POST /api/owner/register` - Register owner
- `POST /api/owner/login` - Login owner
- `POST /api/owner/forgot-password` - Request password reset
- `POST /api/owner/reset-password/:token` - Reset password

### Owner (Protected)
- `GET /api/owner/drivers` - List all drivers
- `GET /api/owner/vehicles` - List all vehicles
- `POST /api/owner/vehicles` - Create vehicle
- `GET /api/owner/notifications` - Get notifications

### Loader (Public/Protected)
- `POST /api/loader/send-otp` - Send OTP
- `POST /api/loader/register` - Register loader
- `POST /api/loader/login` - Login loader

### Driver (Public/Protected)
- `POST /api/driver/send-otp` - Send OTP
- `POST /api/driver/register` - Register driver
- `POST /api/driver/login` - Login driver

### Health Check
- `GET /api/health` - Server health status

## Docker Support

Build and run with Docker:
```bash
docker build -t lorry-backend:latest .
docker run -p 5000:5000 --env-file .env lorry-backend:latest
```

## Debugging

Enable detailed logging:
```bash
DEBUG=* npm start
```

Check logs for:
- `[DB]` - Database operations
- `[MAIL]` - Email operations
- `🔌` - Socket.io connections
- `🚀` - Server startup

## Need Help?

1. Check MongoDB connection
2. Verify all environment variables
3. Review error messages in console
4. Check `/api/health` endpoint status
5. Run `node test-endpoints.js`

"# Truck Management Backend API

A Node.js/Express backend for the Truck Management System with MongoDB integration, JWT authentication, real-time Socket.io notifications, and email support.

## Quick Start

### Installation
```bash
npm install
```

### Environment Setup
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Key variables to configure:
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `EMAIL_USER` & `EMAIL_PASS` - Gmail SMTP credentials
- `CLIENT_URL` - Frontend URL (for CORS and links)

### Start Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will run on `http://localhost:5000`

### Test Endpoints
```bash
node test-endpoints.js
```

## Architecture

```
backend/
├── config/              # Configuration files
│   ├── db.js           # MongoDB connection
│   ├── mail.js         # Email service
│   └── otp.js          # OTP generation & verification
├── middleware/          # Express middleware
│   ├── auth.js         # JWT authentication
│   └── authMiddleware.js # Auth exports
├── models/             # MongoDB schemas
│   ├── Owner.js        # Transport owners
│   ├── Driver.js       # Drivers
│   ├── Loader.js       # Loaders/freight operators
│   ├── Vehicle.js      # Fleet vehicles
│   ├── Load.js         # Loads/shipments
│   └── Notification.js # Real-time notifications
├── routes/             # API endpoints
│   ├── owner/          # Owner endpoints
│   ├── driver/         # Driver endpoints
│   └── loader/         # Loader endpoints
├── scripts/            # Utility scripts
├── server.js           # Main Express app
└── package.json        # Dependencies
```

## API Features

### Authentication
- OTP-based registration (email verification)
- JWT token-based login
- Role-based access control (Owner, Driver, Loader)
- Password reset with token verification

### Core Features
- **Owner**: Manage drivers, fleet vehicles, loads, and view real-time notifications
- **Driver**: Register, accept loads, update trip status, real-time tracking
- **Loader**: Create loads, track shipments, manage schedules

### Real-time Features
- Socket.io for live notifications
- Real-time load assignments
- Driver location tracking
- Instant status updates

## Main Endpoints

### Owner Routes (`/api/owner`)
- `POST /send-otp` - Send OTP
- `POST /register` - Register owner
- `POST /login` - Login
- `GET /drivers` - List drivers (protected)
- `GET /vehicles` - List vehicles (protected)
- `POST /vehicles` - Create vehicle (protected)
- `GET /notifications` - Get notifications (protected)

### Driver Routes (`/api/driver`)
- `POST /send-otp` - Send OTP
- `POST /register` - Register driver
- `POST /login` - Login
- `GET /loads` - Available loads (protected)
- `POST /accept-load` - Accept a load (protected)

### Loader Routes (`/api/loader`)
- `POST /send-otp` - Send OTP
- `POST /register` - Register loader
- `POST /login` - Login
- `POST /loads` - Create load (protected)

### Health Check
- `GET /api/health` - Server status

## Technologies Used

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io
- **Email**: Nodemailer (Gmail SMTP)
- **Security**: bcryptjs for password hashing
- **Rate Limiting**: express-rate-limit
- **File Upload**: Multer

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lorrydb

# Authentication
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d

# Email Service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=Truck Management <your_email@gmail.com>

# CORS & URLs
CLIENT_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

## Docker Support

Build and run with Docker:
```bash
docker build -t lorry-backend:latest .
docker run -p 5000:5000 --env-file .env lorry-backend:latest
```

## Troubleshooting

See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for detailed troubleshooting guide.

### Common Issues:
1. **MongoDB Connection Failed** - Check `MONGO_URI` and IP whitelist
2. **Email Not Sending** - Verify Gmail app password and SMTP settings
3. **Port Already in Use** - Change `PORT` in `.env` or kill process on 5000
4. **CORS Errors** - Update `CLIENT_URL` to match your frontend

## Scripts

```bash
npm start          # Start production server
npm run dev        # Start with nodemon (auto-reload)
npm test           # Test endpoints (requires running server)
npm run test:full  # Start server and test all endpoints
```

## License

MIT" 

# ⚡ BACKEND QUICK START

## 1️⃣ Install Dependencies
```bash
cd backend
npm install
```

## 2️⃣ Check Environment Variables
Before running, verify your `.env` file is configured:
```bash
npm run check-env
```

This will validate:
- ✅ All required variables are present
- ✅ MongoDB URI is valid
- ✅ JWT secret is strong enough
- ✅ Email configuration is correct
- ✅ URLs are properly set

**Fix any ❌ issues it reports before continuing.**

## 3️⃣ Start the Backend Server

### Option A: Production Mode
```bash
npm start
```
Output should show:
```
🚀 Server running on http://localhost:5000
[DB] MongoDB Connected: cluster0.e50fqfv.mongodb.net
[MAIL] SMTP connection verified!
🔔 Socket.io ready for real-time notifications
```

### Option B: Development Mode (Auto-reload)
```bash
npm run dev
```
The server will reload automatically when you make changes.

## 4️⃣ Test All Endpoints
In a new terminal, run:
```bash
npm test
```

You should see:
```
✅ Health Check
✅ Owner Router
✅ Send OTP (Owner)
✅ Send OTP (Loader)
```

## 🐛 Troubleshooting

### Server won't start?
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Use different port
PORT=3001 npm start
```

### Database connection fails?
```bash
# Verify MongoDB Atlas:
1. Is your IP whitelisted? (MongoDB Atlas > Security > IP Access List)
2. Are credentials correct in MONGO_URI?
3. Is the cluster active?
```

### Email not working?
```bash
# Verify in Gmail:
1. Have you enabled 2-Step Verification?
2. Created an App Password? (not regular password)
3. Tried logging in manually first?

# Test email config:
npm run check-env
```

### Endpoints return errors?
```bash
# Check server logs for specific errors:
# [DB] = Database issue
# [MAIL] = Email issue
# 🔌 = Socket.io issue

# Enable debug mode:
DEBUG=* npm run dev
```

## 📋 Common Startup Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Run production server |
| `npm run dev` | Run with auto-reload |
| `npm run check-env` | Validate environment |
| `npm test` | Test all endpoints |
| `npm install` | Install dependencies |

## ✅ When Server is Running

Your backend is ready when you see:
```
🚀 Server running on http://localhost:5000
[DB] MongoDB Connected
[MAIL] SMTP connection verified!
```

Now you can:
- Access the API at `http://localhost:5000/api/*`
- Check health at `http://localhost:5000/api/health`
- Connect frontend (make sure `CORS` allows it)
- Run tests with `npm test`

## 🔗 API Documentation

See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for complete API reference and troubleshooting guide.

## 💡 Tips

1. **Keep both servers running**: 
   - Terminal 1: `npm run dev` (backend)
   - Terminal 2: `cd ../frontend && npm start` (React)

2. **Check logs frequently** for errors and connections

3. **Use Postman** to test API endpoints manually

4. **Monitor Socket.io** with browser console on frontend

---

**Still having issues?** 
- Check logs in the terminal
- Run `npm run check-env` to validate configuration
- Review [BACKEND_SETUP.md](./BACKEND_SETUP.md) for detailed troubleshooting

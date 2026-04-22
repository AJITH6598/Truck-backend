# 🧪 Backend API Testing Guide

## Quick Test (Automated)

```bash
npm test
```

This runs automated tests for all critical endpoints.

---

## Manual Testing with cURL

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Truck Management API is running!"
}
```

---

## Owner Endpoints

### 1. Send OTP (Registration)
```bash
curl -X POST http://localhost:5000/api/owner/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","username":"myowner"}'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email"
}
```

---

### 2. Register Owner
```bash
curl -X POST http://localhost:5000/api/owner/register \
  -H "Content-Type: application/json" \
  -d '{
    "transportName":"ABC Transport",
    "username":"myowner",
    "mobile":"9876543210",
    "email":"owner@example.com",
    "password":"Pass@123",
    "confirmPassword":"Pass@123",
    "otp":"123456"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Owner registered successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "username": "myowner",
    "role": "owner"
  }
}
```

---

### 3. Owner Login
```bash
curl -X POST http://localhost:5000/api/owner/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"myowner","password":"Pass@123"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "username": "myowner",
    "transportName": "ABC Transport",
    "role": "owner"
  }
}
```

---

### 4. Get Drivers (Protected)
```bash
curl http://localhost:5000/api/owner/drivers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "username": "driver1",
      "email": "driver1@example.com",
      "mobile": "9876543211",
      "transportName": "ABC Transport"
    }
  ]
}
```

---

### 5. Create Vehicle (Protected)
```bash
curl -X POST http://localhost:5000/api/owner/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "vehicleNo":"TN01AB1234",
    "wheelType":"8-wheeler",
    "capacity":"20 tons",
    "status":"Idle"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "vehicleNo": "TN01AB1234",
    "wheelType": "8-wheeler",
    "capacity": "20 tons",
    "status": "Idle"
  }
}
```

---

### 6. Get Vehicles (Protected)
```bash
curl http://localhost:5000/api/owner/vehicles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Driver Endpoints

### 1. Send OTP
```bash
curl -X POST http://localhost:5000/api/driver/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@example.com"}'
```

---

### 2. Register Driver
```bash
curl -X POST http://localhost:5000/api/driver/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"driver1",
    "mobile":"9876543211",
    "email":"driver@example.com",
    "password":"Pass@123",
    "confirmPassword":"Pass@123",
    "drivingLicense":"DL123456",
    "aadhaar":"123456789012",
    "otp":"123456"
  }'
```

---

### 3. Driver Login
```bash
curl -X POST http://localhost:5000/api/driver/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"driver1","password":"Pass@123"}'
```

---

## Loader Endpoints

### 1. Send OTP
```bash
curl -X POST http://localhost:5000/api/loader/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"loader@example.com","username":"myloader"}'
```

---

### 2. Register Loader
```bash
curl -X POST http://localhost:5000/api/loader/register \
  -H "Content-Type: application/json" \
  -d '{
    "officeName":"ABC Logistics",
    "username":"myloader",
    "mobile":"9876543212",
    "email":"loader@example.com",
    "password":"Pass@123",
    "confirmPassword":"Pass@123",
    "otp":"123456"
  }'
```

---

## Using Postman

1. **Import Collection:**
   - Create a new Postman collection
   - Add requests for each endpoint
   - Set `Authorization: Bearer {{token}}` for protected routes

2. **Set Environment Variables:**
   ```json
   {
     "base_url": "http://localhost:5000",
     "token": "your_jwt_token_here"
   }
   ```

3. **Template for Protected Requests:**
   ```
   GET {{base_url}}/api/owner/drivers
   Headers:
   - Authorization: Bearer {{token}}
   ```

---

## Error Responses

### Missing Required Fields
```json
{
  "success": false,
  "message": "All fields are required"
}
```

### Invalid Credentials
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Token Expired
```json
{
  "success": false,
  "message": "Token invalid or expired"
}
```

### Access Denied (Wrong Role)
```json
{
  "success": false,
  "message": "Access denied"
}
```

---

## Testing Script

A ready-to-use test script is included:

```bash
node test-endpoints.js
```

This automatically tests all basic endpoints.

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - No/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Check backend logs |

---

## Debugging Tips

1. **Check Console Logs:**
   - Watch the terminal where backend is running
   - Look for `[DB]`, `[MAIL]`, `🔌` prefixes

2. **Enable Debug Mode:**
   ```bash
   DEBUG=* npm run dev
   ```

3. **Test Database Connection:**
   Check if `[DB] MongoDB Connected` appears in logs

4. **Test Email:**
   Check if `[MAIL] Email sent` appears for OTP emails

5. **Monitor Socket.io:**
   Open browser DevTools and watch Network tab for WebSocket connections

---

## Common Issues

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` | Backend not running on 5000 |
| `CORS error` | Check `CLIENT_URL` in `.env` |
| `Invalid token` | Token expired, re-login |
| `Email not received` | Check junk folder, verify Gmail app password |
| `MongoDB error` | Check `MONGO_URI`, IP whitelist, cluster status |

# RuralTrust AI - Authentication System Guide

## 🔐 Overview

The RuralTrust AI system now includes a comprehensive authentication system with three user types:

1. **Citizens** - OTP + CAPTCHA based signup/login
2. **Government Officials** - Username/Password or QR Code login
3. **Administrators** - Administrative access to manage government accounts

---

## 🚀 Quick Start

### Default Admin Credentials

```
Username: admin
Password: admin123

⚠️ **IMPORTANT:** Change these credentials in production!
```

### First Time Setup

1. **Start the servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Access the application:** `http://localhost:3000`

3. **Create your first government account:**
   - Click on "Admin Panel" tab
   - Login with default admin credentials
   - Create a new government account
   - Download the QR code for quick login

---

## 👥 Citizen Portal

### Signup Flow

1. Navigate to "Citizen Portal"
2. Click "New User" → "Create Account"
3. Fill in details:
   - Full Name
   - Village (select from dropdown)
   - Mobile Number (10 digits)
4. Click "Send OTP"
5. Check the **backend console** for OTP (in production, this will be sent via SMS)
6. Solve the CAPTCHA (simple math question)
7. Enter OTP and click "Verify & Login"

### Login Flow (Existing Users)

1. Navigate to "Citizen Portal"
2. Click "Existing User" → "Login with Mobile"
3. Enter mobile number
4. Click "Request OTP"
5. Check backend console for OTP
6. Solve CAPTCHA
7. Enter OTP and login

###Features After Login

- Submit complaints (village auto-filled from profile)
- View user info (name, village)
- Logout

---

## 🏛️ Government Dashboard

### Login Methods

#### Method 1: Username & Password

1. Navigate to "Government Dashboard"
2. Select "Username & Password" tab
3. Enter credentials created by admin
4. Click "Login"

#### Method 2: QR Code Scan

1. Navigate to "Government Dashboard"
2. Select "QR Code" tab
3. Click "Scan QR Code"
4. Scan the QR code provided by admin
5. Auto-login

### Features After Login

- View AI-prioritized active complaints
- See complaint details and AI reasoning
- Resolve complaints
- View officer name and designation
- Logout

---

## ⚙️ Admin Panel

### Accessing Admin Panel

1. Navigate to "Admin Panel" tab
2. Login with admin credentials
3. Access government account management

### Creating Government Accounts

1. Click "+ Create New Account"
2. Fill in details:
   - **Username** (e.g., officer001)
   - **Full Name** (e.g., Rajesh Kumar)
   - **Designation** (e.g., Block Development Officer)
3. Click "Create Account"
4. **Save the generated password** (shown only once!)
5. Download the QR code for the account
6. Share credentials + QR code with the government officer

### Managing Accounts

- **View QR Code**: Download or view QR for any account
- **Toggle Status**: Activate/deactivate accounts
- **Delete Account**: Permanently remove accounts

---

## 🔧 Technical Details

### Backend API Endpoints

#### Authentication Routes (`/api/auth`)

**Citizen:**
```
POST   /citizen/signup           - Register new citizen
POST   /citizen/request-otp      - Request OTP for existing citizen
POST   /citizen/verify-otp       - Verify OTP and login
```

**Government:**
```
POST   /government/login         - Login with credentials
POST   /government/qr-login      - Login with QR code data
GET    /government/:id/qr-code   - Get QR code for account
```

**Admin:**
```
POST   /admin/login                         - Admin login
POST   /admin/create-government             - Create government account
GET    /admin/government-list               - List all government accounts
PUT    /admin/government/:id/toggle-status  - Activate/deactivate
DELETE /admin/government/:id                - Delete account
```

**Utility:**
```
GET    /captcha                  - Get CAPTCHA challenge
POST   /verify-token             - Verify JWT token
```

#### Protected Complaint Routes

All complaint routes now require authentication:

```
POST   /api/complaints           - Submit complaint (citizen only)
GET    /api/complaints           - Get active (government/admin only)
GET    /api/complaints/history   - Get history (government/admin only)
PUT    /api/complaints/:id/resolve - Resolve (government/admin only)
```

### JWT Token Management

- **Citizens**: 24-hour expiry
- **Government**: 8-hour expiry
- **Admin**: 2-hour expiry

Tokens stored in `localStorage` and automatically included in API requests.

### OTP System

- **Expiry**: 5 minutes
- **Delivery**: Console log (development), SMS gateway (production)
- **Storage**: In-memory map (use Redis in production)

### CAPTCHA System

- **Type**: Simple math questions (e.g., "5 + 3 = ?")
- **Expiry**: 5 minutes
- **Storage**: In-memory map
- **Production**: Upgrade to Google reCAPTCHA

### QR Code Generation

- **Format**: Base64 PNG data URL
- **Content**: Encrypted credentials + timestamp
- **Size**: 300x300px
- **Use**: Quick government officer login

---

## 🔒 Security Considerations

### Current Implementation

✅ Password hashing with bcrypt  
✅ JWT token authentication  
✅ OTP verification  
✅ CAPTCHA protection  
✅ Account status management  
✅ Protected API routes  

### Production Checklist

⚠️ **CRITICAL: Before deploying to production:**

1. **Change default admin credentials**
   ```env
   ADMIN_USERNAME=secure_username
   ADMIN_PASSWORD=SecureP@ssw0rd!
   ```

2. **Set strong JWT secret**
   ```env
   JWT_SECRET=your-super-secret-256-bit-key-here
   ```

3. **Integrate real SMS gateway**
   - Twilio, AWS SNS, or similar
   - Update `sendOTP()` in `authService.ts`

4. **Use Google reCAPTCHA**
   - Replace math CAPTCHA with reCAPTCHA v2/v3
   - Add reCAPTCHA site key to frontend

5. **Use Redis for OTP storage**
   - Replace in-memory map
   - Enable OTP cleanup

6. **Enable HTTPS**
   - SSL/TLS certificates
   - Secure cookie settings

7. **Rate limiting**
   - Add rate limiting middleware
   - Prevent brute-force attacks

8. **httpOnly Cookies**
   - Store JWT in httpOnly cookies
   - Prevent XSS attacks

9. **Refresh tokens**
   - Implement refresh token mechanism
   - Improve security and UX

10. **CORS configuration**
    - Restrict to trusted domains only

---

## 📝 Environment Variables

### Backend `.env`

```env
# Server
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/ruraltrust-ai

# JWT Configuration
JWT_SECRET=rural-trust-ai-secret-key-change-in-production
JWT_EXPIRY_CITIZEN=24h
JWT_EXPIRY_GOVERNMENT=8h
JWT_EXPIRY_ADMIN=2h

# OTP Configuration
OTP_EXPIRY_MINUTES=5

# Admin Credentials (CHANGE IN PRODUCTION!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# SMS Gateway (Production)
# TWILIO_ACCOUNT_SID=your_account_sid
# TWILIO_AUTH_TOKEN=your_auth_token
# TWILIO_PHONE_NUMBER=your_twilio_number
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🧪 Testing Guide

### Test Citizen Flow

1. **Signup:**
   - Name: "John Doe"
   - Mobile:  "9876543210"
   - Village: "Rampur"
   - OTP from console: Check backend logs
   - CAPTCHA: Solve the math problem

2. **Submit Complaint:**
   - After login, village auto-filled
   - Submit a water supply complaint
   - Check AI priority assignment

3. **Logout and Re-login:**
   - Logout
   - Request OTP with same mobile
   - Login successfully

### Test Government Flow

1. **Create Account (as Admin):**
   - Username: "officer001"
   - Name: "Rajesh Kumar"
   - Designation: "BDO"
   - Save password and download QR

2. **Login with Credentials:**
   - Use generated username/password
   - Access dashboard
   - View complaints

3. **Login with QR Code:**
   - Logout
   - Use QR code tab
   - Scan the downloaded QR
   - Verify auto-login

4. **Resolve Complaint:**
   - View complaint details
   - Click "Resolve"
   - Check history tab

### Test Admin Flow

1. **Login:**
   - Username: "admin"
   - Password: "admin123"

2. **Create Multiple Accounts:**
   - Create 2-3 government accounts
   - Verify QR generation for each

3. **Manage Accounts:**
   - Toggle status (active → inactive)
   - View QR codes
   - Delete test accounts

---

## 🐛 Troubleshooting

### "OTP not received"
- Check backend console logs for OTP
- Verify OTP hasn't expired (5 min)
- Ensure mobile number is correct

### "Invalid credentials"
- Verify username/password match admin-created account
- Check if account status is "active"
- Try QR code login method

### "Authentication required" error
- Clear browser localStorage
- Login again
- Check token hasn't expired

### QR Scanner not working
- Allow camera permissions in browser
- Use HTTPS in production (required for camera)
- Try uploading QR image instead

### Admin panel not showing
- Verify admin login successful
- Check browser console for errors
- Ensure Admin Panel tab is visible

---

## 🚀 Future Enhancements

### Short Term
- [ ] Password reset functionality
- [ ] Email OTP option for citizens
- [ ] Multi-factor authentication (2FA)
- [ ] Login history tracking
- [ ] Failed login attempt tracking

### Long Term
- [ ] Biometric authentication
- [ ] Social media OAuth integration
- [ ] Role-based permissions (different government levels)
- [ ] API key management for third-party integrations
- [ ] Audit logs for all actions

---

## 📚 Additional Resources

- **Backend Code:** `backend/src/routes/auth.ts`
- **Frontend Code:** `frontend/src/components/CitizenAuth.tsx`, `GovernmentAuth.tsx`, `AdminPanel.tsx`
- **API Documentation:** See main `README.md`
- **Database Schemas:** `backend/src/models/User.ts`

---

## 💡 Tips

1. **For Development:**
   - OTPs are logged to backend console
   - Use simple mobile numbers like "1234567890"
   - Math CAPTCHAs are easy to solve

2. **For Production:**
   - Integrate real SMS gateway immediately
   - Use strong, unique passwords
   - Implement rate limiting
   - Monitor authentication logs

3. **For Users:**
   - Government officers should save QR in secure location
   - Admins should regularly audit government accounts
   - Citizens should logout after use on shared devices

---

## 📞 Support

For any authentication-related issues:
1. Check this guide first
2. Review backend console logs
3. Verify environment variables
4. Check JWT token expiry

---

**Last Updated:** January 30, 2026  
**Version:** 2.0.0 (with Authentication)

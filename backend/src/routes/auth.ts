import { Router, Request, Response } from 'express';
import User from '../models/User';
import {
    generateOTP,
    storeOTP,
    sendOTP,
    verifyOTP,
    hashPassword,
    comparePassword,
    generateJWT,
    generateRandomPassword,
} from '../services/authService';
import { generateQRCode, parseQRData } from '../services/qrService';
import { authenticateAdmin, authenticateGovernmentOrAdmin } from '../middleware/authMiddleware';

const router = Router();

// In-memory CAPTCHA storage (use Redis in production)
const captchaStore = new Map<string, number>();

/**
 * Generate CAPTCHA
 */
router.get('/captcha', (req: Request, res: Response) => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;

    const captchaId = Math.random().toString(36).substring(7);
    captchaStore.set(captchaId, answer);

    // Clean up old CAPTCHAs after 5 minutes
    setTimeout(() => captchaStore.delete(captchaId), 5 * 60 * 1000);

    res.json({
        captchaId,
        question: `${num1} + ${num2} = ?`,
    });
});

/**
 * Verify CAPTCHA
 */
function verifyCaptcha(captchaId: string, answer: number): boolean {
    const correctAnswer = captchaStore.get(captchaId);
    if (!correctAnswer) return false;

    captchaStore.delete(captchaId); // One-time use
    return correctAnswer === answer;
}

// ===================================
// CITIZEN ROUTES
// ===================================

/**
 * Citizen Signup
 */
router.post('/citizen/signup', async (req: Request, res: Response) => {
    try {
        const { mobile, name, village } = req.body;

        if (!mobile || !name || !village) {
            return res.status(400).json({ error: 'Mobile, name, and village are required' });
        }

        // Check if citizen already exists
        const existing = await User.findOne({ mobile, type: 'citizen' });
        if (existing) {
            return res.status(400).json({ error: 'Mobile number already registered' });
        }

        // Generate and send OTP
        const otp = generateOTP();
        storeOTP(mobile, otp, name, village);
        await sendOTP(mobile, otp);

        res.json({
            message: 'OTP sent successfully',
            mobile,
            otp: otp,
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to signup' });
    }
});

/**
 * Request OTP for existing citizen
 */
router.post('/citizen/request-otp', async (req: Request, res: Response) => {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({ error: 'Mobile number is required' });
        }

        // Check if citizen exists
        const citizen = await User.findOne({ mobile, type: 'citizen' });
        if (!citizen) {
            return res.status(404).json({ error: 'Mobile number not registered. Please signup first.' });
        }

        // Generate and send OTP
        const otp = generateOTP();
        storeOTP(mobile, otp);
        await sendOTP(mobile, otp);

        res.json({
            message: 'OTP sent successfully',
            mobile,
            otp: otp,
        });
    } catch (error) {
        console.error('Request OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

/**
 * Verify OTP and login
 */
router.post('/citizen/verify-otp', async (req: Request, res: Response) => {
    try {
        const { mobile, otp, captchaId, captchaAnswer } = req.body;

        if (!mobile || !otp || !captchaId || captchaAnswer === undefined) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Verify CAPTCHA
        if (!verifyCaptcha(captchaId, parseInt(captchaAnswer))) {
            return res.status(400).json({ error: 'Invalid CAPTCHA' });
        }

        // Verify OTP
        const otpResult = verifyOTP(mobile, otp);
        if (!otpResult.valid) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Find or create citizen
        let citizen = await User.findOne({ mobile, type: 'citizen' });

        if (!citizen) {
            // New signup - create citizen account
            if (!otpResult.data?.name || !otpResult.data?.village) {
                return res.status(400).json({ error: 'Signup data missing' });
            }

            citizen = new User({
                type: 'citizen',
                mobile,
                name: otpResult.data.name,
                village: otpResult.data.village,
                status: 'active',
            });

            await citizen.save();
            console.log(`✅ New citizen registered: ${citizen.name} (${mobile})`);
        }

        // Update last login
        citizen.lastLogin = new Date();
        await citizen.save();

        // Generate JWT
        const token = generateJWT(citizen);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: citizen._id,
                type: citizen.type,
                name: citizen.name,
                mobile: citizen.mobile,
                village: citizen.village,
            },
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

// ===================================
// GOVERNMENT ROUTES
// ===================================

/**
 * Government login with username/password
 */
router.post('/government/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find government user or admin
        const govUser = await User.findOne({ username, type: { $in: ['government', 'admin'] } });
        if (!govUser) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if account is active
        if (govUser.status !== 'active') {
            return res.status(403).json({ error: 'Account is inactive. Contact admin.' });
        }

        // Verify password
        if (!govUser.password) {
            return res.status(500).json({ error: 'Password not set for this account' });
        }

        const isValid = await comparePassword(password, govUser.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        govUser.lastLogin = new Date();
        await govUser.save();

        // Generate JWT
        const token = generateJWT(govUser);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: govUser._id,
                type: govUser.type,
                name: govUser.name,
                username: govUser.username,
                designation: govUser.designation,
            },
        });
    } catch (error) {
        console.error('Government login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * Government QR code login
 */
router.post('/government/qr-login', async (req: Request, res: Response) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            return res.status(400).json({ error: 'QR data is required' });
        }

        // Parse QR data
        const credentials = parseQRData(qrData);
        if (!credentials) {
            return res.status(400).json({ error: 'Invalid QR code' });
        }

        // Find government user
        const govUser = await User.findOne({ username: credentials.username, type: 'government' });
        if (!govUser) {
            return res.status(401).json({ error: 'Invalid QR code' });
        }

        // Check if account is active
        if (govUser.status !== 'active') {
            return res.status(403).json({ error: 'Account is inactive. Contact admin.' });
        }

        // Verify password from QR
        if (!govUser.password) {
            return res.status(500).json({ error: 'Password not set for this account' });
        }

        const isValid = await comparePassword(credentials.password, govUser.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid QR code' });
        }

        // Update last login
        govUser.lastLogin = new Date();
        await govUser.save();

        // Generate JWT
        const token = generateJWT(govUser);

        res.json({
            message: 'QR login successful',
            token,
            user: {
                id: govUser._id,
                type: govUser.type,
                name: govUser.name,
                username: govUser.username,
                designation: govUser.designation,
            },
        });
    } catch (error) {
        console.error('QR login error:', error);
        res.status(500).json({ error: 'Failed to login with QR code' });
    }
});

// ===================================
// ADMIN ROUTES
// ===================================

/**
 * Admin login
 */
router.post('/admin/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find admin user
        const admin = await User.findOne({ username, type: 'admin' });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        if (!admin.password) {
            return res.status(500).json({ error: 'Password not set for admin' });
        }

        const isValid = await comparePassword(password, admin.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Generate JWT
        const token = generateJWT(admin);

        res.json({
            message: 'Admin login successful',
            token,
            user: {
                id: admin._id,
                type: admin.type,
                name: admin.name,
                username: admin.username,
            },
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * Create government account (admin only)
 */
router.post('/admin/create-government', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const { username, password, name, designation } = req.body;

        if (!username || !name || !designation) {
            return res.status(400).json({ error: 'Username, name, and designation are required' });
        }

        if (password && password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if username already exists
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Use provided password or generate one
        const finalPassword = password || generateRandomPassword();
        const hashedPassword = await hashPassword(finalPassword);

        // Create government user
        const govUser = new User({
            type: 'government',
            username,
            password: hashedPassword,
            name,
            designation,
            status: 'active',
        });

        // Generate QR code
        const qrCode = await generateQRCode(username, finalPassword);
        govUser.qrCode = qrCode;

        await govUser.save();

        console.log(`✅ New government account created: ${name} (@${username})`);
        console.log(`   Password: ${finalPassword}`);

        res.json({
            message: 'Government account created successfully',
            user: {
                id: govUser._id,
                username: govUser.username,
                name: govUser.name,
                designation: govUser.designation,
                status: govUser.status,
                qrCode: govUser.qrCode,
            },
            credentials: {
                username,
                password: finalPassword, // Return plain password only once
            },
        });
    } catch (error) {
        console.error('Create government error:', error);
        res.status(500).json({ error: 'Failed to create government account' });
    }
});

/**
 * Get all government accounts (admin only)
 */
router.get('/admin/government-list', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const govUsers = await User.find({ type: 'government' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            count: govUsers.length,
            users: govUsers,
        });
    } catch (error) {
        console.error('Get government list error:', error);
        res.status(500).json({ error: 'Failed to fetch government accounts' });
    }
});

/**
 * Toggle government account status (admin only)
 */
router.put('/admin/government/:id/toggle-status', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const govUser = await User.findOne({ _id: id, type: 'government' });
        if (!govUser) {
            return res.status(404).json({ error: 'Government account not found' });
        }

        govUser.status = govUser.status === 'active' ? 'inactive' : 'active';
        await govUser.save();

        res.json({
            message: 'Status updated successfully',
            user: {
                id: govUser._id,
                username: govUser.username,
                status: govUser.status,
            },
        });
    } catch (error) {
        console.error('Toggle status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

/**
 * Delete government account (admin only)
 */
router.delete('/admin/government/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const govUser = await User.findOneAndDelete({ _id: id, type: 'government' });
        if (!govUser) {
            return res.status(404).json({ error: 'Government account not found' });
        }

        console.log(`🗑️  Government account deleted: ${govUser.name} (@${govUser.username})`);

        res.json({
            message: 'Government account deleted successfully',
        });
    } catch (error) {
        console.error('Delete government error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

/**
 * Get QR code for government account
 */
router.get('/government/:id/qr-code', authenticateGovernmentOrAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const govUser = await User.findOne({ _id: id, type: 'government' });
        if (!govUser) {
            return res.status(404).json({ error: 'Government account not found' });
        }

        if (!govUser.qrCode) {
            return res.status(404).json({ error: 'QR code not generated for this account' });
        }

        res.json({
            qrCode: govUser.qrCode,
            username: govUser.username,
            name: govUser.name,
        });
    } catch (error) {
        console.error('Get QR code error:', error);
        res.status(500).json({ error: 'Failed to fetch QR code' });
    }
});

/**
 * Verify token (for frontend to check if token is still valid)
 */
router.post('/verify-token', (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ valid: false });
    }

    const { verifyJWT } = require('../services/authService');
    const decoded = verifyJWT(token);

    if (!decoded) {
        return res.status(401).json({ valid: false });
    }

    res.json({
        valid: true,
        user: decoded,
    });
});

export default router;

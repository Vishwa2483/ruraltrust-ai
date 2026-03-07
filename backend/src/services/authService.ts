import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'rural-trust-ai-secret-key-change-in-production';
const JWT_EXPIRY_CITIZEN = process.env.JWT_EXPIRY_CITIZEN || '24h';
const JWT_EXPIRY_GOVERNMENT = process.env.JWT_EXPIRY_GOVERNMENT || '8h';
const JWT_EXPIRY_ADMIN = process.env.JWT_EXPIRY_ADMIN || '2h';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
const SALT_ROUNDS = 10;

// In-memory OTP storage (use Redis in production)
interface OTPEntry {
    otp: string;
    expiresAt: Date;
    name?: string;
    village?: string;
}

const otpStore = new Map<string, OTPEntry>();

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP for a mobile number
 */
export function storeOTP(mobile: string, otp: string, name?: string, village?: string): void {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    otpStore.set(mobile, { otp, expiresAt, name, village });

    console.log(`📱 OTP for ${mobile}: ${otp} (expires at ${expiresAt.toLocaleTimeString()})`);
}

/**
 * Send OTP via SMS (console.log for development)
 */
export async function sendOTP(mobile: string, otp: string): Promise<void> {
    // In production, integrate with SMS gateway (Twilio, SNS, etc.)
    console.log('');
    console.log('📨 ========== OTP MESSAGE ==========');
    console.log(`📱 To: ${mobile}`);
    console.log(`🔢 OTP: ${otp}`);
    console.log(`⏰ Valid for: ${OTP_EXPIRY_MINUTES} minutes`);
    console.log('===================================');
    console.log('');
}

/**
 * Verify OTP
 */
export function verifyOTP(mobile: string, otp: string): { valid: boolean; data?: OTPEntry } {
    const entry = otpStore.get(mobile);

    if (!entry) {
        return { valid: false };
    }

    if (new Date() > entry.expiresAt) {
        otpStore.delete(mobile);
        return { valid: false };
    }

    if (entry.otp !== otp) {
        return { valid: false };
    }

    // OTP is valid - remove it from store (one-time use)
    otpStore.delete(mobile);
    return { valid: true, data: entry };
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateJWT(user: IUser): string {
    let expiresIn: string;

    switch (user.type) {
        case 'citizen':
            expiresIn = JWT_EXPIRY_CITIZEN;
            break;
        case 'government':
            expiresIn = JWT_EXPIRY_GOVERNMENT;
            break;
        case 'admin':
            expiresIn = JWT_EXPIRY_ADMIN;
            break;
        default:
            expiresIn = '1h';
    }

    const payload = {
        id: user._id,
        type: user.type,
        name: user.name,
        mobile: user.mobile,
        username: user.username,
        village: user.village,
        designation: user.designation,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
}

/**
 * Verify JWT token
 */
export function verifyJWT(token: string): any {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Generate random password
 */
export function generateRandomPassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '@#$%&*!';

    const all = uppercase + lowercase + numbers + special;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = 0; i < 8; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Clear expired OTPs (cleanup job)
 */
export function clearExpiredOTPs(): void {
    const now = new Date();
    for (const [mobile, entry] of otpStore.entries()) {
        if (now > entry.expiresAt) {
            otpStore.delete(mobile);
        }
    }
}

// Run cleanup every minute
setInterval(clearExpiredOTPs, 60000);

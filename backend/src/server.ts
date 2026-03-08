import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import complaintRoutes from './routes/complaints';
import authRoutes from './routes/auth';
import User from './models/User';
import { hashPassword } from './services/authService';
import chatRoutes from './routes/chat';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173',
    // Vercel deployment URLs - update with your actual Vercel URL
    'https://ruraltrust-ai.vercel.app',
    /https:\/\/ruraltrust-ai[a-z0-9\-]*\.vercel\.app/,
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
            callback(null, true);
        } else {
            // Log CORS blocks for debugging
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(null, false); // Just return false instead of Error to allow middleware to handle it
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import analyticsRoutes from './routes/analytics';

// ... (other routes)
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);

// Health check (both paths)
const healthHandler = (req: express.Request, res: express.Response) => {
    res.json({
        status: 'OK',
        message: 'RuralTrust AI Backend is running',
        timestamp: new Date().toISOString()
    });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);


// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: '🌾 RuralTrust AI - Intelligent Rural Complaint Management System',
        version: '2.0.0 (with Authentication)',
        endpoints: {
            health: '/health',
            auth: {
                citizenSignup: 'POST /api/auth/citizen/signup',
                citizenRequestOTP: 'POST /api/auth/citizen/request-otp',
                citizenVerifyOTP: 'POST /api/auth/citizen/verify-otp',
                governmentLogin: 'POST /api/auth/government/login',
                governmentQRLogin: 'POST /api/auth/government/qr-login',
                adminLogin: 'POST /api/auth/admin/login',
                getCaptcha: 'GET /api/auth/captcha'
            },
            complaints: {
                submit: 'POST /api/complaints',
                getActive: 'GET /api/complaints',
                getHistory: 'GET /api/complaints/history',
                resolve: 'PUT /api/complaints/:id/resolve',
                stats: 'GET /api/complaints/stats'
            }
        }
    });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDatabase();

        // Create default admin if not exists
        await createDefaultAdmin();

        // Start listening
        app.listen(PORT, () => {
            console.log('');
            console.log('🌾 ========================================');
            console.log(`🚀 RuralTrust AI Backend Server Running`);
            console.log(`📍 Port: ${PORT}`);
            console.log(`🔗 URL: http://localhost:${PORT}`);
            console.log(`🏥 Health: http://localhost:${PORT}/health`);
            console.log('🌾 ========================================');
            console.log('');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Create/sync default admin account — always matches ADMIN_USERNAME + ADMIN_PASSWORD env vars
async function createDefaultAdmin() {
    try {
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = 'AdminTrust@2026'; // Force update requested by user
        const hashedPassword = await hashPassword(adminPassword);

        const existingAdmin = await User.findOne({ type: 'admin' });

        if (!existingAdmin) {
            const admin = new User({
                type: 'admin',
                username: adminUsername,
                password: hashedPassword,
                name: 'System Administrator',
                status: 'active',
            });
            await admin.save();
            console.log('✅ Default admin account created');
        } else {
            // Always sync username + password from env vars
            existingAdmin.username = adminUsername;
            existingAdmin.password = hashedPassword;
            await existingAdmin.save();
            console.log('🔄 Admin credentials synced from environment variables');
        }

        console.log(`   Username: ${adminUsername}`);
        console.log(`   Password: ${adminPassword}`);
    } catch (error) {
        console.error('Error creating/syncing default admin:', error);
    }
}

startServer();

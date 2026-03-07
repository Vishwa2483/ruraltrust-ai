import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../services/authService';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

/**
 * Authenticate any valid user
 */
export function authenticateAny(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyJWT(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
}

/**
 * Authenticate citizen only
 */
export function authenticateCitizen(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyJWT(token);

    if (!decoded || decoded.type !== 'citizen') {
        return res.status(403).json({ error: 'Citizen access required' });
    }

    req.user = decoded;
    next();
}

/**
 * Authenticate government only
 */
export function authenticateGovernment(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyJWT(token);

    if (!decoded || decoded.type !== 'government') {
        return res.status(403).json({ error: 'Government access required' });
    }

    req.user = decoded;
    next();
}

/**
 * Authenticate admin only
 */
export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyJWT(token);

    if (!decoded || decoded.type !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decoded;
    next();
}

/**
 * Authenticate government or admin
 */
export function authenticateGovernmentOrAdmin(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyJWT(token);

    console.log('🔍 Token decoded:', decoded);

    if (!decoded || (decoded.type !== 'government' && decoded.type !== 'admin')) {
        console.log('❌ Access denied. User type:', decoded?.type);
        return res.status(403).json({ error: 'Government or admin access required' });
    }

    req.user = decoded;
    next();
}

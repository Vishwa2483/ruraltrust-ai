import express from 'express';
import { chatService } from '../services/chatService';
import { authenticateCitizen } from '../middleware/authMiddleware';

const router = express.Router();

// protect middleware validates the JWT and adds user to req.user
router.post('/', authenticateCitizen, async (req: any, res) => {
    try {
        const { message } = req.body;

        // Fix: Token payload uses 'id', not '_id'
        const userId = req.user.id || req.user._id;

        console.log(`🤖 Chat request from user: ${userId}`);
        console.log(`💬 Message: "${message}"`);

        const response = await chatService.processMessage(userId, message);
        res.json(response);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ message: 'Error processing chat message' });
    }
});

export default router;

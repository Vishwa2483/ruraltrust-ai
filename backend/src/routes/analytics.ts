
import express from 'express';
import { predictionService } from '../services/predictionService';
import { resourceAllocationService } from '../services/resourceAllocationService';
import { policySimulatorService } from '../services/policySimulatorService';
import Complaint from '../models/Complaint';
import { authenticateGovernmentOrAdmin } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @route   GET /api/analytics/predictions
 * @desc    Get future issue predictions based on regression analysis
 * @access  Private/Admin
 */
router.get('/predictions', authenticateGovernmentOrAdmin, async (req, res) => {
    try {
        const predictions = await predictionService.predictCategoryTrends();

        // 📊 Aggregate Duplicate Stats
        const duplicateStats = await Complaint.aggregate([
            { $match: { isPrimary: false } }, // Secondary complaints are duplicates
            { $group: { _id: '$groupId', count: { $sum: 1 }, village: { $first: '$village' }, problemType: { $first: '$problemType' } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const totalDuplicates = await Complaint.countDocuments({ isPrimary: false });

        res.json({
            predictions,
            duplicateStats: {
                totalDuplicates,
                topGroups: duplicateStats
            }
        });
    } catch (error) {
        console.error('Error fetching predictions:', error);
        res.status(500).json({ error: 'Failed to generate predictions' });
    }
});

/**
 * @route   GET /api/analytics/resolution-probability
 * @desc    Get probability of resolution within X days
 * @access  Private/Admin
 */
router.get('/resolution-probability', authenticateGovernmentOrAdmin, async (req, res) => {
    try {
        const { village, category, days } = req.query;

        if (!village || !category) {
            return res.status(400).json({ error: 'Missing village or category' });
        }

        const probability = await predictionService.calculateResolutionProbability(
            village as string,
            category as string,
            days ? parseInt(days as string) : 3
        );

        res.json({
            village,
            category,
            days: days || 3,
            probability, // e.g. 0.82
            percentage: Math.round(probability * 100) // e.g. 82
        });
    } catch (error) {
        console.error('Error calculating probability:', error);
        res.status(500).json({ error: 'Failed to calculate probability' });
    }
});


/**
 * @route   GET /api/analytics/resource-allocation
 * @desc    AI-computed resource deployment recommendations per zone
 * @access  Private/Government+Admin
 */
router.get('/resource-allocation', authenticateGovernmentOrAdmin, async (req, res) => {
    try {
        const result = await resourceAllocationService.getRecommendations();
        res.json(result);
    } catch (error) {
        console.error('Error computing resource allocation:', error);
        res.status(500).json({ error: 'Failed to compute resource allocation' });
    }
});

/**
 * @route   POST /api/analytics/simulate-policy
 * @desc    Simulate the impact of a proposed government policy using AI
 * @access  Private/Government+Admin
 */
router.post('/simulate-policy', authenticateGovernmentOrAdmin, async (req, res) => {
    try {
        const { policyAction } = req.body;
        if (!policyAction || policyAction.trim().length === 0) {
            return res.status(400).json({ error: 'Missing policyAction in request body' });
        }

        const result = await policySimulatorService.simulateImpact(policyAction);
        res.json(result);
    } catch (error) {
        console.error('Error simulating policy:', error);
        res.status(500).json({ error: 'Failed to simulate policy impact' });
    }
});

/**
 * @route   GET /api/analytics/merge-suggestions
 * @desc    AI suggests merging related complaints by village + problem type
 * @access  Private/Government+Admin
 */
router.get('/merge-suggestions', authenticateGovernmentOrAdmin, async (req, res) => {
    try {
        const groups = await Complaint.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: { village: '$village', problemType: '$problemType' },
                    count: { $sum: 1 },
                    ids: { $push: '$_id' },
                    maxUrgency: { $max: '$urgency' },
                    priority: { $first: '$priority' },
                    latestDate: { $max: '$createdAt' }
                }
            },
            { $match: { count: { $gte: 2 } } },
            { $sort: { count: -1, maxUrgency: -1 } }
        ]);

        const suggestions = groups.map(g => ({
            village: g._id.village,
            problemType: g._id.problemType,
            count: g.count,
            complaintIds: g.ids.map((id: any) => id.toString()),
            maxUrgency: g.maxUrgency,
            priority: g.priority,
            latestDate: g.latestDate
        }));

        res.json({ suggestions, total: suggestions.length });
    } catch (error) {
        console.error('Error fetching merge suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch merge suggestions' });
    }
});

export default router;


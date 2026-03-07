import { Router, Request, Response } from 'express';
import Complaint from '../models/Complaint';
import { translateText, getLanguageCode } from '../services/translationService';
import { authenticateCitizen, authenticateGovernmentOrAdmin, authenticateAny } from '../middleware/authMiddleware';
import { uploadComplaintImage } from '../config/upload';
import { analyzeImage } from '../services/computerVisionService';

import { analyzeComplaintAdvanced, rebalanceUrgenciesForNewComplaint, generateRejectionReason } from '../services/advancedNlpService';
import { duplicateService } from '../services/duplicateService';
const router = Router();

/**
 * Calculate dynamic ETA based on complaint creation time and original ETA values
 */
function calculateDynamicETA(createdAt: Date, etaMinDays?: number, etaMaxDays?: number): string {
    if (etaMinDays === undefined || etaMaxDays === undefined) {
        // Fallback for old complaints without numeric values
        return ''; // Will use static eta field
    }

    const now = new Date();
    const elapsedMs = now.getTime() - new Date(createdAt).getTime();
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

    // Calculate remaining days
    const remainingMinDays = Math.max(0, etaMinDays - elapsedDays);
    const remainingMaxDays = Math.max(0, etaMaxDays - elapsedDays);

    // Handle different scenarios
    if (remainingMaxDays === 0 || (remainingMinDays === 0 && remainingMaxDays === 0)) {
        return '⚡ Immediate Work';
    } else if (remainingMinDays < 0 && remainingMaxDays < 0) {
        return '🚨 Urgent - Overdue';
    } else if (remainingMinDays === 0 && remainingMaxDays === 1) {
        return 'Within 24 hours';
    } else if (remainingMinDays === remainingMaxDays) {
        return `${remainingMinDays} ${remainingMinDays === 1 ? 'day' : 'days'}`;
    } else {
        return `${remainingMinDays}-${remainingMaxDays} days`;
    }
}

router.post('/', authenticateCitizen, uploadComplaintImage, async (req: Request, res: Response) => {
    try {
        const { village, problemType, description, language = 'en' } = req.body;

        // Validation
        if (!village || !problemType || !description) {
            return res.status(400).json({
                error: 'Missing required fields: village, problemType, description'
            });
        }

        if (description.trim().length < 10) {
            return res.status(400).json({
                error: 'Description must be at least 10 characters long'
            });
        }

        // Translate to English for government portal (if not already in English)
        let translatedDescription = description;
        if (language !== 'en') {
            translatedDescription = await translateText(description, language, 'en');
        }

        // Analyze complaint using NLP (analyze the translated English version)
        const analysis = analyzeComplaintAdvanced(translatedDescription, problemType);

        // 🤖 Multi-Modal AI: Compare NLP vs Computer Vision predictions
        let finalProblemType = problemType; // User's selection (default)
        let imageUrl: string | undefined;
        let imageAnalysis: { problemType: string; confidence: number; visualFeatures: string[] } | undefined;
        let autoCorrected = false;
        let originalUserCategory: string | undefined;
        let correctionReason: string | undefined;

        if (req.file) {
            // Image was uploaded - run CV analysis
            imageUrl = `/uploads/complaints/${req.file.filename}`;
            const cvPrediction = analyzeImage(req.file.path);

            imageAnalysis = {
                problemType: cvPrediction.problemType,
                confidence: cvPrediction.confidence,
                visualFeatures: cvPrediction.visualFeatures
            };

            // Compare NLP (text-based) vs CV (image-based) confidences
            const nlpConfidence = analysis.confidence;
            const cvConfidence = cvPrediction.confidence;

            // Decision threshold: CV must be significantly higher (20%+) to override
            const CONFIDENCE_THRESHOLD = 0.2;

            if (cvConfidence > nlpConfidence + CONFIDENCE_THRESHOLD) {
                // CV prediction is significantly more confident - auto-correct!
                originalUserCategory = problemType;
                finalProblemType = cvPrediction.problemType;
                autoCorrected = true;
                correctionReason = `Image analysis showed ${Math.round(cvConfidence * 100)}% confidence for "${cvPrediction.problemType}", ` +
                    `which is significantly higher than text-based analysis (${Math.round(nlpConfidence * 100)}% for "${problemType}"). ` +
                    `Visual evidence: ${cvPrediction.visualFeatures.join(', ')}.`;

                console.log(`🤖 AUTO-CORRECTED: User selected "${problemType}" but CV detected "${cvPrediction.problemType}" ` +
                    `with ${Math.round(cvConfidence * 100)}% confidence (NLP: ${Math.round(nlpConfidence * 100)}%)`);
            } else {
                console.log(`✅ Both predictions agree or NLP is more confident. Using user selection: "${problemType}" ` +
                    `(NLP: ${Math.round(nlpConfidence * 100)}%, CV: ${Math.round(cvConfidence * 100)}%)`);
            }
        }

        // 🔍 Smart Duplicate Detection (Phase 6)
        const duplicateCheck = await duplicateService.checkForDuplicates(translatedDescription, village);
        let groupId = undefined;
        let isPrimary = true;
        let embedding: number[] = [];

        if (duplicateCheck.isDuplicate) {
            console.log(`⚠️ Potential duplicate detected! Linking to Group ID: ${duplicateCheck.groupId}`);
            groupId = duplicateCheck.groupId;
            isPrimary = false; // This is a secondary/duplicate complaint
        } else {
            // Generate embedding for future comparisons
            embedding = await duplicateService.generateEmbedding(translatedDescription);
        }

        // Create complaint with original language and translation, include ML analysis and multi-label classification 🔥
        const complaint = new Complaint({
            citizenId: req.user.id, // Link to citizen
            village,
            problemType: finalProblemType, // Final decision (possibly auto-corrected by CV)
            problemTypes: analysis.problemTypes, // 🔥 Multi-label classification results
            description, // Original language
            language,
            translatedDescription, // English translation
            priority: analysis.priority,
            priorityScore: analysis.priorityScore, // 🎯 Probabilistic score (0-1)
            urgency: analysis.urgency,
            eta: analysis.eta,
            etaMinDays: analysis.etaMinDays,
            etaMaxDays: analysis.etaMaxDays,
            reasoning: analysis.reasoning,
            status: 'active',
            // Multi-modal AI fields
            imageUrl,
            imageAnalysis,
            autoCorrected,
            originalUserCategory,
            correctionReason,
            // ML features
            sentiment: analysis.sentiment,
            entities: analysis.entities,
            confidence: analysis.confidence,
            suggestedCategory: analysis.suggestedCategory,
            emotionalRisk: analysis.emotionalRisk,
            activeLearningSuggestion: analysis.activeLearningSuggestion,
            // Duplicate Detection
            embedding,
            groupId,
            isPrimary
        });

        await complaint.save();

        console.log(`✅ New complaint submitted from ${village} - Language: ${language} - Priority: ${analysis.priority}`);

        // Rebalance urgencies for other active complaints based on this new complaint
        try {
            const rebalanceResult = await rebalanceUrgenciesForNewComplaint({
                id: complaint._id.toString(),
                priority: complaint.priority,
                urgency: complaint.urgency
            });
            console.log('🔁 Urgency rebalancing result:', rebalanceResult);
        } catch (err) {
            console.error('Error during urgency rebalancing:', err);
        }

        res.status(201).json({
            message: 'Complaint submitted successfully',
            complaint,
            analysis
        });
    } catch (error) {
        console.error('Error creating complaint:', error);
        res.status(500).json({ error: 'Failed to submit complaint' });
    }
});

/**
 * GET /api/complaints - Get all active complaints (government/admin only)
 */
router.get('/', authenticateGovernmentOrAdmin, async (req: Request, res: Response) => {
    const { searchUncertain, status, showUnresolvedByCitizen } = req.query;
    let query: any = { status: status || 'active' };
    try {
        if (searchUncertain === 'true') {
            // Filter for complaints flagged for active learning (uncertain predictions)
            query.activeLearningSuggestion = true;
        }

        if (showUnresolvedByCitizen === 'true') {
            // Filter for complaints where citizen is unsatisfied
            query.status = 'resolved';
            query.citizenFeedback = 'unresolved';
        }

        const complaints = await Complaint.find(query)
            .populate('citizenId', 'name mobile village')
            .sort({ urgency: -1, createdAt: -1 }); // Sort by urgency (high to low) then by date

        // Add dynamic ETA to each complaint
        const complaintsWithDynamicETA = complaints.map(complaint => {
            const dynamicETA = calculateDynamicETA(complaint.createdAt, complaint.etaMinDays, complaint.etaMaxDays);
            return {
                ...complaint.toObject(),
                dynamicETA: dynamicETA || complaint.eta // Use dynamic if available, otherwise fall back to static
            };
        });

        res.json({
            count: complaintsWithDynamicETA.length,
            complaints: complaintsWithDynamicETA
        });
    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

/**
 * GET /api/complaints/history - Get all resolved and rejected complaints (accessible to ALL authenticated users)
 */
router.get('/history', authenticateAny, async (req: Request, res: Response) => {
    try {
        const complaints = await Complaint.find({ status: { $in: ['resolved', 'rejected'] } })
            .populate('citizenId', 'name mobile village')
            .populate('resolvedBy', 'name designation')
            .populate('rejectedBy', 'name designation')
            .sort({ resolvedAt: -1, rejectedAt: -1 }); // Sort by resolution/rejection date (newest first)

        res.json({
            count: complaints.length,
            complaints
        });
    } catch (error) {
        console.error('Error fetching complaint history:', error);
        res.status(500).json({ error: 'Failed to fetch complaint history' });
    }
});

/**
 * GET /api/complaints/my-history - Get citizen's own complaint history (resolved and rejected)
 */
router.get('/my-history', authenticateCitizen, async (req: Request, res: Response) => {
    try {
        const complaints = await Complaint.find({
            citizenId: req.user.id,
            status: { $in: ['resolved', 'rejected'] }
        })
            .populate('resolvedBy', 'name designation')
            .populate('rejectedBy', 'name designation')
            .sort({ resolvedAt: -1, rejectedAt: -1 });

        res.json({
            count: complaints.length,
            complaints
        });
    } catch (error) {
        console.error('Error fetching citizen complaint history:', error);
        res.status(500).json({ error: 'Failed to fetch complaint history' });
    }
});

/**
 * PUT /api/complaints/:id/feedback - Submit official feedback for active learning
 */
router.put('/:id/feedback', authenticateGovernmentOrAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body; // 'accurate' | 'inaccurate' | 'needs_revision'

        if (!['accurate', 'inaccurate', 'needs_revision'].includes(feedback)) {
            return res.status(400).json({ error: 'Invalid feedback value' });
        }

        const complaint = await Complaint.findByIdAndUpdate(
            id,
            { officialFeedback: feedback },
            { new: true }
        );

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        console.log(`📊 Feedback recorded for complaint ${id}: ${feedback}`);

        res.json({
            message: 'Feedback recorded successfully',
            complaint
        });
    } catch (error) {
        console.error('Error recording feedback:', error);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
});

/**
 * PUT /api/complaints/:id/citizen-feedback - Submit citizen feedback for a resolved complaint
 */
router.put('/:id/citizen-feedback', authenticateCitizen, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { feedback, comments } = req.body; // 'solved' | 'unresolved'

        if (!['solved', 'unresolved'].includes(feedback)) {
            return res.status(400).json({ error: 'Invalid feedback value' });
        }

        const complaint = await Complaint.findById(id);

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Verify it belongs to the citizen
        if (complaint.citizenId?.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to provide feedback for this complaint' });
        }

        if (complaint.status !== 'resolved') {
            return res.status(400).json({ error: 'Feedback can only be provided for resolved complaints' });
        }

        complaint.citizenFeedback = feedback;
        complaint.citizenFeedbackAt = new Date();
        if (comments) complaint.citizenComments = comments;

        await complaint.save();

        console.log(`👤 Citizen feedback recorded for complaint ${id}: ${feedback}`);

        res.json({
            message: 'Feedback recorded successfully',
            complaint
        });
    } catch (error) {
        console.error('Error recording citizen feedback:', error);
        res.status(500).json({ error: 'Failed to record citizen feedback' });
    }
});

/**
 * PUT /api/complaints/:id/resolve - Resolve a complaint (government/admin only)
 */
router.put('/:id/resolve', authenticateGovernmentOrAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const complaint = await Complaint.findByIdAndUpdate(
            id,
            {
                status: 'resolved',
                resolvedBy: req.user.id,  // Track who resolved it
                resolvedAt: new Date()
            },
            { new: true }
        );

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        console.log(`✅ Complaint resolved: ${id} - ${complaint.village} - ${complaint.problemType}`);

        res.json({
            message: 'Complaint resolved successfully',
            complaint
        });
    } catch (error) {
        console.error('Error resolving complaint:', error);
        res.status(500).json({ error: 'Failed to resolve complaint' });
    }
});

/**
 * PUT /api/complaints/:id/reject - Reject a complaint with AI feedback (government/admin only)
 */
router.put('/:id/reject', authenticateGovernmentOrAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Find the complaint first
        const complaint = await Complaint.findById(id);

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        if (complaint.status !== 'active') {
            return res.status(400).json({ error: 'Only active complaints can be rejected' });
        }

        // Generate AI-powered rejection reason
        const rejectionReason = generateRejectionReason({
            problemType: complaint.problemType,
            description: complaint.description,
            village: complaint.village,
            priority: complaint.priority,
            confidence: complaint.confidence
        });

        // Update complaint to rejected status
        complaint.status = 'rejected';
        complaint.rejectedBy = req.user.id;
        complaint.rejectedAt = new Date();
        complaint.rejectionReason = rejectionReason;

        await complaint.save();

        console.log(`❌ Complaint rejected: ${id} - ${complaint.village} - ${complaint.problemType}`);
        console.log(`Rejection reason: ${rejectionReason.substring(0, 100)}...`);

        res.json({
            message: 'Complaint rejected successfully',
            complaint,
            rejectionReason
        });
    } catch (error) {
        console.error('Error rejecting complaint:', error);
        res.status(500).json({ error: 'Failed to reject complaint' });
    }
});

/**
 * PUT /api/complaints/:id/reopen - Re-open a complaint (government/admin only)
 */
router.put('/:id/reopen', authenticateGovernmentOrAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const complaint = await Complaint.findByIdAndUpdate(
            id,
            {
                $set: { status: 'active', citizenFeedback: 'pending' },
                $unset: { resolvedAt: 1, resolvedBy: 1 }
            },
            { new: true }
        );

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        console.log(`🔄 Complaint re-opened: ${id} - ${complaint.village} - ${complaint.problemType}`);

        res.json({
            message: 'Complaint re-opened successfully',
            complaint
        });
    } catch (error) {
        console.error('Error re-opening complaint:', error);
        res.status(500).json({ error: 'Failed to re-open complaint' });
    }
});

/**
 * GET /api/complaints/stats - Get complaint statistics (optional feature)
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const activeCount = await Complaint.countDocuments({ status: 'active' });
        const resolvedCount = await Complaint.countDocuments({ status: 'resolved' });

        const priorityBreakdown = await Complaint.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]);

        res.json({
            active: activeCount,
            resolved: resolvedCount,
            priorityBreakdown
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

/**
 * POST /api/translate - Translate text (for voice input transcription)
 */
router.post('/translate', async (req: Request, res: Response) => {
    try {
        const { text, sourceLang, targetLang = 'en' } = req.body;

        if (!text || !sourceLang) {
            return res.status(400).json({
                error: 'Missing required fields: text, sourceLang'
            });
        }

        const translatedText = await translateText(text, sourceLang, targetLang);

        res.json({
            originalText: text,
            translatedText,
            sourceLang,
            targetLang
        });
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ error: 'Failed to translate text' });
    }
});

export default router;
import Complaint from '../models/Complaint';

export interface ZoneRecommendation {
    village: string;
    category: string;
    complaintCount: number;
    avgUrgency: number;
    avgResolutionDays: number;
    duplicateCount: number;
    resourceScore: number;
    priority: 'High' | 'Medium' | 'Low';
    recommendedTeams: number;
    actionText: string;
    reason: string;
}

export interface ResourceAllocationResult {
    recommendations: ZoneRecommendation[];
    totalTeamsNeeded: number;
    criticalZones: number;
    generatedAt: string;
}

// Team name mapping per category
const CATEGORY_TEAMS: Record<string, string> = {
    'Water Supply': 'water supply teams',
    'Sanitation': 'sanitation teams',
    'Road Damage': 'road repair crews',
    'Electricity': 'electrical maintenance teams',
    'Healthcare': 'healthcare response units',
    'Street Lights': 'electrical maintenance teams',
    'Waste Management': 'waste management crews',
};

// Default avg resolution days per category (fallback when no historical data)
const DEFAULT_RESOLUTION_DAYS: Record<string, number> = {
    'Water Supply': 2,
    'Sanitation': 3,
    'Road Damage': 5,
    'Electricity': 1,
    'Healthcare': 1,
    'Street Lights': 2,
    'Waste Management': 3,
};

export class ResourceAllocationService {

    async getRecommendations(): Promise<ResourceAllocationResult> {
        // ── 1. Active complaints aggregation ──────────────────────────────
        const activeZones = await Complaint.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: { village: '$village', category: '$problemType' },
                    complaintCount: { $sum: 1 },
                    avgUrgency: { $avg: '$urgency' },
                    duplicateCount: {
                        $sum: { $cond: [{ $eq: ['$isPrimary', false] }, 1, 0] }
                    }
                }
            },
            { $match: { complaintCount: { $gte: 1 } } }
        ]);

        // ── 2. Historical resolution time per (village, category) ─────────
        const resolvedStats = await Complaint.aggregate([
            {
                $match: {
                    status: 'resolved',
                    resolvedAt: { $exists: true },
                    createdAt: { $exists: true }
                }
            },
            {
                $project: {
                    village: 1,
                    problemType: 1,
                    resolutionDays: {
                        $divide: [
                            { $subtract: ['$resolvedAt', '$createdAt'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: { village: '$village', category: '$problemType' },
                    avgResolutionDays: { $avg: '$resolutionDays' }
                }
            }
        ]);

        // Build lookup map for resolution days
        const resolutionMap = new Map<string, number>();
        for (const r of resolvedStats) {
            const key = `${r._id.village}::${r._id.category}`;
            resolutionMap.set(key, Math.max(0.5, r.avgResolutionDays));
        }

        // ── 3. Compute Resource Score for each zone ───────────────────────
        const recommendations: ZoneRecommendation[] = [];

        for (const zone of activeZones) {
            const village: string = zone._id.village || 'Unknown';
            const category: string = zone._id.category || 'General';
            const complaintCount: number = zone.complaintCount;
            const avgUrgency: number = parseFloat((zone.avgUrgency || 5).toFixed(1));
            const duplicateCount: number = zone.duplicateCount || 0;

            // Fallback resolution days: zone-specific → category default → 3 days
            const resKey = `${village}::${category}`;
            const avgResolutionDays: number = parseFloat(
                (resolutionMap.get(resKey) || DEFAULT_RESOLUTION_DAYS[category] || 3).toFixed(1)
            );

            // Core formula: Resource Score = (avg_urgency × complaint_count) / avg_resolution_days
            // Duplicate boost: +0.5 per duplicate complaint (community-wide issue)
            const rawScore = (avgUrgency * complaintCount) / avgResolutionDays;
            const duplicateBoost = duplicateCount * 0.5;
            const resourceScore = parseFloat((rawScore + duplicateBoost).toFixed(2));

            // Priority tier
            let priority: 'High' | 'Medium' | 'Low';
            if (resourceScore >= 15) priority = 'High';
            else if (resourceScore >= 8) priority = 'Medium';
            else priority = 'Low';

            // Recommended teams: 1 team per 5 score points, min 1, max 10
            const recommendedTeams = Math.min(10, Math.max(1, Math.ceil(resourceScore / 5)));

            // Action text
            const teamName = CATEGORY_TEAMS[category] || 'response teams';
            const actionText = `Send ${recommendedTeams} ${teamName} to ${village}`;

            // XAI reasoning
            const reasons: string[] = [];
            if (avgUrgency >= 8) reasons.push(`high avg urgency (${avgUrgency}/10)`);
            if (complaintCount >= 5) reasons.push(`complaint surge (${complaintCount} active)`);
            if (duplicateCount >= 2) reasons.push(`${duplicateCount} grouped duplicates detected`);
            if (avgResolutionDays >= 4) reasons.push(`historically slow resolution (${avgResolutionDays} days avg)`);
            const reason = reasons.length > 0
                ? reasons.join('; ') + '.'
                : `${complaintCount} active ${category} complaints in ${village}.`;

            recommendations.push({
                village,
                category,
                complaintCount,
                avgUrgency,
                avgResolutionDays,
                duplicateCount,
                resourceScore,
                priority,
                recommendedTeams,
                actionText,
                reason
            });
        }

        // Show all recommendations sorted by score
        const allRecommendations = [...recommendations];
        allRecommendations.sort((a, b) => b.resourceScore - a.resourceScore);

        // Return top 50 recommendations (effectively "everything" for most use cases)
        const topResult = allRecommendations.slice(0, 50);

        const totalTeamsNeeded = topResult.reduce((sum, r) => sum + r.recommendedTeams, 0);
        const criticalZones = topResult.length;

        return {
            recommendations: topResult,
            totalTeamsNeeded,
            criticalZones,
            generatedAt: new Date().toISOString()
        };
    }
}

export const resourceAllocationService = new ResourceAllocationService();

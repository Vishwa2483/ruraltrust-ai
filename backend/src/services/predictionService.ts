
import Complaint from '../models/Complaint';
import regression from 'regression';

interface PredictionResult {
    village: string;
    category: string;
    trend: 'up' | 'down' | 'stable';
    slope: number;
    nextWeekProjection: number;
    confidence: number;
}

export class PredictionService {

    // Predict trends per village and problem type
    async predictCategoryTrends(): Promise<PredictionResult[]> {
        // 1. Aggregate data: Group complaints by village, date, and category for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const complaints = await Complaint.find({
            createdAt: { $gte: thirtyDaysAgo }
        }).select('problemType village createdAt');

        // Structure: village -> category -> date -> count
        const villageGroups: Record<string, Record<string, Record<string, number>>> = {};

        // Helper to format date as YYYY-MM-DD
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        complaints.forEach(c => {
            const date = formatDate(new Date(c.createdAt));
            const category = c.problemType;
            const village = c.village || 'Unknown';

            if (!villageGroups[village]) villageGroups[village] = {};
            if (!villageGroups[village][category]) villageGroups[village][category] = {};
            if (!villageGroups[village][category][date]) villageGroups[village][category][date] = 0;

            villageGroups[village][category][date]++;
        });

        const results: PredictionResult[] = [];

        // 2. Perform Regression for each village + category
        for (const village in villageGroups) {
            const categories = villageGroups[village];

            for (const category in categories) {
                const dateMap = categories[category];
                const dataPoints: [number, number][] = [];

                // Fill in missing dates with 0, convert dates to x (day index 0-29)
                for (let i = 0; i < 30; i++) {
                    const d = new Date(thirtyDaysAgo);
                    d.setDate(d.getDate() + i + 1);
                    const dateStr = formatDate(d);

                    const count = dateMap[dateStr] || 0;
                    dataPoints.push([i, count]);
                }

                // If not enough data points (e.g. only 0s), skip
                const totalComplaints = dataPoints.reduce((sum, p) => sum + p[1], 0);
                if (totalComplaints < 3) continue; // Skip insignificant data

                // Linear Regression: y = mx + c
                const result = regression.linear(dataPoints);
                const slope = result.equation[0];
                const yIntercept = result.equation[1];

                // 3. Predict next 7 days volume
                const nextWeekDayIndex = 33.5;
                const projectedDaily = (slope * nextWeekDayIndex) + yIntercept;
                const nextWeekProjection = Math.max(0, Math.round(projectedDaily * 7));

                let trend: 'up' | 'down' | 'stable' = 'stable';
                if (slope > 0.05) trend = 'up';
                else if (slope < -0.05) trend = 'down';

                const confidence = result.r2;

                if (nextWeekProjection > 0 || trend !== 'stable') {
                    results.push({
                        village,
                        category,
                        trend,
                        slope,
                        nextWeekProjection,
                        confidence
                    });
                }
            }
        }

        return results.sort((a, b) => b.slope - a.slope); // Sort by highest rising trend
    }
    // Calculate resolution probability within T days
    async calculateResolutionProbability(village: string, problemType: string, days: number = 3): Promise<number> {
        // 1. Fetch resolved complaints matching criteria
        const query: any = {
            status: 'resolved',
            problemType: problemType,
            resolvedAt: { $exists: true },
            createdAt: { $exists: true }
        };

        // We want a mix of village-specific and global data to be robust
        // Let's get ALL resolved complaints for this problem type first
        const allResolved = await Complaint.find(query).select('createdAt resolvedAt village');

        if (allResolved.length === 0) return 0; // No data

        // 2. Filter for specific village
        const villageResolved = allResolved.filter(c => c.village === village);

        // Helper to check if resolved within T days
        const isWithinTime = (c: any) => {
            const start = new Date(c.createdAt).getTime();
            const end = new Date(c.resolvedAt).getTime();
            const diffDays = (end - start) / (1000 * 60 * 60 * 24);
            return diffDays <= days;
        };

        // 3. Calculate Global Probability
        const globalCount = allResolved.length;
        const globalSuccess = allResolved.filter(isWithinTime).length;
        const globalProb = globalSuccess / globalCount;

        // 4. Calculate Village Probability
        const villageCount = villageResolved.length;
        if (villageCount === 0) {
            return globalProb; // Fallback to global if no village data
        }

        const villageSuccess = villageResolved.filter(isWithinTime).length;
        const villageProb = villageSuccess / villageCount;

        // 5. Weighted Average (Bayesian-like approach)
        // If we have lots of village data, trust it more. If little, trust global.
        // Simple weight: min(villageCount / 10, 0.8) -> Max 80% weight to village
        const villageWeight = Math.min(villageCount / 10, 0.8);
        const globalWeight = 1 - villageWeight;

        const finalProb = (villageProb * villageWeight) + (globalProb * globalWeight);

        return parseFloat(finalProb.toFixed(2)); // Return as 0.82
    }
}

export const predictionService = new PredictionService();

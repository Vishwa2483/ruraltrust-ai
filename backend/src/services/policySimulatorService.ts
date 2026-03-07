import axios from 'axios';
import Complaint from '../models/Complaint';

export interface PolicyImpactResult {
    policyTarget: string;
    impactScore: number;
    primaryMetric: {
        label: string;
        change: string;
        trend: 'up' | 'down' | 'neutral';
    };
    secondaryMetrics: Array<{
        label: string;
        change: string;
        trend: 'up' | 'down' | 'neutral';
    }>;
    analysis: string;
}

const GEMINI_MODEL = 'gemini-2.5-flash';

class PolicySimulatorService {
    /**
     * Simulates the impact of a proposed government policy based on current complaint trends.
     * Uses the Gemini REST API directly via axios for reliable compatibility.
     */
    async simulateImpact(proposedPolicy: string): Promise<PolicyImpactResult> {
        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        try {
            // Get some real data context to feed into the prompt
            const activeCount = await Complaint.countDocuments({ status: 'active' });
            const resolvedCount = await Complaint.countDocuments({ status: 'resolved' });

            // Get category breakdown
            const breakdown = await Complaint.aggregate([
                { $match: { status: 'active' } },
                { $group: { _id: '$problemType', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            const contextData = `
Current Active Complaints: ${activeCount}
Total Resolved Complaints: ${resolvedCount}
Top Issue Categories:
${breakdown.slice(0, 5).map(b => `- ${b._id}: ${b.count}`).join('\n')}
            `.trim();

            const prompt = `
You are an advanced AI Policy Simulator for a rural governance platform named "RuralTrust AI". 
Your job is to realistically estimate the impact of a proposed action on the community.
Here is the current state of complaints in the district:
${contextData}

PROPOSED ACTION / POLICY: "${proposedPolicy}"

Based on the proposed action and current constraints, predict the impact.
Return a RAW JSON object exactly matching this schema (with no markdown block format or extra text around it):
{
  "policyTarget": "What area this policy mainly targets (e.g. Water Supply)",
  "impactScore": <number 0-100 indicating overall positive expected impact>,
  "primaryMetric": {
    "label": "<e.g. Water complaints>",
    "change": "<e.g. -32%>",
    "trend": "<'up' or 'down' or 'neutral'>"
  },
  "secondaryMetrics": [
    { "label": "<e.g. Resolution ETA>", "change": "<e.g. -1.5 days>", "trend": "down" },
    { "label": "<e.g. Citizen Satisfaction>", "change": "<e.g. +15%>", "trend": "up" }
  ],
  "analysis": "1-2 sentences explaining why this impact is predicted, referencing the current complaint volume if applicable."
}
`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
            const requestBody = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                }
            };

            const response = await axios.post(url, requestBody, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });

            const text: string = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            if (!text) {
                throw new Error('Empty response from Gemini API');
            }

            // Extract JSON from potential markdown formatting
            let jsonStr = text;
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.substring(7);
            } else if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.substring(3);
            }
            if (jsonStr.endsWith('```')) {
                jsonStr = jsonStr.substring(0, jsonStr.length - 3);
            }

            const parsedData = JSON.parse(jsonStr.trim()) as PolicyImpactResult;
            return parsedData;
        } catch (error: any) {
            const geminiError = error?.response?.data?.error;
            if (geminiError) {
                console.error('Gemini API error:', geminiError.code, geminiError.message);
            } else {
                console.error('Error simulating policy impact:', error?.message || error);
            }
            throw new Error('Failed to generate policy simulation');
        }
    }
}

export const policySimulatorService = new PolicySimulatorService();

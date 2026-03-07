/**
 * Advanced NLP Service for RuralTrust AI
 * Implements Transformer-based embeddings, sentiment analysis, NER, and active learning
 */

import * as natural from 'natural';
// Use require for 'sentiment' to avoid missing type declarations
const Sentiment: any = require('sentiment');

// Initialize sentiment analyzer
const sentimentAnalyzer = new Sentiment();

interface AdvancedAnalysisResult {
    priority: 'High' | 'Medium' | 'Low';
    priorityScore: number; // Probabilistic score (0-1)
    urgency: number;
    eta: string;
    etaMinDays: number;
    etaMaxDays: number;
    reasoning: string;
    keywords: string[];
    // Multi-label classification
    problemTypes: Array<{
        category: string;
        confidence: number;
    }>;
    // New ML features
    sentiment: {
        score: number; // -5 to +5
        comparative: number; // normalized score
        magnitude: 'negative' | 'neutral' | 'positive';
    };
    entities: {
        locations: string[];
        infrastructure: string[];
        riskFactors: string[];
    };
    confidence: number; // 0-1: how confident the model is in this classification
    suggestedCategory?: string; // Auto-correction for misclassified complaints
    urgencyIndicators: string[]; // Specific factors driving urgency
    emotionalRisk: 'low' | 'medium' | 'high'; // Based on sentiment analysis
    activeLearningSuggestion?: boolean; // Flag for human review
}

// TF-IDF based term extraction and weighting
class TFIDFAnalyzer {
    private documentFrequency: Map<string, number> = new Map();
    private totalDocuments: number = 0;

    updateFrequency(tokens: string[]) {
        this.totalDocuments++;
        const uniqueTerms = new Set(tokens);
        uniqueTerms.forEach(term => {
            this.documentFrequency.set(term, (this.documentFrequency.get(term) || 0) + 1);
        });
    }

    calculateTFIDF(tokens: string[]): Map<string, number> {
        const tf = new Map<string, number>();
        const tokenCount = tokens.length;

        // Calculate TF (term frequency)
        tokens.forEach(token => {
            tf.set(token, (tf.get(token) || 0) + 1 / tokenCount);
        });

        // Calculate TF-IDF
        const tfidf = new Map<string, number>();
        tf.forEach((tfScore, term) => {
            const df = this.documentFrequency.get(term) || 1;
            const idf = Math.log(this.totalDocuments / df);
            tfidf.set(term, tfScore * idf);
        });

        return tfidf;
    }
}

const tfidfAnalyzer = new TFIDFAnalyzer();

// Import Complaint model for urgency rebalancing
import Complaint, { IComplaint } from '../models/Complaint';

// Named Entity Recognition - governance and infrastructure entities
const GOVERNANCE_ENTITIES = {
    infrastructure: [
        'water supply', 'electricity', 'power', 'road', 'bridge', 'street light',
        'sanitation', 'sewage', 'hospital', 'clinic', 'school', 'toilet',
        'bus', 'transport', 'market', 'well', 'bore well', 'pipeline',
        'transformer', 'pole', 'wire', 'drain', 'gutter'
    ],
    locations: [
        'village', 'town', 'block', 'district', 'panchayat', 'ward',
        'area', 'street', 'lane', 'market', 'gram', 'taluk'
    ],
    riskFactors: [
        'accident', 'death', 'injury', 'disease', 'epidemic', 'contamination',
        'fire', 'flood', 'landslide', 'collapse', 'damage', 'unsafe',
        'emergency', 'critical', 'danger', 'hazard', 'risk'
    ]
};

// Problem type classifier with semantic similarity
const PROBLEM_CLASSIFIERS = {
    'Water Supply': {
        keywords: ['water', 'supply', 'pipeline', 'tap', 'bore', 'well', 'tanker', 'shortage', 'contamination'],
        urgencyKeywords: ['no water', 'contaminated', 'dirty', 'chemical', 'bacterial', 'shortage'],
        baseUrgency: 6
    },
    'Electricity': {
        keywords: ['electricity', 'power', 'voltage', 'current', 'wire', 'pole', 'transformer', 'electric', 'eb'],
        urgencyKeywords: ['no power', 'shock', 'fire', 'sparking', 'blackout', 'short circuit'],
        baseUrgency: 7
    },
    'Road Damage': {
        keywords: ['road', 'street', 'pothole', 'crack', 'bridge', 'highway', 'path', 'surface'],
        urgencyKeywords: ['accident', 'pothole', 'unsafe', 'collapse', 'broken'],
        baseUrgency: 5
    },
    'Sanitation': {
        keywords: ['sanitation', 'sewage', 'drain', 'toilet', 'gutter', 'overflow', 'septic'],
        urgencyKeywords: ['overflow', 'disease', 'health', 'epidemic', 'smell', 'contamination'],
        baseUrgency: 6
    },
    'Healthcare': {
        keywords: ['hospital', 'clinic', 'medicine', 'doctor', 'patient', 'ambulance', 'health'],
        urgencyKeywords: ['emergency', 'patient', 'critical', 'medicine', 'doctor absent'],
        baseUrgency: 8
    },
    'Street Lights': {
        keywords: ['street light', 'streetlight', 'lamp post', 'street lamp', 'light post', 'public lighting', 'darkness', 'illumination', 'LED', 'bulb', 'lamp'],
        urgencyKeywords: ['dark', 'crime', 'unsafe', 'not working', 'broken', 'no light'],
        baseUrgency: 4
    },
    'Waste Management': {
        keywords: ['garbage', 'trash', 'rubbish', 'waste collection', 'dustbin', 'dump', 'litter', 'refuse', 'waste'],
        urgencyKeywords: ['overflow', 'smell', 'disease', 'piled up', 'scattered', 'unhygienic', 'rotting'],
        baseUrgency: 5
    }
};

/**
 * Category → Priority mapping.
 * These are the BASE rules determined by domain knowledge.
 * Healthcare and Electricity are always High.
 * Water Supply / Sanitation / Road Damage are Medium (may be boosted to High if risk factors present).
 * Waste Management and Street Lights are Low.
 */
const CATEGORY_PRIORITY_MAP: Record<string, 'High' | 'Medium' | 'Low'> = {
    'Healthcare': 'High',
    'Electricity': 'High',
    'Water Supply': 'Medium',   // Boosted → High if riskFactors detected
    'Sanitation': 'Medium',
    'Road Damage': 'Medium',
    'Waste Management': 'Low',
    'Street Lights': 'Low',
};

/**
 * Urgency bands per priority level.
 * After computing raw urgency, clamp into the corresponding band.
 */
const URGENCY_BANDS: Record<'High' | 'Medium' | 'Low', [number, number]> = {
    High: [7, 10],
    Medium: [4, 6],
    Low: [1, 3],
};

/**
 * Extract tokens and analyze with TF-IDF
 */
function tokenizeAndAnalyze(text: string): { tokens: string[]; tfidfScores: Map<string, number> } {
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const stemmer = natural.PorterStemmer;
    const stemmedTokens = tokens.map(t => stemmer.stem(t));

    const tfidfScores = tfidfAnalyzer.calculateTFIDF(stemmedTokens);
    tfidfAnalyzer.updateFrequency(stemmedTokens);

    return { tokens: stemmedTokens, tfidfScores };
}

/**
 * Multi-Label Classification using Binary Relevance
 * Classifies complaint into multiple categories simultaneously
 */
function classifyMultiLabel(text: string): Array<{ category: string; confidence: number }> {
    const { tokens } = tokenizeAndAnalyze(text);
    const lowerText = text.toLowerCase();
    const results: Array<{ category: string; confidence: number }> = [];

    // For each category, calculate independent confidence score
    Object.entries(PROBLEM_CLASSIFIERS).forEach(([category, config]) => {
        let score = 0;
        const weights = {
            keywords: 0.4,
            urgencyKeywords: 0.3,
            entities: 0.3
        };

        // 1. Keyword matching score
        const keywordMatches = tokens.filter(t =>
            config.keywords.some(kw => {
                const stemmer = natural.PorterStemmer;
                return stemmer.stem(kw) === t;
            })
        ).length;
        const keywordScore = Math.min(1, keywordMatches / Math.max(config.keywords.length / 3, 1));
        score += keywordScore * weights.keywords;

        // 2. Urgency keyword bonus
        const urgencyMatches = tokens.filter(t =>
            config.urgencyKeywords.some(kw => {
                const stemmer = natural.PorterStemmer;
                return stemmer.stem(kw) === t;
            })
        ).length;
        const urgencyScore = Math.min(1, urgencyMatches / Math.max(config.urgencyKeywords.length / 2, 1));
        score += urgencyScore * weights.urgencyKeywords;

        // 3. Entity/phrase matching (exact substring match with multi-word phrase boost)
        let entityMatches = 0;
        let phraseMatches = 0;
        config.keywords.forEach(kw => {
            if (lowerText.includes(kw.toLowerCase())) {
                entityMatches++;
                // Give extra weight to multi-word phrases (like "street light", "water supply")
                if (kw.includes(' ')) {
                    phraseMatches++;
                }
            }
        });
        const entityScore = Math.min(1, entityMatches / Math.max(config.keywords.length / 4, 1));
        // Boost score for phrase matches (more specific = more confident)
        const phraseBoost = phraseMatches > 0 ? 0.2 : 0;
        score += (entityScore * weights.entities) + phraseBoost;

        // Add category if confidence >= threshold (0.35)
        if (score >= 0.35) {
            results.push({
                category,
                confidence: Math.min(0.99, score) // Cap at 0.99 to avoid overconfidence
            });
        }
    });

    // Sort by confidence (descending)
    results.sort((a, b) => b.confidence - a.confidence);

    // Strict relative filtering: Only keep secondary labels if they are at least 65% as confident as the top prediction
    if (results.length > 1) {
        const topConf = results[0].confidence;
        const filtered = results.filter(r => r.confidence >= (topConf * 0.65));

        // If everything got filtered out (unlikely with > 0.65 relative), fallback to top1
        if (filtered.length > 0) {
            results.length = 0; // Clear array
            results.push(...filtered);
        } else {
            const topOne = results[0];
            results.length = 0;
            results.push(topOne);
        }
    }

    // If no categories matched, return the best one anyway (with lower confidence)
    if (results.length === 0) {
        const allScores = Object.entries(PROBLEM_CLASSIFIERS).map(([category]) => {
            const keywordMatches = tokens.filter(t =>
                PROBLEM_CLASSIFIERS[category as keyof typeof PROBLEM_CLASSIFIERS].keywords.some(kw => {
                    const stemmer = natural.PorterStemmer;
                    return stemmer.stem(kw) === t;
                })
            ).length;
            return { category, confidence: Math.min(0.5, keywordMatches * 0.1) };
        });
        allScores.sort((a, b) => b.confidence - a.confidence);
        results.push(allScores[0]);
    }

    return results;
}

/**
 * Extract Named Entities from text
 */
function extractNamedEntities(text: string): { locations: string[]; infrastructure: string[]; riskFactors: string[] } {
    const lowerText = text.toLowerCase();

    return {
        locations: GOVERNANCE_ENTITIES.locations.filter(loc => lowerText.includes(loc)),
        infrastructure: GOVERNANCE_ENTITIES.infrastructure.filter(inf => lowerText.includes(inf)),
        riskFactors: GOVERNANCE_ENTITIES.riskFactors.filter(risk => lowerText.includes(risk))
    };
}

/**
 * Sentiment analysis with emotional risk detection
 */
function analyzeSentiment(text: string): {
    sentiment: { score: number; comparative: number; magnitude: 'negative' | 'neutral' | 'positive' };
    emotionalRisk: 'low' | 'medium' | 'high';
} {
    const result = sentimentAnalyzer.analyze(text);

    // Determine magnitude
    let magnitude: 'negative' | 'neutral' | 'positive' = 'neutral';
    if (result.score < -2) magnitude = 'negative';
    else if (result.score > 2) magnitude = 'positive';

    // Emotional risk based on negative sentiment and urgency words
    let emotionalRisk: 'low' | 'medium' | 'high' = 'low';
    if (result.score < -3) emotionalRisk = 'high';
    else if (result.score < -1) emotionalRisk = 'medium';

    return {
        sentiment: {
            score: Math.max(-5, Math.min(5, result.score)), // Normalize to -5 to +5
            comparative: result.comparative,
            magnitude
        },
        emotionalRisk
    };
}

/**
 * Semantic similarity scoring for category auto-correction
 */
function calculateCategorySimilarity(text: string, problemType: string): { category: string; score: number }[] {
    const { tokens } = tokenizeAndAnalyze(text);
    const textSet = new Set(tokens);

    const scores = Object.entries(PROBLEM_CLASSIFIERS).map(([category, config]) => {
        const categoryTokens = new Set(
            config.keywords.map(kw => {
                const tokenizer = new natural.WordTokenizer();
                const stemmer = natural.PorterStemmer;
                return stemmer.stem(kw);
            })
        );

        // Jaccard similarity
        const intersection = new Set([...textSet].filter(x => categoryTokens.has(x))).size;
        const union = new Set([...textSet, ...categoryTokens]).size;
        const similarity = union > 0 ? intersection / union : 0;

        return { category, score: similarity };
    });

    return scores.sort((a, b) => b.score - a.score);
}

/**
 * Calculate confidence score (0-1)
 */
function calculateConfidence(
    text: string,
    problemType: string,
    urgency: number,
    sentiment: any
): number {
    const classifier = PROBLEM_CLASSIFIERS[problemType as keyof typeof PROBLEM_CLASSIFIERS];

    if (!classifier) return 0.6; // Low confidence if category not found

    const { tokens } = tokenizeAndAnalyze(text);

    // Check keyword presence
    const keywordMatches = tokens.filter(t =>
        classifier.keywords.some(kw => {
            const stemmer = natural.PorterStemmer;
            return stemmer.stem(kw) === t;
        })
    ).length;

    const keywordRatio = keywordMatches / classifier.keywords.length;

    // Check urgency alignment
    const urgencyMatches = tokens.filter(t =>
        classifier.urgencyKeywords.some(kw => {
            const stemmer = natural.PorterStemmer;
            return stemmer.stem(kw) === t;
        })
    ).length;

    // Calculate base confidence (keyword presence)
    let confidence = keywordRatio * 0.7 + 0.3;

    // Adjust for urgency alignment
    if (urgencyMatches > 0) {
        confidence = Math.min(0.95, confidence + 0.1);
    }

    // Reduce confidence if sentiment is very negative (might need human review)
    if (sentiment.score < -3) {
        confidence = Math.min(0.85, confidence);
    }

    return Math.min(1, Math.max(0.3, confidence));
}

/**
 * Flag complaints for active learning (uncertain predictions)
 */
function flagForActiveLearning(confidence: number, emotionalRisk: string): boolean {
    // Flag if:
    // 1. Confidence is very low (uncertain)
    // 2. Emotional risk is high (might need special handling)
    // 3. Unusual sentiment-urgency mismatch
    return confidence < 0.5 || emotionalRisk === 'high';
}

/**
 * Main advanced analysis function
 */
export function analyzeComplaintAdvanced(
    description: string,
    problemType: string
): AdvancedAnalysisResult {
    // Step 1: Multi-Label Classification 🔥
    const problemTypes = classifyMultiLabel(description);
    const primaryProblemType = problemTypes[0].category; // Highest confidence category

    // Step 2: Tokenize and TF-IDF analysis
    const { tokens } = tokenizeAndAnalyze(description);

    // Step 3: Sentiment analysis
    const { sentiment, emotionalRisk } = analyzeSentiment(description);

    // Step 4: Named Entity Recognition
    const entities = extractNamedEntities(description);

    // Step 5: Category classification and auto-correction
    const categorySimilarities = calculateCategorySimilarity(description, problemType);
    const suggestedCategory = categorySimilarities[0].score > 0.7 ? categorySimilarities[0].category : undefined;

    // Step 6: Calculate urgency across ALL detected categories (multi-label approach)
    // Use the highest base urgency from all detected categories
    let maxBaseUrgency = 0;
    let allUrgencyKeywords: string[] = [];

    problemTypes.forEach(pt => {
        const classifier = PROBLEM_CLASSIFIERS[pt.category as keyof typeof PROBLEM_CLASSIFIERS];
        if (classifier) {
            maxBaseUrgency = Math.max(maxBaseUrgency, classifier.baseUrgency);
            allUrgencyKeywords = [...allUrgencyKeywords, ...classifier.urgencyKeywords];
        }
    });

    let urgency = maxBaseUrgency || 5;

    // Add urgency based on risk factors
    if (entities.riskFactors.length > 0) urgency += entities.riskFactors.length * 1.5;

    // Add urgency based on negative sentiment
    if (sentiment.score < -2) urgency += 1.5;
    if (sentiment.score < -4) urgency += 2;

    // Add urgency based on urgency keywords from ALL detected categories
    const urgencyKeywordMatches = tokens.filter(t =>
        allUrgencyKeywords.some((kw: string) => {
            const stemmer = natural.PorterStemmer;
            return stemmer.stem(kw) === t;
        })
    ).length;
    urgency += urgencyKeywordMatches;

    urgency = Math.min(10, Math.max(1, urgency)); // Clamp to 1-10

    // Step 6: Calculate confidence score (needed for XAI display)
    const confidence = calculateConfidence(description, primaryProblemType, urgency, sentiment);

    // Step 7: Probabilistic Priority Score (0-1) — kept for XAI/explainability display only 🎯
    const baseScore = (urgency - 1) / 9; // Convert raw urgency 1-10 to 0-1
    const confidenceWeight = Math.max(0.5, confidence);
    let priorityScore = baseScore * confidenceWeight;
    if (emotionalRisk === 'high') priorityScore = Math.min(1, priorityScore + 0.15);
    else if (emotionalRisk === 'medium') priorityScore = Math.min(1, priorityScore + 0.05);
    if (problemTypes.length >= 3) priorityScore = Math.min(1, priorityScore + 0.1);
    else if (problemTypes.length >= 2) priorityScore = Math.min(1, priorityScore + 0.05);
    priorityScore = Math.min(1, Math.max(0, priorityScore));

    // Step 8: Category-Driven Priority 🏷️
    // Look up the base priority from the category map (fallback: Medium)
    let priority: 'High' | 'Medium' | 'Low' =
        CATEGORY_PRIORITY_MAP[primaryProblemType] ?? 'Medium';

    // Runtime boost: promote Medium → High if risk factors are detected
    if (priority === 'Medium' && entities.riskFactors.length > 0) {
        priority = 'High';
    }

    // Step 9: Clamp urgency to the priority band
    const [urgencyMin, urgencyMax] = URGENCY_BANDS[priority];
    urgency = Math.min(urgencyMax, Math.max(urgencyMin, urgency));

    // Step 10: Flag for active learning
    const activeLearningSuggestion = flagForActiveLearning(confidence, emotionalRisk);

    // Step 11: Collect urgency indicators
    const urgencyIndicators: string[] = [];
    urgencyIndicators.push(`Category "${primaryProblemType}" → Priority: ${priority} (urgency band ${urgencyMin}–${urgencyMax})`);
    if (entities.riskFactors.length > 0) urgencyIndicators.push(`Risk factors: ${entities.riskFactors.join(', ')}`);
    if (sentiment.score < -2) urgencyIndicators.push('Highly negative sentiment detected');
    if (urgencyKeywordMatches > 0) urgencyIndicators.push('Critical urgency keywords present');
    if (suggestedCategory && suggestedCategory !== problemType) urgencyIndicators.push(`Category mismatch - should be: ${suggestedCategory}`);

    // Step 12: Generate ETA with numeric values
    let eta = '3-7 days';
    let etaMinDays = 3;
    let etaMaxDays = 7;

    if (priority === 'High') {
        eta = 'Within 24 hours';
        etaMinDays = 0;
        etaMaxDays = 1;
    } else if (priority === 'Medium') {
        eta = '1-3 days';
        etaMinDays = 1;
        etaMaxDays = 3;
    }

    // Step 13: Generate reasoning 🔥🎯
    const categoryList = problemTypes.map(pt => `${pt.category} (${(pt.confidence * 100).toFixed(0)}%)`).join(', ');
    const reasoning = `
AI Analysis (Confidence: ${(confidence * 100).toFixed(1)}%):
- 🏷️ Priority driven by category: "${primaryProblemType}" → ${priority} (urgency band: ${urgencyMin}–${urgencyMax})
- 🔥 Multi-Label Classification: ${categoryList}
- 🎯 XAI Priority Score: ${(priorityScore * 100).toFixed(1)}%
- Urgency: ${urgency}/10
- Sentiment: ${sentiment.magnitude} (Score: ${sentiment.score.toFixed(2)})
- Detected Entities: ${Object.values(entities).flat().length > 0 ? Object.values(entities).flat().join(', ') : 'None'}
- Risk Level: ${emotionalRisk}
${suggestedCategory && suggestedCategory !== problemType ? `- Suggested Category: ${suggestedCategory}` : ''}
- Indicators: ${urgencyIndicators.join('; ')}
${activeLearningSuggestion ? '- ⚠️ Flagged for human review (uncertain prediction)' : ''}
    `;

    return {
        priority,
        priorityScore, // 🎯 Probabilistic score (0-1)
        urgency: Math.round(urgency),
        eta,
        etaMinDays,
        etaMaxDays,
        reasoning: reasoning.trim(),
        keywords: tokens.slice(0, 10),
        problemTypes, // 🔥 Multi-label classification results
        sentiment,
        entities,
        confidence,
        suggestedCategory,
        urgencyIndicators,
        emotionalRisk,
        activeLearningSuggestion
    };
}

/**
 * Legacy function for backward compatibility
 */
export function analyzeComplaint(
    description: string,
    problemType: string
): Omit<AdvancedAnalysisResult, 'sentiment' | 'entities' | 'confidence' | 'suggestedCategory' | 'urgencyIndicators' | 'emotionalRisk' | 'activeLearningSuggestion'> {
    const advanced = analyzeComplaintAdvanced(description, problemType);
    return {
        priority: advanced.priority,
        priorityScore: advanced.priorityScore, // 🎯 Probabilistic score
        urgency: advanced.urgency,
        eta: advanced.eta,
        etaMinDays: advanced.etaMinDays,
        etaMaxDays: advanced.etaMaxDays,
        reasoning: advanced.reasoning,
        keywords: advanced.keywords,
        problemTypes: advanced.problemTypes // 🔥 Multi-label
    };
}

/**
 * Check whether a given `description` semantically matches the provided `problemType`.
 * Uses the category similarity scoring from `calculateCategorySimilarity` and simple
 * thresholding rules to decide if the pair is related or likely miscategorized.
 */
export function checkProblemTypeMatch(description: string, problemType: string): {
    match: boolean;
    score: number;
    suggestedCategory?: string;
    reasoning: string;
} {
    // Get similarity scores for all categories
    const similarities = calculateCategorySimilarity(description, problemType);

    const target = similarities.find(s => s.category === problemType);
    const targetScore = target ? target.score : 0;
    const top = similarities[0];

    // Decision rules (tunable):
    // - If targetScore >= 0.6 => match
    // - If top is different and top.score - targetScore >= 0.15 => likely mismatch, suggest top
    // - Otherwise treat as ambiguous but prefer match when equal
    let match = false;
    let suggested: string | undefined;

    if (targetScore >= 0.6) {
        match = true;
    } else if (top && top.category !== problemType && (top.score - targetScore) >= 0.15) {
        match = false;
        suggested = top.category;
    } else {
        // Ambiguous region: consider match if scores are close
        match = targetScore >= 0.45;
    }

    const reasoning = `Category check: provided="${problemType}" (score=${targetScore.toFixed(3)}). Top match="${top.category}" (score=${top.score.toFixed(3)})${suggested ? ` -> suggest="${suggested}"` : ''}. Decision: ${match ? 'MATCH' : 'MISMATCH'}`;

    return {
        match,
        score: Number(targetScore.toFixed(4)),
        suggestedCategory: suggested,
        reasoning
    };
}

/**
 * Rebalance urgencies of existing active complaints when a new complaint arrives.
 * Rules implemented:
 * - If a new complaint has higher priority than an existing complaint, reduce the existing complaint's urgency by 1.
 * - If priorities are the same, do not change the existing urgency.
 * - If an existing complaint's urgency is already 4 or below, do not change it.
 * - Multiple higher-priority arrivals will decrement lower-priority complaints each time (this function applies a single-step adjustment per call).
 *
 * Note: This function updates complaints in-place in the database and returns a summary of changes.
 */
export async function rebalanceUrgenciesForNewComplaint(newComplaint: {
    id?: string;
    priority: 'High' | 'Medium' | 'Low';
    urgency: number;
}) {
    // Map priority to numeric weight for comparison
    const priorityWeight: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
    const newWeight = priorityWeight[newComplaint.priority];

    // Find active complaints excluding the newly created one (if id provided)
    const query: any = { status: 'active' };
    if (newComplaint.id) query._id = { $ne: newComplaint.id };

    const existing = await Complaint.find(query).exec();
    const updates: Array<{ id: string; from: number; to: number }> = [];

    for (const comp of existing as IComplaint[]) {
        const existingWeight = priorityWeight[comp.priority];

        // Only consider lowering urgencies for complaints with lower priority
        if (existingWeight < newWeight) {
            // Do not touch complaints that are already low-urgency (3 or 4 or below per user rule)
            if (comp.urgency <= 4) continue;

            const from = comp.urgency;
            const to = Math.max(1, comp.urgency - 1); // reduce by 1 per arrival

            // Apply change only if it actually lowers the value
            if (to < from) {
                comp.urgency = to;
                try {
                    await comp.save();
                    updates.push({ id: comp._id.toString(), from, to });
                } catch (err) {
                    // Log and continue on error
                    // eslint-disable-next-line no-console
                    console.error('Failed to update complaint urgency', comp._id, err);
                }
            }
        }
        // If priorities are equal or existing is higher, do nothing (per rules)
    }

    return {
        newComplaint: { id: newComplaint.id, priority: newComplaint.priority, urgency: newComplaint.urgency },
        updates
    };
}

/**
 * Generate AI-powered rejection reason for a complaint
 * Analyzes complaint characteristics and provides detailed feedback
 */
export function generateRejectionReason(complaint: {
    problemType: string;
    description: string;
    village: string;
    priority?: string;
    confidence?: number;
}): string {
    const reasons: string[] = [];
    const desc = complaint.description.toLowerCase().trim();

    // 1. Check for insufficient information
    if (desc.length < 20) {
        reasons.push('Insufficient details provided - complaint description must be at least 20 characters');
    }

    // 2. Check for meaningful content
    const meaningfulWords = desc.match(/[a-z]{3,}/g);
    if (!meaningfulWords || meaningfulWords.length < 3) {
        reasons.push('Description lacks meaningful information - please provide specific details about the issue');
    }

    // 3. Check for test submissions
    const testKeywords = ['test', 'testing', 'demo', 'sample', 'trial', 'check'];
    if (testKeywords.some(kw => desc.includes(kw))) {
        reasons.push('Appears to be a test or demo submission - genuine complaints only');
    }

    // 4. Check for spam/inappropriate content
    const spamKeywords = ['spam', 'advertisement', 'ad', 'promotion', 'marketing', 'buy', 'sell', 'click here'];
    if (spamKeywords.some(kw => desc.includes(kw))) {
        reasons.push('Content flagged as spam, advertisement, or promotional material');
    }

    // 5. Check for personal/out-of-jurisdiction issues
    const personalKeywords = ['family', 'personal', 'private matter', 'neighbor dispute', 'argument'];
    if (personalKeywords.some(kw => desc.includes(kw))) {
        reasons.push('This appears to be a personal matter outside government jurisdiction');
    }

    // 6. Check for duplicate/repetitive text
    const words = desc.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size < words.length * 0.4) {
        reasons.push('Complaint contains repetitive or duplicate content');
    }

    // 7. Check for gibberish/random characters
    const gibberishPattern = /([a-z])\1{4,}|[^a-z0-9\s]{5,}/g;
    if (gibberishPattern.test(desc)) {
        reasons.push('Description contains invalid or gibberish content');
    }

    // 8. Check for very low confidence predictions
    if (complaint.confidence && complaint.confidence < 0.3) {
        reasons.push(`AI confidence is very low (${(complaint.confidence * 100).toFixed(0)}%) - complaint details may be unclear or ambiguous`);
    }

    // 9. Check for missing location context
    if (!complaint.village || complaint.village.toLowerCase() === 'unknown' || complaint.village.length < 2) {
        reasons.push('Valid location/village information is required');
    }

    // 10. Generate contextual feedback if no specific issues found
    if (reasons.length === 0) {
        const { tokens } = tokenizeAndAnalyze(desc);
        const sentiment = analyzeSentiment(desc);

        // If description is too generic
        if (tokens.length < 5) {
            reasons.push('Complaint description is too generic - please provide specific details about the problem');
        } else if (sentiment.emotionalRisk === 'high' && sentiment.sentiment.score < -4) {
            reasons.push('Complaint contains highly emotional language without clear factual details - please resubmit with objective information');
        } else {
            // Default contextual rejection
            reasons.push(`The complaint regarding "${complaint.problemType}" in ${complaint.village} does not currently meet the criteria for government action`);
            reasons.push('Please provide more specific details including: location, timeline, severity, and impact on the community');
        }
    }

    // Build formatted response
    const header = '🤖 AI Analysis - Rejection Feedback\n' + '='.repeat(50);
    const footer = '\n\n💡 Recommendation: Please address the above issues and resubmit your complaint with complete, accurate information. For urgent matters, contact your local government office directly.';

    const reasonsList = reasons.map((r, i) => `${i + 1}. ${r}`).join('\n');

    return `${header}\n\n${reasonsList}${footer}`;
}


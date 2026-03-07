import mongoose, { Schema, Document } from 'mongoose';

export interface IComplaint extends Document {
    citizenId?: mongoose.Types.ObjectId;
    village: string;
    problemType: string; // Primary category (highest confidence)
    problemTypes?: Array<{ // Multi-label classification results
        category: string;
        confidence: number;
    }>;
    description: string;
    language: string;
    translatedDescription: string;
    priority: 'High' | 'Medium' | 'Low';
    priorityScore?: number; // Probabilistic score (0-1) for explainability
    urgency: number;
    eta: string;
    etaMinDays?: number; // Minimum days in the ETA range
    etaMaxDays?: number; // Maximum days in the ETA range
    reasoning: string;
    status: 'active' | 'resolved' | 'rejected';
    resolvedBy?: mongoose.Types.ObjectId;
    rejectedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
    rejectedAt?: Date;
    rejectionReason?: string;
    // Citizen Feedback (Phase 7)
    citizenFeedback?: 'solved' | 'unresolved' | 'pending';
    citizenFeedbackAt?: Date;
    citizenComments?: string;
    // Image analysis fields (optional multi-modal AI)
    imageUrl?: string;
    imageAnalysis?: {
        problemType: string;
        confidence: number;
        visualFeatures: string[];
    };
    autoCorrected?: boolean; // True if CV prediction overrode user selection
    originalUserCategory?: string; // User's initial category selection
    correctionReason?: string; // Explanation for auto-correction
    // ML/Confidence features
    sentiment?: {
        score: number;
        comparative: number;
        magnitude: 'negative' | 'neutral' | 'positive';
    };
    entities?: {
        locations: string[];
        infrastructure: string[];
        riskFactors: string[];
    };
    confidence?: number;
    suggestedCategory?: string;
    emotionalRisk?: 'low' | 'medium' | 'high';
    activeLearningSuggestion?: boolean;
    officialFeedback?: 'accurate' | 'inaccurate' | 'needs_revision';
    // Duplicate Detection
    embedding?: number[];
    groupId?: string;
    isPrimary?: boolean;
}

const ComplaintSchema: Schema = new Schema(
    {
        citizenId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        village: {
            type: String,
            required: true,
            trim: true,
        },
        problemType: {
            type: String,
            required: true,
            trim: true,
        },
        problemTypes: [{
            category: {
                type: String,
                required: true,
                trim: true,
            },
            confidence: {
                type: Number,
                required: true,
                min: 0,
                max: 1,
            }
        }],
        description: {
            type: String,
            required: true,
            trim: true,
        },
        language: {
            type: String,
            default: 'en',
            trim: true,
        },
        translatedDescription: {
            type: String,
            required: true,
            trim: true,
        },
        priority: {
            type: String,
            enum: ['High', 'Medium', 'Low'],
            required: true,
        },
        priorityScore: {
            type: Number,
            min: 0,
            max: 1,
        },
        urgency: {
            type: Number,
            required: true,
            min: 0,
            max: 10,
        },
        eta: {
            type: String,
            required: true,
        },
        etaMinDays: {
            type: Number,
            min: 0,
        },
        etaMaxDays: {
            type: Number,
            min: 0,
        },
        reasoning: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'resolved', 'rejected'],
            default: 'active',
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        rejectedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        resolvedAt: {
            type: Date,
        },
        rejectedAt: {
            type: Date,
        },
        rejectionReason: {
            type: String,
        },
        // Citizen Feedback (Phase 7)
        citizenFeedback: {
            type: String,
            enum: ['solved', 'unresolved', 'pending'],
            default: 'pending',
        },
        citizenFeedbackAt: {
            type: Date,
        },
        citizenComments: {
            type: String,
            trim: true,
        },
        // Image analysis fields (optional multi-modal AI)
        imageUrl: {
            type: String,
        },
        imageAnalysis: {
            problemType: { type: String },
            confidence: { type: Number, min: 0, max: 1 },
            visualFeatures: [String],
        },
        autoCorrected: {
            type: Boolean,
            default: false,
        },
        originalUserCategory: {
            type: String,
        },
        correctionReason: {
            type: String,
        },
        // ML/Confidence features
        sentiment: {
            score: { type: Number, default: 0 },
            comparative: { type: Number, default: 0 },
            magnitude: { type: String, enum: ['negative', 'neutral', 'positive'], default: 'neutral' },
        },
        entities: {
            locations: [String],
            infrastructure: [String],
            riskFactors: [String],
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1,
            default: 0.7,
        },
        suggestedCategory: {
            type: String,
            trim: true,
        },
        emotionalRisk: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'low',
        },
        activeLearningSuggestion: {
            type: Boolean,
            default: false,
        },
        officialFeedback: {
            type: String,
            enum: ['accurate', 'inaccurate', 'needs_revision'],
        },
        // Duplicate Detection Fields
        embedding: {
            type: [Number], // Vector embedding from Sentence Transformer
            select: false, // Don't return by default to save bandwidth
        },
        groupId: {
            type: String, // ID linking similar complaints
        },
        isPrimary: {
            type: Boolean, // True if this is the first/main complaint of the group
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying
ComplaintSchema.index({ status: 1, priority: 1, createdAt: -1 });
ComplaintSchema.index({ confidence: 1, activeLearningSuggestion: 1 });
ComplaintSchema.index({ officialFeedback: 1 });

export default mongoose.model<IComplaint>('Complaint', ComplaintSchema);

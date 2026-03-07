import axios from 'axios';
import { getToken } from './authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Complaint {
    _id: string;
    village: string;
    problemType: string; // Primary category
    problemTypes?: Array<{ // 🔥 Multi-label classification
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
    etaMinDays?: number;
    etaMaxDays?: number;
    dynamicETA?: string; // Calculated by backend based on elapsed time
    reasoning: string;
    status: 'active' | 'resolved' | 'rejected';
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    // Citizen Feedback
    citizenFeedback?: 'solved' | 'unresolved' | 'pending';
    citizenFeedbackAt?: string;
    citizenComments?: string;
    // ML features
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
    // Multi-modal AI fields
    imageUrl?: string;
    imageAnalysis?: {
        problemType: string;
        confidence: number;
        visualFeatures: string[];
    };
    autoCorrected?: boolean;
    originalUserCategory?: string;
    correctionReason?: string;
    // Populated citizen reference
    citizenId?: {
        name: string;
        mobile: string;
    } | string;
    resolvedBy?: {
        name: string;
        designation: string;
    } | string;
    rejectedBy?: {
        name: string;
        designation: string;
    } | string;
}

export interface ComplaintSubmission {
    village: string;
    problemType: string;
    description: string;
    language?: string;
}

export interface ComplaintResponse {
    message: string;
    complaint: Complaint;
    analysis: {
        priority: string;
        urgency: number;
        eta: string;
        etaMinDays: number;
        etaMaxDays: number;
        reasoning: string;
        keywords: string[];
    };
}

export interface ComplaintsListResponse {
    count: number;
    complaints: Complaint[];
}

// API Client
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Submit a new complaint (supports FormData for image uploads)
export const submitComplaint = async (data: ComplaintSubmission | FormData): Promise<ComplaintResponse> => {
    const response = await api.post<ComplaintResponse>('/complaints', data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    });
    return response.data;
};

// Get all active complaints
export const getActiveComplaints = async (): Promise<Complaint[]> => {
    const response = await api.get<ComplaintsListResponse>('/complaints');
    return response.data.complaints;
};

// Get complaint history
export const getComplaintHistory = async (): Promise<Complaint[]> => {
    const response = await api.get<ComplaintsListResponse>('/complaints/history');
    return response.data.complaints;
};

// Get personal complaint history
export const getMyComplaintHistory = async (): Promise<Complaint[]> => {
    const response = await api.get<ComplaintsListResponse>('/complaints/my-history');
    return response.data.complaints;
};

// Resolve a complaint
export const resolveComplaint = async (id: string): Promise<Complaint> => {
    const response = await api.put<{ complaint: Complaint }>(`/complaints/${id}/resolve`);
    return response.data.complaint;
};

// Reopen a complaint
export const reopenComplaint = async (id: string): Promise<Complaint> => {
    const response = await api.put<{ complaint: Complaint }>(`/complaints/${id}/reopen`);
    return response.data.complaint;
};

// Reject a complaint with AI feedback
export const rejectComplaint = async (id: string): Promise<{ complaint: Complaint; rejectionReason: string }> => {
    const response = await api.put<{ complaint: Complaint; rejectionReason: string }>(`/complaints/${id}/reject`);
    return response.data;
};

// Submit citizen feedback
export const submitCitizenFeedback = async (id: string, feedback: 'solved' | 'unresolved', comments?: string): Promise<Complaint> => {
    const response = await api.put<{ complaint: Complaint }>(`/complaints/${id}/citizen-feedback`, { feedback, comments });
    return response.data.complaint;
};

// Get rejected complaints
export const getRejectedComplaints = async (): Promise<Complaint[]> => {
    const response = await api.get<ComplaintsListResponse>('/complaints?status=rejected');
    return response.data.complaints;
};

// Get unresolved by citizens complaints
export const getUnresolvedByCitizens = async (): Promise<Complaint[]> => {
    const response = await api.get<ComplaintsListResponse>('/complaints?showUnresolvedByCitizen=true');
    return response.data.complaints;
};

export const sendMessage = async (message: string) => {
    try {
        const response = await api.post('/chat', { message });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export default api;

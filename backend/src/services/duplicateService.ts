
import { pipeline } from '@xenova/transformers';
import Complaint, { IComplaint } from '../models/Complaint';

export class DuplicateDetectionService {
    private static instance: DuplicateDetectionService;
    private extractor: any = null;

    private constructor() { }

    public static getInstance(): DuplicateDetectionService {
        if (!DuplicateDetectionService.instance) {
            DuplicateDetectionService.instance = new DuplicateDetectionService();
        }
        return DuplicateDetectionService.instance;
    }

    // Initialize the model (lazy load)
    private async getExtractor() {
        if (!this.extractor) {
            console.log('🔄 Loading Sentence Transformer model...');
            // Using a lightweight model suitable for CPU/Node.js
            this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            console.log('✅ Model loaded.');
        }
        return this.extractor;
    }

    // Generate valid embeddings (mean pooling)
    public async generateEmbedding(text: string): Promise<number[]> {
        const extractor = await this.getExtractor();
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    // Cosine similarity
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            magnitudeA += vecA[i] * vecA[i];
            magnitudeB += vecB[i] * vecB[i];
        }
        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);
        if (magnitudeA === 0 || magnitudeB === 0) return 0;
        return dotProduct / (magnitudeA * magnitudeB);
    }

    // Find duplicates and return the group ID if found
    public async checkForDuplicates(
        text: string,
        village: string,
        threshold: number = 0.85
    ): Promise<{ isDuplicate: boolean; groupId?: string; similarComplaintId?: string }> {

        const embedding = await this.generateEmbedding(text);

        // Fetch active complaints from the same village to compare against
        // We select embedding (explicitly), groupId, description
        const candidates = await Complaint.find({
            village: village,
            status: 'active',
            embedding: { $exists: true }
        }).select('+embedding groupId description');

        let maxScore = 0;
        let bestMatch: IComplaint | null = null;

        for (const candidate of candidates) {
            if (!candidate.embedding || candidate.embedding.length === 0) continue;

            const score = this.cosineSimilarity(embedding, candidate.embedding);
            if (score > maxScore) {
                maxScore = score;
                bestMatch = candidate;
            }
        }

        console.log(`🔍 Max Similarity Score: ${maxScore.toFixed(4)}`);

        if (maxScore >= threshold && bestMatch) {
            return {
                isDuplicate: true,
                groupId: bestMatch.groupId || bestMatch._id.toString(), // Use existing group ID or create new one from ID
                similarComplaintId: bestMatch._id.toString()
            };
        }

        return { isDuplicate: false };
    }
}

export const duplicateService = DuplicateDetectionService.getInstance();

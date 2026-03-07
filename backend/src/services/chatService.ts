import Complaint from '../models/Complaint';

interface ChatResponse {
    response: string;
    suggestions?: string[];
}

export class ChatService {

    constructor() {
        console.log("🤖 ChatService initialized (Regex Mode - Interactive)");
    }

    async processMessage(userId: string, message: string): Promise<ChatResponse> {
        const lowerMsg = message.toLowerCase();

        // 0. Handle specific complaint selection (Format: "ProblemType - Village")
        // We look for patterns like "Water Supply - Chitlapakkam"
        if (message.includes(' - ')) {
            return this.handleComplaintSpecifics(userId, message);
        }

        // 1. Status Check
        if (lowerMsg.includes('status') || lowerMsg.includes('track') || lowerMsg.includes('what is happening')) {
            return this.handleGetStatus(userId);
        }

        // 2. Delay Explanation (Generic or Specific)
        if (lowerMsg.includes('delay') || lowerMsg.includes('long') || lowerMsg.includes('when') || lowerMsg.includes('time')) {
            return this.handleExplainDelay(userId, lowerMsg);
        }

        // 3. Greetings
        if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
            return {
                response: "Hello! I am your RuralTrust AI Assistant. How can I help you today?",
                suggestions: ["🔍 What is my complaint status?", "⏳ Why is it delayed?"]
            };
        }

        // 4. Default / Fallback
        return {
            response: "I can help you check your complaint status or explain any delays. Please select an option below or type your query.",
            suggestions: ["🔍 What is my complaint status?", "⏳ Why is it delayed?"]
        };
    }

    private async handleGetStatus(userId: string): Promise<ChatResponse> {
        try {
            const complaints = await Complaint.find({ citizenId: userId, status: 'active' })
                .select('problemType status village priority');

            if (complaints.length === 0) {
                return {
                    response: "You don't have any active complaints at the moment.",
                    suggestions: ["Submit New Complaint"]
                };
            }

            // Instead of a summary, we ask the user to select one
            // We format the suggestions as "ProblemType - Village"
            const suggestions = complaints.map(c => `${c.problemType} - ${c.village}`);

            return {
                response: `I found ${complaints.length} active complaints. Please select one to view details:`,
                suggestions: [...suggestions, "🔄 Start Over"]
            };
        } catch (error) {
            console.error("Error fetching status:", error);
            return {
                response: "I'm having trouble accessing your records right now. Please try again later.",
                suggestions: ["🔄 Start Over"]
            };
        }
    }

    private async handleComplaintSpecifics(userId: string, chipText: string): Promise<ChatResponse> {
        try {
            // chipText format: "Water Supply - Chitlapakkam"
            // We need to parse this or fuzzy match
            const [problem, village] = chipText.split(' - ');

            const complaint = await Complaint.findOne({
                citizenId: userId,
                status: 'active',
                problemType: new RegExp(problem, 'i'),
                village: new RegExp(village, 'i')
            });

            if (!complaint) {
                // If we can't find it (maybe user typed something weird), fall back to generic
                return {
                    response: "I couldn't find details for that specific complaint. Here are your active complaints:",
                    suggestions: ["🔍 What is my complaint status?", "🔄 Start Over"]
                };
            }

            return {
                response: `**${complaint.problemType}** in ${complaint.village}:\n\nStatus: **${complaint.status.toUpperCase()}**\nPriority: ${complaint.priority}\n\nWould you like to know why it might be delayed?`,
                suggestions: [`⏳ Why is ${complaint.problemType} delayed?`, "🔍 Check another complaint", "🔄 Start Over"]
            };

        } catch (error) {
            console.error("Error fetching specifics:", error);
            return {
                response: "I encountered an error retrieving those details.",
                suggestions: ["🔄 Start Over"]
            };
        }
    }

    private async handleExplainDelay(userId: string, message: string = ''): Promise<ChatResponse> {
        try {
            const complaints = await Complaint.find({ citizenId: userId, status: 'active' });

            if (complaints.length === 0) {
                return { response: "You have no active complaints to check for delays." };
            }

            let targetComplaint = undefined;
            const knownTypes = ['Water Supply', 'Sanitation', 'Road Damage', 'Electricity', 'Healthcare', 'Street Lights', 'Waste Management'];
            for (const pt of knownTypes) {
                if (message.includes(pt.toLowerCase())) {
                    targetComplaint = complaints.find(c => c.problemType.toLowerCase() === pt.toLowerCase());
                    if (targetComplaint) break;
                }
            }

            // Defaults to most critical if no specific one is mentioned or found
            if (!targetComplaint) {
                targetComplaint = complaints.sort((a, b) => {
                    const priorityScore = { 'High': 3, 'Medium': 2, 'Low': 1 };
                    return priorityScore[b.priority as keyof typeof priorityScore] - priorityScore[a.priority as keyof typeof priorityScore];
                })[0];
            }

            let reason = "";

            if (targetComplaint.priority === 'High') {
                reason = `Your complaint about **${targetComplaint.problemType}** is marked as HIGH priority. Our team is currently attending to emergency requests in ${targetComplaint.village}.`;
            } else {
                reason = `Your complaint about **${targetComplaint.problemType}** is in the queue. We are currently experiencing high volume in ${targetComplaint.village}, which may cause a slight delay.`;
            }

            return {
                response: reason,
                suggestions: ["🔍 What is my complaint status?", "🔄 Start Over"]
            };
        } catch (error) {
            console.error("Error explaining delay:", error);
            return {
                response: "I couldn't analyze the delay reasons at this moment.",
                suggestions: ["🔄 Start Over"]
            };
        }
    }
}

export const chatService = new ChatService();

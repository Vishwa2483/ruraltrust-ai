import React, { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../services/api';
import './ChatWidget.css'; // Import custom styles

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "Hello! I am your RuralTrust Assistant. \n\nI can help you check the status of your complaints or explain delays.",
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial actions
    const initialActions = [
        "🔍 What is my complaint status?",
        "⏳ Why is it delayed?",
        "📅 When will it get resolved?"
    ];

    const [availableActions, setAvailableActions] = useState<string[]>(initialActions);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, isTyping]);

    const isProcessing = useRef(false);

    const handleSend = async (text: string) => {
        if (isProcessing.current) return;
        isProcessing.current = true;

        // Add user message
        const newUserMsg: Message = {
            id: Date.now(),
            text: text,
            sender: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newUserMsg]);
        setIsTyping(true);

        // Temporarily hide actions while processing
        setAvailableActions([]);

        try {
            // Call API
            const response = await sendMessage(text);

            // Add bot response
            const newBotMsg: Message = {
                id: Date.now() + 1,
                text: response.response,
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, newBotMsg]);

            // Update available actions based on backend suggestions
            if (response.suggestions && response.suggestions.length > 0) {
                setAvailableActions(response.suggestions);
            } else {
                setAvailableActions(["🔄 Start Over"]);
            }

        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: Date.now() + 1,
                text: "Sorry, I am having trouble connecting to the server. Please check your connection.",
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
            setAvailableActions(["Try Again", "🔄 Start Over"]);
        } finally {
            setIsTyping(false);
            isProcessing.current = false;
        }
    };

    const handleStartOver = () => {
        setMessages([
            {
                id: Date.now(),
                text: "Let's start over. How can I help?",
                sender: 'bot',
                timestamp: new Date()
            }
        ]);
        setAvailableActions(initialActions);
    };

    const [isMaximized, setIsMaximized] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="chat-overlay" onClick={onClose}>
            <div
                className={`chat-container ${isMaximized ? 'maximized' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Window Controls at top-right */}
                <div className="window-controls">

                    <button className="control-btn maximize" onClick={() => setIsMaximized(!isMaximized)} aria-label="Maximize">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1.5" rx="1" />
                        </svg>
                    </button>
                    <button className="control-btn close" onClick={onClose} aria-label="Close">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Header */}
                <div className="chat-header">
                    <div className="chat-title">
                        <div className="bot-avatar">🤖</div>
                        <div>
                            <h3>RuralTrust AI</h3>
                            <span className="online-status">
                                <span className="online-dot"></span> Online
                            </span>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {messages.map((msg) => (
                        <div key={msg.id} className={`chat-message ${msg.sender}`}>
                            <div className={`message-avatar ${msg.sender}`}>
                                {msg.sender === 'bot' ? '🤖' : '👤'}
                            </div>
                            <div className="message-content">
                                {msg.text.split('\n').map((line, i) => {
                                    // Handle bullet points
                                    const isBullet = line.trim().startsWith('•');
                                    const cleanLine = isBullet ? line.replace('•', '').trim() : line;

                                    // Handle bold text
                                    const parts = cleanLine.split('**');
                                    const renderedLine = parts.map((part, idx) =>
                                        idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part
                                    );

                                    if (isBullet) {
                                        return (
                                            <ul key={i} style={{ margin: '0.2rem 0 0.2rem 1.2rem', padding: 0 }}>
                                                <li>{renderedLine}</li>
                                            </ul>
                                        );
                                    }

                                    // Preserve empty lines
                                    if (!line.trim()) {
                                        return <div key={i} style={{ height: '0.5rem' }}></div>;
                                    }

                                    return <div key={i}>{renderedLine}</div>;
                                })}
                                <span className="message-time">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="chat-message bot">
                            <div className="message-avatar bot">🤖</div>
                            <div className="message-content">
                                <div className="typing-indicator">
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="chat-actions">
                    {isTyping ? (
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            RuralTrust AI is thinking...
                        </span>
                    ) : (
                        availableActions.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => action === "🔄 Start Over" ? handleStartOver() : handleSend(action)}
                                className={`chip-btn ${action === "🔄 Start Over" ? "reset" : ""}`}
                            >
                                {action}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatWidget;

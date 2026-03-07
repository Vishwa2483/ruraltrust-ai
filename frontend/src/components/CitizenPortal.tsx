import React, { useState } from 'react';
import { submitComplaint, ComplaintSubmission, getMyComplaintHistory, Complaint } from '../services/api';
import { getUser, logout, type CitizenUser } from '../services/authApi';
import CitizenAuth from './CitizenAuth';
import ChatWidget from './ChatWidget';

const VILLAGES = [
    'Potheri',
    'Nallur',
    'Urapakkam',
    'Guduvanchery',
    'Vandalur',
    'Kundrathur',
    'Maraimalai Nagar',
    'Singaperumal Koil',
    'Madambakkam',
    'Sembakkam',
    'Chitlapakkam',
    'Selaiyur',
    'Medavakkam',
    'Tambaram',
    'Perungalathur',
    'Chromepet',
    'Pallavaram',
    'Anakaputhur',
    'Thiruneermalai',
    'Pammal',
    'Cowl Bazaar',
    'Hasthinapuram',
    'Chitlapakkam',
    'Nanmangalam',
    'Kovilambakkam'
];

const PROBLEM_TYPES = [
    'Water Supply',
    'Road Damage',
    'Electricity',
    'Sanitation',
    'Healthcare',
    'Street Lights',
    'Drainage Issues',
    'Garbage Collection',
    'Public Transport',
    'Agriculture Support',
    'Animal Menace',
    'School Infrastructure',
    'Ration Card Issues',
    'Pension Problems',
    'Other'
];

// Language translations
const TRANSLATIONS: { [key: string]: { [key: string]: string } } = {
    'en': {
        'language': 'Language 🌐',
        'welcome': 'Welcome',
        'logout': '🚪 Logout',
        'submitComplaint': 'Submit a Complaint',
        'reportIssues': 'Report issues affecting your community. Our AI system will automatically prioritize your complaint.',
        'village': 'Village *',
        'selectVillage': 'Select your village',
        'problemType': 'Problem Type *',
        'selectProblemType': 'Select problem type',
        'description': 'Complaint Description *',
        'descriptionPlaceholder': 'Describe the issue in detail. Include urgency indicators if it\'s an emergency (e.g., \'accident\', \'danger\', \'no water\')... Or click 🎤 to speak.',
        'characters': 'characters',
        'listening': '🔴 Listening...',
        'submit': 'Submit Complaint',
        'submitting': 'Submitting...',
        'fillFields': 'Please fill in all fields',
        'descriptionMin': 'Description must be at least 10 characters',
        'successMessage': 'Complaint submitted successfully! Priority: ',
        'eta': ' | ETA: ',
        'failMessage': 'Failed to submit complaint. Please try again.',
        'howItWorks': '💡 How It Works',
        'step1': 'Select your village and problem type',
        'step2': 'Describe the issue in detail',
        'step3': 'Our AI analyzes your complaint and assigns priority',
        'step4': 'Government officials will address it based on urgency',
    },
    'ta': {
        'language': 'மொழி 🌐',
        'welcome': 'வரவேற்கிறோம்',
        'logout': '🚪 வெளியேறு',
        'submitComplaint': 'புகாரை சமர்ப்பிக்கவும்',
        'reportIssues': 'உங்கள் சமூகத்தைப் பாதிக்கும் சிக்கல்களைக் கூறவும். எங்கள் AI அமைப்பு தானாக உங்கள் புகாரை முன்னுரிமைப்படுத்தும்.',
        'village': 'கிராமம் *',
        'selectVillage': 'உங்கள் கிராமத்தைத் தேர்ந்தெடுக்கவும்',
        'problemType': 'சிக்கல் வகை *',
        'selectProblemType': 'சிக்கல் வகையைத் தேர்ந்தெடுக்கவும்',
        'description': 'புகாரின் விளக்கம் *',
        'descriptionPlaceholder': 'பிரச்சனையை விस्तாரத்தில் விளக்கவும். அவசரமான சூழ்நிலை இருந்தால் சংকேதங்களைச் சேர்க்கவும்... அல்லது 🎤 ஐ கிளிக் செய்து பேசவும்.',
        'characters': 'எழுத்துக்கள்',
        'listening': '🔴 கேட்கிறேன்...',
        'submit': 'புகாரை சமர்ப்பிக்கவும்',
        'submitting': 'சமர்ப்பிக்கிறது...',
        'fillFields': 'அனைத்து புலங்களை நிரப்பவும்',
        'descriptionMin': 'விளக்கம் குறைந்தது 10 எழுத்துக்கள் இருக்க வேண்டும்',
        'successMessage': 'புகாரை வெற்றிகரமாக சமர்ப்பித்தது! முன்னுரிமை: ',
        'eta': ' | ETA: ',
        'failMessage': 'புகாரை சமர்ப்பிக்க தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.',
        'howItWorks': '💡 இது எப்படி வேலை செய்கிறது',
        'step1': 'உங்கள் கிராமம் மற்றும் சிக்கல் வகையைத் தேர்ந்தெடுக்கவும்',
        'step2': 'பிரச்சனையை விス்தாரத்தில் விளக்கவும்',
        'step3': 'எங்கள் AI உங்கள் புகாரை பகுப்பாய்வு செய்து முன்னுரிமை நிர்ணயிக்கிறது',
        'step4': 'அரசு அதிகாரிகள் அவசரத்தின் அடிப்படையில் தீர்க்கிறார்கள்',
    },
    'hi': {
        'language': 'भाषा 🌐',
        'welcome': 'स्वागत है',
        'logout': '🚪 लॉगआउट करें',
        'submitComplaint': 'शिकायत सबमिट करें',
        'reportIssues': 'अपने समुदाय को प्रभावित करने वाली समस्याओं की रिपोर्ट करें। हमारी AI प्रणाली स्वचालित रूप से आपकी शिकायत को प्राथमिकता देगी।',
        'village': 'गाँव *',
        'selectVillage': 'अपना गाँव चुनें',
        'problemType': 'समस्या का प्रकार *',
        'selectProblemType': 'समस्या का प्रकार चुनें',
        'description': 'शिकायत का विवरण *',
        'descriptionPlaceholder': 'समस्या का विस्तार से वर्णन करें। यदि यह आपातकाल है तो संकेत शामिल करें (जैसे, \'दुर्घटना\', \'खतरा\', \'कोई पानी नहीं\')... या 🎤 क्लिक करके बोलें।',
        'characters': 'वर्ण',
        'listening': '🔴 सुन रहे हैं...',
        'submit': 'शिकायत सबमिट करें',
        'submitting': 'जमा किया जा रहा है...',
        'fillFields': 'कृपया सभी फ़ील्ड भरें',
        'descriptionMin': 'विवरण कम से कम 10 वर्ण होना चाहिए',
        'successMessage': 'शिकायत सफलतापूर्वक जमा की गई! प्राथमिकता: ',
        'eta': ' | ETA: ',
        'failMessage': 'शिकायत सबमिट करने में विफल। कृपया पुनः प्रयास करें।',
        'howItWorks': '💡 यह कैसे काम करता है',
        'step1': 'अपना गाँव और समस्या का प्रकार चुनें',
        'step2': 'समस्या का विस्तार से वर्णन करें',
        'step3': 'हमारी AI आपकी शिकायत का विश्लेषण करती है और प्राथमिकता निर्धारित करती है',
        'step4': 'सरकारी अधिकारी इसे तुरंत के आधार पर संबोधित करेंगे',
    }
};

function t(key: string, lang?: string): string {
    const l = lang || 'en';
    return TRANSLATIONS[l]?.[key] || TRANSLATIONS['en'][key] || key;
}

const CitizenPortal: React.FC = () => {
    const [user, setUser] = useState<CitizenUser | null>(getUser() as CitizenUser);
    const [formData, setFormData] = useState<ComplaintSubmission>({
        village: user?.village || '',
        problemType: '',
        description: '',
        language: 'en'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showResolvedFeedback, setShowResolvedFeedback] = useState(false);
    const [feedbackComments, setFeedbackComments] = useState<{ [id: string]: string }>({});

    // History state
    const [history, setHistory] = useState<Complaint[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Chat widget state
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Speech recognition instance is stored in ref; no state needed
    const recognitionRef = React.useRef<any>(null);

    const LANGUAGES = [
        { code: 'en', name: 'English' },
        { code: 'ta', name: 'Tamil' },
        { code: 'te', name: 'Telugu' },
        { code: 'kn', name: 'Kannada' },
        { code: 'ml', name: 'Malayalam' },
        { code: 'hi', name: 'Hindi' },
        { code: 'mr', name: 'Marathi' },
    ];

    // Fetch history on mount
    React.useEffect(() => {
        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const data = await getMyComplaintHistory();
                setHistory(data);
            } catch (error) {
                console.error("Failed to fetch history", error);
            } finally {
                setLoadingHistory(false);
            }
        };
        // Only fetch if logged in
        if (user) {
            fetchHistory();
        }
    }, [user]); // Re-fetch if user changes (login)

    // Initialize Web Speech API
    React.useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setMessage({ type: 'error', text: 'Voice recognition not supported in your browser. Please use Chrome, Edge, or Safari.' });
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }

        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;

        // Set language based on selection
        const langCode = formData.language === 'en' ? 'en-US' :
            formData.language === 'ta' ? 'ta-IN' :
                formData.language === 'te' ? 'te-IN' :
                    formData.language === 'kn' ? 'kn-IN' :
                        formData.language === 'ml' ? 'ml-IN' :
                            formData.language === 'hi' ? 'hi-IN' :
                                formData.language === 'mr' ? 'mr-IN' : 'en-US';

        recognitionInstance.lang = langCode;
        console.log(`🎤 Initializing Speech Recognition for language: ${langCode}`);

        recognitionInstance.onstart = () => {
            console.log('🎤 Speech recognition started');
            setIsListening(true);
            setMessage(null);
        };

        recognitionInstance.onend = () => {
            console.log('🎤 Speech recognition ended');
            setIsListening(false);
        };

        recognitionInstance.onresult = async (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const isFinal = result.isFinal;
                const text = result[0].transcript;

                if (isFinal) {
                    transcript += text;
                }
            }

            if (transcript.trim()) {
                console.log(`🎤 Transcript received (${langCode}):`, transcript);
                // Directly use the transcript (Mother Tongue)
                // The backend will handle translation to English upon submission
                setFormData(prev => ({
                    ...prev,
                    description: (prev.description ? prev.description + ' ' : '') + transcript
                }));
            }
        };

        recognitionInstance.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setMessage({ type: 'error', text: `Voice error: ${event.error}. Please try again.` });
            setIsListening(false);
        };

        recognitionRef.current = recognitionInstance;

        // Cleanup on unmount or language change
        return () => {
            if (recognitionRef.current) {
                console.log('🎤 Cleaning up speech recognition instance');
                recognitionRef.current.abort();
            }
        };
    }, [formData.language]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Validation
        if (!formData.village || !formData.problemType || !formData.description) {
            setMessage({ type: 'error', text: t('fillFields', formData.language) });
            return;
        }

        if (formData.description.trim().length < 10) {
            setMessage({ type: 'error', text: t('descriptionMin', formData.language) });
            return;
        }

        setLoading(true);

        try {
            // Build FormData if image is selected, otherwise use JSON
            let submissionData: FormData | typeof formData;

            if (selectedImage) {
                const formDataObj = new FormData();
                formDataObj.append('village', formData.village);
                formDataObj.append('problemType', formData.problemType);
                formDataObj.append('description', formData.description);
                formDataObj.append('language', formData.language || 'en');
                formDataObj.append('image', selectedImage);
                submissionData = formDataObj;
            } else {
                submissionData = formData;
            }

            const result = await submitComplaint(submissionData);

            let successMsg = `${t('successMessage', formData.language)}${result.analysis.priority}${t('eta', formData.language)}${result.analysis.eta}`;

            // Add auto-correction notification
            if (result.complaint.autoCorrected) {
                successMsg += ` 🤖 AI corrected category from "${result.complaint.originalUserCategory}" to "${result.complaint.problemType}" based on image analysis.`;
            }

            setMessage({
                type: 'success',
                text: successMsg
            });

            // Reset form
            setFormData({
                village: '',
                problemType: '',
                description: '',
                language: 'en'
            });
            setSelectedImage(null);
            setImagePreview(null);

            // Refresh history after submission isn't strictly necessary for "Community Resolutions" as it only shows resolved/rejected, 
            // but if we were showing all active complaints, we would refresh here.
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || t('failMessage', formData.language)
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setMessage({ type: 'error', text: 'Only image files are allowed' });
                return;
            }

            setSelectedImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const clearImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
    };

    const toggleVoiceInput = () => {
        if (!recognitionRef.current) {
            setMessage({ type: 'error', text: 'Voice recognition not supported in your browser. Please use Chrome, Edge, or Safari.' });
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error('Error starting recognition:', error);
                setMessage({ type: 'error', text: 'Failed to start voice recording. Please try again.' });
            }
        }
    };

    const handleLogout = () => {
        logout();
        setUser(null);
    };

    const handleLoginSuccess = () => {
        const loggedInUser = getUser() as CitizenUser;
        setUser(loggedInUser);
        setFormData({
            village: loggedInUser?.village || '',
            problemType: '',
            description: '',
            language: 'en'
        });
    };

    const handleCitizenFeedback = async (id: string, feedback: 'solved' | 'unresolved') => {
        try {
            const comments = feedbackComments[id];
            await import('../services/api').then(api => api.submitCitizenFeedback(id, feedback, comments));
            setMessage({ type: 'success', text: `Feedback recorded: ${feedback === 'solved' ? 'Resolved' : 'Not Solved'}` });

            // Refresh history
            const data = await getMyComplaintHistory();
            setHistory(data);

            // Clear comments
            setFeedbackComments(prev => {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to submit feedback' });
        }
    };

    // Show login screen if not authenticated
    if (!user || user.type !== 'citizen') {
        return <CitizenAuth onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="citizen-portal">
            <div className="user-header">
                <div className="user-info">
                    <span className="welcome">{t('welcome', formData.language)}, <strong>{user.name}</strong></span>
                    <span className="village-badge">📍 {user.village}</span>
                </div>
                <button
                    className="ai-assistant-btn"
                    onClick={() => setShowResolvedFeedback(!showResolvedFeedback)}
                    style={{
                        background: 'var(--success-gradient, linear-gradient(135deg, #10b981 0%, #059669 100%))',
                        border: 'none',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                    }}
                >
                    ✅ Resolved Problems {history.filter(c => c.status === 'resolved' && c.citizenFeedback === 'pending').length > 0 && (
                        <span style={{
                            background: '#ef4444',
                            color: 'white',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {history.filter(c => c.status === 'resolved' && c.citizenFeedback === 'pending').length}
                        </span>
                    )}
                </button>
                <button
                    className="ai-assistant-btn"
                    onClick={() => setIsChatOpen(true)}
                    style={{
                        background: 'var(--accent-gradient)',
                        border: 'none',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)'
                    }}
                >
                    🤖 AI Assistant
                </button>
                <button className="logout-btn" onClick={handleLogout}>
                    {t('logout', formData.language)}
                </button>
            </div>

            <div className="portal-header">
                <h2>{t('submitComplaint', formData.language)}</h2>
                <p>{t('reportIssues', formData.language)}</p>
            </div>

            <form onSubmit={handleSubmit} className="complaint-form">
                <div className="language-selector-box">
                    <label htmlFor="language">{t('language', formData.language)}</label>
                    <select
                        id="language"
                        value={formData.language || 'en'}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        className="language-select"
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="village">{t('village', formData.language)}</label>
                        <select
                            id="village"
                            name="village"
                            value={formData.village}
                            onChange={handleChange}
                            required
                        >
                            <option value="">{t('selectVillage', formData.language)}</option>
                            {VILLAGES.map(village => (
                                <option key={village} value={village}>{village}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="problemType">{t('problemType', formData.language)}</label>
                        <select
                            id="problemType"
                            name="problemType"
                            value={formData.problemType}
                            onChange={handleChange}
                            required
                        >
                            <option value="">{t('selectProblemType', formData.language)}</option>
                            {PROBLEM_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Optional Image Upload for Multi-Modal AI */}
                <div className="form-group">
                    <label htmlFor="image">📷 Upload Image (Optional)</label>
                    <p style={{ fontSize: '12px', opacity: 0.7, margin: '4px 0 8px 0' }}>
                        Attach a photo to help AI analyze the issue more accurately
                    </p>
                    <input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #4b5563',
                            backgroundColor: '#374151',
                            color: '#f3f4f6'
                        }}
                    />
                    {imagePreview && (
                        <div style={{ marginTop: '12px', position: 'relative' }}>
                            <img
                                src={imagePreview}
                                alt="Preview"
                                style={{
                                    maxWidth: '300px',
                                    maxHeight: '200px',
                                    borderRadius: '8px',
                                    border: '2px solid #10b981',
                                    display: 'block'
                                }}
                            />
                            <button
                                type="button"
                                onClick={clearImage}
                                style={{
                                    marginTop: '8px',
                                    padding: '6px 12px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500'
                                }}
                            >
                                Remove Image
                            </button>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="description">{t('description', formData.language)}</label>
                    <div className="textarea-container">
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder={t('descriptionPlaceholder', formData.language)}
                            rows={6}
                            required
                        />
                        <button
                            type="button"
                            className={`voice-btn-textarea ${isListening ? 'listening' : ''}`}
                            onClick={toggleVoiceInput}
                            title={isListening ? 'Stop recording' : 'Start recording'}
                        >
                            {isListening ? '🎤' : '🎤'}
                        </button>
                    </div>
                    <div className="textarea-footer">
                        <span className="char-count">{formData.description.length} {t('characters', formData.language)}</span>
                        {isListening && <span className="listening-indicator">{t('listening', formData.language)}</span>}
                    </div>
                </div>

                {message && (
                    <div className={`message ${message.type}`}>
                        {message.type === 'success' ? '✅' : '❌'} {message.text}
                    </div>
                )}

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? (
                        <>
                            <span className="spinner"></span> {t('submitting', formData.language)}
                        </>
                    ) : (
                        <>
                            <span className="icon">📝</span> {t('submit', formData.language)}
                        </>
                    )}
                </button>
            </form>

            <div className="history-section" style={{ marginTop: '40px', marginBottom: '40px' }}>
                <h3 style={{ color: '#e5e7eb', marginBottom: '20px', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>
                    📜 My Complaint History
                </h3>

                {loadingHistory ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af' }}>Loading history...</div>
                ) : history.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af' }}>You haven't submitted any resolved/rejected complaints yet.</div>
                ) : (
                    <div className="history-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {history.map(complaint => (
                            <div key={complaint._id} style={{
                                backgroundColor: '#1f2937',
                                padding: '15px',
                                borderRadius: '8px',
                                borderLeft: `4px solid ${complaint.status === 'resolved' ? '#10b981' : '#ef4444'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#f3f4f6' }}>{complaint.village}</span>
                                    <span style={{
                                        fontSize: '12px',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        backgroundColor: complaint.status === 'resolved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        color: complaint.status === 'resolved' ? '#34d399' : '#f87171'
                                    }}>
                                        {complaint.status.toUpperCase()}
                                    </span>
                                </div>
                                <h4 style={{ color: '#d1d5db', margin: '0 0 8px 0' }}>{complaint.problemType}</h4>
                                <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '10px' }}>
                                    {complaint.description.length > 100
                                        ? complaint.description.substring(0, 100) + '...'
                                        : complaint.description}
                                </p>
                                <div style={{ fontSize: '12px', color: '#6b7280', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                    {complaint.status === 'resolved' ? (
                                        <>AI Reasoning: {complaint.reasoning}</>
                                    ) : (
                                        <>Reason: {complaint.rejectionReason || 'N/A'}</>
                                    )}
                                </div>

                                {complaint.status === 'resolved' && complaint.citizenFeedback === 'pending' && (
                                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #374151' }}>
                                        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Was your problem actually solved?</p>
                                        <div style={{ marginBottom: '10px' }}>
                                            <input
                                                type="text"
                                                placeholder="Add details (optional)..."
                                                value={feedbackComments[complaint._id] || ''}
                                                onChange={(e) => setFeedbackComments(prev => ({ ...prev, [complaint._id]: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #4b5563',
                                                    backgroundColor: '#111827',
                                                    color: 'white',
                                                    fontSize: '12px',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => handleCitizenFeedback(complaint._id, 'solved')}
                                                style={{ flex: 1, padding: '6px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                            >
                                                Yes, Solved
                                            </button>
                                            <button
                                                onClick={() => handleCitizenFeedback(complaint._id, 'unresolved')}
                                                style={{ flex: 1, padding: '6px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                            >
                                                No, Not Yet
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {complaint.status === 'resolved' && complaint.citizenFeedback && complaint.citizenFeedback !== 'pending' && (
                                    <div style={{
                                        marginTop: '10px',
                                        fontSize: '12px',
                                        padding: '6px 10px',
                                        borderRadius: '4px',
                                        backgroundColor: complaint.citizenFeedback === 'solved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: complaint.citizenFeedback === 'solved' ? '#34d399' : '#f87171',
                                        border: `1px solid ${complaint.citizenFeedback === 'solved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                    }}>
                                        {complaint.citizenFeedback === 'solved' ? '✅ You confirmed it\'s solved' : '❌ You reported it as unresolved'}
                                        {complaint.citizenComments && <div style={{ fontStyle: 'italic', marginTop: '4px', opacity: 0.8 }}>"{complaint.citizenComments}"</div>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="info-box">
                <h3>{t('howItWorks', formData.language)}</h3>
                <ul>
                    <li>{t('step1', formData.language)}</li>
                    <li>{t('step2', formData.language)}</li>
                    <li>{t('step3', formData.language)}</li>
                    <li>{t('step4', formData.language)}</li>
                </ul>
            </div>

            {/* Resolved Feedback View (Modal-like) */}
            {showResolvedFeedback && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#1f2937',
                        width: '100%',
                        maxWidth: '800px',
                        maxHeight: '90vh',
                        borderRadius: '16px',
                        padding: '30px',
                        overflowY: 'auto',
                        position: 'relative',
                        border: '1px solid #374151',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <button
                            onClick={() => setShowResolvedFeedback(false)}
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#9ca3af', fontSize: '24px', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                        <h2 style={{ color: 'white', marginBottom: '10px' }}>✅ Resolved Problems 🏁</h2>
                        <p style={{ color: '#9ca3af', marginBottom: '25px' }}>Please let us know if these issues have been actually resolved to your satisfaction.</p>

                        {history.filter(c => c.status === 'resolved' && c.citizenFeedback === 'pending').length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
                                <p>All caught up! No pending feedback for resolved complaints.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '20px' }}>
                                {history.filter(c => c.status === 'resolved' && c.citizenFeedback === 'pending').map(complaint => (
                                    <div key={complaint._id} style={{
                                        backgroundColor: '#111827',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '1px solid #374151'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span style={{ fontWeight: 'bold', color: '#10b981' }}>{complaint.problemType}</span>
                                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                                {new Date(complaint.resolvedAt!).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '15px' }}>{complaint.description}</p>

                                        <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Additional Comments (Optional):</label>
                                            <textarea
                                                placeholder="..."
                                                rows={2}
                                                value={feedbackComments[complaint._id] || ''}
                                                onChange={(e) => setFeedbackComments(prev => ({ ...prev, [complaint._id]: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #4b5563',
                                                    backgroundColor: '#111827',
                                                    color: 'white',
                                                    fontSize: '14px',
                                                    resize: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={() => handleCitizenFeedback(complaint._id, 'solved')}
                                                style={{ flex: 1, padding: '10px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                                            >
                                                Problem Solved
                                            </button>
                                            <button
                                                onClick={() => handleCitizenFeedback(complaint._id, 'unresolved')}
                                                style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                                            >
                                                Still Not Solved
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </div>
    );
};

export default CitizenPortal;

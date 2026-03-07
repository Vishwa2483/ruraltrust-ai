import React, { useState, useEffect } from 'react';
import {
    getCaptcha,
    citizenSignup,
    citizenRequestOTP,
    citizenVerifyOTP,
    type CaptchaResponse,
} from '../services/authApi';

interface CitizenAuthProps {
    onLoginSuccess: () => void;
}

type Step = 'choice' | 'signup' | 'login';

const CitizenAuth: React.FC<CitizenAuthProps> = ({ onLoginSuccess }) => {
    const [step, setStep] = useState<Step>('choice');
    const [mobile, setMobile] = useState('');
    const [name, setName] = useState('');
    const [village, setVillage] = useState('');
    const [otp, setOtp] = useState('');
    const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null);
    const [captchaAnswer, setCaptchaAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [demoOTP, setDemoOTP] = useState('');
    const [showDemoOTPPopup, setShowDemoOTPPopup] = useState(false);

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

    useEffect(() => {
        if (otpSent) {
            loadCaptcha();
        }
    }, [otpSent]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const loadCaptcha = async () => {
        try {
            const captchaData = await getCaptcha();
            setCaptcha(captchaData);
        } catch (err) {
            setError('Failed to load CAPTCHA');
        }
    };

    const handleSendOTP = async () => {
        setError('');

        if (!mobile || mobile.length !== 10) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        if (step === 'signup' && (!name || !village)) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            let response: any;
            if (step === 'signup') {
                response = await citizenSignup(mobile, name, village);
            } else {
                response = await citizenRequestOTP(mobile);
            }

            // Always show the OTP from backend
            if (response && response.otp) {
                setDemoOTP(response.otp);
                setShowDemoOTPPopup(true);
            }

            setOtpSent(true);
            setCountdown(60);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        setError('');

        if (!otp || !captcha || !captchaAnswer) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            await citizenVerifyOTP(mobile, otp, captcha.captchaId, parseInt(captchaAnswer));
            onLoginSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Verification failed');
            loadCaptcha(); // Reload CAPTCHA on failure
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshCaptcha = () => {
        loadCaptcha();
    };

    if (step === 'choice') {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <h2>👥 Citizen Portal</h2>
                        <p>Login or create your account to submit complaints</p>
                    </div>

                    <div className="auth-choice">
                        <button className="choice-btn signup" onClick={() => setStep('signup')}>
                            <span className="choice-icon">📝</span>
                            <span className="choice-title">New User</span>
                            <span className="choice-desc">Create Account</span>
                        </button>

                        <button className="choice-btn login" onClick={() => setStep('login')}>
                            <span className="choice-icon">🔑</span>
                            <span className="choice-title">Existing User</span>
                            <span className="choice-desc">Login with Mobile</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <button className="back-btn" onClick={() => { setStep('choice'); setOtpSent(false); setError(''); }}>
                    ← Back
                </button>

                <div className="auth-header">
                    <h2>{step === 'signup' ? '📝 Create Account' : '🔑 Login'}</h2>
                    <p>{otpSent ? 'Enter OTP and verify CAPTCHA' : 'Enter your details to continue'}</p>
                </div>

                {!otpSent ? (
                    <div className="auth-form">
                        {step === 'signup' && (
                            <>
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                        autoCorrect="off"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Village *</label>
                                    <select value={village} onChange={(e) => setVillage(e.target.value)}>
                                        <option value="">Select your village</option>
                                        {VILLAGES.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label>Mobile Number *</label>
                            <input
                                type="tel"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="10-digit mobile number"
                                maxLength={10}
                            />
                        </div>

                        {error && <div className="error-message">❌ {error}</div>}

                        <button className="auth-btn" onClick={handleSendOTP} disabled={loading}>
                            {loading ? <span className="spinner"></span> : '📱'} Send OTP
                        </button>
                    </div>
                ) : (
                    <div className="auth-form">
                        <div className="form-group">
                            <label>Enter OTP (sent to {mobile})</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="6-digit OTP"
                                maxLength={6}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoCapitalize="none"
                                autoCorrect="off"
                            />
                            {countdown > 0 ? (
                                <span className="hint-text">Resend OTP in {countdown}s</span>
                            ) : (
                                <button className="link-btn" onClick={() => { setOtpSent(false); setCountdown(0); }}>
                                    Request New OTP
                                </button>
                            )}
                        </div>

                        {captcha && (
                            <div className="form-group captcha-group">
                                <label>Solve CAPTCHA *</label>
                                <div className="captcha-box">
                                    <span className="captcha-question">{captcha.question}</span>
                                    <button className="refresh-btn" onClick={handleRefreshCaptcha} title="Refresh">
                                        🔄
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={captchaAnswer}
                                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                                    placeholder="Your answer"
                                    inputMode="numeric"
                                />
                            </div>
                        )}

                        {error && <div className="error-message">❌ {error}</div>}

                        <button className="auth-btn" onClick={handleVerifyOTP} disabled={loading}>
                            {loading ? <span className="spinner"></span> : '✓'} Verify & Login
                        </button>
                    </div>
                )}
            </div>

            {/* Demo OTP Popup */}
            {showDemoOTPPopup && (
                <div className="modal-overlay" onClick={() => setShowDemoOTPPopup(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowDemoOTPPopup(false)}>×</button>
                        <div className="modal-header">
                            <h3>📱 Your Demo OTP</h3>
                            <p>Development Mode</p>
                        </div>
                        <div className="otp-display">
                            <div className="otp-box">{demoOTP}</div>
                            <p className="otp-hint">Copy this OTP and enter it in the form above</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="copy-btn"
                                onClick={() => {
                                    navigator.clipboard.writeText(demoOTP);
                                    alert('OTP copied to clipboard!');
                                }}
                            >
                                📋 Copy OTP
                            </button>
                            <button
                                className="modal-btn"
                                onClick={() => setShowDemoOTPPopup(false)}
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CitizenAuth;

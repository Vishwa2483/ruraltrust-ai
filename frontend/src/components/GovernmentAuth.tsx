import React, { useState, useRef, useEffect } from 'react';
import { governmentLogin, governmentQRLogin } from '../services/authApi';
import { Html5Qrcode } from 'html5-qrcode';

interface GovernmentAuthProps {
    onLoginSuccess: () => void;
}

type Tab = 'credentials' | 'qr';

const GovernmentAuth: React.FC<GovernmentAuthProps> = ({ onLoginSuccess }) => {
    const [tab, setTab] = useState<Tab>('credentials');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [scanning, setScanning] = useState(false);
    const qrRef = useRef<HTMLDivElement | null>(null);

    const handleLogin = async () => {
        setError('');

        if (!username || !password) {
            setError('Please enter username and password');
            return;
        }

        setLoading(true);

        try {
            await governmentLogin(username, password);
            onLoginSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleScanQR = () => {
        setError('');
        setScanning(true);
    };

    const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            setError('');

            console.log('Uploading QR image:', file.name);
            const html5qrcode = new Html5Qrcode('qr-upload-scanner');
            const decodedText = await html5qrcode.scanFile(file, true);

            console.log('QR Code decoded from image:', decodedText);
            await governmentQRLogin(decodedText);
            await html5qrcode.clear();
            setLoading(false);
            onLoginSuccess();
        } catch (err: any) {
            console.error('QR upload error:', err);
            setError(err?.response?.data?.error || 'Failed to decode QR code from image');
            setLoading(false);
            e.target.value = ''; // Clear file input
        }
    };

    useEffect(() => {
        let html5QrCode: Html5Qrcode | null = null;
        let isActive = true;

        const startScanner = async () => {
            try {
                if (!qrRef.current) {
                    setError('Scanner element not ready');
                    return;
                }

                html5QrCode = new Html5Qrcode('qr-reader');

                const cameras = await Html5Qrcode.getCameras();
                if (!isActive) return;

                if (cameras && cameras.length > 0) {
                    const cameraId = cameras[0].id;
                    await html5QrCode.start(
                        cameraId,
                        { fps: 10, qrbox: 250 },
                        async (decodedText: string) => {
                            console.log('QR Code decoded:', decodedText);
                            try {
                                setLoading(true);
                                await governmentQRLogin(decodedText);
                                if (html5QrCode) {
                                    await html5QrCode.stop();
                                    await html5QrCode.clear();
                                }
                                setScanning(false);
                                setLoading(false);
                                onLoginSuccess();
                            } catch (err: any) {
                                console.error('Login error:', err);
                                setError(err?.response?.data?.error || 'Invalid QR code');
                                try { await html5QrCode?.stop(); } catch { }
                                try { await html5QrCode?.clear(); } catch { }
                                setLoading(false);
                            }
                        },
                        (errorMessage: string) => { void errorMessage; /* Ignore scan errors */ }
                    );
                } else {
                    setError('No camera found. Please upload a QR code image instead.');
                    setScanning(false);
                }
            } catch (err: any) {
                console.error('Scanner error:', err);
                setError('Camera access denied or not available. Please upload an image.');
                setScanning(false);
            }
        };

        if (scanning) {
            startScanner();
        }

        return () => {
            isActive = false;
            if (html5QrCode) {
                (async () => {
                    try {
                        await html5QrCode.stop();
                        await html5QrCode.clear();
                    } catch {
                        // ignore cleanup errors
                    }
                })();
            }
        };
    }, [scanning, onLoginSuccess]);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>🏛️ Government Portal</h2>
                    <p>Login to access the complaint dashboard</p>
                </div>

                <div className="auth-tabs">
                    <button
                        className={`tab ${tab === 'credentials' ? 'active' : ''}`}
                        onClick={() => setTab('credentials')}
                    >
                        🔐 Username & Password
                    </button>
                    <button
                        className={`tab ${tab === 'qr' ? 'active' : ''}`}
                        onClick={() => setTab('qr')}
                    >
                        📱 QR Code
                    </button>
                </div>

                {tab === 'credentials' ? (
                    <div className="auth-form">
                        <div className="form-group">
                            <label>Username *</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                autoCapitalize="none"
                                autoCorrect="off"
                            />
                        </div>

                        <div className="form-group">
                            <label>Password *</label>
                            <div className="password-input">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                />
                                <button
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        {error && <div className="error-message">❌ {error}</div>}

                        <button className="auth-btn" onClick={handleLogin} disabled={loading}>
                            {loading ? <span className="spinner"></span> : '🔑'} Login
                        </button>
                    </div>
                ) : (
                    <div className="auth-form">
                        <p className="qr-instructions">
                            Choose one of the following options to login:
                        </p>

                        <button className="auth-btn" onClick={handleScanQR} style={{ marginBottom: '15px' }}>
                            📷 Open Camera & Scan
                        </button>

                        <p className="qr-instructions" style={{ marginTop: '15px', marginBottom: '15px', fontSize: '14px', opacity: 0.7 }}>
                            — OR —
                        </p>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '500' }}>
                                📤 Upload QR Code Image:
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleQRUpload}
                                disabled={loading}
                                style={{ width: '100%' }}
                            />
                        </div>

                        {error && <div className="error-message">❌ {error}</div>}
                    </div>
                )}

                {/* Scanner Modal Popup */}
                {scanning && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999
                    }} onClick={() => setScanning(false)}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            padding: '20px',
                            maxWidth: '500px',
                            width: '90%',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                            position: 'relative'
                        }} onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setScanning(false)}
                                style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#666'
                                }}
                            >
                                ✕
                            </button>

                            <h3 style={{ marginTop: 0, marginBottom: '15px', textAlign: 'center' }}>📱 Scan QR Code</h3>

                            {loading && <div style={{ textAlign: 'center', padding: '20px' }}>
                                <span className="spinner" style={{ marginRight: '10px' }}></span>
                                Processing...
                            </div>}

                            <div id="qr-reader" ref={qrRef} style={{ width: '100%', minHeight: '400px', opacity: loading ? 0.5 : 1 }}></div>

                            {error && <div className="error-message" style={{ marginTop: '15px' }}>❌ {error}</div>}
                        </div>
                    </div>
                )}

                {/* Hidden scanner element for file uploads */}
                <div id="qr-upload-scanner" style={{ display: 'none' }}></div>
            </div>
        </div>
    );
};

export default GovernmentAuth;

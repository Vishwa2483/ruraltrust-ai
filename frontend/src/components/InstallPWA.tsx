import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    useEffect(() => {
        // Detect iOS
        const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
        const standalone = (window.navigator as any).standalone;
        setIsIOS(ios);

        // Check if user already dismissed the banner
        const isDismissed = localStorage.getItem('pwa_banner_dismissed') === 'true';

        // Check if already installed (standalone mode)
        if (standalone || window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Show banner after 3 seconds if not dismissed
        const timer = setTimeout(() => {
            if (!isDismissed) setShowBanner(true);
        }, 3000);

        // Capture install prompt for Android/Desktop
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
            if (!isDismissed) setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowBanner(false);
            localStorage.setItem('pwa_banner_dismissed', 'true');
        });

        return () => {
            clearTimeout(timer);
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (isIOS) {
            setShowIOSGuide(true);
            return;
        }
        if (!installPrompt) return;
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
            setShowBanner(false);
            localStorage.setItem('pwa_banner_dismissed', 'true');
        }
        setInstallPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa_banner_dismissed', 'true');
    };

    if (isInstalled || !showBanner) return null;

    return (
        <>
            {/* Install Banner */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                border: '1px solid rgba(99,102,241,0.4)',
                borderRadius: '16px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)',
                backdropFilter: 'blur(12px)',
                minWidth: '320px',
                maxWidth: '480px',
                animation: 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
                <style>{`
                    @keyframes slideUp {
                        from { transform: translateX(-50%) translateY(100px); opacity: 0; }
                        to { transform: translateX(-50%) translateY(0); opacity: 1; }
                    }
                    .install-btn:hover { transform: scale(1.03); box-shadow: 0 4px 20px rgba(99,102,241,0.5) !important; }
                    .dismiss-btn:hover { background: rgba(255,255,255,0.1) !important; }
                `}</style>

                {/* App Icon */}
                <div style={{
                    width: '48px', height: '48px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', flexShrink: 0,
                    boxShadow: '0 0 16px rgba(99,102,241,0.4)',
                }}>🌱</div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>
                        Install RuralTrust AI
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>
                        {isIOS ? 'Add to Home Screen for offline access' : 'Install as desktop/mobile app — free'}
                    </div>
                </div>

                {/* Install Button */}
                <button
                    onClick={handleInstall}
                    className="install-btn"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                    }}
                >
                    {isIOS ? 'How to' : '⬇ Install'}
                </button>

                {/* Dismiss */}
                <button
                    onClick={handleDismiss}
                    className="dismiss-btn"
                    style={{
                        background: 'transparent',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 8px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                    }}
                    title="Dismiss"
                >×</button>
            </div>

            {/* iOS Guide Modal */}
            {showIOSGuide && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px',
                }}
                    onClick={() => setShowIOSGuide(false)}
                >
                    <div style={{
                        background: '#1e293b',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: '20px',
                        padding: '28px',
                        maxWidth: '340px',
                        width: '100%',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                    }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ color: '#f1f5f9', margin: '0 0 20px 0', fontSize: '18px', fontWeight: 700 }}>
                            📱 Install on iPhone/iPad
                        </h3>
                        {[
                            { icon: '1️⃣', text: 'Tap the Share button at the bottom of Safari (📤)' },
                            { icon: '2️⃣', text: 'Scroll down and tap "Add to Home Screen"' },
                            { icon: '3️⃣', text: 'Tap "Add" in the top right corner' },
                            { icon: '✅', text: 'RuralTrust AI icon will appear on your home screen!' },
                        ].map((step, i) => (
                            <div key={i} style={{
                                display: 'flex', gap: '12px', marginBottom: '14px',
                                alignItems: 'flex-start',
                            }}>
                                <span style={{ fontSize: '20px', flexShrink: 0 }}>{step.icon}</span>
                                <span style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>{step.text}</span>
                            </div>
                        ))}
                        <button
                            onClick={() => setShowIOSGuide(false)}
                            style={{
                                width: '100%', marginTop: '8px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: 'white', border: 'none', borderRadius: '12px',
                                padding: '12px', fontSize: '14px', fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >Got it!</button>
                    </div>
                </div>
            )}
        </>
    );
}

import React, { useState } from 'react';
import { getToken } from '../services/authApi';

interface SimulationResult {
    policyTarget: string;
    impactScore: number;
    primaryMetric: {
        label: string;
        change: string;
        trend: 'up' | 'down' | 'neutral';
    };
    secondaryMetrics: Array<{
        label: string;
        change: string;
        trend: 'up' | 'down' | 'neutral';
    }>;
    analysis: string;
}

const PolicySimulator: React.FC = () => {
    const [policyAction, setPolicyAction] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSimulate = async () => {
        if (!policyAction.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const token = getToken();
            const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/analytics/simulate-policy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ policyAction })
            });

            if (response.status === 401 || response.status === 403) {
                setError('Session expired — please log out and log back in.');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to simulate policy impact');
            }

            const data: SimulationResult = await response.json();
            setResult(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error communicating with AI Simulator');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="policy-simulator-panel" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            marginTop: '2rem',
            boxShadow: 'var(--shadow-md)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2rem' }}>🔮</span>
                <div>
                    <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        AI Policy Impact Simulator
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Test decisions before implementation using simulation-based governance.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <input
                    type="text"
                    placeholder="E.g., Add 10 garbage bins in Ward 3..."
                    value={policyAction}
                    onChange={(e) => setPolicyAction(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                    style={{
                        flex: 1,
                        background: 'var(--bg-tertiary)',
                        border: '2px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                    }}
                />
                <button
                    onClick={handleSimulate}
                    disabled={loading || !policyAction.trim()}
                    style={{
                        background: 'var(--accent-gradient)',
                        border: 'none',
                        color: 'white',
                        padding: '0 2rem',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading || !policyAction.trim() ? 0.7 : 1,
                        transition: 'var(--transition)'
                    }}
                >
                    {loading ? 'Simulating...' : 'Run Simulation'}
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    ⚠️ {error}
                </div>
            )}

            {result && (
                <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* Primary Metric */}
                        <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', borderTop: '4px solid var(--accent-primary)' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Expected Impact: {result.policyTarget}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: result.primaryMetric.trend === 'down' ? 'var(--success)' : (result.primaryMetric.trend === 'up' ? 'var(--info)' : 'var(--warning)') }}>
                                    {result.primaryMetric.change}
                                </span>
                                <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{result.primaryMetric.label}</span>
                            </div>
                        </div>

                        {/* Secondary Metrics */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {result.secondaryMetrics.map((metric, idx) => (
                                <div key={idx} style={{ background: 'var(--bg-tertiary)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{metric.label}</span>
                                    <span style={{ fontWeight: 700, color: metric.trend === 'up' ? 'var(--success)' : (metric.trend === 'down' ? 'var(--info)' : 'var(--warning)') }}>
                                        {metric.change}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>🧠</span> AI Analysis (Impact Score: {result.impactScore}/100)
                        </h4>
                        <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                            {result.analysis}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PolicySimulator;

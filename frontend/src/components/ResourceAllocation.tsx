import React, { useEffect, useState } from 'react';
import { getToken } from '../services/authApi';

interface ZoneRecommendation {
    village: string;
    category: string;
    complaintCount: number;
    avgUrgency: number;
    avgResolutionDays: number;
    duplicateCount: number;
    resourceScore: number;
    priority: 'High' | 'Medium' | 'Low';
    recommendedTeams: number;
    actionText: string;
    reason: string;
}

interface ResourceAllocationData {
    recommendations: ZoneRecommendation[];
    totalTeamsNeeded: number;
    criticalZones: number;
    generatedAt: string;
}

const PRIORITY_COLORS = {
    High: { bg: '#7f1d1d', border: '#ef4444', text: '#fca5a5', badge: '#dc2626' },
    Medium: { bg: '#7c2d12', border: '#f97316', text: '#fed7aa', badge: '#ea580c' },
    Low: { bg: '#1e3a5f', border: '#3b82f6', text: '#bfdbfe', badge: '#2563eb' },
};

const CATEGORY_ICONS: Record<string, string> = {
    'Water Supply': '💧',
    'Sanitation': '🚽',
    'Road Damage': '🛣️',
    'Electricity': '⚡',
    'Healthcare': '🏥',
    'Street Lights': '🔦',
    'Waste Management': '♻️',
};

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const ResourceAllocation: React.FC = () => {
    const [data, setData] = useState<ResourceAllocationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [selectedPriority, setSelectedPriority] = useState<'High' | 'Medium' | 'Low' | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken();
            const res = await fetch(`${BASE_URL}/analytics/resource-allocation`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) {
                setError('Session expired — please log out and log back in.');
                return;
            }
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const json = await res.json();
            setData(json);
            setLastRefresh(new Date());
        } catch (e: any) {
            setError('Failed to load resource allocation data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const cardStyle = (priority: 'High' | 'Medium' | 'Low') => ({
        backgroundColor: PRIORITY_COLORS[priority].bg,
        border: `1px solid ${PRIORITY_COLORS[priority].border}`,
        borderLeft: `5px solid ${PRIORITY_COLORS[priority].border}`,
        borderRadius: '10px',
        padding: '16px',
        flex: '1 1 300px',
        minWidth: '280px',
        transition: 'transform 0.15s ease',
    });

    return (
        <div style={{
            backgroundColor: '#111827',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '30px',
            border: '2px solid #374151',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ color: '#f3f4f6', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        🤖 AI Resource Allocation
                        <span style={{ fontSize: '0.65em', fontWeight: 'normal', color: '#9ca3af', backgroundColor: '#1f2937', padding: '3px 8px', borderRadius: '12px', border: '1px solid #374151' }}>
                            Decision Support AI
                        </span>
                    </h2>
                    <p style={{ color: '#6b7280', margin: '6px 0 0', fontSize: '0.875rem' }}>
                        AI-computed deployment recommendations based on complaint volume, urgency & resolution history
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: '#f3f4f6', cursor: 'pointer', fontSize: '14px' }}
                >
                    🔄 Refresh
                </button>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚙️</div>
                    Computing resource scores...
                </div>
            )}

            {error && (
                <div style={{ backgroundColor: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '8px', padding: '16px', color: '#fca5a5', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            {!loading && !error && data && (
                <>
                    {/* ── Summary KPI Bar ── */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 140px', backgroundColor: '#1f2937', borderRadius: '8px', padding: '14px', border: '1px solid #374151', textAlign: 'center' }}>
                            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#ef4444' }}>{data.criticalZones}</div>
                            <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>🚨 Displayed Zones</div>
                        </div>
                        <div style={{ flex: '1 1 140px', backgroundColor: '#1f2937', borderRadius: '8px', padding: '14px', border: '1px solid #374151', textAlign: 'center' }}>
                            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#a78bfa' }}>{data.recommendations.length}</div>
                            <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>📍 Priority Zones</div>
                        </div>
                        <div style={{ flex: '1 1 140px', backgroundColor: '#1f2937', borderRadius: '8px', padding: '14px', border: '1px solid #374151', textAlign: 'center' }}>
                            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#34d399' }}>{data.totalTeamsNeeded}</div>
                            <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>👷 Teams Required</div>
                        </div>
                        <div style={{ flex: '2 1 200px', backgroundColor: '#1f2937', borderRadius: '8px', padding: '14px', border: '1px solid #374151' }}>
                            <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Formula</div>
                            <code style={{ color: '#a78bfa', fontSize: '0.8rem' }}>
                                Score = (avg_urgency × complaints) / resolution_days + duplicate_boost
                            </code>
                            <div style={{ color: '#6b7280', fontSize: '0.7rem', marginTop: '4px' }}>
                                Last updated: {lastRefresh.toLocaleTimeString('en-IN')}
                            </div>
                        </div>
                    </div>

                    {data.recommendations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280', fontStyle: 'italic' }}>
                            ✅ No active complaints — no resource deployment required.
                        </div>
                    ) : (
                        <>
                            {/* ── Priority Zones Grid ── */}
                            <h3 style={{ color: '#f3f4f6', marginTop: 0, marginBottom: '16px' }}>🚨 Priority Zones</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '30px' }}>
                                {data.recommendations.map((zone, idx) => (
                                    <div key={idx} style={cardStyle(zone.priority)}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                            <div>
                                                <span style={{ fontSize: '1.2em' }}>{CATEGORY_ICONS[zone.category] || '📋'}</span>
                                                <span style={{ color: PRIORITY_COLORS[zone.priority].text, fontWeight: 700, marginLeft: '6px', fontSize: '1em' }}>
                                                    {zone.category}
                                                </span>
                                                <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '2px' }}>📍 {zone.village}</div>
                                            </div>
                                            <span style={{
                                                backgroundColor: PRIORITY_COLORS[zone.priority].badge,
                                                color: 'white',
                                                padding: '3px 10px',
                                                borderRadius: '12px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {zone.priority}
                                            </span>
                                        </div>

                                        {/* Score bar */}
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>
                                                <span>Resource Score</span>
                                                <span style={{ fontWeight: 700, color: PRIORITY_COLORS[zone.priority].text }}>{zone.resourceScore.toFixed(1)}</span>
                                            </div>
                                            <div style={{ height: '6px', backgroundColor: '#1f2937', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${Math.min(100, (zone.resourceScore / 30) * 100)}%`,
                                                    backgroundColor: PRIORITY_COLORS[zone.priority].border,
                                                    borderRadius: '3px',
                                                    transition: 'width 0.4s ease'
                                                }} />
                                            </div>
                                        </div>

                                        {/* Quick stats */}
                                        <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#9ca3af', flexWrap: 'wrap' }}>
                                            <span>📊 {zone.complaintCount} complaints</span>
                                            <span>⚡ Urgency {zone.avgUrgency}/10</span>
                                            {zone.duplicateCount > 0 && <span>🧩 {zone.duplicateCount} duplicates</span>}
                                            <span>⏱ {zone.avgResolutionDays}d avg</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Recommended Actions ── */}
                            <h3 style={{ color: '#f3f4f6', marginTop: 0, marginBottom: '16px' }}>✅ Recommended Actions</h3>
                            <div style={{ backgroundColor: '#1f2937', borderRadius: '10px', overflow: 'hidden', border: '1px solid #374151', marginBottom: '30px' }}>
                                {data.recommendations.map((zone, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '16px',
                                        padding: '14px 18px',
                                        borderBottom: idx < data.recommendations.length - 1 ? '1px solid #374151' : 'none',
                                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                                    }}>
                                        <div style={{
                                            minWidth: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            backgroundColor: PRIORITY_COLORS[zone.priority].badge,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem',
                                            color: 'white',
                                            flexShrink: 0
                                        }}>
                                            {idx + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ color: '#f3f4f6', fontWeight: 600, marginBottom: '4px' }}>
                                                {CATEGORY_ICONS[zone.category] || '📋'} {zone.actionText}
                                            </div>
                                            <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                                                💡 {zone.reason}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#34d399' }}>{zone.recommendedTeams}</div>
                                            <div style={{ color: '#6b7280', fontSize: '0.7rem' }}>teams</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Workforce Summary ── */}
                            <h3 style={{ color: '#f3f4f6', marginTop: 0, marginBottom: '16px' }}>👷 AI Resource Allocation Controls</h3>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '30px' }}>
                                {(['High', 'Medium', 'Low'] as const).map(level => {
                                    const zones = data.recommendations.filter(r => r.priority === level);
                                    return (
                                        <button
                                            key={level}
                                            onClick={() => setSelectedPriority(level)}
                                            style={{
                                                flex: '1 1 160px',
                                                backgroundColor: selectedPriority === level ? PRIORITY_COLORS[level].badge : PRIORITY_COLORS[level].bg,
                                                border: `2px solid ${PRIORITY_COLORS[level].border}`,
                                                borderRadius: '12px',
                                                padding: '20px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                transform: selectedPriority === level ? 'scale(1.05)' : 'scale(1)',
                                                boxShadow: selectedPriority === level ? `0 0 15px ${PRIORITY_COLORS[level].border}` : 'none'
                                            }}
                                        >
                                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem', marginBottom: '4px' }}>{level} Priority</div>
                                            <div style={{ color: PRIORITY_COLORS[level].text, fontSize: '0.8rem' }}>
                                                {zones.length} Zones Detected
                                            </div>
                                            <div style={{ color: '#fff', fontSize: '0.7rem', marginTop: '8px', fontStyle: 'italic' }}>
                                                Click for details
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Modal Popup */}
                            {selectedPriority && (
                                <div style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0,0,0,0.85)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1000,
                                    backdropFilter: 'blur(5px)'
                                }}>
                                    <div style={{
                                        backgroundColor: '#1f2937',
                                        borderRadius: '16px',
                                        width: '90%',
                                        maxWidth: '800px',
                                        maxHeight: '85vh',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        border: `2px solid ${PRIORITY_COLORS[selectedPriority].border}`,
                                        boxShadow: `0 0 30px ${PRIORITY_COLORS[selectedPriority].border}33`
                                    }}>
                                        {/* Modal Header */}
                                        <div style={{
                                            padding: '20px 24px',
                                            backgroundColor: PRIORITY_COLORS[selectedPriority].bg,
                                            borderBottom: `1px solid ${PRIORITY_COLORS[selectedPriority].border}`,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <h2 style={{ color: '#fff', margin: 0 }}>
                                                    🚨 {selectedPriority} Priority Recommendations
                                                </h2>
                                                <p style={{ color: PRIORITY_COLORS[selectedPriority].text, margin: '4px 0 0', fontSize: '0.9rem' }}>
                                                    Immediate actions required for {selectedPriority.toLowerCase()} risk zones
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedPriority(null)}
                                                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '24px', cursor: 'pointer' }}
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {/* Modal Body */}
                                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                                            {data.recommendations.filter(r => r.priority === selectedPriority).length === 0 ? (
                                                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                                                    No {selectedPriority.toLowerCase()} priority zones detected.
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gap: '20px' }}>
                                                    {data.recommendations.filter(r => r.priority === selectedPriority).map((zone, idx) => (
                                                        <div key={idx} style={{
                                                            backgroundColor: '#111827',
                                                            borderRadius: '12px',
                                                            padding: '20px',
                                                            border: `1px solid ${PRIORITY_COLORS[selectedPriority].border}44`,
                                                            display: 'flex',
                                                            gap: '20px'
                                                        }}>
                                                            <div style={{
                                                                width: '50px',
                                                                height: '50px',
                                                                backgroundColor: PRIORITY_COLORS[selectedPriority].bg,
                                                                borderRadius: '10px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '1.8rem',
                                                                flexShrink: 0
                                                            }}>
                                                                {CATEGORY_ICONS[zone.category] || '📋'}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                    <h4 style={{ margin: 0, color: '#f3f4f6', fontSize: '1.2rem' }}>{zone.village} - {zone.category}</h4>
                                                                    <div style={{ color: '#34d399', fontWeight: 'bold' }}>{zone.recommendedTeams} Teams</div>
                                                                </div>
                                                                <div style={{ color: '#ec4899', fontWeight: 600, marginBottom: '8px', fontSize: '0.95rem' }}>
                                                                    ⚡ Action: {zone.actionText}
                                                                </div>
                                                                <div style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                                                    <strong>Reasoning:</strong> {zone.reason}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '20px', marginTop: '12px', borderTop: '1px solid #374151', paddingTop: '12px' }}>
                                                                    <div style={{ textAlign: 'center' }}>
                                                                        <div style={{ color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase' }}>Score</div>
                                                                        <div style={{ color: '#fff', fontWeight: 700 }}>{zone.resourceScore.toFixed(1)}</div>
                                                                    </div>
                                                                    <div style={{ textAlign: 'center' }}>
                                                                        <div style={{ color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase' }}>Reports</div>
                                                                        <div style={{ color: '#fff', fontWeight: 700 }}>{zone.complaintCount}</div>
                                                                    </div>
                                                                    <div style={{ textAlign: 'center' }}>
                                                                        <div style={{ color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase' }}>Avg Urgency</div>
                                                                        <div style={{ color: '#fff', fontWeight: 700 }}>{zone.avgUrgency}/10</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Modal Footer */}
                                        <div style={{ padding: '16px 24px', backgroundColor: '#111827', borderTop: '1px solid #374151', textAlign: 'right' }}>
                                            <button
                                                onClick={() => setSelectedPriority(null)}
                                                style={{
                                                    padding: '10px 24px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#374151',
                                                    color: '#fff',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '20px' }}>
                                {/* ── Workforce Summary ── */}
                                <h3 style={{ color: '#f3f4f6', marginTop: 0, marginBottom: '16px' }}>👷 Workforce Requirement Summary</h3>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    {(['High', 'Medium', 'Low'] as const).map(level => {
                                        const zones = data.recommendations.filter(r => r.priority === level);
                                        const teams = zones.reduce((sum, r) => sum + r.recommendedTeams, 0);
                                        if (zones.length === 0) return null;
                                        return (
                                            <div key={level} style={{
                                                flex: '1 1 160px',
                                                backgroundColor: PRIORITY_COLORS[level].bg,
                                                border: `1px solid ${PRIORITY_COLORS[level].border}`,
                                                borderRadius: '8px',
                                                padding: '16px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: PRIORITY_COLORS[level].text }}>{teams}</div>
                                                <div style={{ color: PRIORITY_COLORS[level].text, fontWeight: 600 }}>{level} Zone Teams</div>
                                                <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '4px' }}>{zones.length} zone{zones.length > 1 ? 's' : ''}</div>
                                            </div>
                                        );
                                    })}
                                    <div style={{
                                        flex: '1 1 160px',
                                        backgroundColor: '#0f172a',
                                        border: '2px solid #a78bfa',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#a78bfa' }}>{data.totalTeamsNeeded}</div>
                                        <div style={{ color: '#a78bfa', fontWeight: 600 }}>Total Teams</div>
                                        <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px' }}>across all zones</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default ResourceAllocation;

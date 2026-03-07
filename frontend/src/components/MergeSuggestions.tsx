import React, { useState, useEffect } from 'react';
import { getToken } from '../services/authApi';

interface MergeGroup {
    village: string;
    problemType: string;
    count: number;
    complaintIds: string[];
    maxUrgency: number;
    priority: string;
    latestDate: string;
}

interface Props {
    onMergeResolved?: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const MergeSuggestions: React.FC<Props> = ({ onMergeResolved }) => {
    const [suggestions, setSuggestions] = useState<MergeGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [mergingKey, setMergingKey] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const fetchSuggestions = async () => {
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/analytics/merge-suggestions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            setSuggestions(data.suggestions || []);
        } catch {
            // silently ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuggestions();
    }, []);

    const handleMergeResolve = async (group: MergeGroup) => {
        const key = `${group.village}-${group.problemType}`;
        if (!window.confirm(`Merge & resolve all ${group.count} "${group.problemType}" complaints in ${group.village}?`)) return;
        setMergingKey(key);
        try {
            const token = getToken();
            await Promise.all(
                group.complaintIds.map(id =>
                    fetch(`${API_BASE}/complaints/${id}/resolve`, {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${token}` }
                    })
                )
            );
            setSuggestions(prev => prev.filter(s => !(s.village === group.village && s.problemType === group.problemType)));
            setSuccessMsg(`✅ Merged & resolved ${group.count} complaints for "${group.problemType}" in ${group.village}`);
            setTimeout(() => setSuccessMsg(null), 5000);
            onMergeResolved?.();
        } catch {
            alert('Failed to merge complaints. Please try again.');
        } finally {
            setMergingKey(null);
        }
    };

    const getPriorityColor = (priority: string) => {
        if (priority === 'High') return '#ef4444';
        if (priority === 'Medium') return '#f59e0b';
        return '#10b981';
    };

    if (loading || suggestions.length === 0) return null;

    return (
        <div style={{
            marginBottom: '24px',
            borderRadius: '12px',
            border: '1px solid #7c3aed',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #1f2937 100%)',
            boxShadow: '0 4px 20px rgba(124, 58, 237, 0.2)'
        }}>
            {/* Header */}
            <div
                onClick={() => setCollapsed(c => !c)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)',
                    userSelect: 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>🔀</span>
                    <div>
                        <div style={{ fontWeight: '700', color: '#ede9fe', fontSize: '15px', letterSpacing: '0.02em' }}>
                            Smart Complaint Merge Suggestions
                        </div>
                        <div style={{ color: '#c4b5fd', fontSize: '12px', marginTop: '2px' }}>
                            AI detected {suggestions.length} group{suggestions.length > 1 ? 's' : ''} of related complaints — merging improves efficiency
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        background: '#7c3aed',
                        color: '#ede9fe',
                        borderRadius: '20px',
                        padding: '3px 12px',
                        fontSize: '13px',
                        fontWeight: '700'
                    }}>
                        {suggestions.reduce((a, s) => a + s.count, 0)} complaints
                    </span>
                    <span style={{ color: '#c4b5fd', fontSize: '18px' }}>{collapsed ? '▶' : '▼'}</span>
                </div>
            </div>

            {/* Success message */}
            {successMsg && (
                <div style={{
                    background: '#064e3b',
                    color: '#a7f3d0',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    borderBottom: '1px solid #065f46'
                }}>
                    {successMsg}
                </div>
            )}

            {/* Suggestion cards */}
            {!collapsed && (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {suggestions.map(group => {
                        const key = `${group.village}-${group.problemType}`;
                        const isMerging = mergingKey === key;
                        return (
                            <div key={key} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: '#111827',
                                border: '1px solid #374151',
                                gap: '16px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                    {/* Count badge */}
                                    <div style={{
                                        minWidth: '52px',
                                        height: '52px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 0 12px rgba(124,58,237,0.4)'
                                    }}>
                                        <span style={{ color: '#fff', fontSize: '18px', fontWeight: '800', lineHeight: 1 }}>{group.count}</span>
                                        <span style={{ color: '#c4b5fd', fontSize: '9px', lineHeight: 1.2 }}>complaints</span>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '700', color: '#f9fafb', fontSize: '14px' }}>
                                            {group.problemType}
                                        </div>
                                        <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>
                                            📍 {group.village}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                background: getPriorityColor(group.priority) + '22',
                                                border: `1px solid ${getPriorityColor(group.priority)}66`,
                                                color: getPriorityColor(group.priority),
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: '600'
                                            }}>
                                                {group.priority}
                                            </span>
                                            <span style={{
                                                background: '#1f2937',
                                                border: '1px solid #374151',
                                                color: '#d1d5db',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px'
                                            }}>
                                                Urgency {group.maxUrgency}/10
                                            </span>
                                            <span style={{
                                                background: '#065f46',
                                                color: '#6ee7b7',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: '600'
                                            }}>
                                                ✓ Merge Recommended
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleMergeResolve(group)}
                                    disabled={isMerging}
                                    style={{
                                        padding: '9px 18px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: isMerging
                                            ? '#4b5563'
                                            : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                        color: '#fff',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        cursor: isMerging ? 'not-allowed' : 'pointer',
                                        whiteSpace: 'nowrap',
                                        boxShadow: isMerging ? 'none' : '0 2px 10px rgba(124,58,237,0.4)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isMerging ? '⏳ Resolving...' : '🔀 Merge & Resolve All'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MergeSuggestions;

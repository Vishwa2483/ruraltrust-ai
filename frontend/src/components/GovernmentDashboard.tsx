import React, { useState, useEffect } from 'react';
import { getActiveComplaints, resolveComplaint, rejectComplaint, reopenComplaint, getUnresolvedByCitizens, Complaint } from '../services/api';
import { getUser, logout, type GovernmentUser } from '../services/authApi';
import GovernmentAuth from './GovernmentAuth';
import ComplaintAnalytics from './ComplaintAnalytics';
import PolicySimulator from './PolicySimulator';
import MergeSuggestions from './MergeSuggestions';
import './GovernmentDashboard.css';

const GovernmentDashboard: React.FC = () => {
    const [user, setUser] = useState<GovernmentUser | null>(getUser() as GovernmentUser);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showUnresolvedModal, setShowUnresolvedModal] = useState(false);
    const [unresolvedComplaints, setUnresolvedComplaints] = useState<Complaint[]>([]);

    // Navigation and Accordion state
    const [activeSidebarItem, setActiveSidebarItem] = useState('overview');
    const [expandedVillages, setExpandedVillages] = useState<Record<string, boolean>>({});

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const data = await getActiveComplaints();
            setComplaints(data);

            const unresolved = await getUnresolvedByCitizens();
            setUnresolvedComplaints(unresolved || []);

            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load complaints');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchComplaints(); }, []);

    const handleResolve = async (id: string) => {
        const complaint = complaints.find(c => c._id === id);
        if (!complaint) return;
        const similarComplaints = complaints.filter(c =>
            c.village === complaint.village &&
            c.problemType.toLowerCase() === complaint.problemType.toLowerCase() &&
            c.status === 'active'
        );
        const complaintCount = similarComplaints.length;
        const confirmMessage = complaintCount > 1
            ? `This will resolve ${complaintCount} complaints for "${complaint.problemType}" in ${complaint.village}. Continue?`
            : 'Are you sure you want to mark this complaint as resolved?';
        if (!window.confirm(confirmMessage)) return;

        setResolvingId(id);
        try {
            await Promise.all(similarComplaints.map(c => resolveComplaint(c._id)));

            // Remove resolved complaints from current state
            setComplaints(prev => prev.filter(c =>
                !(c.village === complaint.village &&
                    c.problemType.toLowerCase() === complaint.problemType.toLowerCase())
            ));

            const message = complaintCount > 1
                ? `✅ Resolved ${complaintCount} similar complaints for "${complaint.problemType}" in ${complaint.village}!`
                : '✅ Complaint resolved successfully!';
            setSuccessMessage(message);

            // Refetch to ensure everything is in sync (e.g. if some other item changed)
            setTimeout(() => {
                fetchComplaints();
                setSuccessMessage(null);
            }, 3000);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to resolve complaint');
            fetchComplaints(); // Refresh anyway if something went wrong
        } finally {
            setResolvingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!window.confirm('Reject this complaint? AI will generate rejection feedback.')) return;
        setRejectingId(id);
        try {
            await rejectComplaint(id);
            setComplaints(complaints.filter(c => c._id !== id));
            setSuccessMessage('✅ Complaint rejected and moved to Complaint History');
            setTimeout(() => setSuccessMessage(null), 6000);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to reject complaint');
        } finally {
            setRejectingId(null);
        }
    };

    const handleReopenComplaint = async (id: string) => {
        try {
            await reopenComplaint(id);
            setSuccessMessage('✅ Complaint reopened and moved to Active Dashboard');
            setTimeout(() => setSuccessMessage(null), 6000);

            // Remove from unresolved modal list
            setUnresolvedComplaints(unresolvedComplaints.filter(c => c._id !== id));

            // Refetch complaints so it shows up in dashboard
            fetchComplaints();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to reopen complaint');
        }
    };

    const getPriorityColor = (priority: string): string => {
        switch (priority) {
            case 'High': return '#ef4444';
            case 'Medium': return '#f59e0b';
            case 'Low': return '#10b981';
            default: return '#6b7280';
        }
    };

    const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

    const handleProvideFeedback = async (complaintId: string, feedback: 'accurate' | 'inaccurate' | 'needs_revision') => {
        try {
            const token = localStorage.getItem('ruraltrust_token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/complaints/${complaintId}/feedback`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ feedback })
            });
            if (response.ok) {
                const result = await response.json();
                setComplaints(complaints.map(c => c._id === complaintId ? result.complaint : c));
                alert(`✅ Feedback recorded: ${feedback}`);
            } else {
                const error = await response.json();
                alert(`❌ Error: ${error.error || 'Failed to record feedback'}`);
            }
        } catch {
            alert('❌ Network error. Please try again.');
        }
    };

    const handleLoginSuccess = () => {
        setUser(getUser() as GovernmentUser);
        fetchComplaints();
    };

    const handleLogout = () => { logout(); setUser(null); };

    if (!user || (user.type !== 'government' && user.type !== 'admin')) {
        return <GovernmentAuth onLoginSuccess={handleLoginSuccess} />;
    }
    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading complaints...</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="dashboard-error">
                <p>❌ {error}</p>
                <button onClick={fetchComplaints} className="retry-btn">Retry</button>
            </div>
        );
    }

    // Use all complaints
    let filteredList = complaints;

    // Group active complaints by village (sorted alphabetically)
    const villageGroups: Record<string, Complaint[]> = {};
    filteredList.forEach(c => {
        if (!villageGroups[c.village]) villageGroups[c.village] = [];
        villageGroups[c.village].push(c);
    });
    const sortedVillages = Object.keys(villageGroups).sort();

    // Complaint row renderer (shared for each village table)
    const renderComplaintRow = (complaint: Complaint) => (
        <React.Fragment key={complaint._id}>
            <tr className={`complaint-row ${expandedId === complaint._id ? 'expanded' : ''}`}>
                <td className="citizen-name">
                    {complaint.citizenId && typeof complaint.citizenId !== 'string'
                        ? complaint.citizenId.name : 'N/A'}
                </td>
                <td className="mobile-cell">
                    {complaint.citizenId && typeof complaint.citizenId !== 'string'
                        ? complaint.citizenId.mobile : 'N/A'}
                </td>
                <td style={{ maxWidth: '220px' }}>
                    {complaint.problemTypes && complaint.problemTypes.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {complaint.problemTypes.map((pt, idx) => (
                                <span key={idx} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    padding: '4px 8px', borderRadius: '4px',
                                    backgroundColor: idx === 0 ? '#374151' : '#1f2937',
                                    border: idx === 0 ? '1px solid #60a5fa' : '1px solid #4b5563',
                                    fontSize: '11px', fontWeight: idx === 0 ? '600' : '500', color: '#f3f4f6'
                                }}>
                                    {idx === 0 && '🔥'} {pt.category}
                                    <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '2px' }}>
                                        {(pt.confidence * 100).toFixed(0)}%
                                    </span>
                                </span>
                            ))}
                        </div>
                    ) : complaint.problemType}
                    {complaint.autoCorrected && (
                        <div title={complaint.correctionReason || 'AI corrected based on image analysis'} style={{
                            marginTop: '6px', backgroundColor: '#3b82f6', color: 'white',
                            padding: '3px 8px', borderRadius: '4px', fontSize: '10px',
                            fontWeight: '600', display: 'inline-block', cursor: 'help'
                        }}>
                            🤖 Auto-corrected
                        </div>
                    )}
                    {complaint.citizenFeedback === 'unresolved' && (
                        <div style={{
                            marginTop: '6px', backgroundColor: '#991b1b', color: '#fca5a5',
                            padding: '3px 8px', borderRadius: '4px', fontSize: '10px',
                            fontWeight: '600', display: 'inline-block', border: '1px solid #dc2626'
                        }}>
                            ⚠️ Citizen Unresolved
                        </div>
                    )}
                </td>
                <td>
                    <span className="priority-badge" style={{ backgroundColor: getPriorityColor(complaint.priority) }}>
                        {complaint.priority}
                        {complaint.priorityScore !== undefined && (
                            <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.9, fontWeight: '400' }}>
                                ({(complaint.priorityScore * 100).toFixed(0)}%)
                            </span>
                        )}
                    </span>
                </td>
                <td>
                    <div className="urgency-indicator">
                        <div className="urgency-bar">
                            <div className="urgency-fill" style={{
                                width: `${complaint.urgency * 10}%`,
                                backgroundColor: getPriorityColor(complaint.priority)
                            }} />
                        </div>
                        <span className="urgency-score">{complaint.urgency}/10</span>
                    </div>
                </td>
                <td className="eta-cell">
                    <span style={{
                        color: complaint.dynamicETA?.includes('⚡') || complaint.dynamicETA?.includes('🚨')
                            ? '#ef4444' : complaint.dynamicETA?.includes('24 hours') ? '#f59e0b' : '#10b981',
                        fontWeight: complaint.dynamicETA?.includes('⚡') || complaint.dynamicETA?.includes('🚨') ? 'bold' : 'normal'
                    }}>
                        {complaint.dynamicETA || complaint.eta}
                    </span>
                </td>
                <td className="reasoning-cell">
                    <button className="expand-btn" onClick={() => toggleExpand(complaint._id)}>
                        {expandedId === complaint._id ? '▼' : '▶'} View Details
                    </button>
                </td>
                <td className="date-cell">
                    {new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                </td>
                <td style={{ display: 'flex', gap: '8px', padding: '12px' }}>
                    <button className="resolve-btn" onClick={() => handleResolve(complaint._id)}
                        disabled={resolvingId === complaint._id} style={{ flex: 1 }}>
                        {resolvingId === complaint._id ? '⏳' : '✓'} Resolve
                    </button>
                    <button className="resolve-btn" onClick={() => handleReject(complaint._id)}
                        disabled={rejectingId === complaint._id}
                        style={{ flex: 1, backgroundColor: rejectingId === complaint._id ? '#991b1b' : '#dc2626', borderColor: '#dc2626' }}>
                        {rejectingId === complaint._id ? '⏳' : '✕'} Reject
                    </button>
                </td>
            </tr>
            {expandedId === complaint._id && (
                <tr className="details-row">
                    <td colSpan={9}>
                        <div className="complaint-details">
                            <div className="detail-section">
                                <h4>📄 Complaint Description (Translated to English)</h4>
                                <p>{complaint.translatedDescription || complaint.description}</p>
                                {complaint.language && complaint.language !== 'en' && (
                                    <div className="original-language-note">
                                        <strong>Original Language:</strong> {complaint.language.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="detail-section">
                                <h4>🤖 AI Analysis & Reasoning</h4>
                                <p>{complaint.reasoning}</p>
                            </div>
                            {complaint.citizenFeedback === 'unresolved' && (
                                <div className="detail-section" style={{ backgroundColor: '#7f1d1d22', padding: '12px', borderRadius: '6px', border: '1px solid #ef4444' }}>
                                    <h4 style={{ color: '#fca5a5' }}>⚠️ Citizen Feedback: Not Solved</h4>
                                    <p style={{ color: '#fecaca', fontStyle: 'italic' }}>
                                        "{complaint.citizenComments || 'Citizen reported that the problem persists without detailed comments.'}"
                                    </p>
                                    <div style={{ fontSize: '11px', color: '#f87171', marginTop: '6px' }}>
                                        Reported on: {complaint.citizenFeedbackAt ? new Date(complaint.citizenFeedbackAt).toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                            )}
                            {complaint.confidence !== undefined && (
                                <div className="detail-section" style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '6px', border: '1px solid #4b5563' }}>
                                    <h4>🔬 ML Confidence & Analysis</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <strong>Confidence Score:</strong>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                <div style={{ flex: 1, height: '8px', backgroundColor: '#374151', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${complaint.confidence * 100}%`, height: '100%',
                                                        backgroundColor: complaint.confidence > 0.7 ? '#10b981' : complaint.confidence > 0.5 ? '#f59e0b' : '#ef4444'
                                                    }} />
                                                </div>
                                                <span style={{ color: '#9ca3af' }}>{(complaint.confidence * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <strong>Sentiment:</strong>
                                            {complaint.sentiment && (
                                                <div style={{ marginTop: '4px', color: '#d1d5db' }}>
                                                    {complaint.sentiment.magnitude === 'negative' && '😞 Negative'}
                                                    {complaint.sentiment.magnitude === 'neutral' && '😐 Neutral'}
                                                    {complaint.sentiment.magnitude === 'positive' && '😊 Positive'}
                                                    <span style={{ color: '#9ca3af' }}> (Score: {complaint.sentiment.score.toFixed(2)})</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <strong>Emotional Risk:</strong>
                                            {complaint.emotionalRisk && (
                                                <div style={{
                                                    marginTop: '4px', display: 'inline-block', padding: '4px 8px', borderRadius: '4px',
                                                    backgroundColor: complaint.emotionalRisk === 'high' ? '#7f1d1d' : complaint.emotionalRisk === 'medium' ? '#7c2d12' : '#064e3b',
                                                    color: complaint.emotionalRisk === 'high' ? '#fca5a5' : complaint.emotionalRisk === 'medium' ? '#fed7aa' : '#a7f3d0'
                                                }}>
                                                    {complaint.emotionalRisk.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <strong>Active Learning Flag:</strong>
                                            {complaint.activeLearningSuggestion
                                                ? <div style={{ marginTop: '4px', color: '#fbbf24' }}>⚠️ Flagged for Review</div>
                                                : <div style={{ marginTop: '4px', color: '#9ca3af' }}>✓ Standard</div>}
                                        </div>
                                    </div>
                                    {complaint.entities && (
                                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #4b5563' }}>
                                            <strong>Detected Entities:</strong>
                                            {complaint.entities.locations?.length > 0 && (
                                                <div style={{ marginTop: '4px', color: '#d1d5db' }}>
                                                    <span style={{ color: '#9ca3af' }}>📍 Locations:</span> {complaint.entities.locations.join(', ')}
                                                </div>
                                            )}
                                            {complaint.entities.infrastructure?.length > 0 && (
                                                <div style={{ marginTop: '4px', color: '#d1d5db' }}>
                                                    <span style={{ color: '#9ca3af' }}>🏗️ Infrastructure:</span> {complaint.entities.infrastructure.join(', ')}
                                                </div>
                                            )}
                                            {complaint.entities.riskFactors?.length > 0 && (
                                                <div style={{ marginTop: '4px', color: '#d1d5db' }}>
                                                    <span style={{ color: '#9ca3af' }}>⚡ Risk Factors:</span> {complaint.entities.riskFactors.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {complaint.suggestedCategory && complaint.suggestedCategory !== complaint.problemType && (
                                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #4b5563', color: '#fbbf24' }}>
                                            <strong>💡 AI Suggestion:</strong> This might be miscategorized. Consider "{complaint.suggestedCategory}" instead of "{complaint.problemType}"
                                        </div>
                                    )}
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #4b5563', display: 'flex', gap: '8px' }}>
                                        <strong>Feedback for AI Learning:</strong>
                                        {(['accurate', 'inaccurate', 'needs_revision'] as const).map((fb) => (
                                            <button key={fb} onClick={() => handleProvideFeedback(complaint._id, fb)} style={{
                                                padding: '4px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', color: '#fff',
                                                backgroundColor: fb === 'accurate' ? '#10b981' : fb === 'inaccurate' ? '#ef4444' : fb === 'needs_revision' ? '#f59e0b' : '#6b7280'
                                            }}>
                                                {fb === 'accurate' ? '✓ Accurate' : fb === 'inaccurate' ? '✕ Inaccurate' : '⚙️ Needs Revision'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );

    const categoryGroups: Record<string, Complaint[]> = {};
    filteredList.forEach(c => {
        const cat = c.problemType || 'Other';
        if (!categoryGroups[cat]) categoryGroups[cat] = [];
        categoryGroups[cat].push(c);
    });
    const sortedCategories = Object.keys(categoryGroups).sort();

    return (
        <div className="government-dashboard gov-dashboard-layout">

            {/* LEFT SIDEBAR */}
            <div className="gov-sidebar">
                <div style={{ padding: '0 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--accent-gradient)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: 'var(--shadow-glow)' }}>🏛️</div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: '700', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>RuralTrust AI</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.name} <br />({user.designation})</div>
                    </div>
                </div>

                <div className="sidebar-category">Main Menu</div>
                <div className={`sidebar-item ${activeSidebarItem === 'overview' ? 'active' : ''}`} onClick={() => setActiveSidebarItem('overview')}>
                    <span className="sidebar-icon">📊</span> Dashboard Overview
                </div>
                <div className={`sidebar-item ${activeSidebarItem === 'analytics' ? 'active' : ''}`} onClick={() => setActiveSidebarItem('analytics')}>
                    <span className="sidebar-icon">📈</span> Analytics
                </div>

                <div className="sidebar-category">Active Categories</div>
                <div className={`sidebar-item ${activeSidebarItem === 'overview' ? 'active' : ''}`} onClick={() => setActiveSidebarItem('overview')}>
                    <span className="sidebar-icon">📝</span> All Categories
                </div>
                {sortedCategories.map(cat => {
                    const catsList = categoryGroups[cat];
                    const highCount = catsList.filter(c => c.priority === 'High').length;
                    return (
                        <div key={cat} className={`sidebar-item ${activeSidebarItem === cat ? 'active' : ''}`} onClick={() => setActiveSidebarItem(cat)}>
                            <span className="sidebar-icon">📋</span> <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{cat}</span>
                            {highCount > 0 && <span style={{ marginLeft: 'auto', color: 'var(--error)', fontSize: '0.9rem' }}>🚨</span>}
                            <span style={{ marginLeft: highCount > 0 ? '0.3rem' : 'auto', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {catsList.length}
                            </span>
                        </div>
                    );
                })}

                <div className="sidebar-category">AI Decision Tools</div>
                <div className={`sidebar-item ${activeSidebarItem === 'policy' ? 'active' : ''}`} onClick={() => setActiveSidebarItem('policy')}>
                    <span className="sidebar-icon">📜</span> Policy Simulator
                </div>
                <div className={`sidebar-item ${activeSidebarItem === 'future' ? 'active' : ''}`} onClick={() => setActiveSidebarItem('future')}>
                    <span className="sidebar-icon">🔮</span> Future Prediction
                </div>
                <div className={`sidebar-item ${activeSidebarItem === 'merge' ? 'active' : ''}`} onClick={() => setActiveSidebarItem('merge')}>
                    <span className="sidebar-icon">🔗</span> Merge & Resolve
                </div>

                <div className="sidebar-category">Preferences</div>
                <div className={`sidebar-item ${activeSidebarItem === 'settings' ? 'active' : ''}`} onClick={() => setActiveSidebarItem('settings')}>
                    <span className="sidebar-icon">⚙️</span> Settings
                </div>
                <div className="sidebar-item" onClick={handleLogout} style={{ color: 'var(--error)' }}>
                    <span className="sidebar-icon">🚪</span> Logout
                </div>

                <div style={{ marginTop: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {unresolvedComplaints.length > 0 && (
                        <button onClick={() => setShowUnresolvedModal(true)} style={{ width: '100%', background: '#b91c1c', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            ⚠️ {unresolvedComplaints.length} Unresolved
                        </button>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="gov-main-content">

                {/* DASHBOARD OVERVIEW & CATEGORY VIEWS */}
                {(activeSidebarItem === 'overview' || sortedCategories.includes(activeSidebarItem)) && (
                    <div style={{ animation: 'fadeIn 0.4s' }}>
                        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 'bold' }}>
                                    {activeSidebarItem === 'overview' ? 'Dashboard Overview' : `Category: ${activeSidebarItem}`}
                                </h2>
                                <p style={{ color: 'var(--text-muted)' }}>High-level metrics and active complaints.</p>
                            </div>
                            <button onClick={fetchComplaints} className="refresh-btn" style={{ whiteSpace: 'nowrap' }} title="Refresh">🔄 Refresh Data</button>
                        </div>

                        {successMessage && (
                            <div style={{ backgroundColor: '#10b98122', color: '#34d399', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #10b981' }}>
                                {successMessage}
                            </div>
                        )}

                        <div className="gov-top-summary">
                            <div className="summary-card">
                                <span className="title">📋 Total Complaints</span>
                                <span className="value">{complaints.length}</span>
                            </div>
                            <div className="summary-card" style={{ borderColor: 'var(--error)' }}>
                                <span className="title" style={{ color: 'var(--error)' }}>🚨 High Priority</span>
                                <span className="value">{complaints.filter(c => c.priority === 'High').length}</span>
                            </div>
                            <div className="summary-card" style={{ borderColor: 'var(--info)' }}>
                                <span className="title" style={{ color: 'var(--info)' }}>📍 Critical Zones</span>
                                <span className="value">{sortedVillages.length}</span>
                            </div>
                            <div className="summary-card" style={{ borderColor: 'var(--success)' }}>
                                <span className="title" style={{ color: 'var(--success)' }}>✓ Est. Resolution Rate</span>
                                <span className="value">78%</span>
                            </div>
                        </div>


                        {/* Location-based grouped complaint boxes */}
                        {sortedVillages.length === 0 ? (
                            <div className="empty-state" style={{ marginTop: '2.5rem' }}>
                                <div className="empty-icon">✅</div>
                                <h3>No Active Complaints</h3>
                                <p>All complaints have been resolved!</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', marginTop: '2.5rem' }}>
                                {sortedVillages.map(village => {
                                    const villageComplaints = activeSidebarItem === 'overview'
                                        ? villageGroups[village]
                                        : villageGroups[village].filter(c => (c.problemType || 'Other') === activeSidebarItem);

                                    if (villageComplaints.length === 0) return null;

                                    const highCount = villageComplaints.filter(c => c.priority === 'High').length;
                                    const isExpanded = !!expandedVillages[village]; // Closed by default
                                    const toggleVillage = () => {
                                        setExpandedVillages(prev => ({ ...prev, [village]: !isExpanded }));
                                    };

                                    return (
                                        <div key={village} style={{
                                            width: '100%',
                                            borderRadius: '14px',
                                            overflow: 'hidden',
                                            border: '1px solid #374151',
                                            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                                            background: '#111827',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {/* Village header */}
                                            <div
                                                onClick={toggleVillage}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 24px',
                                                    background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '12px',
                                                    boxSizing: 'border-box',
                                                    borderBottom: isExpanded ? '2px solid #3b82f6' : 'none',
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    position: 'relative'
                                                }}>
                                                <span style={{ fontSize: '20px' }}>📍</span>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{
                                                        fontSize: '18px',
                                                        fontWeight: '800',
                                                        color: '#ffffff',
                                                        letterSpacing: '0.04em',
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        {village}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '6px' }}>
                                                        <span style={{
                                                            backgroundColor: '#1d4ed8', color: '#bfdbfe',
                                                            padding: '3px 12px', borderRadius: '20px',
                                                            fontSize: '12px', fontWeight: '600'
                                                        }}>
                                                            {villageComplaints.length} active
                                                        </span>
                                                        {highCount > 0 && (
                                                            <span style={{
                                                                backgroundColor: '#7f1d1d', color: '#fca5a5',
                                                                padding: '3px 12px', borderRadius: '20px',
                                                                fontSize: '12px', fontWeight: '600'
                                                            }}>
                                                                🔴 {highCount} High Priority
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    position: 'absolute',
                                                    right: '25px',
                                                    fontSize: '20px',
                                                    transition: 'transform 0.3s',
                                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                    color: '#9ca3af'
                                                }}>
                                                    ▼
                                                </div>
                                            </div>

                                            {/* Complaints table for this village */}
                                            {
                                                isExpanded && (
                                                    <div className="complaints-table-container" style={{ overflowX: 'auto', overflowAnchor: 'none', border: 'none', borderRadius: '0', animation: 'fadeIn 0.3s' }}>
                                                        <table className="complaints-table" style={{ width: '100%' }}>
                                                            <thead>
                                                                <tr>
                                                                    <th>Citizen Name</th>
                                                                    <th>Mobile</th>
                                                                    <th>Location / Problem</th>
                                                                    <th>Priority</th>
                                                                    <th>Urgency</th>
                                                                    <th>ETA</th>
                                                                    <th>AI Reasoning</th>
                                                                    <th>Submitted</th>
                                                                    <th>Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {villageComplaints.map(renderComplaintRow)}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )
                                            }
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ANALYTICS MODULE */}
                {activeSidebarItem === 'analytics' && (
                    <div style={{ width: '100%', animation: 'fadeIn 0.4s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 'bold', margin: 0 }}>System Analytics</h2>
                            <button onClick={fetchComplaints} className="refresh-btn" style={{ padding: '8px 12px', fontSize: '1rem' }}>🔄 Update</button>
                        </div>
                        {complaints.length > 0 ? <ComplaintAnalytics complaints={filteredList} /> : <div className="empty-state"><div style={{ fontSize: '3rem' }}>📉</div><h3>No data available</h3></div>}
                    </div>
                )}

                {/* POLICY SIMULATOR */}
                {activeSidebarItem === 'policy' && (
                    <div style={{ animation: 'fadeIn 0.4s' }}>
                        <h2 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 'bold', marginBottom: '1rem' }}>Policy Simulator</h2>
                        <PolicySimulator />
                    </div>
                )}

                {/* FUTURE PREDICTION */}
                {activeSidebarItem === 'future' && (
                    <div style={{ width: '100%', animation: 'fadeIn 0.4s' }}>
                        <h2 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 'bold', marginBottom: '1rem' }}>Future Prediction</h2>
                        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 20px rgba(124, 58, 237, 0.4))' }}>🔮</span>
                            <h3 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '1rem' }}>Predictive Modeling Beta</h3>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                                Our Advanced Forecasting AI is currently analyzing historical patterns across all zones to predict future service disruptions and infrastructure failures.
                                <br /><br />
                                <span style={{ color: 'var(--info)' }}>This feature will generate interactive heatmaps in the next RuralTrust update.</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* MERGE & RESOLVE */}
                {activeSidebarItem === 'merge' && (
                    <div style={{ animation: 'fadeIn 0.4s' }}>
                        <h2 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 'bold', marginBottom: '1rem' }}>Merge & Resolve AI</h2>
                        <MergeSuggestions onMergeResolved={fetchComplaints} />
                    </div>
                )}

                {/* SETTINGS MODULE */}
                {activeSidebarItem === 'settings' && (
                    <div className="complaint-management-module" style={{ animation: 'fadeIn 0.4s' }}>
                        <h2 style={{ color: 'white', marginBottom: '1.5rem', marginTop: 0, fontSize: '1.8rem' }}>System Settings</h2>

                        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
                            <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem' }}>👤 Account Information</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: 'var(--text-muted)' }}>Name:</strong> <span>{user.name}</span>
                                    <strong style={{ color: 'var(--text-muted)' }}>Role:</strong> <span style={{ textTransform: 'uppercase' }}>{user.type}</span>
                                    <strong style={{ color: 'var(--text-muted)' }}>Designation:</strong> <span>{user.designation || 'N/A'}</span>
                                </div>
                            </div>

                            <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem' }}>🔔 Notification Preferences</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Global notification settings will be available here.</p>
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                        <input type="checkbox" defaultChecked /> Receive email alerts for High Priority items
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                        <input type="checkbox" defaultChecked /> Enable AI autonomous category corrections
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* UNRESOLVED COMPLAINTS MODAL */}
                {showUnresolvedModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{
                            backgroundColor: '#1f2937', width: '100%', maxWidth: '800px', maxHeight: '90vh',
                            borderRadius: '16px', padding: '30px', overflowY: 'auto', position: 'relative',
                            border: '1px solid #374151', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}>
                            <button onClick={() => setShowUnresolvedModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#6b7280', fontSize: '24px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'white'} onMouseOut={e => e.currentTarget.style.color = '#6b7280'}>✕</button>
                            <h2 style={{ color: 'white', marginBottom: '10px' }}>⚠️ Unresolved by Citizens</h2>
                            <p style={{ color: '#9ca3af', marginBottom: '25px' }}>These complaints were marked as resolved, but the citizens reported that the issue persists.</p>

                            {unresolvedComplaints.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
                                    <p>No unresolved complaints reported!</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '20px' }}>
                                    {unresolvedComplaints.map(complaint => (
                                        <div key={complaint._id} style={{ backgroundColor: '#111827', padding: '20px', borderRadius: '12px', border: '1px solid #ef4444' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                <span style={{ fontWeight: 'bold', color: '#fca5a5' }}>{complaint.problemType} - {complaint.village}</span>
                                            </div>
                                            <p style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '15px' }}>{complaint.description}</p>
                                            <div style={{ backgroundColor: '#7f1d1d22', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #7f1d1d' }}>
                                                <label style={{ display: 'block', fontSize: '12px', color: '#fca5a5', marginBottom: '8px', fontWeight: 'bold' }}>Citizen's Comment:</label>
                                                <p style={{ color: '#fecaca', fontStyle: 'italic', margin: 0, fontSize: '14px' }}>"{complaint.citizenComments || 'No details provided.'}"</p>
                                            </div>
                                            <button onClick={() => handleReopenComplaint(complaint._id)} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#2563eb'} onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}>Re-open Complaint</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default GovernmentDashboard;

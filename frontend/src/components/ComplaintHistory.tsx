import React, { useState, useEffect } from 'react';
import { getComplaintHistory, Complaint } from '../services/api';

const ComplaintHistory: React.FC = () => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'resolved' | 'rejected'>('all');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                const data = await getComplaintHistory();
                setComplaints(data);
                setError(null);
            } catch (err: any) {
                setError(err.response?.data?.error || 'Failed to load complaint history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const filteredComplaints = complaints.filter(complaint => {
        // Filter by status
        if (filterStatus === 'resolved' && complaint.status !== 'resolved') return false;
        if (filterStatus === 'rejected' && complaint.status !== 'rejected') return false;

        // Filter by search term
        return complaint.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
            complaint.problemType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const getPriorityColor = (priority: string): string => {
        switch (priority) {
            case 'High': return '#ef4444';
            case 'Medium': return '#f59e0b';
            case 'Low': return '#10b981';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading complaint history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <p>❌ {error}</p>
            </div>
        );
    }

    return (
        <div className="complaint-history">
            <div className="history-header">
                <div>
                    <h2>Complaint History</h2>
                    <p>Archive of resolved and rejected complaints for audit and analysis</p>
                </div>
                <div className="history-stats">
                    <div className="stat-card">
                        <span className="stat-number">{complaints.length}</span>
                        <span className="stat-label">Total</span>
                    </div>
                    <div className="stat-card" style={{ backgroundColor: '#10b981' }}>
                        <span className="stat-number">{complaints.filter(c => c.status === 'resolved').length}</span>
                        <span className="stat-label">Resolved</span>
                    </div>
                    <div className="stat-card" style={{ backgroundColor: '#dc2626' }}>
                        <span className="stat-number">{complaints.filter(c => c.status === 'rejected').length}</span>
                        <span className="stat-label">Rejected</span>
                    </div>
                </div>
            </div>

            {/* Filter Buttons */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                padding: '8px',
                backgroundColor: '#1f2937',
                borderRadius: '8px',
                border: '1px solid #374151'
            }}>
                <button
                    onClick={() => setFilterStatus('all')}
                    style={{
                        flex: 1,
                        padding: '12px 24px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: filterStatus === 'all' ? '#3b82f6' : '#374151',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    📋 All ({complaints.length})
                </button>
                <button
                    onClick={() => setFilterStatus('resolved')}
                    style={{
                        flex: 1,
                        padding: '12px 24px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: filterStatus === 'resolved' ? '#10b981' : '#374151',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    ✓ Resolved ({complaints.filter(c => c.status === 'resolved').length})
                </button>
                <button
                    onClick={() => setFilterStatus('rejected')}
                    style={{
                        flex: 1,
                        padding: '12px 24px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: filterStatus === 'rejected' ? '#dc2626' : '#374151',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    ✕ Rejected ({complaints.filter(c => c.status === 'rejected').length})
                </button>
            </div>

            <div className="search-bar">
                <input
                    type="text"
                    placeholder="🔍 Search by village, problem type, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredComplaints.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📁</div>
                    <h3>
                        {searchTerm
                            ? 'No Results Found'
                            : filterStatus === 'resolved'
                                ? 'No Resolved Complaints'
                                : filterStatus === 'rejected'
                                    ? 'No Rejected Complaints'
                                    : 'No Complaints Yet'
                        }
                    </h3>
                    <p>
                        {searchTerm
                            ? 'Try a different search term'
                            : filterStatus === 'resolved'
                                ? 'Resolved complaints will appear here'
                                : filterStatus === 'rejected'
                                    ? 'Rejected complaints will appear here'
                                    : 'Completed complaints will appear here'
                        }
                    </p>
                </div>
            ) : (
                <div className="complaints-table-container">
                    <table className="complaints-table history-table">
                        <thead>
                            <tr>
                                <th>Citizen Name</th>
                                <th>Mobile</th>
                                <th>Village</th>
                                <th>Problem Type</th>
                                <th>Description</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Submitted</th>
                                <th>Resolved/Rejected</th>
                                <th>Resolution Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredComplaints.map((complaint) => {
                                const submittedDate = new Date(complaint.createdAt);
                                const completedDate = complaint.status === 'resolved'
                                    ? (complaint.resolvedAt ? new Date(complaint.resolvedAt) : null)
                                    : (complaint.rejectedAt ? new Date(complaint.rejectedAt) : null);
                                const resolutionTime = completedDate
                                    ? Math.round((completedDate.getTime() - submittedDate.getTime()) / (1000 * 60 * 60))
                                    : 0;

                                return (
                                    <React.Fragment key={complaint._id}>
                                        <tr>
                                            <td className="citizen-name">
                                                {complaint.citizenId && typeof complaint.citizenId !== 'string'
                                                    ? complaint.citizenId.name
                                                    : 'N/A'}
                                            </td>
                                            <td className="mobile-cell">
                                                {complaint.citizenId && typeof complaint.citizenId !== 'string'
                                                    ? complaint.citizenId.mobile
                                                    : 'N/A'}
                                            </td>
                                            <td className="village-cell">{complaint.village}</td>
                                            <td>{complaint.problemType}</td>
                                            <td className="description-cell">
                                                <div className="description-preview">{complaint.description}</div>
                                            </td>
                                            <td>
                                                <span
                                                    className="priority-badge small"
                                                    style={{ backgroundColor: getPriorityColor(complaint.priority) }}
                                                >
                                                    {complaint.priority}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className="priority-badge small"
                                                    style={{
                                                        backgroundColor: complaint.status === 'resolved' ? '#10b981' : '#dc2626',
                                                        textTransform: 'uppercase'
                                                    }}
                                                >
                                                    {complaint.status === 'resolved' ? '✓ Resolved' : '✕ Rejected'}
                                                </span>
                                            </td>
                                            <td className="date-cell">
                                                {submittedDate.toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="date-cell">
                                                {completedDate?.toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="resolution-time">
                                                {resolutionTime < 24
                                                    ? `${resolutionTime}h`
                                                    : `${Math.round(resolutionTime / 24)}d`}
                                            </td>
                                        </tr>
                                        {/* Always show AI feedback for rejected complaints */}
                                        {complaint.status === 'rejected' && complaint.rejectionReason && (
                                            <tr style={{ backgroundColor: '#1f2937' }}>
                                                <td colSpan={10} style={{ padding: '12px 16px' }}>
                                                    <div style={{
                                                        backgroundColor: '#0f172a',
                                                        border: '1px solid #dc2626',
                                                        borderRadius: '6px',
                                                        padding: '12px'
                                                    }}>
                                                        <strong style={{ color: '#dc2626', display: 'block', marginBottom: '8px' }}>
                                                            🤖 AI Rejection Feedback:
                                                        </strong>
                                                        <pre style={{
                                                            fontFamily: 'monospace',
                                                            color: '#fca5a5',
                                                            fontSize: '12px',
                                                            whiteSpace: 'pre-wrap',
                                                            margin: 0,
                                                            lineHeight: '1.5'
                                                        }}>
                                                            {complaint.rejectionReason}
                                                        </pre>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ComplaintHistory;

import React from 'react';
import {
    PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Complaint } from '../services/api';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ComplaintAnalyticsProps {
    complaints: Complaint[];
}

const ComplaintAnalytics: React.FC<ComplaintAnalyticsProps> = ({ complaints }) => {
    // Priority data for pie chart
    const priorityData = [
        { name: 'High', value: complaints.filter(c => c.priority === 'High').length },
        { name: 'Medium', value: complaints.filter(c => c.priority === 'Medium').length },
        { name: 'Low', value: complaints.filter(c => c.priority === 'Low').length }
    ].filter(d => d.value > 0);

    // Village data for bar chart
    const villageData = Array.from(new Set(complaints.map(c => c.village)))
        .map(village => ({
            name: village,
            count: complaints.filter(c => c.village === village).length
        }))
        .sort((a, b) => b.count - a.count);

    const COLORS = {
        High: '#ef4444',
        Medium: '#f59e0b',
        Low: '#10b981'
    };


    // Prediction Data State
    const [aiPredictions, setAiPredictions] = React.useState<any[]>([]);
    const [duplicateStats, setDuplicateStats] = React.useState<any>({ totalDuplicates: 0, topGroups: [] });

    React.useEffect(() => {
        const fetchPredictions = async () => {
            try {
                const token = localStorage.getItem('ruraltrust_token');
                if (!token) return;

                const res = await fetch(`${BASE_URL}/analytics/predictions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setAiPredictions(data.predictions || []);
                    setDuplicateStats(data.duplicateStats || { totalDuplicates: 0, topGroups: [] });
                }
            } catch (err) {
                console.error("Failed to load predictions", err);
            }
        };
        fetchPredictions();
    }, []);


    return (
        <div style={{
            backgroundColor: '#1f2937',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '30px',
            border: '1px solid #374151'
        }}>
            <h2 style={{ color: '#f3f4f6', marginTop: 0, marginBottom: '30px', textAlign: 'center' }}>
                📊 Complaint Analytics
            </h2>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '30px'
            }}>
                {/* Pie Chart - Priority Distribution */}
                <div style={{
                    flex: '1 1 400px',
                    backgroundColor: '#111827',
                    borderRadius: '10px',
                    padding: '20px',
                    border: '1px solid #374151'
                }}>
                    <h3 style={{ color: '#f3f4f6', textAlign: 'center', marginTop: 0 }}>
                        🎯 Priority Distribution
                    </h3>
                    {priorityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={priorityData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={true}
                                    label={({ name, value, percent }) => `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {priorityData.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#374151',
                                        border: '1px solid #4b5563',
                                        color: '#f3f4f6',
                                        borderRadius: '6px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
                            No priority data available
                        </div>
                    )}
                </div>

                {/* Bar Chart - Village Distribution */}
                <div style={{
                    flex: '1 1 400px',
                    backgroundColor: '#111827',
                    borderRadius: '10px',
                    padding: '20px',
                    border: '1px solid #374151'
                }}>
                    <h3 style={{ color: '#f3f4f6', textAlign: 'center', marginTop: 0 }}>
                        🏘️ Complaints by Location
                    </h3>
                    {villageData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={villageData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={100}
                                    tick={{ fill: '#f3f4f6', fontSize: 12 }}
                                />
                                <YAxis tick={{ fill: '#f3f4f6' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#374151',
                                        border: '1px solid #4b5563',
                                        color: '#f3f4f6',
                                        borderRadius: '6px'
                                    }}
                                />
                                <Bar dataKey="count" fill="#8b5cf6" name="Complaints" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
                            No location data available
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Statistics */}
            <div style={{
                marginTop: '30px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '15px'
            }}>
                {priorityData.map((p) => (
                    <div
                        key={p.name}
                        style={{
                            flex: '1 1 150px',
                            backgroundColor: '#111827',
                            padding: '15px',
                            borderRadius: '8px',
                            border: `2px solid ${COLORS[p.name as keyof typeof COLORS]}`,
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: COLORS[p.name as keyof typeof COLORS] }}>
                            {p.value}
                        </div>
                        <div style={{ fontSize: '14px', color: '#d1d5db', marginTop: '5px' }}>
                            {p.name} Priority
                        </div>
                    </div>
                ))}
                <div
                    style={{
                        flex: '1 1 150px',
                        backgroundColor: '#111827',
                        padding: '15px',
                        borderRadius: '8px',
                        border: '2px solid #a78bfa',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a78bfa' }}>
                        {villageData.length}
                    </div>
                    <div style={{ fontSize: '14px', color: '#d1d5db', marginTop: '5px' }}>
                        Locations
                    </div>
                </div>
            </div>
            {/* Duplicate Detection Section */}
            <div style={{
                marginTop: '40px',
                backgroundColor: '#111827',
                borderRadius: '10px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#f3f4f6', textAlign: 'center', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    🧩 Smart Duplicate Detection <span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#9ca3af', backgroundColor: '#374151', padding: '2px 8px', borderRadius: '12px' }}>Sentence Transformers</span>
                </h3>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                    <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#f3f4f6' }}>Total Auto-Grouped</h4>
                        <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#a78bfa', margin: 0 }}>
                            {duplicateStats.totalDuplicates} <span style={{ fontSize: '0.5em', fontWeight: 'normal', color: '#9ca3af' }}>complaints</span>
                        </p>
                    </div>

                    <div style={{ flex: 2, minWidth: '300px', backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#f3f4f6' }}>Top Duplicate Issues</h4>
                        {duplicateStats.topGroups.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#d1d5db' }}>
                                {duplicateStats.topGroups.map((group: any, idx: number) => (
                                    <li key={idx} style={{ marginBottom: '8px' }}>
                                        <strong>{group.count} reports:</strong> {group.village} - {group.problemType}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ margin: 0, color: '#9ca3af' }}>No duplicate groups detected yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Future Issue Prediction Section */}
            <div style={{
                marginTop: '40px',
                backgroundColor: '#111827',
                borderRadius: '10px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#f3f4f6', textAlign: 'center', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    🔮 Future Issue Predictions <span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#9ca3af', backgroundColor: '#374151', padding: '2px 8px', borderRadius: '12px' }}>Linear Regression</span>
                </h3>

                {aiPredictions.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
                        {aiPredictions.map((pred, idx) => (
                            <div key={idx} style={{
                                flex: '1 1 300px',
                                backgroundColor: '#1f2937',
                                padding: '15px',
                                borderRadius: '8px',
                                borderLeft: `4px solid ${pred.trend === 'up' ? '#ef4444' : pred.trend === 'down' ? '#10b981' : '#f59e0b'}`
                            }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>
                                        <span style={{ fontSize: '0.8em', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                            📍 {pred.village}
                                        </span>
                                        {pred.category}
                                    </span>
                                    <span style={{ fontSize: '0.9em', color: pred.trend === 'up' ? '#fca5a5' : '#d1d5db' }}>
                                        {pred.trend === 'up' ? '📈 Trending Up' : pred.trend === 'down' ? '📉 Trending Down' : '➡️ Stable'}
                                    </span>
                                </h4>
                                <p style={{ margin: 0, color: '#d1d5db' }}>
                                    Projected <strong>{pred.nextWeekProjection}</strong> new complaints next week.
                                    <br />
                                    <span style={{ fontSize: '0.8em', color: '#9ca3af' }}>
                                        (Slope: {pred.slope.toFixed(2)}, Confidence: {(pred.confidence * 100).toFixed(0)}%)
                                    </span>
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', fontStyle: 'italic' }}>
                        Gathering more data for regression analysis...
                    </div>
                )}
            </div>

            {/* Resolution Probability Section */}
            <div style={{
                marginTop: '40px',
                backgroundColor: '#111827',
                borderRadius: '10px',
                padding: '20px',
                border: '1px solid #374151'
            }}>
                <h3 style={{ color: '#f3f4f6', textAlign: 'center', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    🧠 Resolution Probability <span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#9ca3af', backgroundColor: '#374151', padding: '2px 8px', borderRadius: '12px' }}>AI Model</span>
                </h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
                    {/* Dynamic Probability Card */}
                    <div style={{ flex: '1 1 300px', backgroundColor: '#1f2937', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#f3f4f6' }}>⚡ Likelihood of Quick Resolution</h4>

                        {aiPredictions.length > 0 ? (
                            <ResolutionProbabilityDisplay
                                village={aiPredictions[0].village || 'Unknown'}
                                category={aiPredictions[0].category}
                            />
                        ) : (
                            <p style={{ color: '#9ca3af' }}>Waiting for prediction data...</p>
                        )}
                    </div>

                    <div style={{ flex: '1 1 300px', backgroundColor: '#1f2937', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#f3f4f6' }}>ℹ️ How it works</h4>
                        <p style={{ color: '#d1d5db', fontSize: '0.9em', lineHeight: '1.6' }}>
                            Our AI analyzes historical data for specific villages and problem types.
                            If <strong>Water Supply</strong> issues in <strong>Chitlapakkam</strong> are usually resolved in 2 days, the probability score will be high (&gt;80%).
                            Global stats are used if village data is sparse.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
};

// Helper Component for fetching and displaying probability
const ResolutionProbabilityDisplay = ({ village, category }: { village: string, category: string }) => {
    const [probability, setProbability] = React.useState<number | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchProb = async () => {
            try {
                const token = localStorage.getItem('ruraltrust_token');
                const res = await fetch(`${BASE_URL}/analytics/resolution-probability?village=${village}&category=${category}&days=3`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProbability(data.percentage);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchProb();
    }, [village, category]);

    if (loading) return <div style={{ color: '#9ca3af' }}>Calculating...</div>;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '3em', fontWeight: 'bold', color: (probability || 0) > 70 ? '#10b981' : (probability || 0) > 40 ? '#f59e0b' : '#ef4444' }}>
                    {probability}%
                </span>
                <span style={{ color: '#d1d5db' }}>within 3 days</span>
            </div>
            <p style={{ margin: '5px 0 0 0', color: '#9ca3af', fontSize: '0.9em' }}>
                For <strong>{category}</strong> issues in <strong>{village}</strong>
            </p>
        </div>
    );
};

export default ComplaintAnalytics;

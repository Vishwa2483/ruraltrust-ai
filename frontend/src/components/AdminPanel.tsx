import React, { useState, useEffect } from 'react';
import {
    adminLogin,
    createGovernmentAccount,
    getGovernmentList,
    toggleGovernmentStatus,
    deleteGovernmentAccount,
    getUser,
    type GovernmentAccount,
} from '../services/authApi';

const AdminPanel: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Government account creation
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newName, setNewName] = useState('');
    const [newDesignation, setNewDesignation] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [createdAccount, setCreatedAccount] = useState<any>(null);

    //Government list
    const [govList, setGovList] = useState<GovernmentAccount[]>([]);
    const [selectedQR, setSelectedQR] = useState<string | null>(null);

    useEffect(() => {
        const user = getUser();
        if (user && user.type === 'admin') {
            setIsLoggedIn(true);
            fetchGovernmentList();
        }
    }, []);

    const fetchGovernmentList = async () => {
        try {
            const list = await getGovernmentList();
            setGovList(list);
        } catch (err) {
            console.error('Failed to fetch government list');
        }
    };

    const handleAdminLogin = async () => {
        setError('');

        if (!username || !password) {
            setError('Please enter username and password');
            return;
        }

        setLoading(true);

        try {
            await adminLogin(username, password);
            setIsLoggedIn(true);
            fetchGovernmentList();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGovernment = async () => {
        setError('');

        if (!newUsername || !newName || !newDesignation || !newPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const result = await createGovernmentAccount(newUsername, newName, newDesignation, newPassword);
            setCreatedAccount(result);
            setShowCreateForm(false);
            setNewUsername('');
            setNewName('');
            setNewDesignation('');
            setNewPassword('');
            fetchGovernmentList();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id: string) => {
        try {
            await toggleGovernmentStatus(id);
            fetchGovernmentList();
        } catch (err) {
            alert('Failed to toggle status');
        }
    };

    const handleDeleteAccount = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete account for ${name}?`)) {
            return;
        }

        try {
            await deleteGovernmentAccount(id);
            fetchGovernmentList();
        } catch (err) {
            alert('Failed to delete account');
        }
    };

    const handleViewQR = async (id: string) => {
        const account = govList.find(g => g._id === id);
        if (account?.qrCode) {
            setSelectedQR(account.qrCode);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <h2>🔐 Admin Panel</h2>
                        <p>Login to manage government accounts</p>
                    </div>

                    <div className="auth-form">
                        <div className="form-group">
                            <label>Admin Username *</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter admin username"
                                autoCapitalize="none"
                                autoCorrect="off"
                            />
                        </div>
                        <div className="form-group">
                            <label>Admin Password *</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter admin password"
                                autoCapitalize="none"
                                autoCorrect="off"
                            />
                        </div>

                        {error && <div className="error-message">❌ {error}</div>}

                        <button className="auth-btn" onClick={handleAdminLogin} disabled={loading}>
                            {loading ? <span className="spinner"></span> : '🔑'} Admin Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <h2>⚙️ Government Account Management</h2>
                <button className="create-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
                    {showCreateForm ? '✕ Cancel' : '+ Create New Account'}
                </button>
            </div>

            {showCreateForm && (
                <div className="create-form-card">
                    <h3>Create New Government Account</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Username *</label>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="e.g., officer001"
                            />
                        </div>

                        <div className="form-group">
                            <label>Full Name *</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g., Rajesh Kumar"
                            />
                        </div>

                        <div className="form-group">
                            <label>Designation *</label>
                            <select
                                value={newDesignation}
                                onChange={(e) => setNewDesignation(e.target.value)}
                            >
                                <option value="">Select Designation</option>
                                <option value="Block Development Officer">Block Development Officer</option>
                                <option value="Village Health Nurse">Village Health Nurse</option>
                                <option value="Teacher">Teacher</option>
                                <option value="Panchayat President">Panchayat President</option>
                                <option value="ASHA Worker">ASHA Worker</option>
                                <option value="Anganwadi Worker">Anganwadi Worker</option>
                                <option value="Agriculture Officer">Agriculture Officer</option>
                                <option value="Water Supply Officer">Water Supply Officer</option>
                                <option value="Electricity Officer">Electricity Officer</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Password *</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter password (min 6 characters)"
                            />
                        </div>
                    </div>

                    {error && <div className="error-message">❌ {error}</div>}

                    <button className="submit-btn" onClick={handleCreateGovernment} disabled={loading}>
                        {loading ? <span className="spinner"></span> : '✓'} Create Account
                    </button>
                </div>
            )}

            {createdAccount && (
                <div className="success-card">
                    <h3>✅ Account Created Successfully!</h3>
                    <div className="credentials-box">
                        <p><strong>Username:</strong> {createdAccount.credentials.username}</p>
                        <p><strong>Password:</strong> {createdAccount.credentials.password}</p>
                        <p className="warning-text">⚠️ Save these credentials! Password won't be shown again.</p>
                    </div>
                    <div className="qr-display">
                        <h4>QR Code for Quick Login:</h4>
                        <img src={createdAccount.user.qrCode} alt="QR Code" />
                        <a href={createdAccount.user.qrCode} download={`${createdAccount.credentials.username}_qr.png`} className="download-btn">
                            📥 Download QR Code
                        </a>
                    </div>
                    <button className="close-btn" onClick={() => setCreatedAccount(null)}>Close</button>
                </div>
            )}

            <div className="gov-list-card">
                <h3>Government Accounts ({govList.length})</h3>

                {govList.length === 0 ? (
                    <div className="empty-state">
                        <p>No government accounts yet. Create one to get started.</p>
                    </div>
                ) : (
                    <table className="gov-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Name</th>
                                <th>Designation</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {govList.map((gov) => (
                                <tr key={gov._id}>
                                    <td className="username-cell">@{gov.username}</td>
                                    <td>{gov.name}</td>
                                    <td>{gov.designation}</td>
                                    <td>
                                        <span className={`status-badge ${gov.status}`}>
                                            {gov.status === 'active' ? '✅ Active' : '🚫 Inactive'}
                                        </span>
                                    </td>
                                    <td className="date-cell">
                                        {new Date(gov.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="actions-cell">
                                        <button className="action-btn qr" onClick={() => handleViewQR(gov._id)} title="View QR">
                                            📱
                                        </button>
                                        <button
                                            className="action-btn toggle"
                                            onClick={() => handleToggleStatus(gov._id)}
                                            title={gov.status === 'active' ? 'Deactivate' : 'Activate'}
                                        >
                                            {gov.status === 'active' ? '🔒' : '🔓'}
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            onClick={() => handleDeleteAccount(gov._id, gov.name)}
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedQR && (
                <div className="qr-modal" onClick={() => setSelectedQR(null)}>
                    <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal" onClick={() => setSelectedQR(null)}>✕</button>
                        <h3>QR Code</h3>
                        <img src={selectedQR} alt="QR Code" />
                        <a href={selectedQR} download="qr_code.png" className="download-btn">
                            📥 Download
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;

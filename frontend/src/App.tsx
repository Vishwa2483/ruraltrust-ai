import { useState } from 'react';
console.log('HMR test — frontend file saved at', new Date().toISOString());
import CitizenPortal from './components/CitizenPortal';
import GovernmentDashboard from './components/GovernmentDashboard';
import ComplaintHistory from './components/ComplaintHistory';
import AdminPanel from './components/AdminPanel';
import InstallPWA from './components/InstallPWA';

import './App.css';

type Tab = 'citizen' | 'dashboard' | 'history' | 'admin';

function App() {
    const [activeTab, setActiveTab] = useState<Tab>('citizen');

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-content">
                    <div className="logo-section">
                        {/* Courthouse icon */}
                        <svg
                            className="logo-svg"
                            viewBox="0 0 100 90"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <polygon points="10,30 50,4 90,30" />
                            <rect x="10" y="30" width="80" height="8" rx="1" />
                            <rect x="14" y="38" width="10" height="34" rx="2" />
                            <rect x="29" y="38" width="10" height="34" rx="2" />
                            <rect x="44" y="38" width="10" height="34" rx="2" />
                            <rect x="59" y="38" width="10" height="34" rx="2" />
                            <rect x="74" y="38" width="10" height="34" rx="2" />
                            <rect x="7" y="72" width="86" height="8" rx="1" />
                            <rect x="3" y="80" width="94" height="8" rx="1" />
                        </svg>
                        <div>
                            <h1>RuralTrust AI</h1>
                            <p className="tagline">Smart Governance for Rural Communities</p>
                        </div>
                    </div>

                </div>
            </header>

            <nav className="nav-tabs">
                <button
                    className={`tab ${activeTab === 'citizen' ? 'active' : ''}`}
                    onClick={() => setActiveTab('citizen')}
                >
                    <span className="tab-icon">👥</span>
                    Citizen Portal
                </button>
                <button
                    className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    <span className="tab-icon">🏛️</span>
                    Government Dashboard
                </button>
                <button
                    className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    <span className="tab-icon">📜</span>
                    Complaint History
                </button>
                <button
                    className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
                    onClick={() => setActiveTab('admin')}
                >
                    <span className="tab-icon">🔐</span>
                    Admin Panel
                </button>
            </nav>

            <main className="main-content">
                {activeTab === 'citizen' && <CitizenPortal />}
                {activeTab === 'dashboard' && <GovernmentDashboard />}
                {activeTab === 'history' && <ComplaintHistory />}
                {activeTab === 'admin' && <AdminPanel />}
            </main>

            <footer className="app-footer">
                <p>© 2026 RuralTrust AI | Empowering Rural Governance with Artificial Intelligence</p>
            </footer>

            <InstallPWA />
        </div>
    );
}

export default App;

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { PartyPopper, CheckCircle } from 'lucide-react';

function DashboardPage() {
    // context theke user info r logout function hook nisi
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // logout korar logic, server r local state duitao handle kortesi
    const handleLogout = async () => {
        try {
            // server k session disconnect korar jonne request kortesi
            await api('/logout', { method: 'POST' });
        } catch (err) {
            // failed hoileo local logout jate hoy oita ensure kortesi
        }
        // local storage/state clear kore login page e pathay ditesi
        logout();
        navigate('/login');
    };

    return (
        /* Dashboard er primary welcome container console */
        <div className="pending-container">
            <div className="pending-card">
                {/* Visual welcome icon presentation logic rendering */}
                <div className="pending-icon"><PartyPopper size={64} color="var(--accent-primary)" /></div>
                {/* Logged in user er name display logic handler point */}
                <h1 className="pending-title">Welcome, {user?.name || 'User'}!</h1>
                <p className="pending-text">
                    You are logged in as <strong>{user?.role || 'user'}</strong>.
                    The full dashboard will be built in Phase 2.
                </p>
                {/* Active connection status indicator point visual rendering */}
                <div className="status-badge status-badge--success">
                    <span className="status-dot"></span>
                    Authenticated
                </div>
                {/* User action execution area for session termination logic */}
                <div style={{ marginTop: 'var(--space-2xl)' }}>
                    <button className="btn btn-danger" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DashboardPage;

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { PartyPopper, CheckCircle } from 'lucide-react';

function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await api('/logout', { method: 'POST' });
        } catch (err) {
            // logout even if API fails
        }
        logout();
        navigate('/login');
    };

    return (
        <div className="pending-container">
            <div className="pending-card">
                <div className="pending-icon"><PartyPopper size={64} color="var(--accent-primary)" /></div>
                <h1 className="pending-title">Welcome, {user?.name || 'User'}!</h1>
                <p className="pending-text">
                    You are logged in as <strong>{user?.role || 'user'}</strong>.
                    The full dashboard will be built in Phase 2.
                </p>
                <div className="status-badge status-badge--success">
                    <span className="status-dot"></span>
                    Authenticated
                </div>
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

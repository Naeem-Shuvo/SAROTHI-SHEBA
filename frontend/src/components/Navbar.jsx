import { useAuth, UserButton } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Navbar({ role }) {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    return (
        <nav style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 32px',
            background: 'rgba(15, 15, 26, 0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
        }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    <span className="gradient-text">SAROTHI</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> SHEBA</span>
                </h1>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {role && (
                    <span className="status-badge status-available" style={{ fontSize: '0.8rem' }}>
                        {role.toUpperCase()}
                    </span>
                )}
                <UserButton
                    appearance={{
                        elements: {
                            avatarBox: { width: 36, height: 36 },
                        },
                    }}
                />
            </div>
        </nav>
    );
}

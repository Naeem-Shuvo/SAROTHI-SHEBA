import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function SelectRolePage() {
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState(null);
    const [licenseNumber, setLicenseNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit() {
        if (!selectedRole) return;
        if (selectedRole === 'driver' && !licenseNumber.trim()) {
            setError('Please enter your license number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const body = { role: selectedRole };
            if (selectedRole === 'driver') {
                body.license_number = licenseNumber.trim();
            }

            await api.post('/users/role', body);
            navigate(selectedRole === 'passenger' ? '/passenger/dashboard' : '/driver/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
        }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }} className="animate-fade-in">
                <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '12px' }}>
                    <span className="gradient-text">How will you ride?</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                    Choose your role to get started
                </p>
            </div>

            <div style={{
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginBottom: '32px',
            }}>
                {/* Passenger Card */}
                <div
                    onClick={() => { setSelectedRole('passenger'); setError(''); }}
                    className="glass-card animate-fade-in animate-delay-1"
                    style={{
                        width: '280px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        border: selectedRole === 'passenger'
                            ? '2px solid var(--accent)'
                            : '1px solid var(--border)',
                        transform: selectedRole === 'passenger' ? 'scale(1.03)' : 'scale(1)',
                    }}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧑‍💼</div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '8px' }}>
                        I'm a Passenger
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        Request rides, track your driver in real-time, and pay seamlessly
                    </p>
                </div>

                {/* Driver Card */}
                <div
                    onClick={() => { setSelectedRole('driver'); setError(''); }}
                    className="glass-card animate-fade-in animate-delay-2"
                    style={{
                        width: '280px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        border: selectedRole === 'driver'
                            ? '2px solid var(--accent)'
                            : '1px solid var(--border)',
                        transform: selectedRole === 'driver' ? 'scale(1.03)' : 'scale(1)',
                    }}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚗</div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '8px' }}>
                        I'm a Driver
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        Accept ride requests, earn money, and manage your vehicle
                    </p>
                </div>
            </div>

            {/* Driver License Input */}
            {selectedRole === 'driver' && (
                <div className="animate-fade-in" style={{
                    width: '100%',
                    maxWidth: '400px',
                    marginBottom: '24px',
                }}>
                    <label style={{
                        display: 'block',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        License Number
                    </label>
                    <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. DL-DHAKA-2024-001"
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            color: 'var(--text-primary)',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.3s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                </div>
            )}

            {error && (
                <p style={{
                    color: 'var(--danger)',
                    marginBottom: '16px',
                    fontSize: '0.9rem',
                }}>
                    {error}
                </p>
            )}

            <button
                className="btn-primary animate-fade-in animate-delay-3"
                onClick={handleSubmit}
                disabled={!selectedRole || loading}
                style={{
                    opacity: (!selectedRole || loading) ? 0.5 : 1,
                    cursor: (!selectedRole || loading) ? 'not-allowed' : 'pointer',
                    minWidth: '200px',
                    justifyContent: 'center',
                }}
            >
                {loading ? 'Setting up...' : 'Continue →'}
            </button>
        </div>
    );
}

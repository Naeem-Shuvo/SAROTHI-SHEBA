import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../api/axios';

export default function PassengerDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchDashboard() {
            try {
                const res = await api.get('/passengers/dashboard');
                setData(res.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        }
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Loading dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p style={{ color: 'var(--danger)' }}>{error}</p>
            </div>
        );
    }

    const { profile, stats, recent_rides } = data;

    return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar role="passenger" />

            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
                {/* welcome header */}
                <div className="animate-fade-in" style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>
                        Welcome back, <span className="gradient-text">{profile.name}</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Here's your ride overview
                    </p>
                </div>

                {/* stats grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                    marginBottom: '32px',
                }}>
                    <div className="stat-card animate-fade-in animate-delay-1">
                        <div className="stat-value">{Number(profile.rating_average || 0).toFixed(1)}</div>
                        <div className="stat-label">Your Rating</div>
                    </div>
                    <div className="stat-card animate-fade-in animate-delay-2">
                        <div className="stat-value">{stats.completed_rides}</div>
                        <div className="stat-label">Rides Completed</div>
                    </div>
                    <div className="stat-card animate-fade-in animate-delay-3">
                        <div className="stat-value">{Number(profile.total_distance || 0).toFixed(1)} km</div>
                        <div className="stat-label">Total Distance</div>
                    </div>
                    <div className="stat-card animate-fade-in animate-delay-4">
                        <div className="stat-value">Tk {Number(stats.total_spent || 0).toFixed(0)}</div>
                        <div className="stat-label">Total Spent</div>
                    </div>
                </div>

                {/* quick action */}
                <div className="glass-card animate-fade-in" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '32px',
                    background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.15), rgba(0, 206, 201, 0.1))',
                }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>
                            Need a ride?
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Request a ride and we'll match you with a nearby driver
                        </p>
                    </div>
                    <button className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                        Request a Ride
                    </button>
                </div>

                {/* recent rides */}
                <div className="glass-card animate-fade-in">
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>
                        Recent Rides
                    </h2>

                    {recent_rides.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>
                            No rides yet. Request your first ride!
                        </p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        {['Date', 'Route', 'Driver', 'Type', 'Fare', 'Status'].map(h => (
                                            <th key={h} style={{
                                                textAlign: 'left',
                                                padding: '12px 16px',
                                                color: 'var(--text-secondary)',
                                                fontSize: '0.8rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                fontWeight: 600,
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent_rides.map((ride) => (
                                        <tr key={ride.ride_id} style={{
                                            borderBottom: '1px solid rgba(45, 45, 68, 0.5)',
                                            transition: 'background 0.2s',
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(108, 92, 231, 0.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>
                                                {new Date(ride.requested_at).toLocaleDateString('en-BD', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>
                                                <div>{ride.pickup_address || 'N/A'}</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                    to {ride.drop_address || 'N/A'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>
                                                {ride.driver_name || '-'}
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>
                                                {ride.vehicle_type || '-'}
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: 600 }}>
                                                Tk {Number(ride.fare_amount || 0).toFixed(0)}
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span className={`status-badge status-${ride.ride_status}`}>
                                                    {ride.ride_status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

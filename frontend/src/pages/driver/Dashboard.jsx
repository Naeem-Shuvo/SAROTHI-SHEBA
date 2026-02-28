import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../api/axios';

export default function DriverDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchDashboard() {
            try {
                const res = await api.get('/drivers/dashboard');
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

    const { profile, vehicle, stats, recent_rides } = data;

    return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar role="driver" />

            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
                {/* welcome header */}
                <div className="animate-fade-in" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '32px',
                    flexWrap: 'wrap',
                    gap: '16px',
                }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>
                            Welcome back, <span className="gradient-text">{profile.name}</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Here's your driver overview
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`status-badge status-${profile.status}`}>
                            {profile.status}
                        </span>
                    </div>
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
                        <div className="stat-value">Tk {Number(stats.total_earnings || 0).toFixed(0)}</div>
                        <div className="stat-label">Total Earnings</div>
                    </div>
                    <div className="stat-card animate-fade-in animate-delay-4">
                        <div className="stat-value">{stats.total_rides}</div>
                        <div className="stat-label">Total Rides</div>
                    </div>
                </div>

                {/* vehicle and action */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: vehicle ? '1fr 1fr' : '1fr',
                    gap: '20px',
                    marginBottom: '32px',
                }}>
                    {vehicle ? (
                        <div className="glass-card animate-fade-in">
                            <h3 style={{ fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.8rem' }}>
                                Your Vehicle
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem',
                                    fontWeight: 700,
                                    color: 'white',
                                }}>
                                    CAR
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{vehicle.model}</h4>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        {vehicle.plate_number} - {vehicle.color}
                                    </p>
                                    <span className="status-badge status-available" style={{ marginTop: '4px', display: 'inline-block' }}>
                                        {vehicle.vehicle_type}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card animate-fade-in" style={{ textAlign: 'center', padding: '32px' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                No vehicle registered yet
                            </p>
                            <button className="btn-primary">+ Add Vehicle</button>
                        </div>
                    )}

                    <div className="glass-card animate-fade-in" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(0, 206, 201, 0.1), rgba(108, 92, 231, 0.15))',
                        textAlign: 'center',
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
                            Ready to earn?
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                            Go online to start receiving ride requests
                        </p>
                        <button className="btn-primary">
                            Go Online
                        </button>
                    </div>
                </div>

                {/* recent rides */}
                <div className="glass-card animate-fade-in">
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>
                        Recent Rides
                    </h2>

                    {recent_rides.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>
                            No rides yet. Go online to start receiving requests!
                        </p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        {['Date', 'Route', 'Passenger', 'Type', 'Fare', 'Status'].map(h => (
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
                                                {ride.passenger_name}
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

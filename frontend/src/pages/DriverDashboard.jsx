import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Bike, LayoutDashboard, Bell, MapPin, ScrollText, AlertTriangle, Banknote, Route, Star, Wifi } from 'lucide-react';

function DriverDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [rides, setRides] = useState([]);
  const [earnings, setEarnings] = useState({ total_rides: 0, total_earnings: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api('/dashboard/driver');
        setProfile(data.profile);
        setRides(data.rides);
        setEarnings(data.earnings);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleLogout = async () => {
    try {
      await api('/logout', { method: 'POST' });
    } catch (err) { /* logout anyway */ }
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">SAROTHI SHEBA</div>
        <nav className="dash-nav">
          <button className="dash-nav-item" onClick={() => navigate('/dashboard/driver')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button className="dash-nav-item" onClick={() => navigate('/rides/available')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} /> Find Rides
          </button>
          <button className="dash-nav-item" onClick={() => navigate('/active-ride')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} /> Active Ride
          </button>
          <button className="dash-nav-item" onClick={() => navigate('/rides/history')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScrollText size={18} /> Ride History
          </button>
        </nav>
        <button className="btn btn-danger dash-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title">Driver Dashboard</h1>
          <div className="dash-user-badge">
            <span className="dash-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bike size={20} color="var(--primary)" /></span>
            <span>{user?.name || 'Driver'}</span>
          </div>
        </header>

        {error && (
          <div className="alert alert-error" style={{ margin: 'var(--space-lg) 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        {/* Stats Row */}
        <div className="dash-stats-grid">
          <div className="dash-stat-card dash-stat-card--accent">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Banknote size={24} color="var(--bg-primary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">৳{earnings.total_earnings}</span>
              <span className="dash-stat-label">Total Earnings</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Route size={24} color="var(--accent-secondary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{earnings.total_rides}</span>
              <span className="dash-stat-label">Rides Completed</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={24} color="#FFD700" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{profile?.rating_average || '0.00'}</span>
              <span className="dash-stat-label">Rating</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wifi size={24} color="var(--accent-info)" /></span>
            <div className="dash-stat-info">
              <span className={`dash-stat-value ${profile?.status === 'active' ? 'text-green' : 'text-muted'}`}>
                {profile?.status || 'offline'}
              </span>
              <span className="dash-stat-label">Status</span>
            </div>
          </div>
        </div>

        {/* Profile & Vehicle */}
        <div className="dash-grid-2">
          <div className="dash-card">
            <h2 className="dash-card-title">Profile</h2>
            <div className="dash-profile-grid">
              <div className="dash-profile-item">
                <span className="dash-profile-label">Name</span>
                <span className="dash-profile-value">{profile?.name || '—'}</span>
              </div>
              <div className="dash-profile-item">
                <span className="dash-profile-label">Email</span>
                <span className="dash-profile-value">{profile?.email || '—'}</span>
              </div>
              <div className="dash-profile-item">
                <span className="dash-profile-label">Phone</span>
                <span className="dash-profile-value">{profile?.phone_number || '—'}</span>
              </div>
              <div className="dash-profile-item">
                <span className="dash-profile-label">License</span>
                <span className="dash-profile-value">{profile?.license_number || '—'}</span>
              </div>
            </div>
          </div>

          <div className="dash-card">
            <h2 className="dash-card-title">Vehicle</h2>
            <div className="dash-profile-grid">
              <div className="dash-profile-item">
                <span className="dash-profile-label">Type</span>
                <span className="dash-profile-value">{profile?.type_name || 'Not registered'}</span>
              </div>
              <div className="dash-profile-item">
                <span className="dash-profile-label">Model</span>
                <span className="dash-profile-value">{profile?.model || '—'}</span>
              </div>
              <div className="dash-profile-item">
                <span className="dash-profile-label">Color</span>
                <span className="dash-profile-value">{profile?.color || '—'}</span>
              </div>
              <div className="dash-profile-item">
                <span className="dash-profile-label">Plate</span>
                <span className="dash-profile-value">{profile?.plate_number || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ride History */}
        <div className="dash-card">
          <h2 className="dash-card-title">Ride History</h2>
          {rides.length === 0 ? (
            <p className="dash-empty">No rides completed yet.</p>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Pickup</th>
                    <th>Drop-off</th>
                    <th>Passenger</th>
                    <th>Fare</th>
                    <th>Distance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map((ride) => (
                    <tr key={ride.ride_id}>
                      <td>{ride.pickup_address || '—'}</td>
                      <td>{ride.drop_address || '—'}</td>
                      <td>{ride.passenger_name || '—'}</td>
                      <td>৳{ride.fare_amount || '—'}</td>
                      <td>{ride.distance_km ? `${ride.distance_km} km` : '—'}</td>
                      <td>
                        <span className={`dash-status dash-status--${ride.ride_status}`}>
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
      </main>
    </div>
  );
}

export default DriverDashboard;

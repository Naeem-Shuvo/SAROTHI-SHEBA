import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LayoutDashboard, Car, MapPin, ScrollText, User, AlertTriangle, Star, Ruler, Route } from 'lucide-react';

function PassengerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api('/dashboard/passenger');
        setProfile(data.profile);
        setRides(data.rides);
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
          <button className="dash-nav-item" onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button className="dash-nav-item" onClick={() => navigate('/rides/request')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={18} /> Request Ride
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
          <h1 className="dash-title">Passenger Dashboard</h1>
          <div className="dash-user-badge">
            <span className="dash-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="var(--primary)" /></span>
            <span>{user?.name || 'Passenger'}</span>
          </div>
        </header>

        {error && (
          <div className="alert alert-error" style={{ margin: 'var(--space-lg) 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        {/* Stats Row */}
        <div className="dash-stats-grid">
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={24} color="#FFD700" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{profile?.rating_average || '0.00'}</span>
              <span className="dash-stat-label">Rating</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ruler size={24} color="var(--accent-info)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{profile?.total_distance || '0'} km</span>
              <span className="dash-stat-label">Total Distance</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Route size={24} color="var(--accent-secondary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{rides.length}</span>
              <span className="dash-stat-label">Total Rides</span>
            </div>
          </div>
        </div>

        {/* Profile Card */}
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
          </div>
        </div>

        {/* Ride History */}
        <div className="dash-card">
          <h2 className="dash-card-title">Ride History</h2>
          {rides.length === 0 ? (
            <p className="dash-empty">No rides yet. Request your first ride!</p>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Pickup</th>
                    <th>Drop-off</th>
                    <th>Driver</th>
                    <th>Vehicle</th>
                    <th>Fare</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map((ride) => (
                    <tr key={ride.ride_id}>
                      <td>{ride.pickup_address || '—'}</td>
                      <td>{ride.drop_address || '—'}</td>
                      <td>{ride.driver_name || '—'}</td>
                      <td>{ride.vehicle_type || '—'}</td>
                      <td>৳{ride.fare_amount || '—'}</td>
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

export default PassengerDashboard;

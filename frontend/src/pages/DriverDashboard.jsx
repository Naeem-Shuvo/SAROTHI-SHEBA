import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Bike, LayoutDashboard, Bell, MapPin, ScrollText, AlertTriangle, Banknote, Route, Star, Wifi } from 'lucide-react';

function DriverDashboard() {

  // auth context theke driver info r logout function hook nisi
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // driver er personal profile information state e rakhtesi
  const [profile, setProfile] = useState(null);

  // driver er kora sobgula ride er list state e thakbe
  const [rides, setRides] = useState([]);

  // driver er total income r ride count track kortesi ekhane
  const [earnings, setEarnings] = useState({ total_rides: 0, total_earnings: 0 });

  // data loading status track korar jonno state update kortesi
  const [loading, setLoading] = useState(true);

  // error message dekhate hole ei state display logic update hobe
  const [error, setError] = useState('');

  // dashboard er data (profile, rides, earnings) fetch korar main logic
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // backend api theke driver er specific dashboard data load kortesi
        const data = await api('/dashboard/driver');
        // asha data gula respective state e set kortesi
        setProfile(data.profile);
        setRides(data.rides);
        setEarnings(data.earnings);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        // loading cycle complete, spinner off hobe
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // session terminate korar logic handler
  const handleLogout = async () => {
    try {
      // server theke session out korar request kortesi
      await api('/logout', { method: 'POST' });
    } catch (err) { /* failed hoileo local logout jate hoy logic path */ }
    logout();
    navigate('/login');
  };

  // initial data load hobar shomoy screen overlay point ui logic
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
      {/* Sidebar - driver er navigation pane navigation point ui logic display */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">SAROTHI SHEBA</div>
        <nav className="dash-nav">
          {/* Main dashboard view link logic ui display pointer */}
          <button className="dash-nav-item" onClick={() => navigate('/dashboard/driver')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          {/* Available rides khujar link pointer logic ui display point */}
          <button className="dash-nav-item" onClick={() => navigate('/rides/available')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} /> Find Rides
          </button>
          {/* Currently active ride tracker link pointer logic display generation logic */}
          <button className="dash-nav-item" onClick={() => navigate('/active-ride')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} /> Active Ride
          </button>
          {/* Purana ride record check korar link logic display logic handler */}
          <button className="dash-nav-item" onClick={() => navigate('/rides/history')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScrollText size={18} /> Ride History
          </button>
        </nav>
        {/* Logout execution action point ui display logic handler point logic */}
        <button className="btn btn-danger dash-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* Main monitoring display for driver leads and stats layout logic point ui rendering */}
      <main className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title">Driver Dashboard</h1>
          {/* Driver profile indicator badge visuals rendering logic layout display generation logic */}
          <div className="dash-user-badge">
            <span className="dash-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bike size={20} color="var(--primary)" /></span>
            <span>{user?.name || 'Driver'}</span>
          </div>
        </header>

        {/* Global error alert container handler logic ui display generation pointer logic */}
        {error && (
          <div className="alert alert-error" style={{ margin: 'var(--space-lg) 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        {/* Stats Summary Grid - driver earnings r activity card display point visual rendering logic */}
        <div className="dash-stats-grid">
          {/* Total revenue earning summary card indicator logic point display ui logic rendering */}
          <div className="dash-stat-card dash-stat-card--accent">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Banknote size={24} color="var(--bg-primary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">৳{earnings.total_earnings}</span>
              <span className="dash-stat-label">Total Earnings</span>
            </div>
          </div>
          {/* Total rides completion summary card indicator logic point display ui logic rendering logic */}
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Route size={24} color="var(--accent-secondary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{earnings.total_rides}</span>
              <span className="dash-stat-label">Rides Completed</span>
            </div>
          </div>
          {/* Feedback rating average monitor card display point ui logic generation pointer logic ui display */}
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={24} color="#FFD700" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{profile?.rating_average || '0.00'}</span>
              <span className="dash-stat-label">Rating</span>
            </div>
          </div>
          {/* Connectivity / Approval status indicator card display point ui logic rendering logic pointer setup */}
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

        {/* User Information & Vehicle Meta Details Block layout display logic point rendering pointer display */}
        <div className="dash-grid-2">
          {/* Profile particulars card view point visuals rendering logic layout display generation logic display */}
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

          {/* Vehicle specifications meta details card view point visuals rendering logic layout logic generation */}
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

        {/* Driver Activity Logs Ride History Data display container area layout visual rendering points layout display */}
        <div className="dash-card">
          <h2 className="dash-card-title">Ride History</h2>
          {/* Empty log state message visual rendering logic indicator logic point ui display generation point */}
          {rides.length === 0 ? (
            <p className="dash-empty">No rides completed yet.</p>
          ) : (
            /* Historical ride record data display generation logic layout rendering visuals points layout display logic */
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
                  {/* Recent ride log record mapping logic visual generation rendering logic point ui display layout display logic handler */}
                  {rides.map((ride) => (
                    <tr key={ride.ride_id}>
                      <td>{ride.pickup_address || '—'}</td>
                      <td>{ride.drop_address || '—'}</td>
                      <td>{ride.passenger_name || '—'}</td>
                      <td>৳{ride.fare_amount || '—'}</td>
                      <td>{ride.distance_km ? `${ride.distance_km} km` : '—'}</td>
                      <td>
                        {/* Status chip indicator badge visuals generation layout rendering logic point ui display layout display logic handler */}
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LayoutDashboard, Car, MapPin, ScrollText, User, AlertTriangle, Star, Ruler, Route } from 'lucide-react';

function PassengerDashboard() {

  // auth context theke user details r logout function hook theke nisi
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // passenger er profile related data store korar jonno state nisi
  const [profile, setProfile] = useState(null);

  // passenger er historical ride list array te rakhtesi ekhane
  const [rides, setRides] = useState([]);

  // dashboard data fetch hobar shomoy initial loading status handle kortesi
  const [loading, setLoading] = useState(true);

  // error message display korar jonno state update pointer logic
  const [error, setError] = useState('');

  // backend theke passenger specific dashboard stats r rides fetch korar handler
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // api endpoint call kore dashboard data load kortesi
        const data = await api('/dashboard/passenger');
        setProfile(data.profile);
        setRides(data.rides);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        // request cycle complete, spinner bondho hobe visual rendering
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // user logout logic execution handler point
  const handleLogout = async () => {
    try {
      // server side session clear korar jonno request pathaitesi handler point
      await api('/logout', { method: 'POST' });
    } catch (err) { /* error hoileo jate local logout clear hoy logic path */ }
    logout();
    navigate('/login');
  };

  // initial background fetch hobar shomoy overlay loading ui generation layout
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
      {/* Sidebar - passenger er primary navigation console layout rendering visuals display */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">SAROTHI SHEBA</div>
        <nav className="dash-nav">
          {/* Main dashboard base view link identifier logic ui pointer rendering */}
          <button className="dash-nav-item" onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          {/* Notun ride book korar navigation handler logic pointer ui rendering logic layout display */}
          <button className="dash-nav-item" onClick={() => navigate('/rides/request')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={18} /> Request Ride
          </button>
          {/* Ongoing ride tracker link identifier logic pointer ui display generation logic rendering layout */}
          <button className="dash-nav-item" onClick={() => navigate('/active-ride')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} /> Active Ride
          </button>
          {/* Purana ride record log list check korar handler logic pointer layout rendering logic handler display */}
          <button className="dash-nav-item" onClick={() => navigate('/rides/history')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScrollText size={18} /> Ride History
          </button>
        </nav>
        {/* Session termination execution handler point ui display logic handler point rendering layout display */}
        <button className="btn btn-danger dash-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* Main data analytics monitor area for passenger leads rendering logic layout display generation rendering */}
      <main className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title">Passenger Dashboard</h1>
          {/* Passenger personality indicator badge visuals rendering logic layout display generation rendering logic display */}
          <div className="dash-user-badge">
            <span className="dash-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="var(--primary)" /></span>
            <span>{user?.name || 'Passenger'}</span>
          </div>
        </header>

        {/* Global error alert box handler logic ui display generation pointer logic ui rendering layout rendering */}
        {error && (
          <div className="alert alert-error" style={{ margin: 'var(--space-lg) 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        {/* Aggregate Stats Summary Grid - passenger activity card indicators mapping logic visuals point display ui rendering */}
        <div className="dash-stats-grid">
          {/* Reputation average monitor indicator card display point ui logic generation pointer logic ui display generation rendering */}
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={24} color="#FFD700" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{profile?.rating_average || '0.00'}</span>
              <span className="dash-stat-label">Rating</span>
            </div>
          </div>
          {/* Traveled distance metric indicator card display point ui logic rendering logic pointer setup visuals generation rendering */}
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ruler size={24} color="var(--accent-info)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{profile?.total_distance || '0'} km</span>
              <span className="dash-stat-label">Total Distance</span>
            </div>
          </div>
          {/* Frequency of rides completion monitor indicator card display point ui logic rendering logic pointer generation logic rendering */}
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Route size={24} color="var(--accent-secondary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{rides.length}</span>
              <span className="dash-stat-label">Total Rides</span>
            </div>
          </div>
        </div>

        {/* Core Personal Particulars Container Area layout display logic point rendering pointer display generation rendering logic display */}
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

        {/* Historical Ride Record Data Log display generation logic layout rendering visuals points layout display logic rendering generation */}
        <div className="dash-card">
          <h2 className="dash-card-title">Ride History</h2>
          {/* Empty log state message visual rendering logic indicator logic point ui display generation point layout rendering logic */}
          {rides.length === 0 ? (
            <p className="dash-empty">No rides yet. Request your first ride!</p>
          ) : (
            /* Tabular ride log data generation logic layout rendering visuals points layout display logic rendering generation logic handler */
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
                  {/* Historical record mapping logic visual logic rendering layout rendering logic point ui display layout rendering logic handler */}
                  {rides.map((ride) => (
                    <tr key={ride.ride_id}>
                      <td>{ride.pickup_address || '—'}</td>
                      <td>{ride.drop_address || '—'}</td>
                      <td>{ride.driver_name || '—'}</td>
                      <td>{ride.vehicle_type || '—'}</td>
                      <td>৳{ride.fare_amount || '—'}</td>
                      <td>
                        {/* Status identifier badge visuals generation layout rendering logic point ui display layout rendering logic handler point */}
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

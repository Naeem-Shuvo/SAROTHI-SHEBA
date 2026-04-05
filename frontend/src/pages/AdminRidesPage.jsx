import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LayoutDashboard, Users, Car, Shield, AlertTriangle, CheckCircle, Banknote, List, Smartphone } from 'lucide-react';

function AdminRidesPage() {

  //admin user details r logout function hook theke nisi
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  //sobgula ride er data ekta list state e store kortesi
  const [rides, setRides] = useState([]);

  //data fetch hobar shomoy loading status dharon korbe
  const [loading, setLoading] = useState(true);

  //error message dekhate hole ei state update hobe
  const [error, setError] = useState('');

  //ride status onujayi (requested, completed) filter korar jonno state
  const [statusFilter, setStatusFilter] = useState('');

  //backend theke ride list fetch korar function, status filter logic soho
  const fetchRides = async (status = '') => {
    setLoading(true);
    try {
      //filter status handle kore endpoint set kortesi
      const endpoint = status ? `/admin/rides?status=${status}` : '/admin/rides';
      const data = await api(endpoint);
      //api theke asha ride gula state e set kortesi
      setRides(data.rides);
    } catch (err) {
      setError(err.message || 'Failed to load rides');
    } finally {
      //loading state off kore ditesi data ashar por
      setLoading(false);
    }
  };

  // status filter update hoilei component abar ride fetch korbe
  useEffect(() => {
    fetchRides(statusFilter);
  }, [statusFilter]);

  //admin logout handler logic
  const handleLogout = async () => {
    try {
      //session clear korar jonno server e logout request pathaitesi 
      await api('/logout', { method: 'POST' });
    } catch (err) { /* error hoileo local logout hobe */ }
    logout();
    navigate('/login');
  };

  //completed ride gula filter kore alada kortesi revenue calculation er jonno
  const completedRides = rides.filter(r => r.ride_status === 'completed');
  //completed ride theke fare amount jog kore total revenue ber kortesi
  const totalRevenue = completedRides.reduce((sum, r) => sum + parseFloat(r.fare_amount || 0), 0);

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">SAROTHI SHEBA</div>
        <nav className="dash-nav">
          <button className="dash-nav-item" onClick={() => navigate('/dashboard/admin')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className="dash-nav-item" onClick={() => navigate('/admin/users')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> Users
          </button>
          <button className="dash-nav-item active" onClick={() => navigate('/admin/rides')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={18} /> All Rides
          </button>
        </nav>
        <button className="btn btn-danger dash-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title">Ride Monitor</h1>
          <div className="dash-user-badge">
            <span className="dash-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={20} color="var(--primary)" /></span>
            <span>{user?.name || 'Admin'}</span>
          </div>
        </header>

        {error && (
          <div className="alert alert-error" style={{ margin: 'var(--space-lg) 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        <div className="dash-stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><List size={24} color="var(--accent-info)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{rides.length}</span>
              <span className="dash-stat-label">Showing</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={24} color="var(--accent-success)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{completedRides.length}</span>
              <span className="dash-stat-label">Completed</span>
            </div>
          </div>
          <div className="dash-stat-card dash-stat-card--accent">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Banknote size={24} color="var(--bg-primary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">৳{totalRevenue.toFixed(2)}</span>
              <span className="dash-stat-label">Revenue</span>
            </div>
          </div>
        </div>

        {/* Filter Selection Bar - status wise ride filter korar buttons */}
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>Filter by Status:</span>
            {['', 'requested', 'accepted', 'ongoing', 'completed', 'cancelled'].map(status => (
              <button
                key={status}
                className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(status)}
              >
                {status || 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <h2 className="dash-card-title">
            All Rides
            <span className="dash-badge" style={{ marginLeft: '0.5rem' }}>{rides.length}</span>
          </h2>

          {loading ? (
            <div className="dash-loading" style={{ padding: '2rem' }}>
              <div className="dash-spinner"></div>
            </div>
          ) : rides.length === 0 ? (
            <p className="dash-empty">No rides found with the selected filter.</p>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Passenger</th>
                    <th>Driver</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Distance</th>
                    <th>Fare</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map((ride) => (
                    <tr key={ride.ride_id}>
                      <td><code>{ride.ride_id}</code></td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{ride.passenger_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ride.passenger_email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{ride.driver_name || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ride.driver_email || ''}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ride.pickup_address}>
                          <span style={{ color: 'var(--accent-info)' }}>A:</span> {ride.pickup_address?.split(',')[0] || '—'}
                        </div>
                        <div style={{ fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ride.drop_address}>
                          <span style={{ color: 'var(--accent-secondary)' }}>B:</span> {ride.drop_address?.split(',')[0] || '—'}
                        </div>
                      </td>
                      <td style={{ fontSize: '1.2rem' }}>{ride.vehicle_type === 'CNG Auto' ? '🛺' : (ride.vehicle_type === 'Bike' ? '🏍️' : '🚗')}</td>
                      <td>
                        <span className={`dash-status dash-status--${ride.ride_status}`}>
                          {ride.ride_status}
                        </span>
                      </td>
                      <td>{ride.distance_km ? `${ride.distance_km} km` : '—'}</td>
                      <td style={{ fontWeight: 600, color: ride.fare_amount ? 'var(--accent-success)' : 'inherit' }}>
                        {ride.fare_amount ? `৳${ride.fare_amount}` : '—'}
                      </td>
                      <td>{new Date(ride.requested_at).toLocaleDateString()}</td>
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

export default AdminRidesPage;

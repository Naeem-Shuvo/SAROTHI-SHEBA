import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ArrowLeft, RefreshCw, User, Phone, Car, MapPin, Inbox } from 'lucide-react';

function AvailableRidesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchRides = async () => {
    try {
      const data = await api('/rides/available');
      setRides(data.rides);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load available rides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
    
    // Optional: Refresh every 10 seconds
    const interval = setInterval(fetchRides, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (rideId) => {
    setActionLoading(rideId);
    try {
      await api('/rides/accept', {
        method: 'POST',
        body: JSON.stringify({ ride_id: rideId })
      });
      // On success, go to active ride viewing page
      navigate('/active-ride');
    } catch (err) {
      setError(err.message || 'Failed to accept ride');
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner"></div>
        <p>Finding passengers nearby...</p>
      </div>
    );
  }

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar" style={{ width: '200px' }}>
        <div className="dash-sidebar-logo" style={{ fontSize: '1.2rem' }}>SAROTHI</div>
        <nav className="dash-nav">
          <button className="dash-nav-item" onClick={() => navigate('/dashboard/driver')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back
          </button>
        </nav>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title">Available Ride Requests</h1>
          <button className="btn btn-secondary btn-sm" onClick={() => { setLoading(true); fetchRides(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} className={loading ? 'dash-spinner' : ''} /> Refresh
          </button>
        </header>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            <span>⚠</span> {error}
          </div>
        )}

        <div className="dash-card">
          {rides.length === 0 ? (
            <div className="dash-empty">
              <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}><Inbox size={64} /></div>
              No ride requests right now. Wait a bit or refresh.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {rides.map(ride => (
                <div key={ride.ride_id} className="dash-stat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="dash-status dash-status--requested">New Request</span>
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(ride.requested_at).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-info)' }}></div>
                         {ride.pickup_address}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <div style={{ width: '8px', height: '8px', background: 'var(--accent-secondary)' }}></div>
                         {ride.drop_address}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={14} /> {ride.passenger_name}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={14} /> {ride.passenger_phone}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                         {ride.vehicle_type === 'CNG Auto' ? '🛺' : <Car size={14} />} {ride.vehicle_type}
                      </span>
                    </div>
                  </div>
                  <button 
                    className={`btn btn-primary ${actionLoading === ride.ride_id ? 'btn-loading' : ''}`}
                    onClick={() => handleAccept(ride.ride_id)}
                    disabled={actionLoading === ride.ride_id}
                    style={{ padding: '0.75rem 2rem' }}
                  >
                    Accept Ride
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AvailableRidesPage;

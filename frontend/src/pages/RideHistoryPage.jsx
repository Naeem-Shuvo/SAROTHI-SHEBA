import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function RideHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    try {
      const data = await api('/rides/history');
      setHistory(data.history);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load ride history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner"></div>
        <p>Loading your past rides...</p>
      </div>
    );
  }

  const isDriver = user.role === 'driver';

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar" style={{ width: '250px' }}>
        <div className="dash-sidebar-logo" style={{ fontSize: '1.2rem' }}>SAROTHI</div>
        <nav className="dash-nav">
          <button className="dash-nav-item" onClick={() => navigate(isDriver ? '/dashboard/driver' : '/dashboard')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <span>←</span> Back
          </button>
        </nav>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title">📜 Ride History</h1>
        </header>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            <span>⚠</span> {error}
          </div>
        )}

        <div className="dash-card">
          {history.length === 0 ? (
            <div className="dash-empty">
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📭</span>
              You have no past rides to show.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>{isDriver ? 'Passenger' : 'Driver'}</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Fare / Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((ride) => (
                    <tr key={ride.ride_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{new Date(ride.completed_at || new Date()).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(ride.completed_at || new Date()).toLocaleTimeString()}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{isDriver ? ride.passenger_name : (ride.driver_name || '—')}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.9rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ride.pickup_address}>
                          <span style={{ color: 'var(--accent-info)' }}>A:</span> {ride.pickup_address.split(',')[0]}
                        </div>
                        <div style={{ fontSize: '0.9rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ride.drop_address}>
                          <span style={{ color: 'var(--accent-secondary)' }}>B:</span> {ride.drop_address.split(',')[0]}
                        </div>
                      </td>
                      <td>{ride.vehicle_type}</td>
                      <td>
                        <span className={`dash-status dash-status--${ride.ride_status}`}>
                          {ride.ride_status}
                        </span>
                      </td>
                      <td>
                         {ride.ride_status === 'completed' ? (
                             <>
                               <div style={{ fontWeight: 600, color: 'var(--accent-success)' }}>৳{ride.fare_amount}</div>
                               <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ride.distance_km} km</div>
                             </>
                         ) : (
                             <span className="text-muted">—</span>
                         )}
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

export default RideHistoryPage;

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ScrollText, CheckCircle, XCircle, AlertTriangle, Inbox, Check, CreditCard, ArrowLeft, Bike, Car } from 'lucide-react';

function RideHistoryPage() {

  // authenticated user details nisi auth context theke
  const { user } = useAuth();
  const navigate = useNavigate();

  // url theke query params check korar jonno hook nisi
  const [searchParams] = useSearchParams();

  // historical ride data store korar jonno state array nisi
  const [history, setHistory] = useState([]);

  // data fetch hobar shomoy loading status handle kortesi
  const [loading, setLoading] = useState(true);

  // error message display logic handle korbo ekhane
  const [error, setError] = useState('');

  // specific ride er payment process pending thakle id store rakhtesi
  const [payingRideId, setPayingRideId] = useState(null);

  // SSLCommerz payment gateway theke return asha result trigger point indicator point logic
  const paymentResult = searchParams.get('payment');

  // backend theke user er historical ride log fetch korar main logic handler
  const fetchHistory = async () => {
    try {
      // api call kore sobgula ride record niye ashtesi
      const data = await api('/rides/history');
      // asha details history state e set kortesi
      setHistory(data.history);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load ride history');
    } finally {
      setLoading(false);
    }
  };

  // component mount holei historical records load hobe automatic hook pointer logic
  useEffect(() => {
    fetchHistory();
  }, []);

  // ride er payment initialize korar main execution logic handler
  const handlePayNow = async (rideId) => {
    setPayingRideId(rideId);
    try {
      // backend theke SSLCommerz hosted session create korার request kortesi logic handler
      const data = await api(`/payment/init/${rideId}`, { method: 'POST' });

      // gateway url thakle user k external browser link e redirect kortesi conversion logic
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Failed to get payment URL');
      }
    } catch (err) {
      // initialization failed hoile error banner show hobe visual rendering layout logic
      setError(err.message || 'Payment initialization failed');
    } finally {
      // loading action clear kortesi ui generation logic layout display
      setPayingRideId(null);
    }
  };

  // data load hobar shomoy screen overlay point visual rendering logic layout display
  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner"></div>
        <p>Loading your past rides...</p>
      </div>
    );
  }

  // current logged in user driver kina oita identify kortesi check logic pointer
  const isDriver = user.role === 'driver';

  return (
    <div className="dash-layout">
      {/* Sidebar - history monitoring panel layout rendering visuals display logic rendering */}
      <aside className="dash-sidebar" style={{ width: '250px' }}>
        <div className="dash-sidebar-logo" style={{ fontSize: '1.2rem' }}>SAROTHI</div>
        <nav className="dash-nav">
          {/* Dashboard phire jaoar navigation pointer logic ui display generation rendering logic */}
          <button className="dash-nav-item" onClick={() => navigate(isDriver ? '/dashboard/driver' : '/dashboard')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back
          </button>
        </nav>
      </aside>

      {/* Main activities log monitoring area layout rendering logic layout display generation rendering */}
      <main className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScrollText size={28} color="var(--accent-primary)" /> Ride History
          </h1>
        </header>

        {/* Payment gateway redirects successful feedback logic ui display generation rendering logic */}
        {paymentResult === 'success' && (
          <div className="alert" style={{ marginBottom: '1.5rem', background: 'rgba(0,212,170,0.1)', border: '1px solid var(--accent-success)', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} /> Payment completed successfully!
          </div>
        )}
        {/* Payment execution failed status indicator ui display generation rendering logic pointer setup */}
        {paymentResult === 'failed' && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <XCircle size={20} /> Payment failed. You can try again.
          </div>
        )}
        {/* User action cancellation feedback logic ui display generation rendering logic pointer setup visuals */}
        {paymentResult === 'cancelled' && (
          <div className="alert" style={{ marginBottom: '1.5rem', background: 'rgba(255,171,0,0.1)', border: '1px solid #ffab00', color: '#ffab00', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> Payment was cancelled.
          </div>
        )}

        {/* Global error notification container layout rendering logic layout display generation rendering logic */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        {/* Historical record mapping container area layout display logic point rendering pointer display generation */}
        <div className="dash-card">
          {/* Empty log set message visual rendering logic indicator logic point ui display generation logic */}
          {history.length === 0 ? (
            <div className="dash-empty">
              <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}><Inbox size={64} /></div>
              You have no past rides to show.
            </div>
          ) : (
            /* Historical dataset monitor tabular layout rendering logic layout display generation rendering logic handler */
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
                    {/* Payment column logic strictly for passenger lead conversion tracking visual setup pointer */}
                    {!isDriver && <th>Payment</th>}
                  </tr>
                </thead>
                <tbody>
                  {/* Historical dataset row wise mapping logic visual generation rendering layout rendering points display */}
                  {history.map((ride) => (
                    <tr key={ride.ride_id}>
                      <td>
                        {/* Timestamp identification logic points ui display generation points layout rendering logic display */}
                        <div style={{ fontWeight: 600 }}>{new Date(ride.drop_time || ride.requested_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(ride.drop_time || ride.requested_at).toLocaleTimeString()}</div>
                      </td>
                      <td>
                        {/* Counterpart name identifier logic visuals generation logic rendering points layout display generation */}
                        <div style={{ fontWeight: 500 }}>{isDriver ? ride.passenger_name : (ride.driver_name || '—')}</div>
                      </td>
                      <td>
                        {/* Location address sequence metrics visuals rendering points layout display generation rendering logic handler */}
                        <div style={{ fontSize: '0.9rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ride.pickup_address}>
                          <span style={{ color: 'var(--accent-info)' }}>A:</span> {ride.pickup_address?.split(',')[0] || '—'}
                        </div>
                        <div style={{ fontSize: '0.9rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ride.drop_address}>
                          <span style={{ color: 'var(--accent-secondary)' }}>B:</span> {ride.drop_address?.split(',')[0] || '—'}
                        </div>
                      </td>
                      <td>
                        {/* Vehicle type identifier icons mapping logic visual rendering layout generation points layout display */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {ride.vehicle_type === 'CNG Auto' ? '🛺' : (ride.vehicle_type === 'Bike' ? <Bike size={16} /> : <Car size={16} />)}
                          <span>{ride.vehicle_type}</span>
                        </div>
                      </td>
                      <td>
                        {/* Lifecycle status identification badge visuals generation layout rendering points layout display generation */}
                        <span className={`dash-status dash-status--${ride.ride_status}`}>
                          {ride.ride_status}
                        </span>
                      </td>
                      <td>
                        {/* Monetary metric summary displays logic rendering points layout display generation rendering logic generation */}
                        {ride.ride_status === 'completed' ? (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--accent-success)' }}>৳{ride.fare_amount}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ride.distance_km} km</div>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      {/* Session transaction execution point button visuals rendering points layout display generation logic display pointer */}
                      {!isDriver && (
                        <td>
                          {ride.ride_status === 'completed' && (
                            // Paid status identifier badge visuals generation layout rendering points layout display generation logic
                            ride.payment_status === 'paid' ? (
                              <span className="dash-status dash-status--completed" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Check size={14} /> Paid
                              </span>
                            ) : (
                              // Payment command execution action button visual rendering points layout display generation logic rendering
                              <button
                                className={`btn btn-primary btn-sm ${payingRideId === ride.ride_id ? 'btn-loading' : ''}`}
                                onClick={() => handlePayNow(ride.ride_id)}
                                disabled={payingRideId === ride.ride_id}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <CreditCard size={14} /> Pay ৳{ride.fare_amount}
                              </button>
                            )
                          )}
                        </td>
                      )}
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

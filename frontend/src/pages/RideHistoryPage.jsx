import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ScrollText, CheckCircle, XCircle, AlertTriangle, Inbox, Check, CreditCard, ArrowLeft, Bike, Car } from 'lucide-react';

function RideHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingRideId, setPayingRideId] = useState(null);

  // check if the user was redirected back from SSLCommerz payment
  const paymentResult = searchParams.get('payment');

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

  // initiate SSLCommerz payment for a ride
  const handlePayNow = async (rideId) => {
    setPayingRideId(rideId);
    try {
      // call the backend to initialize SSLCommerz session
      const data = await api(`/payment/init/${rideId}`, { method: 'POST' });

      // redirect to SSLCommerz hosted payment gateway
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Failed to get payment URL');
      }
    } catch (err) {
      setError(err.message || 'Payment initialization failed');
    } finally {
      setPayingRideId(null);
    }
  };

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
          <button className="dash-nav-item" onClick={() => navigate(isDriver ? '/dashboard/driver' : '/dashboard')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back
          </button>
        </nav>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <ScrollText size={28} color="var(--accent-primary)" /> Ride History
          </h1>
        </header>

        {/* show payment result banner if redirected from SSLCommerz */}
        {paymentResult === 'success' && (
          <div className="alert" style={{ marginBottom: '1.5rem', background: 'rgba(0,212,170,0.1)', border: '1px solid var(--accent-success)', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} /> Payment completed successfully!
          </div>
        )}
        {paymentResult === 'failed' && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <XCircle size={20} /> Payment failed. You can try again.
          </div>
        )}
        {paymentResult === 'cancelled' && (
          <div className="alert" style={{ marginBottom: '1.5rem', background: 'rgba(255,171,0,0.1)', border: '1px solid #ffab00', color: '#ffab00', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> Payment was cancelled.
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        <div className="dash-card">
          {history.length === 0 ? (
            <div className="dash-empty">
              <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}><Inbox size={64} /></div>
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
                    {/* only passengers see the payment column */}
                    {!isDriver && <th>Payment</th>}
                  </tr>
                </thead>
                <tbody>
                  {history.map((ride) => (
                    <tr key={ride.ride_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{new Date(ride.drop_time || ride.requested_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(ride.drop_time || ride.requested_at).toLocaleTimeString()}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{isDriver ? ride.passenger_name : (ride.driver_name || '—')}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.9rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ride.pickup_address}>
                          <span style={{ color: 'var(--accent-info)' }}>A:</span> {ride.pickup_address?.split(',')[0] || '—'}
                        </div>
                        <div style={{ fontSize: '0.9rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ride.drop_address}>
                          <span style={{ color: 'var(--accent-secondary)' }}>B:</span> {ride.drop_address?.split(',')[0] || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {ride.vehicle_type === 'CNG Auto' ? '🛺' : (ride.vehicle_type === 'Bike' ? <Bike size={16} /> : <Car size={16} />)}
                          <span>{ride.vehicle_type}</span>
                        </div>
                      </td>
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
                      {/* payment action column for passengers */}
                      {!isDriver && (
                        <td>
                          {ride.ride_status === 'completed' && (
                            ride.payment_status === 'paid' ? (
                              <span className="dash-status dash-status--completed" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                 <Check size={14} /> Paid
                              </span>
                            ) : (
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

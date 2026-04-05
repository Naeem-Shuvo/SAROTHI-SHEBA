import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ArrowLeft, RefreshCw, User, Phone, Car, MapPin, Inbox } from 'lucide-react';

function AvailableRidesPage() {

  // driver er authenticated user details nisi
  const { user } = useAuth();
  const navigate = useNavigate();

  // available ride requests gula rakar jonno array state nisi
  const [rides, setRides] = useState([]);

  // data fetch hobar shomoy loading status dharon korbe
  const [loading, setLoading] = useState(true);

  // error message display korar jonno state update hobe
  const [error, setError] = useState('');

  // accept button click korle loading state dharon korbe specific ride-er jonno
  const [actionLoading, setActionLoading] = useState(null);

  //driver er live location rakhbo jate nearest ride sort/filter korte pari
  const [driverLocation, setDriverLocation] = useState(null);

  // backend theke available ride list fetch korar logic handler
  const fetchRides = async () => {
    try {
      if (!driverLocation) {
        setError('Please allow location access to see nearby ride requests');
        setRides([]);
        return;
      }

      // available rides endpoint theke data call kortesi
      const data = await api(`/rides/available?driver_lat=${driverLocation.lat}&driver_lng=${driverLocation.lng}`);
      setRides(data.rides);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load available rides');
    } finally {
      // load shesh, spinner bondho hobe
      setLoading(false);
    }
  };

  // component mount hoilei real time ride request load hobe
  useEffect(() => {
    //driver er location niye tarpor nearby ride load kortesi
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDriverLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      () => {
        setError('Location permission is required to show nearby rides');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );

    //notun request power jonno driver location periodic refresh korbo
    const locationInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          //permission revoke hole existing value diye continue korbo
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    }, 30000);

    return () => clearInterval(locationInterval);
  }, []);

  useEffect(() => {
    if (!driverLocation) return;

    fetchRides();

    // notun request power jonno proti 10 second por por automatic refresh kortesi
    const interval = setInterval(fetchRides, 10000);
    return () => clearInterval(interval);
  }, [driverLocation]);

  // driver kono ride accept korle ei logic call hobe
  const handleAccept = async (rideId) => {
    setActionLoading(rideId);
    try {
      // ride accept korar backend notification pathaitesi
      await api('/rides/accept', {
        method: 'POST',
        body: JSON.stringify({ ride_id: rideId })
      });
      // accept confirm hoile active ride tracking screen e niye jaitesi
      navigate('/active-ride');
    } catch (err) {
      setError(err.message || 'Failed to accept ride');
      setActionLoading(null);
    }
  };

  // results load hobar shomoy initial search display point
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
      {/* Sidebar - amader minimal navigation console */}
      <aside className="dash-sidebar" style={{ width: '200px' }}>
        <div className="dash-sidebar-logo" style={{ fontSize: '1.2rem' }}>SAROTHI</div>
        <nav className="dash-nav">
          {/* Driver dashboard e phire jaoar navigation handler */}
          <button className="dash-nav-item" onClick={() => navigate('/dashboard/driver')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back
          </button>
        </nav>
      </aside>

      {/* Main monitoring display for new ride leads */}
      <main className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title">Available Ride Requests</h1>
          {/* Manual refresh button current leads update korar jonno */}
          <button className="btn btn-secondary btn-sm" onClick={() => { setLoading(true); fetchRides(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} className={loading ? 'dash-spinner' : ''} /> Refresh
          </button>
        </header>

        {/* Global error alert box ui display logic point */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            <span>⚠</span> {error}
          </div>
        )}

        {/* Available rides display container logic area */}
        <div className="dash-card">
          {/* Ride na thakle empty state message indicator logic display point */}
          {rides.length === 0 ? (
            <div className="dash-empty">
              <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}><Inbox size={64} /></div>
              No ride requests right now. Wait a bit or refresh.
            </div>
          ) : (
            /* Ride thakle card wise mapping logic ui display generation logic point */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {rides.map(ride => (
                <div key={ride.ride_id} className="dash-stat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Status badge for quick new leads recognition logic points */}
                      <span className="dash-status dash-status--requested">New Request</span>
                      {/* Creation time tracking logic indicator point ui display */}
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(ride.requested_at).toLocaleTimeString()}</span>
                    </div>
                    {/* Pickup and Dropoff address visuals logic container display point */}
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {/* Pickup location point indicator point visuals logic layout display generation */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-info)' }}></div>
                        {ride.pickup_address}
                      </div>
                      {/* Dropoff location point indicator visual rendering logic layout display generation */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', background: 'var(--accent-secondary)' }}></div>
                        {ride.drop_address}
                      </div>
                    </div>
                    {/* Passenger basic information lead analytics visuals display point layout logic handler */}
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={14} /> {ride.passenger_name}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={14} /> {ride.passenger_phone}</span>
                      {/* Vehicle selection criteria lead identifier logic ui display points visual generation logic rendering */}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {ride.vehicle_type === 'CNG Auto' ? '🛺' : <Car size={14} />} {ride.vehicle_type}
                      </span>
                      {/* distance nearest priority bujhanor jonno display */}
                      {ride.distance_km != null && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={14} /> {Number(ride.distance_km).toFixed(2)} km away</span>
                      )}
                    </div>
                  </div>
                  {/* Lead conversion action execution point button visual rendering logic layout display generation */}
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons
const createIcon = (color) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 1.5rem; height: 1.5rem; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.5);"></div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const pickupIcon = createIcon('var(--accent-info)');
const dropoffIcon = createIcon('var(--accent-secondary)');
const driverIcon = createIcon('var(--accent-primary)');

// Helper to extract Lat/Lng from text like "Lat: 23.8103, Lng: 90.4125"
const extractCoordinates = (addressString) => {
  if (!addressString) return null;
  const latMatch = addressString.match(/Lat:\s*([0-9.-]+)/i);
  const lngMatch = addressString.match(/Lng:\s*([0-9.-]+)/i);
  if (latMatch && lngMatch) {
    return [parseFloat(latMatch[1]), parseFloat(lngMatch[1])];
  }
  // Try to find any two floats in the string
  const floats = addressString.match(/-?\d+\.\d+/g);
  if (floats && floats.length >= 2) {
    return [parseFloat(floats[0]), parseFloat(floats[1])];
  }
  return null;
};

// Rating Modal Component
function RatingModal({ ride, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(rating, comment);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="dash-card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem', textAlign: 'center' }}>Rate your experience</h3>
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>How was the trip with {ride.passenger_name || ride.driver_name || 'your companion'}?</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1,2,3,4,5].map(star => (
             <span key={star} onClick={() => setRating(star)} style={{ fontSize: '2rem', cursor: 'pointer', filter: star <= rating ? 'none' : 'grayscale(100%) opacity(30%)' }}>⭐</span>
          ))}
        </div>

        <textarea 
          className="form-input" 
          placeholder="Leave a comment (optional)..." 
          value={comment} 
          onChange={e => setComment(e.target.value)}
          style={{ minHeight: '100px', marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', gap: '1rem' }}>
           <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Skip</button>
           <button className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>Submit</button>
        </div>
      </div>
    </div>
  );
}

function ActiveRidePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  
  const [distance, setDistance] = useState('');
  const [showRating, setShowRating] = useState(false);

  const fetchActiveRide = async () => {
    try {
      const endpoint = user.role === 'driver' ? '/dashboard/driver' : '/dashboard/passenger';
      const data = await api(endpoint);
      
      const active = data.rides.find(r => 
        r.ride_status === 'requested' || 
        r.ride_status === 'accepted' || 
        r.ride_status === 'ongoing'
      );
      
      setRide(active || null);
    } catch (err) {
      setError(err.message || 'Failed to load active ride');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRide();
    const interval = setInterval({fetchActiveRide}, 5000);
    return () => clearInterval(interval);
  }, [user.role, showRating]); // pause polling if showRating is open

  const updateStatus = async (status) => {
    setActionLoading(status);
    setError('');
    
    const body = { status };
    if (status === 'completed') {
      if (!distance || isNaN(distance) || parseFloat(distance) <= 0) {
        setError('Please enter a valid distance to complete the ride.');
        setActionLoading('');
        return;
      }
      body.distance_km = parseFloat(distance);
    }

    try {
      await api(`/rides/${ride.ride_id}/status`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      // Refresh to see updated state
      await fetchActiveRide();
      
      if (status === 'completed') {
         setShowRating(true);
      }
    } catch (err) {
      setError(err.message || `Failed to mark ride as ${status}`);
    } finally {
      setActionLoading('');
    }
  };

  const handleRate = async (rating_value, comment) => {
     try {
       await api(`/rides/${ride.ride_id}/rate`, {
         method: 'POST',
         body: JSON.stringify({ rating_value, comment })
       });
       setShowRating(false);
       navigate(user.role === 'driver' ? '/dashboard/driver' : '/dashboard');
     } catch (err) {
       alert(err.message || 'Failed to submit rating');
     }
  };

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner"></div>
        <p>Loading active ride...</p>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="dash-layout">
        <main className="dash-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="dash-empty">
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>🛋️</span>
            <h2>No active rides</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>You don't have any ongoing rides at the moment.</p>
            <button className="btn btn-primary" onClick={() => navigate(user.role === 'driver' ? '/rides/available' : '/rides/request')}>
              {user.role === 'driver' ? 'Find Passengers' : 'Request a Ride'}
            </button>
            <button className="btn btn-secondary" style={{ marginLeft: '1rem' }} onClick={() => navigate(user.role === 'driver' ? '/dashboard/driver' : '/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isDriver = user.role === 'driver';
  
  const pickupCoords = extractCoordinates(ride.pickup_address);
  const dropoffCoords = extractCoordinates(ride.drop_address);
  const mapCenter = pickupCoords || dropoffCoords || [23.8103, 90.4125];

  // In a real app with Location_Logs, driverCoords would fetch from the endpoint.
  // We'll mock it slightly offset from pickup for visual indication.
  const driverCoords = pickupCoords ? [pickupCoords[0] - 0.005, pickupCoords[1] - 0.005] : mapCenter;

  return (
    <div className="dash-layout">
      {showRating && <RatingModal ride={ride} onClose={() => { setShowRating(false); navigate(isDriver ? '/dashboard/driver' : '/dashboard'); }} onSubmit={handleRate} />}
      
      <main className="dash-main" style={{ display: 'flex', padding: 0, height: '100vh', boxSizing: 'border-box' }}>
        
        {/* Left pane: Details and Actions */}
        <div style={{ flex: '0 0 400px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-subtle)', boxShadow: '4px 0 15px rgba(0,0,0,0.3)', zIndex: 10 }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Ride Status</h2>
            <span className={`dash-status dash-status--${ride.ride_status}`}>{ride.ride_status}</span>
          </div>

          <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                <span>⚠</span> {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-info)' }}></div>
                  <div style={{ width: '2px', height: '40px', background: 'var(--border-strong)', opacity: 0.5 }}></div>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-secondary)' }}></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pickup</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }} title={ride.pickup_address}>{ride.pickup_address}</div>
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Drop-off</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }} title={ride.drop_address}>{ride.drop_address}</div>
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{isDriver ? 'Passenger' : 'Driver'}</div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    {isDriver ? (ride.passenger_name || '—') : (ride.driver_name || 'Looking for driver...')}
                  </div>
                </div>
                <div style={{ fontSize: '2rem', opacity: ride.driver_name ? 1 : 0.3 }}>
                  {ride.vehicle_type === 'Bike' ? '🏍️' : ride.vehicle_type === 'Auto-Rickshaw' ? '🛺' : ride.vehicle_type === 'Car' ? '🚗' : '🚙'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isDriver ? (
                <>
                  {ride.ride_status === 'accepted' && (
                    <button 
                      className={`btn btn-primary ${actionLoading === 'ongoing' ? 'btn-loading' : ''}`}
                      onClick={() => updateStatus('ongoing')}
                      disabled={!!actionLoading}
                      style={{ padding: '1rem', fontSize: '1.1rem' }}
                    >
                      Start Ride (Passenger Picked Up)
                    </button>
                  )}
                  
                  {ride.ride_status === 'ongoing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0, 212, 170, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(0, 212, 170, 0.2)' }}>
                      <h3 style={{ margin: 0, color: 'var(--accent-secondary)' }}>Complete Ride</h3>
                      <div className="form-group">
                        <label className="form-label">Distance Traveled (km)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          min="0.1"
                          className="form-input" 
                          placeholder="e.g. 5.5"
                          value={distance}
                          onChange={(e) => setDistance(e.target.value)}
                        />
                        <small className="text-muted" style={{ display: 'block', marginTop: '0.5rem' }}>Fare automatically calculated via DB.</small>
                      </div>
                      <button 
                        className={`btn btn-secondary ${actionLoading === 'completed' ? 'btn-loading' : ''}`}
                        onClick={() => updateStatus('completed')}
                        disabled={!!actionLoading}
                        style={{ padding: '1rem', fontSize: '1.1rem', background: 'var(--accent-secondary)' }}
                      >
                        Finish & Collect Payment
                      </button>
                    </div>
                  )}

                  <button 
                    className={`btn btn-danger btn-sm ${actionLoading === 'cancelled' ? 'btn-loading' : ''}`}
                    onClick={() => updateStatus('cancelled')}
                    disabled={!!actionLoading}
                    style={{ alignSelf: 'center', marginTop: '1rem', background: 'transparent', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)' }}
                  >
                    Cancel Ride
                  </button>
                </>
              ) : (
                /* Passenger Actions */
                <>
                  {ride.ride_status === 'requested' && (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                      <div className="dash-spinner" style={{ margin: '0 auto 1rem', width: '30px', height: '30px', borderTopColor: 'var(--accent-warning)' }}></div>
                      <p>Wait while a driver accepts your request...</p>
                    </div>
                  )}
                  
                  {ride.ride_status === 'ongoing' && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(71, 179, 255, 0.1)', borderRadius: 'var(--radius-lg)' }}>
                      <h3 style={{ margin: '0 0 0.5rem', color: 'var(--accent-info)' }}>Enjoy your ride!</h3>
                      <p style={{ margin: 0 }}>Driver will end the trip when you arrive.</p>
                    </div>
                  )}

                  {ride.ride_status === 'completed' && !showRating && (
                      <button className="btn btn-primary" style={{ padding: '1rem' }} onClick={() => setShowRating(true)}>
                         Rate this trip
                      </button>
                  )}

                  <button 
                    className={`btn btn-danger ${actionLoading === 'cancelled' ? 'btn-loading' : ''}`}
                    onClick={() => updateStatus('cancelled')}
                    disabled={!!actionLoading || ride.ride_status === 'completed'}
                    style={{ padding: '1rem' }}
                  >
                    Cancel Request
                  </button>
                </>
              )}
            </div>
          </div>
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
             <button className="btn btn-secondary btn-sm" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }} onClick={() => navigate(isDriver ? '/dashboard/driver' : '/dashboard')}>
                ← Back to Dashboard
             </button>
          </div>
        </div>

        {/* Right pane: Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {pickupCoords && (
              <Marker position={pickupCoords} icon={pickupIcon}>
                <Popup>Pickup</Popup>
              </Marker>
            )}
            
            {dropoffCoords && (
              <Marker position={dropoffCoords} icon={dropoffIcon}>
                <Popup>Drop-off</Popup>
              </Marker>
            )}

            {/* Driver pin simulation */}
            {ride.ride_status !== 'requested' && driverCoords && (
              <Marker position={driverCoords} icon={driverIcon}>
                <Popup>Driver</Popup>
              </Marker>
            )}

            {/* Line connecting pickup and dropoff */}
            {pickupCoords && dropoffCoords && (
               <Polyline positions={[pickupCoords, dropoffCoords]} color="var(--accent-secondary)" weight={3} dashArray="5, 10" />
            )}
          </MapContainer>
          
          <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-info)' }}></span> Pickup</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-secondary)' }}></span> Drop-off</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-primary)' }}></span> Driver</div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ActiveRidePage;

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Star, MessageSquare, CreditCard, Banknote, Car, Navigation, MapPin } from 'lucide-react';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapUpdater({ boundsData, centerData }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      if (boundsData) {
         map.fitBounds(boundsData, { padding: [50, 50], maxZoom: 16 });
      } else if (centerData) {
         map.flyTo([centerData.lat, centerData.lng], 14);
      }
    }, 200);
  }, [boundsData, centerData, map]);
  return null;
}

// MapUpdater from previously...

// Main Component
function ActiveRidePage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  
  // Rating modal state
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Auto-calculated distance from OSRM
  const [distance, setDistance] = useState(0);

  const [driverPos, setDriverPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef(null);

  const fetchActiveRide = async () => {
    try {
      const endpoint = user.role === 'driver' ? '/dashboard/driver' : '/dashboard/passenger';
      const data = await api(endpoint);
      const active = data.rides.find(r =>
        r.ride_status === 'requested' ||
        r.ride_status === 'accepted' ||
        r.ride_status === 'ongoing' ||
        r.ride_status === 'completed' // Show completed rides so passenger can pay
      );
      setRide(active || null);
    } catch (err) {
      toast.error(err.message || 'Failed to load active ride');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRide();
    const interval = setInterval(fetchActiveRide, 8000);
    return () => clearInterval(interval);
  }, [user.role]);

  // Handle Free OSRM Routing & Distance Calculation
  useEffect(() => {
    if (ride && ride.pickup_lat && ride.drop_lat) {
      const pickup = { lat: parseFloat(ride.pickup_lat), lng: parseFloat(ride.pickup_lng) };
      const dropoff = { lat: parseFloat(ride.drop_lat), lng: parseFloat(ride.drop_lng) };
      
      if (pickup && dropoff && routeCoords.length === 0) {
        setMapBounds(L.latLngBounds([pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]));

        fetch(`https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`)
          .then(res => res.json())
          .then(data => {
            if (data.routes && data.routes[0]) {
              const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
              setRouteCoords(coords);
              // Store distance internally for Driver completion payload
              const distKm = parseFloat((data.routes[0].distance / 1000).toFixed(2));
              setDistance(distKm);
            }
          })
          .catch(e => console.error("OSRM routing failed", e));
      }
    }
  }, [ride]);

  // Socket logic
  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchActiveRide();
    socket.on('ride_accepted', handler);
    socket.on('ride_status_update', handler);
    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    
    // Listen for live driver location if user is passenger
    if (user.role !== 'driver') {
       socket.on('driver_location_update', (data) => {
          setDriverPos({ lat: data.lat, lng: data.lng });
       });
    }

    return () => {
      socket.off('ride_accepted', handler);
      socket.off('ride_status_update', handler);
      socket.off('new_message');
      socket.off('driver_location_update');
    };
  }, [socket, user.role]);

  // Fetch messages
  useEffect(() => {
    if (ride && ride.ride_id) {
      api(`/rides/${ride.ride_id}/messages`)
        .then(data => setMessages(data.messages || []))
        .catch(() => {});
    }
  }, [ride?.ride_id]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial dummy position
  useEffect(() => {
    if (ride && !driverPos && user.role !== 'driver') {
       if (ride.pickup_lat) setDriverPos({ lat: parseFloat(ride.pickup_lat) + 0.001, lng: parseFloat(ride.pickup_lng) + 0.001 });
    }
  }, [ride, driverPos, user.role]);

  // Emit Real-time GPS location via Geolocation API if Driver
  useEffect(() => {
    let watchId;
    if (user.role === 'driver' && navigator.geolocation && ride && ride.ride_status !== 'completed' && socket) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
           const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
           setDriverPos(loc);
           if (ride.passenger_id) {
               socket.emit('driver_location_update', { passenger_id: ride.passenger_id, ...loc });
           }
        },
        (err) => console.log('Geolocation error:', err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [user.role, ride, socket]);

  const updateStatus = async (status) => {
    setActionLoading(status);
    const body = { status };

    if (status === 'completed') {
      if (!distance || isNaN(distance) || distance <= 0) {
        toast.error('Distance calculation not ready. Using default fallback.');
        body.distance_km = 1.0; // Fallback
      } else {
        body.distance_km = distance;
      }
    }

    try {
      await api(`/rides/${ride.ride_id}/status`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      toast.success(`Ride marked as ${status}`);
      await fetchActiveRide();
      // Only auto-navigate if it's a cancellation.
      // If completed, both see the final summary screen.
      if (status === 'cancelled') navigate(user.role === 'driver' ? '/dashboard/driver' : '/dashboard');
    } catch (err) {
      toast.error(err.message || `Failed to mark ride as ${status}`);
    } finally {
      setActionLoading('');
    }
  };

  const submitRating = async () => {
    setActionLoading('rating');
    try {
      await api(`/rides/${ride.ride_id}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating_value: rating, comment })
      });
      toast.success('Rating submitted!');
      setShowRating(false);
      navigate('/rides/history');
    } catch (err) {
      toast.error(err.message || 'Failed to submit rating');
    } finally {
      setActionLoading('');
    }
  };

  const handlePayOnline = async () => {
     setActionLoading('paying_online');
     try {
        const data = await api(`/payment/init/${ride.ride_id}`, { method: 'POST' });
        if (data.url) {
           window.location.href = data.url;
        } else {
           toast.error('Could not initiate payment');
        }
     } catch(err) {
        toast.error(err.message || 'Payment initialization failed');
     } finally {
        setActionLoading('');
     }
  };

  const handlePayCash = async () => {
      setActionLoading('paying_cash');
      try {
         await api(`/payment/cash/${ride.ride_id}`, { method: 'PUT' });
         toast.success('Cash payment confirmed!');
         setShowRating(true); // show rating prompt now
      } catch (err) {
         toast.error(err.message || 'Verification failed for Cash Payment');
      } finally {
         setActionLoading('');
      }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !ride) return;
    try {
      const data = await api(`/rides/${ride.ride_id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message_text: chatInput.trim() })
      });
      setMessages(prev => [...prev, { ...data.message, sender_name: user.name || user.username }]);
      setChatInput('');
    } catch (err) {
      toast.error('Send message failed: ' + err.message);
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

  const isDriver = user.role === 'driver';

  if (!ride) {
    // If there is no active ride at all
    return (
      <div className="dash-layout">
        <main className="dash-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="dash-empty">
            <Car size={64} style={{ marginBottom: '1rem', color: 'var(--text-muted)' }} />
            <h2>No active rides</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>You don't have any ongoing rides at the moment.</p>
            <button className="btn btn-primary" onClick={() => navigate(isDriver ? '/rides/available' : '/rides/request')}>
              {isDriver ? 'Find Passengers' : 'Request a Ride'}
            </button>
            <button className="btn btn-secondary" style={{ marginLeft: '1rem' }} onClick={() => navigate(isDriver ? '/dashboard/driver' : '/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const pickupCoords = ride.pickup_lat ? { lat: parseFloat(ride.pickup_lat), lng: parseFloat(ride.pickup_lng) } : null;
  const dropoffCoords = ride.drop_lat ? { lat: parseFloat(ride.drop_lat), lng: parseFloat(ride.drop_lng) } : null;
  const defaultMapCenter = pickupCoords ? [pickupCoords.lat, pickupCoords.lng] : [23.8103, 90.4125];

  // Estimated Fare logic for Driver info panel
  let estimatedFare = 0;
  if (ride.base_fare && distance) {
     estimatedFare = (parseFloat(ride.base_fare) + (distance * parseFloat(ride.rate_per_km))).toFixed(2);
  } else if (ride.fare_amount) {
     estimatedFare = parseFloat(ride.fare_amount).toFixed(2);
  }

  // MASSIVE MODAL FOR PASSENGER CHECKOUT
  if (!isDriver && ride.ride_status === 'completed') {
     return (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(18, 18, 18, 0.85)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            
            {/* Main Payment Checkout State */}
            {!showRating ? (
              <div className="dash-card" style={{ maxWidth: '500px', width: '100%', padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
              <div>
                 <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0, 212, 170, 0.1)', color: 'var(--accent-success)', marginBottom: '1rem' }}>
                    <Navigation size={40} />
                 </div>
                 <h1 style={{ margin: 0, fontSize: '2rem' }}>You've Arrived!</h1>
                 <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>Please pay the driver to complete your trip.</p>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                 <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Total Fare</div>
                 <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-success)' }}>৳{estimatedFare || ride.fare_amount}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <button className={`btn btn-primary ${actionLoading === 'paying_online' ? 'btn-loading' : ''}`} onClick={handlePayOnline} disabled={!!actionLoading} style={{ padding: '1.25rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                   <CreditCard /> Pay Online (SSLCommerz)
                 </button>
                 <button className={`btn btn-secondary ${actionLoading === 'paying_cash' ? 'btn-loading' : ''}`} onClick={handlePayCash} disabled={!!actionLoading} style={{ padding: '1.25rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: 'transparent', border: '1px solid var(--border-subtle)' }}>
                   <Banknote /> Pay with Cash
                 </button>
              </div>
            </div>
          ) : (
            <div className="dash-card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem', textAlign: 'center' }}>Rate your driver</h3>
              <p className="text-muted" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                How was the trip with {ride.driver_name || 'the driver'}?
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[1,2,3,4,5].map(s => (
                  <Star 
                    key={s} 
                    size={40} 
                    onClick={() => setRating(s)} 
                    style={{ cursor: 'pointer', color: s <= rating ? '#FFD700' : 'var(--text-muted)', fill: s <= rating ? '#FFD700' : 'none', transition: 'all 0.2s' }} 
                  />
                ))}
              </div>
              <textarea className="form-input" placeholder="Leave a comment (optional)..." value={comment} onChange={e => setComment(e.target.value)} style={{ minHeight: '100px', marginBottom: '1rem' }} />
              <button className={`btn btn-primary ${actionLoading === 'rating' ? 'btn-loading' : ''}`} onClick={submitRating} disabled={!!actionLoading} style={{ width: '100%' }}>Done</button>
            </div>
          )}

          </div>

          {/* RENDER THE MAP UNDERNEATH SO IT IS VISIBLE THROUGH THE BLUR */}
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}>
             <MapContainer center={defaultMapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {pickupCoords && <Marker position={[pickupCoords.lat, pickupCoords.lng]}><Popup>Pickup</Popup></Marker>}
                {dropoffCoords && <Marker position={[dropoffCoords.lat, dropoffCoords.lng]}><Popup>Drop-off</Popup></Marker>}
                {routeCoords.length > 0 && <Polyline positions={routeCoords} color="var(--accent-primary)" weight={5} opacity={0.8} />}
             </MapContainer>
          </div>
        </>
     );
  }

  // STANDARD ACTIVE RIDE SCREEN
  return (
    <div className="dash-layout">
      <main className="dash-main" style={{ display: 'flex', padding: 0, height: '100vh', boxSizing: 'border-box' }}>
        <div style={{ flex: '0 0 400px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-subtle)', boxShadow: '4px 0 15px rgba(0,0,0,0.3)', zIndex: 10 }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Ride Status</h2>
            <span className={`dash-status dash-status--${ride.ride_status}`}>{ride.ride_status}</span>
          </div>

          <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
            {!isDriver && ride.ride_status !== 'requested' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-success)', fontSize: '0.85rem' }}>
                   <div className="dash-spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>
                   Live driver tracking active
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pickup</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <MapPin size={16} color="var(--accent-info)" /> {ride.pickup_address}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Drop-off</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <MapPin size={16} color="var(--accent-secondary)" /> {ride.drop_address}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isDriver ? (
                <>
                  {ride.ride_status === 'accepted' && (
                    <button className={`btn btn-primary ${actionLoading === 'ongoing' ? 'btn-loading' : ''}`} onClick={() => updateStatus('ongoing')} disabled={!!actionLoading} style={{ padding: '1rem' }}>
                      Start Ride (Passenger Picked Up)
                    </button>
                  )}
                  
                  {/* Clean Driver Finish Panel */}
                  {ride.ride_status === 'ongoing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,212,170,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', alignContent: 'center' }}>
                      
                      <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                         <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Estimated Fare</span>
                         <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-success)' }}>
                            ৳{estimatedFare > 0 ? estimatedFare : '...'}
                         </div>
                      </div>

                      <button className={`btn btn-secondary ${actionLoading === 'completed' ? 'btn-loading' : ''}`} onClick={() => updateStatus('completed')} disabled={!!actionLoading || !distance} style={{ padding: '1rem', background: 'var(--accent-secondary)' }}>
                         Arrived at Destination
                      </button>
                    </div>
                  )}
                  <button className={`btn btn-danger btn-sm ${actionLoading === 'cancelled' ? 'btn-loading' : ''}`} onClick={() => updateStatus('cancelled')} disabled={!!actionLoading} style={{ alignSelf: 'center', background: 'transparent', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)' }}>
                    Cancel Ride
                  </button>
                </>
              ) : (
                <>
                  {ride.ride_status === 'requested' && (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                      <div className="dash-spinner"></div>
                      <p>Waiting for a driver...</p>
                    </div>
                  )}
                  {ride.ride_status !== 'completed' && (
                     <button className={`btn btn-danger ${actionLoading === 'cancelled' ? 'btn-loading' : ''}`} onClick={() => updateStatus('cancelled')} disabled={!!actionLoading} style={{ padding: '1rem' }}>
                       Cancel Request
                     </button>
                  )}
                </>
              )}
            </div>

            {(ride.ride_status === 'accepted' || ride.ride_status === 'ongoing') && (
              <button className="btn btn-secondary" onClick={() => setChatOpen(!chatOpen)} style={{ marginTop: '1.5rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <MessageSquare size={18} /> {chatOpen ? 'Close Chat' : 'Open Chat'} ({messages.length})
              </button>
            )}

            {chatOpen && (
              <div style={{ marginTop: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '250px' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-secondary)' }}>
                  {messages.length === 0 && <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.85rem' }}>No messages yet</p>}
                  {messages.map((msg, i) => {
                    const isMine = msg.sender_id === (user.userId || user.id);
                    return (
                      <div key={msg.message_id || i} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', background: isMine ? 'var(--accent-primary)' : 'var(--bg-primary)', color: isMine ? 'white' : 'inherit', padding: '0.5rem 0.75rem', borderRadius: '12px', maxWidth: '80%', fontSize: '0.85rem' }}>
                        {!isMine && <div style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem', opacity: 0.7 }}>{msg.sender_name}</div>}
                        {msg.message_text}
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid var(--border-subtle)' }}>
                  <input
                    type="text" className="form-input"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                    style={{ flex: 1, margin: 0, border: 'none', borderRadius: 0 }}
                  />
                  <button className="btn btn-primary" onClick={handleSendMessage} style={{ borderRadius: 0 }}>Send</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <button className="btn btn-secondary btn-sm" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }} onClick={() => navigate(isDriver ? '/dashboard/driver' : '/dashboard')}>
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Right pane: Leaflet Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer center={defaultMapCenter} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pickupCoords && (
              <Marker position={[pickupCoords.lat, pickupCoords.lng]}>
                 <Popup>Pickup</Popup>
              </Marker>
            )}
            {dropoffCoords && (
              <Marker position={[dropoffCoords.lat, dropoffCoords.lng]}>
                 <Popup>Drop-off</Popup>
              </Marker>
            )}
            {driverPos && ride.ride_status !== 'requested' && (
              <Marker position={[driverPos.lat, driverPos.lng]}>
                 <Popup>{isDriver ? "You" : "Driver"}</Popup>
              </Marker>
            )}
            {routeCoords.length > 0 && (
               <Polyline positions={routeCoords} color="var(--accent-primary)" weight={5} opacity={0.8} />
            )}
            <MapUpdater boundsData={mapBounds} />
          </MapContainer>
        </div>
      </main>
    </div>
  );
}

export default ActiveRidePage;

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
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

// Map click handler component
function LocationSelector({ pickup, setPickup, dropoff, setDropoff, selectionMode, setSelectionMode }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (selectionMode === 'pickup') {
         setPickup({ lat, lng, name: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}` });
         setSelectionMode('dropoff'); // Auto switch to dropoff selection
      } else if (selectionMode === 'dropoff') {
         setDropoff({ lat, lng, name: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}` });
         setSelectionMode(null);
      }
    },
  });
  return null;
}

// Component to programmatically move the map view
function MapUpdater({ centerData }) {
  const map = useMap();
  if (centerData) {
    map.flyTo([centerData.lat, centerData.lng], 15);
  }
  return null;
}

function RideRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [pickup, setPickup] = useState(null); // {lat, lng, name}
  const [dropoff, setDropoff] = useState(null);
  const [selectionMode, setSelectionMode] = useState('pickup'); // 'pickup' | 'dropoff' | null
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);

  const [vehicleTypeId, setVehicleTypeId] = useState('1'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default coordinate: Dhaka, Bangladesh
  const defaultCenter = [23.8103, 90.4125];
  
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      return data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    } catch (e) {
      return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
  };

  const forwardGeocode = async (query) => {
    try {
      setSearchLoading(true);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const name = result.display_name;

        // Apply to the active selection mode
        if (selectionMode === 'pickup') {
          setPickup({ lat, lng, name });
          setSelectionMode('dropoff');
        } else {
          setDropoff({ lat, lng, name });
          setSelectionMode(null);
        }

        // Move map
        setMapCenter({ lat, lng });
        setSearchQuery('');
        setError('');
      } else {
        setError('Location not found. Please try a different search term.');
      }
    } catch (e) {
      setError('Search failed. Please ensure you are connected to the internet.');
    } finally {
      setSearchLoading(false);
    }
  };
  
  const handleRequest = async (e) => {
    e.preventDefault();
    if (!pickup || !dropoff) {
      setError('Please select both pickup and drop-off locations.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // If name is just coords, try to reverse geocode one last time, else use what's there
      let pickupAddress = pickup.name;
      let dropAddress = dropoff.name;

      if (pickupAddress.startsWith('Lat:')) pickupAddress = await reverseGeocode(pickup.lat, pickup.lng);
      if (dropAddress.startsWith('Lat:')) dropAddress = await reverseGeocode(dropoff.lat, dropoff.lng);

      await api('/rides/request', {
        method: 'POST',
        body: JSON.stringify({
          pickup_address: pickupAddress,
          drop_address: dropAddress,
          vehicle_type_id: parseInt(vehicleTypeId)
        })
      });
      navigate('/active-ride');
    } catch (err) {
      setError(err.message || 'Failed to request ride');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar" style={{ width: '200px' }}>
        <div className="dash-sidebar-logo" style={{ fontSize: '1.2rem' }}>SAROTHI</div>
        <nav className="dash-nav">
          <button className="dash-nav-item" onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <span>←</span> Back
          </button>
        </nav>
      </aside>

      <main className="dash-main" style={{ display: 'flex', gap: '2rem', padding: '2rem', height: '100vh', boxSizing: 'border-box' }}>
        
        {/* Left Side: Map UI */}
        <div style={{ flex: 2, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          
          {/* Top Search Bar */}
          <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
             <input 
                type="text" 
                className="form-input" 
                placeholder={`Search for ${selectionMode || 'a'} location...`} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter') forwardGeocode(searchQuery) }}
                style={{ flex: 1, margin: 0 }}
             />
             <button 
                className={`btn btn-secondary ${searchLoading ? 'btn-loading' : ''}`} 
                onClick={() => forwardGeocode(searchQuery)}
                disabled={!searchQuery || searchLoading}
             >
                Search
             </button>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {/* Instructions Overlay */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', width: '300px' }}>
               <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Map Selection</h3>
               <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Search above, or click on the map.</p>

               {selectionMode === 'pickup' && <p style={{ margin: 0, color: 'var(--accent-info)', fontWeight: 600 }}>📍 Now setting: Pickup</p>}
               {selectionMode === 'dropoff' && <p style={{ margin: 0, color: 'var(--accent-secondary)', fontWeight: 600 }}>🏁 Now setting: Drop-off</p>}
               {!selectionMode && <p style={{ margin: 0, color: 'var(--accent-success)', fontWeight: 600 }}>✅ Both locations selected.</p>}
               
               <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectionMode('pickup')} style={{ opacity: selectionMode === 'pickup' ? 0.5 : 1 }}>Set Pickup</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectionMode('dropoff')} style={{ opacity: selectionMode === 'dropoff' ? 0.5 : 1 }}>Set Dropoff</button>
               </div>
            </div>

            <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationSelector pickup={pickup} setPickup={setPickup} dropoff={dropoff} setDropoff={setDropoff} selectionMode={selectionMode} setSelectionMode={setSelectionMode} />
              <MapUpdater centerData={mapCenter} />
              
              {pickup && (
                <Marker position={[pickup.lat, pickup.lng]}>
                  <Popup>Pickup Location</Popup>
                </Marker>
              )}
              {dropoff && (
                <Marker position={[dropoff.lat, dropoff.lng]}>
                  <Popup>Drop-off Location</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="dash-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <h2 className="dash-card-title">🚘 Request a Ride</h2>
          <p className="dash-text text-muted" style={{ marginBottom: '1.5rem' }}>Where are you heading today, {user?.name?.split(' ')[0] || 'Passenger'}?</p>
          
          {error && (
            <div className="alert alert-error">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--accent-info)' }}>📍 Pickup</label>
              <div className="form-input" style={{ opacity: pickup ? 1 : 0.5, backgroundColor: 'var(--bg-secondary)', minHeight: '44px', display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                {pickup ? pickup.name : 'Search or tap map'}
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--accent-secondary)' }}>🏁 Drop-off</label>
              <div className="form-input" style={{ opacity: dropoff ? 1 : 0.5, backgroundColor: 'var(--bg-secondary)', minHeight: '44px', display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                {dropoff ? dropoff.name : 'Search or tap map'}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 'auto' }}>
              <label className="form-label">Vehicle Type</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label className={`dash-stat-card ${vehicleTypeId === '1' ? 'dash-stat-card--accent' : ''}`} style={{ flex: 1, padding: '1rem', cursor: 'pointer', textAlign: 'center', margin: 0, justifyContent: 'center' }}>
                  <input type="radio" value="1" checked={vehicleTypeId === '1'} onChange={(e) => setVehicleTypeId(e.target.value)} style={{ display: 'none' }} />
                  <div style={{ fontSize: '2rem' }}>🏍️</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Bike</div>
                </label>
                <label className={`dash-stat-card ${vehicleTypeId === '2' ? 'dash-stat-card--accent' : ''}`} style={{ flex: 1, padding: '1rem', cursor: 'pointer', textAlign: 'center', margin: 0, justifyContent: 'center' }}>
                  <input type="radio" value="2" checked={vehicleTypeId === '2'} onChange={(e) => setVehicleTypeId(e.target.value)} style={{ display: 'none' }} />
                  <div style={{ fontSize: '2rem' }}>🛺</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Auto</div>
                </label>
                <label className={`dash-stat-card ${vehicleTypeId === '3' ? 'dash-stat-card--accent' : ''}`} style={{ flex: 1, padding: '1rem', cursor: 'pointer', textAlign: 'center', margin: 0, justifyContent: 'center' }}>
                  <input type="radio" value="3" checked={vehicleTypeId === '3'} onChange={(e) => setVehicleTypeId(e.target.value)} style={{ display: 'none' }} />
                  <div style={{ fontSize: '2rem' }}>🚗</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Car</div>
                </label>
              </div>
            </div>

            <button type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} disabled={loading || !pickup || !dropoff} style={{ marginTop: '1rem', padding: '1rem' }}>
              Confirm Request
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default RideRequestPage;

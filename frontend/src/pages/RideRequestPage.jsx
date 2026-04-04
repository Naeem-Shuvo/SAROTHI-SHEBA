import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { Car, Bike, Truck, MapPin, ArrowLeft } from 'lucide-react';

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
  useEffect(() => {
    if (centerData && centerData.bounds) {
       map.fitBounds(centerData.bounds, { padding: [50, 50] });
    } else if (centerData && centerData.lat) {
       map.flyTo([centerData.lat, centerData.lng], 14);
    }
  }, [centerData, map]);
  return null;
}

// Custom Autocomplete Input Component
function LocationSearchInput({ placeholder, value, onSelect, activeMode, setMode }) {
  const [query, setQuery] = useState(value ? value.name : '');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimeout = useRef(null);

  // Sync external value changes (e.g. from map click)
  useEffect(() => {
    if (value && value.name !== query) {
      setQuery(value.name);
    }
  }, [value]);

  const searchNominatim = async (searchText) => {
    if (!searchText || searchText.length < 3) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=5&countrycodes=bd`);
      const data = await res.json();
      setResults(data);
      setShowDropdown(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    if (!activeMode) setMode(); // activate this input's map click mode
    
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      searchNominatim(text);
    }, 600); // 600ms debounce
  };

  const handleSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setQuery(item.display_name);
    setShowDropdown(false);
    onSelect({ lat, lng, name: item.display_name });
  };

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <input 
        type="text" 
        className="form-input" 
        placeholder={placeholder} 
        value={query}
        onChange={handleInputChange}
        onFocus={() => { setMode(); if(results.length > 0) setShowDropdown(true); }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // delay to allow click
        style={{ margin: 0, width: '100%', borderColor: activeMode ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
      />
      {isSearching && <div style={{ position: 'absolute', right: 10, top: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>⏳</div>}
      
      {showDropdown && results.length > 0 && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, 
          background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-md)', zIndex: 1000, maxHeight: '200px', overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: '4px'
        }}>
          {results.map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => handleSelect(item)}
              style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'white' }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-primary)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              {item.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RideRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [pickup, setPickup] = useState(null); // {lat, lng, name}
  const [dropoff, setDropoff] = useState(null);
  const [selectionMode, setSelectionMode] = useState('pickup'); // 'pickup' | 'dropoff' | null
  const [routeCoords, setRouteCoords] = useState([]);
  
  const [mapCenter, setMapCenter] = useState(null); // {lat, lng} or {bounds}

  const [vehicleTypeId, setVehicleTypeId] = useState('1'); 
  const [loading, setLoading] = useState(false);

  // Default coordinate: Dhaka, Bangladesh
  const defaultCenter = [23.777176, 90.399452];
  
  // Fetch OSRM Route when both points are selected
  useEffect(() => {
    if (pickup && dropoff) {
      const fetchRoute = async () => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            // OSRM returns coordinates as [lng, lat], Leaflet needs [lat, lng]
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setRouteCoords(coords);
            
            // Adjust map bounds to fit route
            const bounds = L.latLngBounds([pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]);
            setMapCenter({ bounds });
          }
        } catch(e) {
          console.error("OSRM routing failed", e);
          toast.error("Failed to calculate route path.");
        }
      };
      fetchRoute();
    } else {
      setRouteCoords([]);
      if (pickup) setMapCenter({ lat: pickup.lat, lng: pickup.lng });
      else if (dropoff) setMapCenter({ lat: dropoff.lat, lng: dropoff.lng });
    }
  }, [pickup, dropoff]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      return data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    } catch (e) {
      return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!pickup || !dropoff) {
      toast.error('Please select both pickup and drop-off locations.');
      return;
    }
    
    setLoading(true);
    
    try {
      let pickupAddress = pickup.name;
      let dropAddress = dropoff.name;

      if (pickupAddress.startsWith('Lat:')) pickupAddress = await reverseGeocode(pickup.lat, pickup.lng);
      if (dropAddress.startsWith('Lat:')) dropAddress = await reverseGeocode(dropoff.lat, dropoff.lng);

      await api('/rides/request', {
        method: 'POST',
        body: JSON.stringify({
          pickup_address: pickupAddress,
          drop_address: dropAddress,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          drop_lat: dropoff.lat,
          drop_lng: dropoff.lng,
          vehicle_type_id: parseInt(vehicleTypeId)
        })
      });
      toast.success('Ride requested successfully!');
      navigate('/active-ride');
    } catch (err) {
      toast.error(err.message || 'Failed to request ride');
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
          <button className="dash-nav-item" onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back
          </button>
        </nav>
      </aside>

      <main className="dash-main" style={{ display: 'flex', gap: '2rem', padding: '1rem 2rem', height: '100vh', boxSizing: 'border-box' }}>
        
        {/* Left Side: Uber-style Search & Map */}
        <div style={{ flex: 2, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          
          {/* Autocomplete Search Bar Panel */}
          <div style={{ padding: '1.5rem', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 10 }}>
             <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Plan your ride</h3>
             <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', padding: '0 0.5rem' }}>
                   <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-info)' }}></div>
                   <div style={{ width: '2px', height: '24px', background: 'var(--border-subtle)' }}></div>
                   <div style={{ width: '10px', height: '10px', background: 'var(--accent-secondary)' }}></div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                   <LocationSearchInput 
                      placeholder="Pickup location" 
                      value={pickup} 
                      onSelect={(loc) => { setPickup(loc); setMapCenter({ lat: loc.lat, lng: loc.lng }); }} 
                      activeMode={selectionMode === 'pickup'}
                      setMode={() => setSelectionMode('pickup')}
                   />
                   <LocationSearchInput 
                      placeholder="Where to?" 
                      value={dropoff} 
                      onSelect={(loc) => { setDropoff(loc); setSelectionMode(null); }} 
                      activeMode={selectionMode === 'dropoff'}
                      setMode={() => setSelectionMode('dropoff')}
                   />
                </div>
             </div>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {/* Map Interaction Hint */}
            {selectionMode && (
              <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', fontSize: '0.85rem', fontWeight: 500 }}>
                 Click on the map to set {selectionMode === 'pickup' ? 'Pickup' : 'Drop-off'}
              </div>
            )}

            <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationSelector pickup={pickup} setPickup={setPickup} dropoff={dropoff} setDropoff={setDropoff} selectionMode={selectionMode} setSelectionMode={setSelectionMode} />
              <MapUpdater centerData={mapCenter} />
              
              {routeCoords.length > 0 && (
                 <Polyline positions={routeCoords} color="var(--accent-primary)" weight={5} opacity={0.8} />
              )}

              {pickup && (
                <Marker position={[pickup.lat, pickup.lng]}>
                  <Popup>Pickup</Popup>
                </Marker>
              )}
              {dropoff && (
                <Marker position={[dropoff.lat, dropoff.lng]}>
                  <Popup>Drop-off</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="dash-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <h2 className="dash-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Car size={24} color="var(--accent-primary)" /> Choose a ride
          </h2>
          <p className="dash-text text-muted" style={{ marginBottom: '1.5rem' }}>Select your vehicle type to continue.</p>

          <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Available Vehicles</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label className={`dash-stat-card ${vehicleTypeId === '1' ? 'dash-stat-card--accent' : ''}`} style={{ padding: '1rem', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="radio" value="1" checked={vehicleTypeId === '1'} onChange={(e) => setVehicleTypeId(e.target.value)} style={{ display: 'none' }} />
                  <div><Bike size={32} color={vehicleTypeId === '1' ? 'white' : 'var(--text-secondary)'} /></div>
                  <div>
                     <div style={{ fontWeight: 'bold' }}>Moto</div>
                     <div style={{ fontSize: '0.8rem', color: vehicleTypeId === '1' ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>Affordable, compact rides</div>
                  </div>
                </label>
                <label className={`dash-stat-card ${vehicleTypeId === '2' ? 'dash-stat-card--accent' : ''}`} style={{ padding: '1rem', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="radio" value="2" checked={vehicleTypeId === '2'} onChange={(e) => setVehicleTypeId(e.target.value)} style={{ display: 'none' }} />
                  <div style={{ fontSize: '2.5rem' }}>🛺</div>
                  <div>
                     <div style={{ fontWeight: 'bold' }}>CNG Auto</div>
                     <div style={{ fontSize: '0.8rem', color: vehicleTypeId === '2' ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>Great for local trips</div>
                  </div>
                </label>
                <label className={`dash-stat-card ${vehicleTypeId === '3' ? 'dash-stat-card--accent' : ''}`} style={{ padding: '1rem', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="radio" value="3" checked={vehicleTypeId === '3'} onChange={(e) => setVehicleTypeId(e.target.value)} style={{ display: 'none' }} />
                  <div><Car size={32} color={vehicleTypeId === '3' ? 'white' : 'var(--text-secondary)'} /></div>
                  <div>
                     <div style={{ fontWeight: 'bold' }}>Car</div>
                     <div style={{ fontSize: '0.8rem', color: vehicleTypeId === '3' ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>Comfortable rides for groups</div>
                  </div>
                </label>
              </div>
            </div>

            <button type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} disabled={loading || !pickup || !dropoff} style={{ marginTop: 'auto', padding: '1rem', fontSize: '1.1rem' }}>
              Confirm Request
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default RideRequestPage;

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

// Map e jate click kore location select kora jay
function LocationSelector({ pickup, setPickup, dropoff, setDropoff, selectionMode, setSelectionMode }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      // pickup selection mode active thakle point pickup e set hobe logic handler
      if (selectionMode === 'pickup') {
        setPickup({ lat, lng, name: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}` });
        // pickup deoa shesh hoile automatic dropoff mode e switch kortesi point layout
        setSelectionMode('dropoff');
      } else if (selectionMode === 'dropoff') {
        // dropoff point dharon korার logic pointer animation point rendering layout
        setDropoff({ lat, lng, name: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}` });
        setSelectionMode(null);
      }
    },
  });
  return null;
}

// map zoom ba move korar handler
function MapUpdater({ centerData }) {
  const map = useMap();
  useEffect(() => {
    // bounds thakle full route screen e adjust korbe visual rendering layout, route er jonno
    if (centerData && centerData.bounds) {
      map.fitBounds(centerData.bounds, { padding: [50, 50] });
    } else if (centerData && centerData.lat) {
      // jekono ekta location pick korar time e shetar upor focus
      map.flyTo([centerData.lat, centerData.lng], 14);
    }
  }, [centerData, map]);
  return null;
}

// Custom Autocomplete Input Component - location khujar search bar logic component rendering
function LocationSearchInput({ placeholder, value, onSelect, activeMode, setMode }) {
  // search query state e rakhtesi logic parsing pointer layout display rendering
  const [query, setQuery] = useState(value ? value.name : '');
  // suggestions er array list logic pointer rendering points visuals logic display
  const [results, setResults] = useState([]);
  // api call pendant thakle loading indication logic handling analytics visuals rendering
  const [isSearching, setIsSearching] = useState(false);
  // suggestions dropdown show/hide korar flag logic rendering points display generation
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimeout = useRef(null);

  // external value (map click) change hoile input text synchronize kortesi logic handler
  useEffect(() => {
    if (value && value.name !== query) {
      setQuery(value.name);
    }
  }, [value]);

  // OpenStreetMap Nominatim API diye real-time address search logic handler logic point
  const searchNominatim = async (searchText) => {
    if (!searchText || searchText.length < 3) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // Bangladesh er address suggestions load kortesi backend api call layout logic handler
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

  // input field e kichu type korle debouncing method e search trigger kortesi logic handler
  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    if (!activeMode) setMode(); // typing shuru korlei map click mode automatic switch logic point

    // speed optimize korar jonno timeout set kortesi 600ms logic parsing pointers visuals
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      searchNominatim(text);
    }, 600);
  };

  // suggestion list theke address select korar logic execution point layout display generation logic rendering
  const handleSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setQuery(item.display_name);
    setShowDropdown(false);
    onSelect({ lat, lng, name: item.display_name });
  };

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Visual search field rendering points logic layout generation rendering logic point ui display layout display logic */}
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => { setMode(); if (results.length > 0) setShowDropdown(true); }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        style={{ margin: 0, width: '100%', borderColor: activeMode ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
      />
      {/* Async task pending feedback logic ui display generation rendering logic layout display generation logic */}
      {isSearching && <div style={{ position: 'absolute', right: 10, top: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>⏳</div>}

      {/* Smart address suggestions dropdown listing logic mapping logic visuals rendering points layout display generation logic rendering */}
      {showDropdown && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)', zIndex: 1000, maxHeight: '200px', overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: '4px'
        }}>
          {/* Recent results row wise mapping points visual rendering layout generation points layout display generation rendering logic */}
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
  // Context theke user identity r routing hooks nisi ekhane logic pointer
  const { user } = useAuth();
  const navigate = useNavigate();

  // Pickup point details {lat, lng, name} state e dharon kortesi logic parsing pointer layout display
  const [pickup, setPickup] = useState(null);
  // Dropoff destination point details state variable identifier logic ui display generation logic rendering
  const [dropoff, setDropoff] = useState(null);
  // Karte kon focus point e marker set hobe oita track kortesi logic pointer parsing points visuals
  const [selectionMode, setSelectionMode] = useState('pickup');
  // Route coordinates list (Polyline draw korar jonno) array state dharon kortesi logic parsing pointer
  const [routeCoords, setRouteCoords] = useState([]);

  // Karte zoom ba focus focus change korar instruction set logic pointer visuals generation logic rendering
  const [mapCenter, setMapCenter] = useState(null);

  // Kono gari select kora hoilo oita id form element e pathaitesi logic parsing pointer layout display
  const [vehicleTypeId, setVehicleTypeId] = useState('1');
  // API request pending status logic handling points analytics visuals rendering points layout display
  const [loading, setLoading] = useState(false);

  // default coordinate: Dhaka, Bangladesh focal point rendering logic layout display generation logic rendering
  const defaultCenter = [23.777176, 90.399452];

  // OSRM API call kore pickup theke dropoff er rasta draw korar logical trigger point pointer rendering
  useEffect(() => {
    if (pickup && dropoff) {
      const fetchRoute = async () => {
        try {
          // Real-time path optimization api request pathaitesi rendering logic layout display generation
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            // OSRM logical coordinate geometry parsing logic rendering layout rendering logic point
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setRouteCoords(coords);

            // Karte route data focus korar bounds adjust logic identifier layout rendering logic display
            const bounds = L.latLngBounds([pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]);
            setMapCenter({ bounds });
          }
        } catch (e) {
          console.error("OSRM routing failed", e);
          toast.error("Failed to calculate route path.");
        }
      };
      fetchRoute();
    } else {
      // points missing thakle route clear r single point focus trigger logic rendering layout display logic
      setRouteCoords([]);
      if (pickup) setMapCenter({ lat: pickup.lat, lng: pickup.lng });
      else if (dropoff) setMapCenter({ lat: dropoff.lat, lng: dropoff.lng });
    }
  }, [pickup, dropoff]);

  // Coordinate theke human readable address conversion (Reverse Geocoding) helper utility logic parsing pointer
  const reverseGeocode = async (lat, lng) => {
    try {
      // Nominatim api target coordinate address request pathaitesi rendering logic layout display generation
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      return data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    } catch (e) {
      return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
  };

  // Final confirmation logic for requesting a new ride leads conversion logic handling point rendering
  const handleRequest = async (e) => {
    e.preventDefault();
    // Logic validation execution check points visual layout parsing logic rendering points layout display
    if (!pickup || !dropoff) {
      toast.error('Please select both pickup and drop-off locations.');
      return;
    }

    setLoading(true);

    try {
      let pickupAddress = pickup.name;
      let dropAddress = dropoff.name;

      // coordinates addresses update logical pointer mapping logic visual rendering layout generation points
      if (pickupAddress.startsWith('Lat:')) pickupAddress = await reverseGeocode(pickup.lat, pickup.lng);
      if (dropAddress.startsWith('Lat:')) dropAddress = await reverseGeocode(dropoff.lat, dropoff.lng);

      // backend api k complete ride lead metrics dispatch kortesi logic handler parsing points rendering
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
      // lead conversion successful feedback logic ui display generation rendering logic layout display
      toast.success('Ride requested successfully!');
      // ongoing ride tracker page e auto-route logic identifier display logic handler parsing points
      navigate('/active-ride');
    } catch (err) {
      // execution failure alert box indicators mapping logic visuals point display ui rendering layout
      toast.error(err.message || 'Failed to request ride');
    } finally {
      // async session terminate logic clear ui rendering layout generation points layout display logic
      setLoading(false);
    }
  };

  return (
    <div className="dash-layout">
      {/* Sidebar - main navigator area visual rendering layout generation points layout display logic generation rendering */}
      <aside className="dash-sidebar" style={{ width: '200px' }}>
        <div className="dash-sidebar-logo" style={{ fontSize: '1.2rem' }}>SAROTHI</div>
        <nav className="dash-nav">
          {/* Action phire jaoar navigation handler pointer visuals rendering logic layout display generation logic rendering */}
          <button className="dash-nav-item" onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back
          </button>
        </nav>
      </aside>

      {/* Primary planning display layout for location leads mapping logic rendering points layout display generation rendering logic */}
      <main className="dash-main" style={{ display: 'flex', gap: '2rem', padding: '1rem 2rem', height: '100vh', boxSizing: 'border-box' }}>

        {/* Left Interactive Map Block - location analysis visuals layout rendering logic layout display generation rendering logic display */}
        <div style={{ flex: 2, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative', display: 'flex', flexDirection: 'column' }}>

          {/* Smart Lead Search Panel Layout rendering points layout display generation rendering logic display generation rendering logic */}
          <div style={{ padding: '1.5rem', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 10 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Plan your ride</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {/* Visual path sequence indicator layout rendering points layout display generation rendering logic display generation logic rendering */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', padding: '0 0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-info)' }}></div>
                <div style={{ width: '2px', height: '24px', background: 'var(--border-subtle)' }}></div>
                <div style={{ width: '10px', height: '10px', background: 'var(--accent-secondary)' }}></div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Pickup location point selection logic field rendering visuals point layout display generation rendering */}
                <LocationSearchInput
                  placeholder="Pickup location"
                  value={pickup}
                  onSelect={(loc) => { setPickup(loc); setMapCenter({ lat: loc.lat, lng: loc.lng }); }}
                  activeMode={selectionMode === 'pickup'}
                  setMode={() => setSelectionMode('pickup')}
                />
                {/* Destination point selection logic field rendering visuals point layout display generation rendering logic rendering */}
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
            {/* Contextual instruction overlay layout rendering visuals point layout display generation rendering logic display generation */}
            {selectionMode && (
              <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', fontSize: '0.85rem', fontWeight: 500 }}>
                Click on the map to set {selectionMode === 'pickup' ? 'Pickup' : 'Drop-off'}
              </div>
            )}

            {/* Core Karte Rendering Block UI generation layout rendering points layout display generation rendering logic display generation */}
            <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Interaction points handlers logic components mapping points visuals point layout display generation rendering logic generation */}
              <LocationSelector pickup={pickup} setPickup={setPickup} dropoff={dropoff} setDropoff={setDropoff} selectionMode={selectionMode} setSelectionMode={setSelectionMode} />
              <MapUpdater centerData={mapCenter} />

              {/* Visual pathway Polyline rendering logic points layout display generation rendering logic display generation rendering logic parsing */}
              {routeCoords.length > 0 && (
                <Polyline positions={routeCoords} color="var(--accent-primary)" weight={5} opacity={0.8} />
              )}

              {/* Geographical visual indicators (Markers) layout rendering points layout display generation rendering logic display generation */}
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

        {/* Lead Conversion form Area - vehicle preferences layout rendering points layout display generation rendering logic display generation */}
        <div className="dash-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <h2 className="dash-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={24} color="var(--accent-primary)" /> Choose a ride
          </h2>
          <p className="dash-text text-muted" style={{ marginBottom: '1.5rem' }}>Select your vehicle type to continue.</p>

          <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>

            {/* Service categories selection logic area layout rendering points layout display generation rendering logic display generation logic rendering */}
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Available Vehicles</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Moto service selection identifier logic visual rendering layout generation points layout display generation logic rendering points */}
                <label className={`dash-stat-card ${vehicleTypeId === '1' ? 'dash-stat-card--accent' : ''}`} style={{ padding: '1rem', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="radio" value="1" checked={vehicleTypeId === '1'} onChange={(e) => setVehicleTypeId(e.target.value)} style={{ display: 'none' }} />
                  <div><Bike size={32} color={vehicleTypeId === '1' ? 'white' : 'var(--text-secondary)'} /></div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Moto</div>
                    <div style={{ fontSize: '0.8rem', color: vehicleTypeId === '1' ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>Affordable, compact rides</div>
                  </div>
                </label>
                {/* CNG service preference identifier logic visual rendering layout generation points layout display generation logic rendering points parsing */}
                <label className={`dash-stat-card ${vehicleTypeId === '2' ? 'dash-stat-card--accent' : ''}`} style={{ padding: '1rem', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="radio" value="2" checked={vehicleTypeId === '2'} onChange={(e) => setSelectionMode(null) || setVehicleTypeId(e.target.value)} style={{ display: 'none' }} />
                  <div style={{ fontSize: '2.5rem' }}>🛺</div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>CNG Auto</div>
                    <div style={{ fontSize: '0.8rem', color: vehicleTypeId === '2' ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>Great for local trips</div>
                  </div>
                </label>
                {/* Prime car service identifier logic visual rendering layout generation points layout display generation rendering logic points parsing visuals */}
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

            {/* Execution finalize command execution point visual rendering logic layout display generation rendering logic display generation rendering logic parsing */}
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

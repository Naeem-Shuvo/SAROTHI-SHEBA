import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LayoutDashboard, Users, Car, Shield, AlertTriangle, Bike, UserCheck } from 'lucide-react';

function AdminUsersPage() {

  // auth context theke user info r logout hook nisi
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // sobgula user er list state e rakhtesi
  const [users, setUsers] = useState([]);

  // search result onujayi filtered users ekhane thakbe
  const [filteredUsers, setFilteredUsers] = useState([]);

  // search box er input state dharon kortesi
  const [searchTerm, setSearchTerm] = useState('');

  // data fetch hobar shomoy loading status handle kortesi
  const [loading, setLoading] = useState(true);

  // error message display korar jonno state
  const [error, setError] = useState('');

  // deactivate button click korle loading state dharon korbe
  const [actionLoading, setActionLoading] = useState(null);

  // admin endpoint theke sobgula user fetch korar function
  const fetchUsers = async () => {
    try {
      const data = await api('/admin/users');
      // sobgula user k state e set kortesi
      setUsers(data.users);
      setFilteredUsers(data.users);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      // fetch shesh, loading off kore ditesi
      setLoading(false);
    }
  };

  // component mount hoilei user list load hobe
  useEffect(() => {
    fetchUsers();
  }, []);

  // search term change hoile locally user list filter kortesi
  useEffect(() => {
    // search box faka thakle pura list dekhaitesi
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      // name, email ba role match korle list e dekhabe
      const term = searchTerm.toLowerCase();
      setFilteredUsers(users.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
      ));
    }
  }, [searchTerm, users]);


  // user deactivate korar logic handler
  const handleDeactivate = async (userId) => {
    // admin ke confirm kortesi deactivate korar age
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    setActionLoading(userId);
    try {
      // backend api pathaitesi delete request er maddhome
      await api(`/admin/users/${userId}`, { method: 'DELETE' });
      // list refresh korar jonno abar fetch kortesi
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to deactivate user');
    } finally {
      setActionLoading(null);
    }
  };

  // admin logout function logic
  const handleLogout = async () => {
    try {
      // session disconnect korar jonno server e janaitesi
      await api('/logout', { method: 'POST' });
    } catch (err) { /* error hoileo session clear hobe local theke */ }
    logout();
    navigate('/login');
  };

  // users load na hoba porjonto loading screen
  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="dash-layout">
      {/* Sidebar - amader application navigation pane */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">SAROTHI SHEBA</div>
        <nav className="dash-nav">
          {/* Dashboard er base overview te phire jaoar button */}
          <button className="dash-nav-item" onClick={() => navigate('/dashboard/admin')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={18} /> Overview
          </button>
          {/* User monitor active navigation point */}
          <button className="dash-nav-item active" onClick={() => navigate('/admin/users')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> Users
          </button>
          {/* Ride management page e jaoar option */}
          <button className="dash-nav-item" onClick={() => navigate('/admin/rides')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={18} /> All Rides
          </button>
        </nav>
        {/* Logout execution logic handler point */}
        <button className="btn btn-danger dash-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* Amader main main data display section ekhane */}
      <main className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title">User Management</h1>
          {/* Admin badge identifier style */}
          <div className="dash-user-badge">
            <span className="dash-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={20} color="var(--primary)" /></span>
            <span>{user?.name || 'Admin'}</span>
          </div>
        </header>

        {/* Dynamic error display container based on state logic */}
        {error && (
          <div className="alert alert-error" style={{ margin: 'var(--space-lg) 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        {/* Quick Search Filtering Container - real time user sorting */}
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ margin: 0 }}
          />
        </div>

        {/* Global Stats Summary Grid - role wise user counts card display */}
        <div className="dash-stats-grid" style={{ marginBottom: '1.5rem' }}>
          {/* System er total registered user count card display point */}
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} color="var(--accent-info)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{users.length}</span>
              <span className="dash-stat-label">Total Users</span>
            </div>
          </div>
          {/* Total active/pending driver count summary card indicator point */}
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bike size={24} color="var(--accent-secondary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{users.filter(u => u.role === 'driver').length}</span>
              <span className="dash-stat-label">Drivers</span>
            </div>
          </div>
          {/* System er current active passenger count summary indicator logic point */}
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserCheck size={24} color="var(--accent-success)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{users.filter(u => u.role === 'passenger').length}</span>
              <span className="dash-stat-label">Passengers</span>
            </div>
          </div>
          {/* Administrative staff count summary indicator logic point UI display */}
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={24} color="var(--accent-primary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{users.filter(u => u.role === 'admin').length}</span>
              <span className="dash-stat-label">Admins</span>
            </div>
          </div>
        </div>

        {/* Primary Data Table Display Area for user records list management */}
        <div className="dash-card">
          <h2 className="dash-card-title">
            All Users
            {/* List e koto gula element ashe oita badge e show kortesi data analytics monitor point */}
            <span className="dash-badge" style={{ marginLeft: '0.5rem' }}>{filteredUsers.length}</span>
          </h2>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {/* Search filtered logic onujayi user data loop kora hobe table row creation generation logic point */}
                {filteredUsers.map((u) => (
                  <tr key={u.user_id}>
                    <td><code>{u.user_id}</code></td>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone_number}</td>
                    <td>
                      {/* Character role matching onujayi status color indicator logic point ui display generation */}
                      <span className={`dash-status dash-status--${u.role === 'admin' ? 'completed' : u.role === 'driver' ? 'ongoing' : u.role === 'passenger' ? 'accepted' : 'requested'}`}>
                        {u.role}
                      </span>
                    </td>
                    {/* Driver hole tar current status display logic handler point ui display generation logic */}
                    <td>{u.driver_status || '—'}</td>
                    {/* User joining date parsing logic formatter point ui display generation logic handler */}
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      {/* Admin nijeke deactivate korte parbe na, oi restrictions logic check handler point UI generation */}
                      {u.role !== 'admin' && (
                        <button
                          className={`btn btn-danger btn-sm ${actionLoading === u.user_id ? 'btn-loading' : ''}`}
                          onClick={() => handleDeactivate(u.user_id)}
                          disabled={actionLoading === u.user_id}
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminUsersPage;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LayoutDashboard, Users, Car, Shield, AlertTriangle, Bike, UserCheck } from 'lucide-react';

function AdminUsersPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // fetch all users from the admin endpoint
  const fetchUsers = async () => {
    try {
      const data = await api('/admin/users');
      setUsers(data.users);
      setFilteredUsers(data.users);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // filter users locally by name, email, or role when search term changes
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredUsers(users.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
      ));
    }
  }, [searchTerm, users]);

  // deactivate a user (remove from role tables)
  const handleDeactivate = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    setActionLoading(userId);
    try {
      await api(`/admin/users/${userId}`, { method: 'DELETE' });
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to deactivate user');
    } finally {
      setActionLoading(null);
    }
  };

  // handle admin logout
  const handleLogout = async () => {
    try { await api('/logout', { method: 'POST' }); } catch (err) { /* logout anyway */ }
    logout();
    navigate('/login');
  };

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
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">SAROTHI SHEBA</div>
        <nav className="dash-nav">
          <button className="dash-nav-item" onClick={() => navigate('/dashboard/admin')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className="dash-nav-item active" onClick={() => navigate('/admin/users')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> Users
          </button>
          <button className="dash-nav-item" onClick={() => navigate('/admin/rides')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={18} /> All Rides
          </button>
        </nav>
        <button className="btn btn-danger dash-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title">User Management</h1>
          <div className="dash-user-badge">
            <span className="dash-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={20} color="var(--primary)" /></span>
            <span>{user?.name || 'Admin'}</span>
          </div>
        </header>

        {error && (
          <div className="alert alert-error" style={{ margin: 'var(--space-lg) 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        {/* Search Bar */}
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

        {/* Stats summary */}
        <div className="dash-stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} color="var(--accent-info)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{users.length}</span>
              <span className="dash-stat-label">Total Users</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bike size={24} color="var(--accent-secondary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{users.filter(u => u.role === 'driver').length}</span>
              <span className="dash-stat-label">Drivers</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserCheck size={24} color="var(--accent-success)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{users.filter(u => u.role === 'passenger').length}</span>
              <span className="dash-stat-label">Passengers</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={24} color="var(--accent-primary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{users.filter(u => u.role === 'admin').length}</span>
              <span className="dash-stat-label">Admins</span>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="dash-card">
          <h2 className="dash-card-title">
            All Users
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
                {filteredUsers.map((u) => (
                  <tr key={u.user_id}>
                    <td><code>{u.user_id}</code></td>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone_number}</td>
                    <td>
                      <span className={`dash-status dash-status--${u.role === 'admin' ? 'completed' : u.role === 'driver' ? 'ongoing' : u.role === 'passenger' ? 'accepted' : 'requested'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.driver_status || '—'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
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

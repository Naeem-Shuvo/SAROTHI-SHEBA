import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LayoutDashboard, Users, Car, Shield, AlertTriangle, UserCheck, Banknote, Bike } from 'lucide-react';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingApps, setPendingApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // fetch dashboard stats and pending driver applications
  const fetchDashboard = async () => {
    try {
      const data = await api('/dashboard/admin');
      setStats(data.stats);
      setPendingApps(data.pendingApplications);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // approve a pending driver application
  const handleApproveDriver = async (userId) => {
    setActionLoading(userId);
    try {
      await api('/admin/approve-driver', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      // refresh the list after approval
      await fetchDashboard();
    } catch (err) {
      setError(err.message || 'Failed to approve driver');
    } finally {
      setActionLoading(null);
    }
  };

  // reject a pending driver application
  const handleRejectDriver = async (userId) => {
    setActionLoading(userId);
    try {
      await api('/admin/reject-driver', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      // refresh the list after rejection
      await fetchDashboard();
    } catch (err) {
      setError(err.message || 'Failed to reject driver');
    } finally {
      setActionLoading(null);
    }
  };

  // handle admin logout
  const handleLogout = async () => {
    try {
      await api('/logout', { method: 'POST' });
    } catch (err) { /* logout anyway */ }
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dash-layout">
      {/* Sidebar - links now navigate to real pages */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">SAROTHI SHEBA</div>
        <nav className="dash-nav">
          <button className="dash-nav-item active" onClick={() => navigate('/dashboard/admin')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className="dash-nav-item" onClick={() => navigate('/admin/users')} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
          <h1 className="dash-title">Admin Dashboard</h1>
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

        {/* System Stats */}
        <div className="dash-stats-grid">
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} color="var(--accent-info)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{stats?.total_users || 0}</span>
              <span className="dash-stat-label">Total Users</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bike size={24} color="var(--accent-secondary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{stats?.total_drivers || 0}</span>
              <span className="dash-stat-label">Drivers</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserCheck size={24} color="var(--accent-success)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{stats?.total_passengers || 0}</span>
              <span className="dash-stat-label">Passengers</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={24} color="var(--accent-primary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{stats?.total_rides || 0}</span>
              <span className="dash-stat-label">Total Rides</span>
            </div>
          </div>
          <div className="dash-stat-card dash-stat-card--accent">
            <span className="dash-stat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Banknote size={24} color="var(--bg-primary)" /></span>
            <div className="dash-stat-info">
              <span className="dash-stat-value">৳{stats?.total_revenue || 0}</span>
              <span className="dash-stat-label">Total Revenue</span>
            </div>
          </div>
        </div>

        {/* Pending Driver Applications - now with Reject button */}
        <div className="dash-card">
          <h2 className="dash-card-title">
            Pending Driver Applications
            {pendingApps.length > 0 && (
              <span className="dash-badge">{pendingApps.length}</span>
            )}
          </h2>
          {pendingApps.length === 0 ? (
            <p className="dash-empty">No pending applications.</p>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>License</th>
                    <th>Applied</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApps.map((app) => (
                    <tr key={app.application_id}>
                      <td>{app.name}</td>
                      <td>{app.email}</td>
                      <td>{app.phone_number}</td>
                      <td><code>{app.license_number}</code></td>
                      <td>{new Date(app.applied_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className={`btn btn-primary btn-sm ${actionLoading === app.user_id ? 'btn-loading' : ''}`}
                            onClick={() => handleApproveDriver(app.user_id)}
                            disabled={actionLoading === app.user_id}
                          >
                            Approve
                          </button>
                          <button
                            className={`btn btn-danger btn-sm ${actionLoading === app.user_id ? 'btn-loading' : ''}`}
                            onClick={() => handleRejectDriver(app.user_id)}
                            disabled={actionLoading === app.user_id}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
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

export default AdminDashboard;

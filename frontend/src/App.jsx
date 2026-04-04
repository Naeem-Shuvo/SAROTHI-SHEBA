import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import PassengerDashboard from './pages/PassengerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import RideRequestPage from './pages/RideRequestPage';
import AvailableRidesPage from './pages/AvailableRidesPage';
import ActiveRidePage from './pages/ActiveRidePage';
import RideHistoryPage from './pages/RideHistoryPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminRidesPage from './pages/AdminRidesPage';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toaster 
             position="top-center" 
             toastOptions={{
                 style: { background: 'var(--bg-secondary)', color: 'white', border: '1px solid var(--border-subtle)' },
                 success: { iconTheme: { primary: 'var(--accent-success)', secondary: 'white' } },
                 error: { iconTheme: { primary: 'var(--accent-danger)', secondary: 'white' } }
             }} 
          />
          <Routes>
            {/* Auth Pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Post-Registration */}
            <Route path="/role-select" element={<RoleSelectionPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />

            {/* Role-based Dashboards */}
            <Route path="/dashboard" element={
              <ProtectedRoute><PassengerDashboard /></ProtectedRoute>
            } />
            <Route path="/dashboard/driver" element={
              <ProtectedRoute><DriverDashboard /></ProtectedRoute>
            } />
            <Route path="/dashboard/admin" element={
              <ProtectedRoute><AdminDashboard /></ProtectedRoute>
            } />

            {/* Ride Flow */}
            <Route path="/rides/request" element={
              <ProtectedRoute><RideRequestPage /></ProtectedRoute>
            } />
            <Route path="/rides/available" element={
              <ProtectedRoute><AvailableRidesPage /></ProtectedRoute>
            } />
            <Route path="/active-ride" element={
              <ProtectedRoute><ActiveRidePage /></ProtectedRoute>
            } />
            <Route path="/rides/history" element={
              <ProtectedRoute><RideHistoryPage /></ProtectedRoute>
            } />

            {/* Admin Pages */}
            <Route path="/admin/users" element={
              <ProtectedRoute><AdminUsersPage /></ProtectedRoute>
            } />
            <Route path="/admin/rides" element={
              <ProtectedRoute><AdminRidesPage /></ProtectedRoute>
            } />

            {/* Default Redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

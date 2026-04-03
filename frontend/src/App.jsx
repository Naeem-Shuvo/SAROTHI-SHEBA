import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

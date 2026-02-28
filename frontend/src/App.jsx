import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react';
import { setAuthInterceptor } from './api/axios';

import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import SelectRolePage from './pages/SelectRolePage';
import PassengerDashboard from './pages/passenger/Dashboard';
import DriverDashboard from './pages/driver/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import api from './api/axios';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// redirect based on role
function HomeRedirect() {
  const { getToken } = useAuth();
  const { isSignedIn, isLoaded: isUserLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isUserLoaded || !isSignedIn) return;

    async function checkRole() {
      try {
        const res = await api.get('/users/me');
        const { role } = res.data;

        if (role === 'passenger') {
          navigate('/passenger/dashboard', { replace: true });
        } else if (role === 'driver') {
          navigate('/driver/dashboard', { replace: true });
        } else if (role === 'admin') {
          navigate('/passenger/dashboard', { replace: true });
        } else {
          navigate('/select-role', { replace: true });
        }
      } catch (err) {
        console.error('Role check failed:', err);
        navigate('/select-role', { replace: true });
      } finally {
        setLoading(false);
      }
    }

    checkRole();
  }, [isUserLoaded, isSignedIn]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: '16px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--border)',
          borderTop: '3px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--text-secondary)' }}>Setting up your dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return null;
}

// setup auth interceptor
function AuthSetup({ children }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthInterceptor(getToken);
  }, [getToken]);

  return children;
}

function App() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <BrowserRouter>
        <AuthSetup>
          <Routes>
            {/* public */}
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />

            {/* home redirect */}
            <Route path="/" element={
              <ProtectedRoute>
                <HomeRedirect />
              </ProtectedRoute>
            } />

            {/* role selection */}
            <Route path="/select-role" element={
              <ProtectedRoute>
                <SelectRolePage />
              </ProtectedRoute>
            } />

            {/* passenger */}
            <Route path="/passenger/dashboard" element={
              <ProtectedRoute>
                <PassengerDashboard />
              </ProtectedRoute>
            } />

            {/* driver */}
            <Route path="/driver/dashboard" element={
              <ProtectedRoute>
                <DriverDashboard />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthSetup>
      </BrowserRouter>
    </ClerkProvider>
  );
}

export default App;

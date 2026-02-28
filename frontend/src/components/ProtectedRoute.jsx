import { useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
    const { isSignedIn, isLoaded } = useAuth();

    if (!isLoaded) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '1.1rem',
                color: 'var(--text-secondary)',
            }}>
                Loading...
            </div>
        );
    }

    if (!isSignedIn) {
        return <Navigate to="/sign-in" replace />;
    }

    return children;
}

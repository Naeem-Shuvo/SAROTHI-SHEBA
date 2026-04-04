import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Car, Bike, AlertTriangle, User } from 'lucide-react';

function RoleSelectionPage() {

    // driver card click korle license form show korar toggle state nisi
    const [showLicenseForm, setShowLicenseForm] = useState(false);

    // license number input field state e store rakhtesi logic pointer parsing points
    const [licenseNumber, setLicenseNumber] = useState('');

    // api request pendant status display logic handling points analytics visuals rendering
    const [loading, setLoading] = useState(false);

    // exception handle logic display generation rendering logic layout display generation rendering
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // auth context theke user details update korar logic handler pointer visuals rendering logic
    const { login } = useAuth();

    // Passenger role confirm korar logic execution handler point rendering logic layout display
    const handlePassengerSelect = async () => {
        setError('');
        setLoading(true);
        try {
            // backend api call kore user k passenger role assign kortesi logic handler
            const data = await api('/register/passenger', {
                method: 'POST',
            });
            // session storage update r role change sync kortesi analytics visuals rendering
            login(data.token, data.user);
            // primary analytics dashboard e auto-route logic identifier display logic handler
            navigate('/dashboard');
        } catch (err) {
            // failure feedback indicators mapping logic visuals point display ui rendering layout rendering
            setError(err.message || 'Failed to register as passenger');
        } finally {
            // request cycle terminate logic clear ui rendering layout generation points layout display
            setLoading(false);
        }

    };

    // Driver application form submission logic handler pointer visuals rendering logic layout display
    const handleDriverSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // License number validation logic execution check points visual layout parsing logic rendering
        if (!licenseNumber.trim()) {
            setError('License number is required');
            return;
        }

        setLoading(true);
        try {
            // admin review selection queue te driver candidate data pathaitesi logic parsing pointer
            await api('/register/driver', {
                method: 'POST',
                body: JSON.stringify({ license_number: licenseNumber }),
            });

            // approval queue feedback screen e redirection point logic handler parsing points rendering
            navigate('/pending-approval');
        } catch (err) {
            // server exception handling indicators mapping logic visuals point display ui rendering layout
            setError(err.message || 'Failed to submit driver application');
        } finally {
            // async session terminate logic clear ui rendering layout generation points layout display logic
            setLoading(false);
        }


    };

    return (
        <div className="auth-layout">
            {/* Identity decision console card rendering logic point layout generation rendering logic display */}
            <div className="auth-card" style={{ maxWidth: '520px' }}>
                <div className="auth-header">
                    {/* Branding identity setup rendering logic layout generation pointer visuals display rendering */}
                    <div className="auth-logo">SAROTHI SHEBA</div>
                    <p className="auth-subtitle">How would you like to use the app?</p>
                </div>

                {/* Conflict status indicator alert box logic points ui display generation rendering logic layout */}
                {error && (
                    <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                {/* User persona selection grid area layout rendering points layout display generation rendering */}
                <div className="role-grid">
                    {/* Consumer persona selection card rendering visuals point layout display generation rendering logic */}
                    <div
                        className="role-card"
                        onClick={!loading ? handlePassengerSelect : undefined}
                        style={{ opacity: loading ? 0.6 : 1 }}
                    >
                        {/* Visual identity icon layout rendering points layout display generation rendering logic display */}
                        <div className="role-icon"><User size={48} /></div>
                        <h3 className="role-title">Passenger</h3>
                        <p className="role-desc">Book rides and travel comfortably to your destination</p>
                    </div>

                    {/* Service provider persona selection card rendering visuals point layout display generation rendering logic */}
                    <div
                        className="role-card role-card--driver"
                        onClick={!loading ? () => setShowLicenseForm(true) : undefined}
                        style={{ opacity: loading ? 0.6 : 1 }}
                    >
                        {/* Service visual icon layout rendering points layout display generation rendering logic display rendering */}
                        <div className="role-icon"><Bike size={48} /></div>
                        <h3 className="role-title">Driver</h3>
                        <p className="role-desc">Accept rides and earn money on your own schedule</p>
                    </div>
                </div>

                {/* Credential verification form overlay points visuals point layout display generation rendering logic */}
                {showLicenseForm && (
                    <form className="license-form" onSubmit={handleDriverSubmit}>
                        {/* Formal identifier input grouping logic point visual layout points layout display rendering logic */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="licenseNumber">
                                Driving License Number
                            </label>
                            <input
                                id="licenseNumber"
                                type="text"
                                className="form-input"
                                placeholder="e.g. DHK-DR-1001"
                                value={licenseNumber}
                                onChange={(e) => setLicenseNumber(e.target.value)}
                                required
                            />
                        </div>

                        {/* Interaction action buttons layout rendering points layout display generation rendering logic display generation */}
                        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            {/* Cancellation logic pointer visuals rendering logic layout display generation rendering logic display generation */}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowLicenseForm(false)}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            {/* Submission finalize command execution point visual rendering logic layout display generation rendering points */}
                            <button
                                type="submit"
                                className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                Apply as Driver
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default RoleSelectionPage;

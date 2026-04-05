import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Car, Bike, AlertTriangle, User } from 'lucide-react';

function RoleSelectionPage() {
    const [showLicenseForm, setShowLicenseForm] = useState(false);
    const [licenseNumber, setLicenseNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handlePassengerSelect = async () => {
        setError('');
        setLoading(true);
        try {
            //passenger er role set korchi
            const data = await api('/register/passenger', {
                method: 'POST',
            });
            //login korchi
            login(data.token, data.user);
            //dashboard e pathacchi
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to register as passenger');
        } finally {
            setLoading(false);
        }

    };

    const handleDriverSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!licenseNumber.trim()) {
            setError('License number is required');
            return;
        }

        setLoading(true);
        try {
            await api('/register/driver', {
                method: 'POST',
                body: JSON.stringify({ license_number: licenseNumber }),
            });

            navigate('/pending-approval');
        } catch (err) {
            setError(err.message || 'Failed to submit driver application');
        } finally {
            setLoading(false);
        }


    };

    return (
        <div className="auth-layout">
            <div className="auth-card" style={{ maxWidth: '520px' }}>
                <div className="auth-header">
                    <div className="auth-logo">SAROTHI SHEBA</div>
                    <p className="auth-subtitle">How would you like to use the app?</p>
                </div>

                {error && (
                    <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                <div className="role-grid">
                    {/* Passenger Card */}
                    <div
                        className="role-card"
                        onClick={!loading ? handlePassengerSelect : undefined}
                        style={{ opacity: loading ? 0.6 : 1 }}
                    >
                        <div className="role-icon"><User size={48} /></div>
                        <h3 className="role-title">Passenger</h3>
                        <p className="role-desc">Book rides and travel comfortably to your destination</p>
                    </div>

                    {/* Driver Card */}
                    <div
                        className="role-card role-card--driver"
                        onClick={!loading ? () => setShowLicenseForm(true) : undefined}
                        style={{ opacity: loading ? 0.6 : 1 }}
                    >
                        <div className="role-icon"><Bike size={48} /></div>
                        <h3 className="role-title">Driver</h3>
                        <p className="role-desc">Accept rides and earn money on your own schedule</p>
                    </div>
                </div>

                {/* Driver License Form (appears when driver card is clicked) */}
                {showLicenseForm && (
                    <form className="license-form" onSubmit={handleDriverSubmit}>
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

                        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowLicenseForm(false)}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
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

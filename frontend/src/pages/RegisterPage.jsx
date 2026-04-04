import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AlertTriangle } from 'lucide-react';

function RegisterPage() {
    // registration form er shob field er data state e object hishebe rakhtesi
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone_number: '',
        password: '',
        confirmPassword: '',
    });
    // error message display korar jonno state update pointer logic logic
    const [error, setError] = useState('');
    // registration pending thakle button e loading spinner show hobe visual
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    // registration er por automatic login korar jonno auth context nisi
    const { login } = useAuth();


    // input field change hoile specific state property update kortesi logic point
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // registration form submission handler logic function pointer logic handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // password r confirm password match kortese kina oita check kortesi validation logic
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            // api k registration dataJson create kore pathaitesi logic handler point
            const data = await api('/register', {
                method: 'POST',
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    phone_number: formData.phone_number,
                    password: formData.password,
                }),
            });
            // registration success hoile automatic session create kortesi login hook diye
            login(data.token, data.user);
            // role select page e pathaitesi jate driver ba passenger select korte pare logic
            navigate('/role-select');
        } catch (err) {
            // registration failed hoile exception handle kore error state update kortesi
            setError(err.message || 'Registration failed');
        } finally {
            // request cycle shesh hoile loading cycle off hobe visual rendering point
            setLoading(false);
        }

    };

    return (
        <div className="auth-layout">
            {/* Registration box visual card rendering logic point layout generation rendering */}
            <div className="auth-card">
                <div className="auth-header">
                    {/* Branding identifier visual setup rendering logic layout generation pointer */}
                    <div className="auth-logo">SAROTHI SHEBA</div>
                    <p className="auth-subtitle">Create your account</p>
                </div>

                {/* Validation ba server error alert display zone visual rendering logic layout display */}
                {error && (
                    <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Full Name input field logic grouping rendering visuals point display layout */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="username">
                            Full Name
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            className="form-input"
                            placeholder="e.g. Naeem Shuvo"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Email address input field logic grouping rendering visual layout logic rendering */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Contact number input field logic grouping rendering visuals point display layout generation */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="phone_number">
                            Phone Number
                        </label>
                        <input
                            id="phone_number"
                            name="phone_number"
                            type="tel"
                            className="form-input"
                            placeholder="+8801XXXXXXXXX"
                            value={formData.phone_number}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Secure password input field logic grouping rendering visual layout parsing logic */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            className="form-input"
                            placeholder="Create a strong password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                        />
                    </div>

                    {/* Password secondary verification grouping logic point visual layout generation rendering */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="confirmPassword">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            className="form-input"
                            placeholder="Re-enter your password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Primary registration action execution point visual rendering logic layout display */}
                    <button
                        type="submit"
                        className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`}
                        disabled={loading}
                    >
                        Create Account
                    </button>
                </form>

                {/* Account existance alternative redirect logic generation pointer visuals display rendering */}
                <div className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;

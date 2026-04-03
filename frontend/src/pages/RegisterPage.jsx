import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function RegisterPage() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone_number: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            //api ke form er data pathacchi
            const data = await api('/register', {
                method: 'POST',
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    phone_number: formData.phone_number,
                    password: formData.password,
                }),
            });
            //jehetu register korche,tai login korchi automatically
            login(data.token, data.user);
            //role select page e pathacchi
            navigate('/role-select');
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }

    };

    return (
        <div className="auth-layout">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">SAROTHI SHEBA</div>
                    <p className="auth-subtitle">Create your account</p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <span>⚠</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
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

                    <button
                        type="submit"
                        className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`}
                        disabled={loading}
                    >
                        Create Account
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;

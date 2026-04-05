import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AlertTriangle } from 'lucide-react';

function LoginPage() {
  // login form er email r password state e store korar jonno object nisi
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
  });

  // error message display korar jonno state update point
  const [error, setError] = useState('');

  // login request pending thakle loading spinner show hobe
  const [loading, setLoading] = useState(false);

  // input field e kichu type korle state data update hobe ekhane
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const navigate = useNavigate();
  // auth context theke login method ta nisi store korar jonno
  const { login } = useAuth();


  // form submisson handler logic function pointer logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // api ke form er data json format e pathaitesi logic handler point
      const data = await api('/login', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.emailOrPhone,
          password: formData.password,
        }),
      });

      // credentials match hoile token r user details dharon kortesi
      login(data.token, data.user);

      // user er specific role check kore home screen e pathaitesi routing logic handler point
      if (data.user.role === 'passenger') {
        navigate('/dashboard');
      } else if (data.user.role === 'driver') {
        navigate('/dashboard/driver');
      } else if (data.user.role === 'admin') {
        navigate('/dashboard/admin');
      } else {
        // default role selection screen jodi role na thake check logic pointer
        navigate('/role-select');
      }
    } catch (err) {
      // failed login response error handle pointer layout display rendering
      setError(err.message || 'Login failed');
    }
    finally {
      // request shesh hoile loading cycle off hobe visual rendering
      setLoading(false);
    }

  };

  return (
    <div className="auth-layout">
      {/* Login box visual card rendering logic point layout generation rendering logic */}
      <div className="auth-card">
        <div className="auth-header">
          {/* Company branding visual identifier layout rendering pointer display */}
          <div className="auth-logo">SAROTHI SHEBA</div>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        {/* Global form level error handling indicator alert box logic points ui display rendering */}
        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* User identifier input grouping logic point visual rendering logic layout generation */}
          <div className="form-group">
            <label className="form-label" htmlFor="emailOrPhone">
              Email or Phone Number
            </label>
            <input
              id="emailOrPhone"
              name="emailOrPhone"
              type="text"
              className="form-input"
              placeholder="you@example.com or +880..."
              value={formData.emailOrPhone}
              onChange={handleChange}
              required
            />
          </div>

          {/* Secure character input grouping logic point visual layout parsing logic rendering */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Form action execution command point execution logic visual rendering pointer display */}
          <button
            type="submit"
            className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
          >
            Sign In
          </button>
        </form>

        {/* Alternative account creation redirect link logic generation pointer visuals display */}
        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

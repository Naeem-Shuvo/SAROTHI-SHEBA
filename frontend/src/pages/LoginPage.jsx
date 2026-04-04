import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AlertTriangle } from 'lucide-react';

function LoginPage() {
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const navigate = useNavigate();
  const { login } = useAuth();


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      //api ke form er data pathacchi
      const data = await api('/login', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.emailOrPhone,
          password: formData.password,
        }),
      });

      //AuthContext e login function call kortesi
      login(data.token, data.user);

      //role check kore navigate korchi
      if (data.user.role === 'passenger') {
        navigate('/dashboard');
      } else if (data.user.role === 'driver') {
        navigate('/dashboard/driver');
      } else if (data.user.role === 'admin') {
        navigate('/dashboard/admin');
      } else {
        navigate('/role-select');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    }
    finally {
      setLoading(false);
    }

  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">SAROTHI SHEBA</div>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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

          <button
            type="submit"
            className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
          >
            Sign In
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

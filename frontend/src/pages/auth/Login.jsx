import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';
import { GiCrossedSwords } from 'react-icons/gi';
import './Login.css';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login({ username: form.username, password: form.password });
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-bg" />
      <div className="login-card fade-in">
        <div className="login-logo-wrap">
          <div className="login-logo-icon"><GiCrossedSwords size={36} color="#fff" /></div>
          <h1 className="login-title">QUÂN KHÍ</h1>
          <p className="login-subtitle">Hệ thống quản lý vũ khí trang bị</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">Tên đăng nhập</label>
            <div className="login-input-wrap">
              <FiUser className="login-input-icon" />
              <input
                className="login-input"
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Nhập tên đăng nhập"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">Mật khẩu</label>
            <div className="login-input-wrap">
              <FiLock className="login-input-icon" />
              <input
                className="login-input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Nhập mật khẩu"
                required
              />
            </div>
          </div>

          {error && (
            <div className="login-error-box">
              <span>⚠ {error}</span>
            </div>
          )}

          <button
            className={`login-btn${loading ? ' login-btn--loading' : ''}`}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span>Đang xử lý...</span>
            ) : (
              <><FiLogIn style={{ marginRight: 8 }} />Đăng nhập</>
            )}
          </button>
        </form>

        <p className="login-footer">© 2024 Hệ thống quản lý kho quân khí</p>
      </div>
    </div>
  );
}

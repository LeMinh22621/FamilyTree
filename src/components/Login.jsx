import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    const result = login(username.trim(), password);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="login-page">
      {/* Decorative background */}
      <div className="login-bg-pattern" />

      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <svg viewBox="0 0 80 80" width="64" height="64">
              <circle cx="40" cy="40" r="38" fill="#3b2b1b" stroke="#d4af37" strokeWidth="2"/>
              <path d="M40 15c8 8 13 13 13 23s-5 15-13 23c-8-8-13-13-13-23s5-15 13-23z" fill="#d4af37" opacity="0.9"/>
              <path d="M28 38c5-7 10-10 12-12 2 2 7 5 12 12-5 2-10 2-12 2s-7 0-12-2z" fill="#8b2a2a" opacity="0.85"/>
            </svg>
          </div>
          <h1 className="login-title">GIA PHẢ</h1>
          <p className="login-subtitle">Đăng nhập để xem phả hệ dòng họ</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <span className="login-error-icon">⚠</span>
              {error}
            </div>
          )}

          <div className="login-field">
            <label htmlFor="username">Tên đăng nhập</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">👤</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Mật khẩu</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">🔒</span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn">
            Đăng nhập
          </button>
        </form>

        {/* Demo accounts hint */}
        <div className="login-hint">
          <details>
            <summary>Tài khoản thử nghiệm</summary>
            <div className="login-hint-list">
              <p className="hint-clan-title">⚙️ Quản trị hệ thống</p>
              <div className="hint-row">
                <span className="hint-role sysadmin">SYSADMIN</span>
                <code>sysadmin</code> / <code>sysadmin@2026</code>
              </div>
              <hr className="hint-divider" />
              <p className="hint-clan-title">🏯 Gia tộc Monkey D.</p>
              <div className="hint-row">
                <span className="hint-role admin">ADMIN</span>
                <code>admin_monkeyd</code> / <code>monkeyd@2026</code>
              </div>
              <div className="hint-row">
                <span className="hint-role viewer">XEM</span>
                <code>luffy</code> / <code>luffy123</code>
              </div>
              <p className="hint-clan-title">⚔️ Gia tộc Roronoa</p>
              <div className="hint-row">
                <span className="hint-role admin">ADMIN</span>
                <code>admin_roronoa</code> / <code>roronoa@2026</code>
              </div>
              <div className="hint-row">
                <span className="hint-role viewer">XEM</span>
                <code>zoro</code> / <code>zoro123</code>
              </div>
              <p className="hint-clan-title">👑 Gia tộc Vinsmoke</p>
              <div className="hint-row">
                <span className="hint-role admin">ADMIN</span>
                <code>admin_vinsmoke</code> / <code>vinsmoke@2026</code>
              </div>
              <div className="hint-row">
                <span className="hint-role viewer">XEM</span>
                <code>sanji</code> / <code>sanji123</code>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

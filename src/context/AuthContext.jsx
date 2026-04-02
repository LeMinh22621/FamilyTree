import React from 'react';

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(() => {
    try {
      const saved = sessionStorage.getItem('ft_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = async (username, password) => {
    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        return { ok: false, error: data.error || 'Sai tên đăng nhập hoặc mật khẩu' };
      }

      const session = data.user;
      setUser(session);
      sessionStorage.setItem('ft_user', JSON.stringify(session));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Lỗi kết nối. Vui lòng thử lại.' };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('ft_user');
  };

  const isSysAdmin = user?.role === 'sysadmin';
  const isAdmin = user?.role === 'admin';
  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isSysAdmin, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;

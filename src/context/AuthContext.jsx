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
  const [usersData, setUsersData] = React.useState(null);

  // Load users.json once
  React.useEffect(() => {
    fetch('/api/data/users.json')
      .then((r) => r.json())
      .then((d) => setUsersData(d))
      .catch((err) => console.error('Failed to load users.json', err));
  }, []);

  const login = (username, password) => {
    if (!usersData) return { ok: false, error: 'Đang tải dữ liệu...' };

    const found = usersData.users.find(
      (u) => u.username === username && u.password === password
    );

    if (!found) return { ok: false, error: 'Sai tên đăng nhập hoặc mật khẩu' };

    const clan = usersData.clans.find((c) => c.clanId === found.clanId);
    const session = {
      username: found.username,
      displayName: found.displayName,
      role: found.role,
      clanId: found.clanId || null,
      clanName: clan ? clan.clanName : (found.clanId || ''),
      dataFile: clan ? clan.dataFile : null,
    };

    setUser(session);
    sessionStorage.setItem('ft_user', JSON.stringify(session));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('ft_user');
  };

  const isSysAdmin = user?.role === 'sysadmin';
  const isAdmin = user?.role === 'admin';
  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isSysAdmin, isLoggedIn, usersData, setUsersData }}>
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

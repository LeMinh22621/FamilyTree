import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function AdminPanel() {
  const { user, logout, setUsersData } = useAuth();
  const [tab, setTab] = React.useState('clans'); // 'clans' | 'users' | 'github'
  const [clans, setClans] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState(null);

  // ─── Clan form state ───
  const [showClanForm, setShowClanForm] = React.useState(false);
  const [editingClan, setEditingClan] = React.useState(null);
  const [clanForm, setClanForm] = React.useState({ clanId: '', clanName: '', dataFile: '' });

  // ─── User form state ───
  const [showUserForm, setShowUserForm] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState(null);
  const [userForm, setUserForm] = React.useState({ username: '', password: '', displayName: '', role: 'viewer', clanId: '' });

  // ─── GitHub config state ───
  const [ghConfig, setGhConfig] = React.useState({ owner: '', repo: '', token: '', branch: 'main', dataPath: 'data', imagePath: 'images', enabled: false });
  const [ghTesting, setGhTesting] = React.useState(false);
  const [ghSyncing, setGhSyncing] = React.useState(false);

  // ─── Fetch data ───
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [cr, ur, gh] = await Promise.all([
        fetch('/api/clans').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/github-config').then((r) => r.json()).catch(() => null),
      ]);
      setClans(cr.clans || []);
      setUsers(ur.users || []);
      if (gh) setGhConfig(gh);
      // Also update AuthContext's usersData
      setUsersData({ clans: cr.clans || [], users: ur.users || [] });
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    }
    setLoading(false);
  }, [setUsersData]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  // ─── CLAN CRUD ───

  const openClanAdd = () => {
    setEditingClan(null);
    setClanForm({ clanId: '', clanName: '', dataFile: '' });
    setShowClanForm(true);
  };

  const openClanEdit = (clan) => {
    setEditingClan(clan.clanId);
    setClanForm({ clanId: clan.clanId, clanName: clan.clanName, dataFile: clan.dataFile });
    setShowClanForm(true);
  };

  const handleClanSubmit = async (e) => {
    e.preventDefault();
    const { clanId, clanName, dataFile } = clanForm;
    if (!clanId.trim() || !clanName.trim()) {
      flash('Vui lòng nhập đầy đủ thông tin', 'error');
      return;
    }
    const finalDataFile = dataFile.trim() || `data_${clanId.trim()}.json`;

    try {
      let res;
      if (editingClan) {
        res = await fetch(`/api/clans/${encodeURIComponent(editingClan)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clanName: clanName.trim(), dataFile: finalDataFile }),
        });
      } else {
        res = await fetch('/api/clans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clanId: clanId.trim(), clanName: clanName.trim(), dataFile: finalDataFile }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        flash(data.error || 'Lỗi', 'error');
        return;
      }
      setClans(data.clans);
      setShowClanForm(false);
      flash(editingClan ? 'Đã cập nhật clan' : 'Đã thêm clan mới');
      fetchData();
    } catch (err) {
      flash('Lỗi kết nối', 'error');
    }
  };

  const handleClanDelete = async (clanId) => {
    if (!confirm(`Xóa clan "${clanId}"? Hành động này không thể hoàn tác.`)) return;
    try {
      const res = await fetch(`/api/clans/${encodeURIComponent(clanId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error || 'Lỗi khi xóa', 'error');
        return;
      }
      setClans(data.clans);
      flash('Đã xóa clan');
      fetchData();
    } catch (err) {
      flash('Lỗi kết nối', 'error');
    }
  };

  // ─── USER CRUD ───

  const openUserAdd = () => {
    setEditingUser(null);
    setUserForm({ username: '', password: '', displayName: '', role: 'viewer', clanId: clans[0]?.clanId || '' });
    setShowUserForm(true);
  };

  const openUserEdit = (u) => {
    setEditingUser(u.username);
    setUserForm({ username: u.username, password: '', displayName: u.displayName, role: u.role, clanId: u.clanId || '' });
    setShowUserForm(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const { username, password, displayName, role, clanId } = userForm;
    if (!username.trim() || !displayName.trim()) {
      flash('Vui lòng nhập đầy đủ thông tin', 'error');
      return;
    }
    if (!editingUser && !password.trim()) {
      flash('Mật khẩu là bắt buộc khi tạo mới', 'error');
      return;
    }

    try {
      let res;
      if (editingUser) {
        const body = { displayName: displayName.trim(), role, clanId: role === 'sysadmin' ? null : (clanId || null) };
        if (password.trim()) body.password = password.trim();
        res = await fetch(`/api/users/${encodeURIComponent(editingUser)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password: password.trim(),
            displayName: displayName.trim(),
            role,
            clanId: role === 'sysadmin' ? null : (clanId || null),
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        flash(data.error || 'Lỗi', 'error');
        return;
      }
      setUsers(data.users);
      setShowUserForm(false);
      flash(editingUser ? 'Đã cập nhật tài khoản' : 'Đã thêm tài khoản mới');
      fetchData();
    } catch (err) {
      flash('Lỗi kết nối', 'error');
    }
  };

  const handleUserDelete = async (username) => {
    if (!confirm(`Xóa tài khoản "${username}"?`)) return;
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error || 'Lỗi khi xóa', 'error');
        return;
      }
      setUsers(data.users);
      flash('Đã xóa tài khoản');
      fetchData();
    } catch (err) {
      flash('Lỗi kết nối', 'error');
    }
  };

  const getClanName = (clanId) => {
    if (!clanId) return '—';
    const c = clans.find((cl) => cl.clanId === clanId);
    return c ? c.clanName : clanId;
  };

  // ─── GITHUB CONFIG ───

  const handleGhSave = async () => {
    try {
      const res = await fetch('/api/github-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ghConfig),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error || 'Lỗi', 'error'); return; }
      setGhConfig(data.config);
      flash('Đã lưu cấu hình GitHub');
    } catch (err) {
      flash('Lỗi kết nối', 'error');
    }
  };

  const handleGhTest = async () => {
    setGhTesting(true);
    try {
      const res = await fetch('/api/github-test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { flash(data.error || 'Kết nối thất bại', 'error'); return; }
      flash(`✅ Kết nối thành công: ${data.repoName} (branch: ${data.defaultBranch})`);
    } catch (err) {
      flash('Lỗi kết nối: ' + err.message, 'error');
    } finally {
      setGhTesting(false);
    }
  };

  const handleGhSyncAll = async () => {
    setGhSyncing(true);
    try {
      const res = await fetch('/api/github-sync-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { flash(data.error || 'Sync thất bại', 'error'); return; }
      flash(`Đã đồng bộ ${data.synced.length} file lên GitHub`);
    } catch (err) {
      flash('Lỗi: ' + err.message, 'error');
    } finally {
      setGhSyncing(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'sysadmin': return <span className="adm-badge sysadmin">🔧 SysAdmin</span>;
      case 'admin': return <span className="adm-badge admin">🛡 Admin</span>;
      default: return <span className="adm-badge viewer">👁 Viewer</span>;
    }
  };

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo">⚙️</div>
          <div>
            <h1 className="admin-title">QUẢN TRỊ HỆ THỐNG</h1>
            <p className="admin-subtitle">Quản lý dòng họ và tài khoản người dùng</p>
          </div>
        </div>
        <div className="admin-header-right">
          <span className="admin-user-name">{user?.displayName}</span>
          <button className="admin-logout-btn" onClick={logout}>Đăng xuất</button>
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`admin-flash ${msg.type}`}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'clans' ? 'active' : ''}`} onClick={() => setTab('clans')}>
          🏯 Quản lý dòng họ ({clans.length})
        </button>
        <button className={`admin-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          👥 Quản lý tài khoản ({users.length})
        </button>
        <button className={`admin-tab ${tab === 'github' ? 'active' : ''}`} onClick={() => setTab('github')}>
          🐙 GitHub {ghConfig.enabled ? '🟢' : '⚪'}
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">Đang tải dữ liệu...</div>
      ) : (
        <div className="admin-content">
          {/* ═══ CLANS TAB ═══ */}
          {tab === 'clans' && (
            <div className="admin-section">
              <div className="admin-section-header">
                <h2>Danh sách dòng họ</h2>
                <button className="admin-add-btn" onClick={openClanAdd}>＋ Thêm dòng họ</button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Mã clan</th>
                      <th>Tên dòng họ</th>
                      <th>Tệp dữ liệu</th>
                      <th>Số tài khoản</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clans.map((c) => {
                      const userCount = users.filter((u) => u.clanId === c.clanId).length;
                      return (
                        <tr key={c.clanId}>
                          <td><code>{c.clanId}</code></td>
                          <td className="clan-name-cell">{c.clanName}</td>
                          <td><code>{c.dataFile}</code></td>
                          <td className="center">{userCount}</td>
                          <td className="actions">
                            <button className="adm-btn edit" onClick={() => openClanEdit(c)} title="Sửa">✏️</button>
                            <button className="adm-btn delete" onClick={() => handleClanDelete(c.clanId)} title="Xóa">🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                    {clans.length === 0 && (
                      <tr><td colSpan={5} className="empty-row">Chưa có dòng họ nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ USERS TAB ═══ */}
          {tab === 'users' && (
            <div className="admin-section">
              <div className="admin-section-header">
                <h2>Danh sách tài khoản</h2>
                <button className="admin-add-btn" onClick={openUserAdd}>＋ Thêm tài khoản</button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tên đăng nhập</th>
                      <th>Tên hiển thị</th>
                      <th>Vai trò</th>
                      <th>Dòng họ</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.username} className={u.role === 'sysadmin' ? 'sysadmin-row' : ''}>
                        <td><code>{u.username}</code></td>
                        <td>{u.displayName}</td>
                        <td>{getRoleBadge(u.role)}</td>
                        <td>{getClanName(u.clanId)}</td>
                        <td className="actions">
                          <button className="adm-btn edit" onClick={() => openUserEdit(u)} title="Sửa">✏️</button>
                          {u.role !== 'sysadmin' && (
                            <button className="adm-btn delete" onClick={() => handleUserDelete(u.username)} title="Xóa">🗑️</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={5} className="empty-row">Chưa có tài khoản nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ GITHUB TAB ═══ */}
          {tab === 'github' && (
            <div className="admin-section">
              <div className="admin-section-header">
                <h2>Cấu hình GitHub Repository</h2>
              </div>
              <p className="gh-description">
                Kết nối với GitHub để lưu trữ dữ liệu JSON và ảnh thành viên. Mọi thay đổi sẽ tự động được đồng bộ lên repository.
              </p>

              <div className="gh-form">
                {/* Enable toggle */}
                <div className="gh-toggle-row">
                  <label className="gh-toggle-label">
                    <input
                      type="checkbox"
                      checked={ghConfig.enabled}
                      onChange={(e) => setGhConfig((c) => ({ ...c, enabled: e.target.checked }))}
                    />
                    <span className="gh-toggle-text">Bật đồng bộ GitHub</span>
                  </label>
                  <span className={`gh-status ${ghConfig.enabled ? 'on' : 'off'}`}>
                    {ghConfig.enabled ? '🟢 Đang bật' : '⚪ Đang tắt'}
                  </span>
                </div>

                <div className="gh-fields">
                  <div className="adm-field">
                    <label>Repository Owner (username hoặc org)</label>
                    <input
                      type="text"
                      value={ghConfig.owner}
                      onChange={(e) => setGhConfig((c) => ({ ...c, owner: e.target.value }))}
                      placeholder="vd: my-username"
                    />
                  </div>
                  <div className="adm-field">
                    <label>Repository Name</label>
                    <input
                      type="text"
                      value={ghConfig.repo}
                      onChange={(e) => setGhConfig((c) => ({ ...c, repo: e.target.value }))}
                      placeholder="vd: family-tree-data"
                    />
                  </div>
                  <div className="adm-field">
                    <label>Personal Access Token</label>
                    <input
                      type="password"
                      value={ghConfig.token}
                      onChange={(e) => setGhConfig((c) => ({ ...c, token: e.target.value }))}
                      placeholder="ghp_xxxxxxxxxxxx"
                    />
                    <small>Cần quyền <code>repo</code> (full control). Tạo tại <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">GitHub Settings → Tokens</a></small>
                  </div>
                  <div className="form-row">
                    <div className="adm-field">
                      <label>Branch</label>
                      <input
                        type="text"
                        value={ghConfig.branch}
                        onChange={(e) => setGhConfig((c) => ({ ...c, branch: e.target.value }))}
                        placeholder="main"
                      />
                    </div>
                    <div className="adm-field">
                      <label>Thư mục dữ liệu</label>
                      <input
                        type="text"
                        value={ghConfig.dataPath}
                        onChange={(e) => setGhConfig((c) => ({ ...c, dataPath: e.target.value }))}
                        placeholder="data"
                      />
                    </div>
                    <div className="adm-field">
                      <label>Thư mục ảnh</label>
                      <input
                        type="text"
                        value={ghConfig.imagePath}
                        onChange={(e) => setGhConfig((c) => ({ ...c, imagePath: e.target.value }))}
                        placeholder="images"
                      />
                    </div>
                  </div>
                </div>

                <div className="gh-actions">
                  <button className="adm-submit-btn" onClick={handleGhSave}>💾 Lưu cấu hình</button>
                  <button className="gh-test-btn" onClick={handleGhTest} disabled={ghTesting}>
                    {ghTesting ? '⏳ Đang kiểm tra...' : '🔌 Kiểm tra kết nối'}
                  </button>
                  <button className="gh-sync-btn" onClick={handleGhSyncAll} disabled={ghSyncing || !ghConfig.enabled}>
                    {ghSyncing ? '⏳ Đang đồng bộ...' : '🔄 Đồng bộ tất cả lên GitHub'}
                  </button>
                </div>

                <div className="gh-info-box">
                  <h4>📋 Hướng dẫn</h4>
                  <ol>
                    <li>Tạo một <strong>GitHub Repository</strong> (public hoặc private)</li>
                    <li>Tạo <strong>Personal Access Token</strong> với quyền <code>repo</code> tại <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer">github.com/settings/tokens</a></li>
                    <li>Điền thông tin Owner, Repo, Token vào form trên</li>
                    <li>Nhấn <strong>Kiểm tra kết nối</strong> để xác nhận</li>
                    <li>Bật <strong>Đồng bộ GitHub</strong> và nhấn <strong>Lưu cấu hình</strong></li>
                    <li>Nhấn <strong>Đồng bộ tất cả</strong> để đẩy toàn bộ dữ liệu lên GitHub lần đầu</li>
                  </ol>
                  <p>Sau khi bật, mọi thay đổi (thêm/sửa/xóa thành viên, upload ảnh) sẽ tự động được lưu lên GitHub.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CLAN FORM MODAL ═══ */}
      {showClanForm && (
        <div className="admin-modal-overlay" onClick={() => setShowClanForm(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingClan ? 'Sửa dòng họ' : 'Thêm dòng họ mới'}</h3>
            <form onSubmit={handleClanSubmit}>
              <div className="adm-field">
                <label>Mã clan (ID)</label>
                <input
                  type="text"
                  value={clanForm.clanId}
                  onChange={(e) => setClanForm((f) => ({ ...f, clanId: e.target.value }))}
                  disabled={!!editingClan}
                  placeholder="vd: nguyen-van"
                  autoFocus
                />
              </div>
              <div className="adm-field">
                <label>Tên dòng họ</label>
                <input
                  type="text"
                  value={clanForm.clanName}
                  onChange={(e) => setClanForm((f) => ({ ...f, clanName: e.target.value }))}
                  placeholder="vd: Nguyễn Văn"
                />
              </div>
              <div className="adm-field">
                <label>Tệp dữ liệu</label>
                <input
                  type="text"
                  value={clanForm.dataFile}
                  onChange={(e) => setClanForm((f) => ({ ...f, dataFile: e.target.value }))}
                  placeholder={`data_${clanForm.clanId || 'clan-id'}.json`}
                />
                <small>Để trống sẽ tự sinh theo mã clan</small>
              </div>
              <div className="adm-form-actions">
                <button type="button" className="adm-cancel-btn" onClick={() => setShowClanForm(false)}>Hủy</button>
                <button type="submit" className="adm-submit-btn">{editingClan ? 'Cập nhật' : 'Thêm mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ USER FORM MODAL ═══ */}
      {showUserForm && (
        <div className="admin-modal-overlay" onClick={() => setShowUserForm(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingUser ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}</h3>
            <form onSubmit={handleUserSubmit}>
              <div className="adm-field">
                <label>Tên đăng nhập</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
                  disabled={!!editingUser}
                  placeholder="vd: admin_nguyen"
                  autoFocus
                />
              </div>
              <div className="adm-field">
                <label>{editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}</label>
                <input
                  type="text"
                  value={userForm.password}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editingUser ? '(không thay đổi)' : 'Nhập mật khẩu'}
                />
              </div>
              <div className="adm-field">
                <label>Tên hiển thị</label>
                <input
                  type="text"
                  value={userForm.displayName}
                  onChange={(e) => setUserForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="vd: Nguyễn Văn A"
                />
              </div>
              <div className="adm-field">
                <label>Vai trò</label>
                <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="viewer">👁 Viewer (Chỉ xem)</option>
                  <option value="admin">🛡 Admin (Quản trị viên clan)</option>
                  <option value="sysadmin">🔧 SysAdmin (Quản trị hệ thống)</option>
                </select>
              </div>
              {userForm.role !== 'sysadmin' && (
                <div className="adm-field">
                  <label>Dòng họ</label>
                  <select value={userForm.clanId} onChange={(e) => setUserForm((f) => ({ ...f, clanId: e.target.value }))}>
                    <option value="">— Chọn dòng họ —</option>
                    {clans.map((c) => (
                      <option key={c.clanId} value={c.clanId}>{c.clanName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="adm-form-actions">
                <button type="button" className="adm-cancel-btn" onClick={() => setShowUserForm(false)}>Hủy</button>
                <button type="submit" className="adm-submit-btn">{editingUser ? 'Cập nhật' : 'Thêm mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

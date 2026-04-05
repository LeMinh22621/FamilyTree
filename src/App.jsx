import React from 'react';
import Header from './components/Header';
import GenealogyTree from './components/GenealogyTree';
import MemberDetail from './components/MemberDetail';
import Search from './components/Search';
import DeathAnniversary from './components/DeathAnniversary';
import AddMember from './components/AddMember';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import { useAuth } from './context/AuthContext';
import './styles.css';

export default function App() {
  const { isLoggedIn, isAdmin, isSysAdmin, user, logout } = useAuth();
  const [members, setMembers] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [filtered, setFiltered] = React.useState(null);
  const [showPanel, setShowPanel] = React.useState(false);
  const [showAddForm, setShowAddForm] = React.useState(false);

  React.useEffect(() => {
    if (!isLoggedIn || !user) {
      setMembers([]);
      setSelected(null);
      setFiltered(null);
      return;
    }
    const dataFile = user.dataFile || 'data.json';
    setMembers([]); // clear stale data while loading
    setSelected(null);
    setFiltered(null);
    fetch(`/api/data/${dataFile}`)
      .then((r) => r.json())
      .then((d) => setMembers(d))
      .catch((err) => console.error(`Failed load ${dataFile}`, err));
  }, [isLoggedIn, user]);

  // If not logged in, show login page
  if (!isLoggedIn) return <Login />;

  // If sysadmin, show admin panel
  if (isSysAdmin) return <AdminPanel />;

  const handleSearch = ({ q, moPhan }) => {
    let result = members;
    if (q) {
      const norm = q.toLowerCase();
      result = result.filter(
        (m) =>
          (m.tenTu || '').toLowerCase().includes(norm) ||
          (m.tenHuy || '').toLowerCase().includes(norm)
      );
    }
    if (moPhan) {
      const nm = moPhan.toLowerCase();
      result = result.filter((m) => (m.moPhan || '').toLowerCase().includes(nm));
    }
    setFiltered(result);
    setSelected(result[0] || null);
    setShowPanel(true);
  };

  const handleSelect = (m) => {
    setSelected(m);
    setShowPanel(true);
  };

  const handleAddMember = async (newMember) => {
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataFile: user.dataFile, member: newMember }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Lỗi khi thêm thành viên');
        return;
      }
      setMembers(data.members);
      setFiltered(null);
      setShowAddForm(false);
      // Don't auto-select — user can click the node on the tree to view detail
    } catch (err) {
      console.error('Add member failed', err);
      alert('Không thể lưu dữ liệu.');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataFile: user.dataFile }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Lỗi khi xóa thành viên');
        return;
      }
      setMembers(data.members);
      if (selected && selected.id === memberId) setSelected(null);
      setFiltered(null);
    } catch (err) {
      console.error('Delete member failed', err);
      alert('Không thể xóa dữ liệu.');
    }
  };

  const handleEditMember = async (updatedMember) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/members/${updatedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataFile: user.dataFile, member: updatedMember }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Lỗi khi cập nhật thành viên');
        return;
      }
      setMembers(data.members);
      setSelected(updatedMember);
      setFiltered(null);
    } catch (err) {
      console.error('Edit member failed', err);
      alert('Không thể cập nhật dữ liệu.');
    }
  };

  const listToShow = filtered || members;

  return (
    <div className="ft-app">
      <Header user={user} onLogout={logout} />

      {/* Decorative frame around tree */}
      <div className="tree-frame">
        <div className="frame-corner tl" />
        <div className="frame-corner tr" />
        <div className="frame-corner bl" />
        <div className="frame-corner br" />
        <GenealogyTree members={listToShow} onSelect={handleSelect} />
      </div>

      {/* Slide-out detail panel */}
      <div className={`side-panel ${showPanel ? 'open' : ''}`}>
        <button className="panel-close" onClick={() => setShowPanel(false)}>✕</button>
        <Search onSearch={handleSearch} />
        <MemberDetail
          member={selected}
          members={members}
          isAdmin={isAdmin}
          onDelete={handleDeleteMember}
          onEdit={handleEditMember}
        />
        <DeathAnniversary members={members} daysAhead={90} />
      </div>

      {/* Toggle panel button */}
      {!showPanel && (
        <button className="panel-toggle" onClick={() => setShowPanel(true)} title="Tìm kiếm & Chi tiết">
          ☰
        </button>
      )}

      {/* Add member button — admin only */}
      {isAdmin && (
        <button
          className="fab-add"
          onClick={() => setShowAddForm(true)}
          title="Thêm thành viên mới"
        >
          ＋
        </button>
      )}

      {/* Add member modal — admin only */}
      {isAdmin && showAddForm && (
        <AddMember
          members={members}
          onAdd={handleAddMember}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

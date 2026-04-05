/**
 * MemberPicker — searchable dropdown to pick a member from a large list.
 *
 * Props:
 *  - members: full members array
 *  - filter: optional fn(m) => bool  (e.g. only show Nam)
 *  - exclude: array of ids to hide   (already-selected / self)
 *  - placeholder: string
 *  - onSelect(id): called when user picks someone
 */
import React from 'react';

export default function MemberPicker({ members = [], filter, exclude = [], placeholder = '— Tìm kiếm... —', onSelect }) {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = React.useMemo(() => {
    let list = members;
    if (filter) list = list.filter(filter);
    list = list.filter((m) => !exclude.includes(m.id));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (m) =>
          (m.tenTu || '').toLowerCase().includes(q) ||
          (m.tenHuy || '').toLowerCase().includes(q) ||
          (m.id || '').toLowerCase().includes(q)
      );
    }
    return list.slice(0, 60); // cap to avoid rendering 1000+ items
  }, [members, filter, exclude, query]);

  const handleSelect = (id) => {
    onSelect(id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="member-picker" ref={wrapRef}>
      <div
        className="member-picker-input"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="picker-icon">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="picker-arrow">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="member-picker-dropdown">
          {filtered.length === 0 ? (
            <div className="picker-empty">Không tìm thấy kết quả</div>
          ) : (
            filtered.map((m) => (
              <div
                key={m.id}
                className="picker-item"
                onMouseDown={() => handleSelect(m.id)}
              >
                <span className={`picker-gender ${m.gioiTinh === 'Nữ' ? 'female' : 'male'}`}>
                  {m.gioiTinh === 'Nữ' ? '♀' : '♂'}
                </span>
                <span className="picker-name">{m.tenHuy} {m.tenTu}</span>
                <span className="picker-id">{m.id}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

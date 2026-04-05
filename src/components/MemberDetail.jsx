import React from 'react';
import ImageUpload from './ImageUpload';
import MemberPicker from './MemberPicker';
import { useAuth } from '../context/AuthContext';
import { proxyImageUrl } from '../utils/imageProxy';

export default function MemberDetail({ member, members = [], isAdmin, onDelete, onEdit }) {
  const { user } = useAuth();
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({});

  React.useEffect(() => {
    if (member) setForm({ ...member });
    setEditing(false);
  }, [member]);

  // Helper — find member by id
  const findName = (id) => {
    if (!id) return null;
    const m = members.find((x) => x.id === id);
    return m ? m.tenTu : id;
  };

  if (!member) {
    return (
      <aside className="ft-detail">
        <div className="detail-empty">
          <div className="detail-empty-icon">👤</div>
          <p>Chọn một thành viên trên phả đồ để xem chi tiết.</p>
        </div>
      </aside>
    );
  }

  const formatDate = (d) => (d ? d : '—');
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const handleSave = () => { if (onEdit) onEdit(form); setEditing(false); };
  const handleDelete = () => {
    if (window.confirm(`Xác nhận xóa thành viên "${member.tenTu}"?`)) {
      if (onDelete) onDelete(member.id);
    }
  };

  // Resolve relationships
  const fatherName = findName(member.chaId);
  const motherName = findName(member.meId);
  const spouseNames = (member.voChongIds || []).map(findName).filter(Boolean);
  const children = members.filter(
    (m) => m.chaId === member.id || m.meId === member.id
  );

  // View mode
  if (!editing) {
    return (
      <aside className="ft-detail">
        <div className="detail-header-row">
          <h2 className="section-title">Thông tin chi tiết</h2>
          {isAdmin && (
            <div className="detail-actions">
              <button className="btn-edit" onClick={() => setEditing(true)} title="Sửa">✏️</button>
              <button className="btn-delete" onClick={handleDelete} title="Xóa">🗑️</button>
            </div>
          )}
        </div>

        {/* Profile header */}
        <div className="detail-profile">
          <div className="detail-avatar-wrap">
            <img
              src={proxyImageUrl(member.hinhAnh)}
              alt={member.tenTu}
              className="detail-avatar"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            <div className="detail-avatar-fallback" style={{ display: 'none' }}>
              <span>{(member.tenTu || '?')[0]}</span>
            </div>
            {member.gioiTinh && (
              <span className={`detail-gender-badge ${member.gioiTinh === 'Nam' ? 'male' : 'female'}`}>
                {member.gioiTinh === 'Nam' ? '♂' : '♀'}
              </span>
            )}
          </div>
          <div className="detail-profile-info">
            <h3 className="detail-fullname">{member.tenTu}</h3>
            {member.thuyHieu && <p className="detail-title-text">{member.thuyHieu}</p>}
            <span className={`detail-branch-badge ${member.nhanh || 'noi'}`}>
              {member.nhanh === 'ngoai' ? 'Ngoại' : 'Nội'}
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div className="detail-info-grid">
          <div className="detail-info-item">
            <span className="info-icon">📛</span>
            <div>
              <span className="info-label">Họ</span>
              <span className="info-value">{member.tenHuy || '—'}</span>
            </div>
          </div>
          <div className="detail-info-item">
            <span className="info-icon">🎂</span>
            <div>
              <span className="info-label">Ngày sinh</span>
              <span className="info-value">{formatDate(member.ngaySinh)}</span>
            </div>
          </div>
          <div className="detail-info-item">
            <span className="info-icon">✝️</span>
            <div>
              <span className="info-label">Ngày mất</span>
              <span className="info-value">{formatDate(member.ngayMat)}</span>
            </div>
          </div>
          <div className="detail-info-item">
            <span className="info-icon">🪦</span>
            <div>
              <span className="info-label">Mộ phần</span>
              <span className="info-value">{member.moPhan || '—'}</span>
            </div>
          </div>
        </div>

        {/* Relationships */}
        <div className="detail-relationships">
          <h4 className="detail-section-heading">👨‍👩‍👦 Quan hệ gia đình</h4>
          <div className="detail-rel-list">
            {fatherName && (
              <div className="detail-rel-item">
                <span className="rel-label">Cha:</span>
                <span className="rel-value">{fatherName}</span>
              </div>
            )}
            {motherName && (
              <div className="detail-rel-item">
                <span className="rel-label">Mẹ:</span>
                <span className="rel-value">{motherName}</span>
              </div>
            )}
            {spouseNames.length > 0 && (
              <div className="detail-rel-item">
                <span className="rel-label">Vợ/Chồng:</span>
                <span className="rel-value">{spouseNames.join(', ')}</span>
              </div>
            )}
            {children.length > 0 && (
              <div className="detail-rel-item">
                <span className="rel-label">Con:</span>
                <span className="rel-value">{children.map((c) => c.tenTu).join(', ')}</span>
              </div>
            )}
            {!fatherName && !motherName && spouseNames.length === 0 && children.length === 0 && (
              <p className="rel-empty">Không có thông tin quan hệ.</p>
            )}
          </div>
        </div>

        {/* Biography */}
        {member.tieuSu && (
          <div className="detail-bio">
            <h4 className="detail-section-heading">📜 Tiểu sử</h4>
            <p className="detail-bio-text">{member.tieuSu}</p>
          </div>
        )}
      </aside>
    );
  }

  // Edit mode — admin only
  const otherMembers = members.filter((m) => m.id !== member.id);

  // voChongIds management helpers
  const formSpouses = form.voChongIds || [];
  const addSpouse = (id) => {
    if (id && !formSpouses.includes(id)) {
      set('voChongIds', [...formSpouses, id]);
    }
  };
  const removeSpouse = (id) => {
    set('voChongIds', formSpouses.filter((s) => s !== id));
  };

  // conIds — derive current children from data, keep in edit form
  const formConIds = form.conIds || members
    .filter((m) => m.chaId === member.id || m.meId === member.id)
    .map((m) => m.id);
  const addChild = (id) => {
    if (id && !formConIds.includes(id)) {
      set('conIds', [...formConIds, id]);
    }
  };
  const removeChild = (id) => {
    set('conIds', formConIds.filter((c) => c !== id));
  };

  return (
    <aside className="ft-detail">
      <div className="detail-header-row">
        <h2 className="section-title">Sửa: {member.tenTu}</h2>
      </div>
      <div className="edit-form">
        <div className="form-row">
          <div className="form-group">
            <label>Họ</label>
            <input value={form.tenHuy || ''} onChange={(e) => set('tenHuy', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Tên tự</label>
            <input value={form.tenTu || ''} onChange={(e) => set('tenTu', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Thụy hiệu</label>
          <input value={form.thuyHieu || ''} onChange={(e) => set('thuyHieu', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Giới tính</label>
            <select value={form.gioiTinh || 'Nam'} onChange={(e) => set('gioiTinh', e.target.value)}>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </div>
          <div className="form-group">
            <label>Nhánh</label>
            <select value={form.nhanh || 'noi'} onChange={(e) => set('nhanh', e.target.value)}>
              <option value="noi">Nội</option>
              <option value="ngoai">Ngoại</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Ngày sinh</label>
            <input value={form.ngaySinh || ''} onChange={(e) => set('ngaySinh', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Ngày mất</label>
            <input value={form.ngayMat || ''} onChange={(e) => set('ngayMat', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Hình ảnh</label>
          <ImageUpload
            value={form.hinhAnh || ''}
            onChange={(url) => set('hinhAnh', url)}
            clanId={user?.clanId}
          />
        </div>
        <div className="form-group">
          <label>Mộ phần</label>
          <input value={form.moPhan || ''} onChange={(e) => set('moPhan', e.target.value)} />
        </div>

        {/* ─── Relationship fields ─── */}
        <div className="edit-section-divider">
          <span>👨‍👩‍👦 Quan hệ gia đình</span>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Cha</label>
            {form.chaId ? (
              <div className="spouse-tags">
                <span className="spouse-tag">
                  {(() => { const m = members.find((x) => x.id === form.chaId); return m ? `${m.tenHuy} ${m.tenTu}` : form.chaId; })()}
                  <button type="button" className="spouse-tag-remove" onClick={() => set('chaId', null)}>✕</button>
                </span>
              </div>
            ) : (
              <MemberPicker
                members={members}
                filter={(m) => m.gioiTinh === 'Nam' && m.id !== member.id}
                exclude={[form.meId, ...formSpouses, ...formConIds].filter(Boolean)}
                placeholder="Tìm cha..."
                onSelect={(id) => set('chaId', id)}
              />
            )}
          </div>
          <div className="form-group">
            <label>Mẹ</label>
            {form.meId ? (
              <div className="spouse-tags">
                <span className="spouse-tag">
                  {(() => { const m = members.find((x) => x.id === form.meId); return m ? `${m.tenHuy} ${m.tenTu}` : form.meId; })()}
                  <button type="button" className="spouse-tag-remove" onClick={() => set('meId', null)}>✕</button>
                </span>
              </div>
            ) : (
              <MemberPicker
                members={members}
                filter={(m) => m.gioiTinh === 'Nữ' && m.id !== member.id}
                exclude={[form.chaId, ...formSpouses, ...formConIds].filter(Boolean)}
                placeholder="Tìm mẹ..."
                onSelect={(id) => set('meId', id)}
              />
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Thứ tự con</label>
          <input
            type="number"
            min={1}
            value={form.thuTuCon || 1}
            onChange={(e) => set('thuTuCon', parseInt(e.target.value, 10) || 1)}
          />
        </div>

        <div className="form-group">
          <label>Vợ/Chồng</label>
          {formSpouses.length > 0 && (
            <div className="spouse-tags">
              {formSpouses.map((sid) => {
                const sp = members.find((m) => m.id === sid);
                return (
                  <span key={sid} className="spouse-tag">
                    {sp ? `${sp.tenHuy} ${sp.tenTu}` : sid}
                    <button type="button" className="spouse-tag-remove" onClick={() => removeSpouse(sid)}>✕</button>
                  </span>
                );
              })}
            </div>
          )}
          <MemberPicker
            members={members}
            exclude={[member.id, form.chaId, form.meId, ...formSpouses, ...formConIds].filter(Boolean)}
            placeholder="Tìm vợ/chồng..."
            onSelect={addSpouse}
          />
        </div>

        <div className="form-group">
          <label>👶 Con cái</label>
          {formConIds.length > 0 && (
            <div className="spouse-tags">
              {formConIds.map((cid) => {
                const ch = members.find((m) => m.id === cid);
                return (
                  <span key={cid} className="spouse-tag child-tag">
                    {ch ? `${ch.tenHuy} ${ch.tenTu}` : cid}
                    <button type="button" className="spouse-tag-remove" onClick={() => removeChild(cid)}>✕</button>
                  </span>
                );
              })}
            </div>
          )}
          <MemberPicker
            members={members}
            exclude={[member.id, form.chaId, form.meId, ...formSpouses, ...formConIds].filter(Boolean)}
            placeholder="Tìm con..."
            onSelect={addChild}
          />
          <small className="form-hint">Hệ thống tự cập nhật cha/mẹ của những người được chọn làm con.</small>
        </div>

        <div className="form-group">
          <label>Tiểu sử</label>
          <textarea value={form.tieuSu || ''} onChange={(e) => set('tieuSu', e.target.value)} rows={3} />
        </div>
        <div className="form-actions">
          <button className="btn btn-cancel" onClick={() => setEditing(false)}>Hủy</button>
          <button className="btn btn-submit" onClick={handleSave}>💾 Lưu</button>
        </div>
      </div>
    </aside>
  );
}

import React from 'react';
import ImageUpload from './ImageUpload';
import { useAuth } from '../context/AuthContext';

const EMPTY = {
  tenHuy: '',
  tenTu: '',
  thuyHieu: '',
  thuTuCon: 1,
  gioiTinh: 'Nam',
  ngaySinh: '',
  ngayMat: '',
  tieuSu: '',
  hinhAnh: '',
  moPhan: '',
  voChongIds: [],
  chaId: '',
  meId: '',
  nhanh: 'noi',
};

export default function AddMember({ members = [], onAdd, onClose }) {
  const { user } = useAuth();
  const [form, setForm] = React.useState({ ...EMPTY });
  const [errors, setErrors] = React.useState({});

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  // Generate next ID automatically based on existing members
  const generateId = () => {
    const ids = members.map((m) => m.id);
    // Simple incremental: find the highest numeric suffix
    let maxNum = 0;
    ids.forEach((id) => {
      const match = id.match(/\d+/g);
      if (match) {
        const n = parseInt(match[match.length - 1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    return `M${maxNum + 1}`;
  };

  const validate = () => {
    const errs = {};
    if (!form.tenTu.trim()) errs.tenTu = 'Tên tự là bắt buộc';
    if (!form.tenHuy.trim()) errs.tenHuy = 'Họ là bắt buộc';
    // If chaId is provided, check it exists
    if (form.chaId && !members.find((m) => m.id === form.chaId)) {
      errs.chaId = 'ID cha không tồn tại';
    }
    if (form.meId && !members.find((m) => m.id === form.meId)) {
      errs.meId = 'ID mẹ không tồn tại';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const newMember = {
      ...form,
      id: generateId(),
      chaId: form.chaId || null,
      meId: form.meId || null,
      voChongIds: form.spouseId ? [form.spouseId] : [],
    };
    delete newMember.spouseId;

    onAdd(newMember);
  };

  // Build parent options from existing members
  const parentOptions = members.map((m) => ({
    id: m.id,
    label: `${m.tenTu} (${m.id})`,
  }));

  return (
    <div className="add-member-overlay">
      <div className="add-member-modal">
        <div className="modal-header">
          <h2 className="modal-title">Thêm thành viên mới</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="add-member-form">
          {/* Row: Họ + Tên tự */}
          <div className="form-row">
            <div className="form-group">
              <label>Họ <span className="required">*</span></label>
              <input
                value={form.tenHuy}
                onChange={(e) => set('tenHuy', e.target.value)}
                placeholder="VD: Nguyễn Văn"
                className={errors.tenHuy ? 'input-error' : ''}
              />
              {errors.tenHuy && <span className="error-text">{errors.tenHuy}</span>}
            </div>
            <div className="form-group">
              <label>Tên tự <span className="required">*</span></label>
              <input
                value={form.tenTu}
                onChange={(e) => set('tenTu', e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className={errors.tenTu ? 'input-error' : ''}
              />
              {errors.tenTu && <span className="error-text">{errors.tenTu}</span>}
            </div>
          </div>

          {/* Row: Thụy hiệu */}
          <div className="form-group">
            <label>Thụy hiệu</label>
            <input
              value={form.thuyHieu}
              onChange={(e) => set('thuyHieu', e.target.value)}
              placeholder="Biệt danh / tước hiệu"
            />
          </div>

          {/* Row: Thứ tự con + Giới tính */}
          <div className="form-row">
            <div className="form-group">
              <label>Thứ tự con</label>
              <input
                type="number"
                min={1}
                value={form.thuTuCon}
                onChange={(e) => set('thuTuCon', parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="form-group">
              <label>Giới tính</label>
              <select value={form.gioiTinh} onChange={(e) => set('gioiTinh', e.target.value)}>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
          </div>

          {/* Row: Ngày sinh + Ngày mất */}
          <div className="form-row">
            <div className="form-group">
              <label>Ngày sinh</label>
              <input
                value={form.ngaySinh}
                onChange={(e) => set('ngaySinh', e.target.value)}
                placeholder="VD: 01-15 hoặc 1990-01-15"
              />
            </div>
            <div className="form-group">
              <label>Ngày mất</label>
              <input
                value={form.ngayMat}
                onChange={(e) => set('ngayMat', e.target.value)}
                placeholder="Để trống nếu còn sống"
              />
            </div>
          </div>

          {/* Cha + Mẹ */}
          <div className="form-row">
            <div className="form-group">
              <label>Cha (chọn từ danh sách)</label>
              <select value={form.chaId} onChange={(e) => set('chaId', e.target.value)}>
                <option value="">— Không có —</option>
                {parentOptions.filter((p) => {
                  const m = members.find((x) => x.id === p.id);
                  return m && m.gioiTinh === 'Nam';
                }).map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              {errors.chaId && <span className="error-text">{errors.chaId}</span>}
            </div>
            <div className="form-group">
              <label>Mẹ (chọn từ danh sách)</label>
              <select value={form.meId} onChange={(e) => set('meId', e.target.value)}>
                <option value="">— Không có —</option>
                {parentOptions.filter((p) => {
                  const m = members.find((x) => x.id === p.id);
                  return m && m.gioiTinh === 'Nữ';
                }).map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              {errors.meId && <span className="error-text">{errors.meId}</span>}
            </div>
          </div>

          {/* Vợ/Chồng */}
          <div className="form-group">
            <label>Vợ/Chồng (chọn từ danh sách)</label>
            <select value={form.spouseId || ''} onChange={(e) => set('spouseId', e.target.value)}>
              <option value="">— Không có —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Hình ảnh */}
          <div className="form-group">
            <label>Hình ảnh</label>
            <ImageUpload
              value={form.hinhAnh}
              onChange={(url) => set('hinhAnh', url)}
              clanId={user?.clanId}
            />
          </div>

          {/* Row: Mộ phần + Nhánh */}
          <div className="form-row">
            <div className="form-group">
              <label>Mộ phần</label>
              <input
                value={form.moPhan}
                onChange={(e) => set('moPhan', e.target.value)}
                placeholder="Vị trí mộ phần"
              />
            </div>
            <div className="form-group">
              <label>Nhánh</label>
              <select value={form.nhanh} onChange={(e) => set('nhanh', e.target.value)}>
                <option value="noi">Nội</option>
                <option value="ngoai">Ngoại</option>
              </select>
            </div>
          </div>

          {/* Tiểu sử */}
          <div className="form-group">
            <label>Tiểu sử</label>
            <textarea
              value={form.tieuSu}
              onChange={(e) => set('tieuSu', e.target.value)}
              placeholder="Ghi chép về cuộc đời, công trạng..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-submit">
              <span className="btn-icon">＋</span> Thêm thành viên
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

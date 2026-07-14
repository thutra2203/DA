import { useState, useEffect } from 'react';
import { vaiTroAPI } from '../services/api';
import { FiPlus, FiTrash2, FiShield, FiLock } from 'react-icons/fi';
import '../styles/shared.css';
import './QuanLyVaiTro.css';

const DEFAULT_ROLES = ['Admin', 'QuanLy', 'NhanVien'];

export default function QuanLyVaiTro() {
  const [roles, setRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ tenVaiTro: '', moTa: '' });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await vaiTroAPI.getAll();
      setRoles(res.data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await vaiTroAPI.create(form);
      showToast(`Đã tạo vai trò "${form.tenVaiTro}" thành công!`);
      setShowModal(false);
      setForm({ tenVaiTro: '', moTa: '' });
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi tạo vai trò', 'error');
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Xóa vai trò "${role.TenVaiTro}"?`)) return;
    try {
      await vaiTroAPI.remove(role.ID);
      showToast(`Đã xóa vai trò "${role.TenVaiTro}"`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi xóa vai trò', 'error');
    }
  };

  const isDefault = (tenVaiTro) => DEFAULT_ROLES.includes(tenVaiTro);

  const roleColors = {
    Admin:    { bg: '#fce4ec', color: '#c62828', border: '#ef9a9a' },
    QuanLy:   { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
    NhanVien: { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
  };
  const defaultColor = { bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8' };

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-icon vt-page-icon"><FiShield size={20} color="#6a1b9a" /></div>
          <div>
            <h2 className="page-title">Quản lý vai trò</h2>
            <p className="page-sub">Tạo và quản lý các vai trò trong hệ thống</p>
          </div>
        </div>
        <button className="vt-btn-add" onClick={() => setShowModal(true)}>
          <FiPlus style={{ marginRight: 6 }} /> Thêm vai trò
        </button>
      </div>

      <div className="vt-info-banner">
        <FiLock size={14} style={{ marginRight: 8, flexShrink: 0 }} />
        Vai trò mặc định <strong>Admin, QuanLy, NhanVien</strong> không thể xóa.
        Sau khi tạo vai trò mới, vào <strong>Phân quyền</strong> để cấu hình quyền chi tiết.
      </div>

      {loading ? <p style={{ color: '#999', padding: 20 }}>Đang tải...</p> : (
        <div className="vt-grid">
          {roles.map(role => {
            const c = roleColors[role.TenVaiTro] || defaultColor;
            const locked = isDefault(role.TenVaiTro);
            return (
              <div key={role.ID} className="vt-role-card" style={{ borderTop: `4px solid ${c.border}` }}>
                <div className="vt-role-card-top">
                  <div className="vt-role-avatar" style={{ background: c.bg, color: c.color }}>
                    {role.TenVaiTro[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="vt-role-name">{role.TenVaiTro}</span>
                      {locked && (
                        <span className="vt-role-badge" style={{ background: c.bg, color: c.color }}>Mặc định</span>
                      )}
                    </div>
                    <p className="vt-role-desc">{role.MoTa || 'Chưa có mô tả'}</p>
                  </div>
                </div>
                <div className="vt-role-card-bottom">
                  <span className="vt-role-date">
                    Tạo: {new Date(role.NgayTao).toLocaleDateString('vi-VN')}
                  </span>
                  {!locked && (
                    <button className="vt-btn-delete" onClick={() => handleDelete(role)} title="Xóa vai trò">
                      <FiTrash2 size={13} /> Xóa
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="vt-add-card" onClick={() => setShowModal(true)}>
            <div className="vt-add-icon"><FiPlus size={28} color="#bbb" /></div>
            <p className="vt-add-text">Thêm vai trò mới</p>
          </div>
        </div>
      )}

      {showModal && (
        <div className="overlay">
          <div className="modal fade-in">
            <div className="modal-header">
              <h3 className="modal-title">Thêm vai trò mới</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <div className="form-field">
                <label className="form-label">Tên vai trò <span style={{ color: 'red' }}>*</span></label>
                <input
                  className="form-input"
                  value={form.tenVaiTro}
                  onChange={e => setForm({ ...form, tenVaiTro: e.target.value })}
                  placeholder="VD: KiemSoatVien, TruongKho..."
                  required
                />
                <p className="form-hint">Không dùng khoảng trắng, không dấu tiếng Việt</p>
              </div>
              <div className="form-field">
                <label className="form-label">Mô tả</label>
                <textarea
                  className="form-input"
                  style={{ height: 80, resize: 'vertical' }}
                  value={form.moTa}
                  onChange={e => setForm({ ...form, moTa: e.target.value })}
                  placeholder="Mô tả chức năng của vai trò này..."
                />
              </div>
              <div className="vt-info-box">
                💡 Sau khi tạo, vai trò mới sẽ có quyền <strong>chỉ xem</strong> tất cả module.
                Vào <strong>Phân quyền</strong> để cấu hình chi tiết hơn.
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="vt-btn-primary">
                  <FiPlus style={{ marginRight: 6 }} /> Tạo vai trò
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

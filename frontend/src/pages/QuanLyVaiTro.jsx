import { useState, useEffect } from 'react';
import { vaiTroAPI } from '../services/api';
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { usePageTitle } from '../context/PageHeaderContext';
import { useConfirm } from '../context/ConfirmContext';
import '../styles/shared.css';
import './QuanLyVaiTro.css';

const DEFAULT_ROLES = ['ADMIN'];

export default function QuanLyVaiTro() {
  usePageTitle('Quản lý vai trò');
  const confirm = useConfirm();
  const [roles, setRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);       // null = tạo mới; object = đang sửa
  const [form, setForm] = useState({ tenVaiTro: '', moTa: '' });
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const clearError = (col) => setErrors(prev => {
    if (!prev[col]) return prev;
    const next = { ...prev };
    delete next[col];
    return next;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ tenVaiTro: '', moTa: '' });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (role) => {
    setEditing(role);
    setForm({ tenVaiTro: role.TenVaiTro, moTa: role.MoTa || '' });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tenVaiTro || !form.tenVaiTro.trim()) {
      setErrors({ tenVaiTro: 'Tên vai trò không được để trống' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await vaiTroAPI.update(editing.ID, form);
        showToast(`Đã cập nhật vai trò "${form.tenVaiTro}"`);
      } else {
        await vaiTroAPI.create(form);
        showToast(`Đã tạo vai trò "${form.tenVaiTro}" thành công!`);
      }
      setShowModal(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi lưu vai trò', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!(await confirm(`Xóa vai trò "${role.TenVaiTro}"?`))) return;
    try {
      await vaiTroAPI.remove(role.ID);
      showToast(`Đã xóa vai trò "${role.TenVaiTro}"`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi xóa vai trò', 'error');
    }
  };

  const isDefault = (tenVaiTro) => DEFAULT_ROLES.includes(tenVaiTro);

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header">
        <p className="page-sub vt-page-title">Danh sách vai trò</p>
      </div>

      <div className="data-card">
        <div className="table-toolbar">
          <span className="table-total">Tổng: <strong>{roles.length}</strong> vai trò</span>
          <button className="vt-btn-add" onClick={openCreate}>
            <FiPlus style={{ marginRight: 6 }} /> Thêm vai trò
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#999', padding: 20 }}>Đang tải...</p>
        ) : roles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <div className="empty-state-title">Chưa có vai trò nào</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>STT</th>
                  <th style={{ width: 170 }}>Mã vai trò</th>
                  <th>Tên vai trò</th>
                  <th>Mô tả</th>
                  <th style={{ width: 120, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role, i) => {
                  const locked = isDefault(role.TenVaiTro);
                  return (
                    <tr key={role.ID}>
                      <td className="td-muted td-center">{i + 1}</td>
                      <td><span className="sub-value">{role.ID}</span></td>
                      <td>
                        <div className="vt-name-cell">
                          <span className="vt-role-name">{role.TenVaiTro}</span>
                          {locked && <span className="badge badge--locked">Mặc định</span>}
                        </div>
                      </td>
                      <td className="td-muted">{role.MoTa || '—'}</td>
                      <td className="td-center">
                        <div className="td-actions">
                          <button
                            className="btn-icon-edit"
                            onClick={() => openEdit(role)}
                            disabled={locked}
                            title={locked ? 'Vai trò mặc định không thể sửa' : 'Sửa vai trò'}
                          >
                            <FiEdit2 size={13} />
                          </button>
                          <button
                            className="btn-icon-delete"
                            onClick={() => handleDelete(role)}
                            disabled={locked}
                            title={locked ? 'Vai trò mặc định không thể xóa' : 'Xóa vai trò'}
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="overlay">
          <div className="modal fade-in">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? `Sửa vai trò "${editing.TenVaiTro}"` : 'Thêm vai trò mới'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" noValidate>
              <div className="form-field">
                <label className="form-label">Tên vai trò <span style={{ color: 'red' }}>*</span></label>
                <input
                  className={`form-input${errors.tenVaiTro ? ' form-input--invalid' : ''}`}
                  value={form.tenVaiTro}
                  onChange={e => { setForm({ ...form, tenVaiTro: e.target.value }); clearError('tenVaiTro'); }}
                  placeholder="Nhập tên vai trò "
                />
                {errors.tenVaiTro && <p className="form-error-text">{errors.tenVaiTro}</p>}

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
              {editing && (
                <div className="vt-info-box">
                  💡 <strong>Mã vai trò ({editing.ID})</strong> giữ nguyên khi đổi tên, nên các tài khoản đang dùng vai trò này không bị ảnh hưởng.
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="vt-btn-primary" disabled={saving}>
                  {editing ? <FiEdit2 style={{ marginRight: 6 }} /> : <FiPlus style={{ marginRight: 6 }} />}
                  {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo vai trò'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { userAPI, vaiTroAPI, danhMucAPI } from '../../services/api';
import { usePageTitle } from '../../context/PageHeaderContext';
import { FiPlus, FiShield, FiKey, FiLock, FiUnlock, FiSearch } from 'react-icons/fi';
import SkeletonTable from '../../components/ui/SkeletonTable';
import Pagination from '../../components/ui/Pagination';
import '../../styles/shared.css';
import './QuanLyNguoiDung.css';

const PAGE_SIZE = 10;

const roleConfig = {
  ADMIN:      { bg: '#fce4ec', color: '#c62828', label: 'Admin' },
  QUAN_LY:    { bg: '#e3f2fd', color: '#1565c0', label: 'Quản lý' },
  THU_KHO:    { bg: '#e8f5e9', color: '#2e7d32', label: 'Thủ kho' },
  KIEM_KE:    { bg: '#fff3e0', color: '#e65100', label: 'Kiểm kê viên' },
  NHAP_XUAT:  { bg: '#e0f2f1', color: '#00695c', label: 'Nhân viên nhập xuất' },
  KY_THUAT:   { bg: '#ede7f6', color: '#4527a0', label: 'Nhân viên kỹ thuật' },
  PHE_DUYET:  { bg: '#fff8e1', color: '#f57f17', label: 'Người phê duyệt' },
  BAO_CAO:    { bg: '#e1f5fe', color: '#0277bd', label: 'Nhân viên báo cáo' },
  CHI_XEM:    { bg: '#f1f8e9', color: '#558b2f', label: 'Chỉ xem' },
  KHACH:      { bg: '#eceff1', color: '#455a64', label: 'Khách' },
};
const DEFAULT_ROLE_CONFIG = { bg: '#f3e5f5', color: '#6a1b9a', label: 'Khác' };

export default function QuanLyNguoiDung() {
  usePageTitle('Quản lý người dùng');
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [vaiTros, setVaiTros] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [showResetModal, setShowResetModal] = useState(null);
  const [form, setForm] = useState({ tenDangNhap: '', hoTen: '', matKhau: '', vaiTro: '', maDonVi: '' });
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      const [userRes, vtRes, khoRes] = await Promise.all([userAPI.getAll(), vaiTroAPI.getAll(), danhMucAPI.getAll('kho')]);
      setUsers(userRes.data);
      setFiltered(userRes.data);
      setVaiTros(vtRes.data);
      setKhoList(khoRes.data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(u =>
      u.TenDangNhap?.toLowerCase().includes(q) ||
      u.HoTen?.toLowerCase().includes(q) ||
      u.VaiTro?.toLowerCase().includes(q)
    ));
    setPage(1);
  }, [search, users]);

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

  const validate = () => {
    const next = {};
    if (!form.tenDangNhap || !form.tenDangNhap.trim()) next.tenDangNhap = 'Tên đăng nhập không được để trống';
    if (!form.hoTen || !form.hoTen.trim()) next.hoTen = 'Họ và tên không được để trống';
    if (!form.matKhau) next.matKhau = 'Mật khẩu không được để trống';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await userAPI.create(form);
      showToast('Tạo tài khoản thành công!');
      setShowModal(false);
      setForm({ tenDangNhap: '', hoTen: '', matKhau: '', vaiTro: '', maDonVi: '' });
      setErrors({});
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi tạo tài khoản', 'error'); }
  };

  const handleUpdateRole = async (id, vaiTro) => {
    try {
      await userAPI.updateRole(id, vaiTro);
      showToast('Cập nhật quyền thành công!');
      setShowRoleModal(null);
      load();
    } catch { showToast('Lỗi cập nhật quyền', 'error'); }
  };

  const handleUpdateKho = async (id, maDonVi) => {
    try {
      await userAPI.updateKho(id, maDonVi);
      showToast('Cập nhật kho thành công!');
      setShowRoleModal(null);
      load();
    } catch { showToast('Lỗi cập nhật kho', 'error'); }
  };

  const handleReset = async (id, matKhauMoi) => {
    try {
      await userAPI.resetPassword(id, matKhauMoi);
      showToast('Đặt lại mật khẩu thành công!');
      setShowResetModal(null);
    } catch { showToast('Lỗi đặt lại mật khẩu', 'error'); }
  };

  const handleToggleLock = async (user) => {
    try {
      await userAPI.toggleLock(user.ID);
      showToast(`${user.TrangThai ? 'Đã khóa' : 'Đã mở khóa'} tài khoản ${user.TenDangNhap}`);
      load();
    } catch { showToast('Lỗi cập nhật trạng thái', 'error'); }
  };

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header">
        <p className="page-sub">Quản lý tài khoản, phân quyền và bảo mật</p>
      </div>

      <div className="data-card">
        <div className="table-toolbar">
          <span className="table-total">Tổng: <strong>{filtered.length}</strong> tài khoản</span>
          <button className="btn-add" onClick={() => { setErrors({}); setShowModal(true); }}>
            <FiPlus style={{ marginRight: 6 }} /> Thêm tài khoản
          </button>
        </div>

        <div className="table-toolbar">
          <div className="search-wrap search-wrap--lg">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Tìm kiếm tên đăng nhập, họ tên..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={8} rows={5} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{search ? '🔍' : '👤'}</div>
            <div className="empty-state-title">
              {search ? 'Không tìm thấy kết quả' : 'Chưa có tài khoản nào'}
            </div>
            <div className="empty-state-desc">
              {search
                ? `Không có tài khoản nào khớp với "${search}"`
                : 'Nhấn "+ Thêm tài khoản" để tạo tài khoản đầu tiên'
              }
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {['STT', 'Tên đăng nhập', 'Họ và tên', 'Vai trò', 'Kho', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((u, i) => {
                    const rc = roleConfig[u.VaiTro] || DEFAULT_ROLE_CONFIG;
                    return (
                      <tr key={u.ID}>
                        <td className="td-muted td-center" style={{ width: 50 }}>{startIdx + i + 1}</td>
                        <td>
                          <div className="user-row">
                            <div className="user-avatar">{u.HoTen?.[0] || 'U'}</div>
                            <span className="main-value">{u.TenDangNhap}</span>
                          </div>
                        </td>
                        <td>{u.HoTen}</td>
                        <td>
                          <span className="badge" style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>
                        </td>
                        <td>{u.TenDonVi || u.MaDonVi || ''}</td>
                        <td>
                          <span className={`badge ${u.TrangThai ? 'badge--active' : 'badge--locked'}`}>
                            {u.TrangThai ? '● Hoạt động' : '● Bị khóa'}
                          </span>
                        </td>
                        <td className="td-muted" style={{ fontSize: 12 }}>
                          {new Date(u.NgayTao).toLocaleDateString('vi-VN')}
                        </td>
                        <td>
                          <div className="actions-wrap">
                            <button className="btn-action" title="Phân quyền" onClick={() => setShowRoleModal(u)}>
                              <FiShield size={14} /> Phân quyền
                            </button>
                            <button className="btn-action" title="Đặt lại MK" onClick={() => setShowResetModal(u)}>
                              <FiKey size={14} /> Đặt lại MK
                            </button>
                            <button
                              className={`btn-action ${u.TrangThai ? 'btn-action--danger' : 'btn-action--success'}`}
                              onClick={() => handleToggleLock(u)}
                            >
                              {u.TrangThai ? <><FiLock size={14} /> Khóa</> : <><FiUnlock size={14} /> Mở</>}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>

      {/* Modal thêm */}
      {showModal && (
        <Modal title="Thêm tài khoản mới" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} noValidate>
            <div className="form-field">
              <label className="form-label">Tên đăng nhập *</label>
              <input className={`form-input${errors.tenDangNhap ? ' form-input--invalid' : ''}`} value={form.tenDangNhap} onChange={e => { setForm({ ...form, tenDangNhap: e.target.value }); clearError('tenDangNhap'); }} placeholder="Nhập tên đăng nhập" />
              {errors.tenDangNhap && <p className="form-error-text">{errors.tenDangNhap}</p>}
            </div>
            <div className="form-field">
              <label className="form-label">Họ và tên *</label>
              <input className={`form-input${errors.hoTen ? ' form-input--invalid' : ''}`} value={form.hoTen} onChange={e => { setForm({ ...form, hoTen: e.target.value }); clearError('hoTen'); }} placeholder="Nhập họ tên" />
              {errors.hoTen && <p className="form-error-text">{errors.hoTen}</p>}
            </div>
            <div className="form-field">
              <label className="form-label">Mật khẩu *</label>
              <input className={`form-input${errors.matKhau ? ' form-input--invalid' : ''}`} type="password" value={form.matKhau} onChange={e => { setForm({ ...form, matKhau: e.target.value }); clearError('matKhau'); }} placeholder="Nhập mật khẩu" />
              {errors.matKhau && <p className="form-error-text">{errors.matKhau}</p>}
            </div>
            <div className="form-field">
              <label className="form-label">Vai trò</label>
              <select className="form-input" value={form.vaiTro} onChange={e => setForm({ ...form, vaiTro: e.target.value })}>
                {vaiTros.map(vt => <option key={vt.ID} value={vt.ID}>{vt.TenVaiTro}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Kho (để trống nếu không giới hạn — ví dụ Admin)</label>
              <select className="form-input" value={form.maDonVi} onChange={e => setForm({ ...form, maDonVi: e.target.value })}>
                <option value="">Không giới hạn</option>
                {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
              </select>
              <p className="form-hint">Nếu chọn 1 kho, tài khoản này chỉ xem/thao tác được dữ liệu của kho đó.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
              <button type="submit" className="btn-primary"><FiPlus style={{ marginRight: 6 }} />Tạo tài khoản</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal phân quyền */}
      {showRoleModal && (
        <Modal title={`Phân quyền — ${showRoleModal.HoTen}`} onClose={() => setShowRoleModal(null)}>
          <div className="form-field">
            <label className="form-label">Vai trò mới</label>
            <select className="form-input" defaultValue={showRoleModal.VaiTro}
              onChange={e => handleUpdateRole(showRoleModal.ID, e.target.value)}>
              {vaiTros.map(vt => <option key={vt.ID} value={vt.ID}>{vt.TenVaiTro}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Kho (để trống nếu không giới hạn — ví dụ Admin)</label>
            <select className="form-input" defaultValue={showRoleModal.MaDonVi || ''}
              onChange={e => handleUpdateKho(showRoleModal.ID, e.target.value)}>
              <option value="">Không giới hạn</option>
              {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
            </select>
            <p className="form-hint">Nếu chọn 1 kho, tài khoản này chỉ xem/thao tác được dữ liệu của kho đó.</p>
          </div>
          <div className="modal-footer">
            <button className="btn-cancel" onClick={() => setShowRoleModal(null)}>Đóng</button>
          </div>
        </Modal>
      )}

      {/* Modal reset mật khẩu */}
      {showResetModal && (
        <ResetModal user={showResetModal} onClose={() => setShowResetModal(null)} onSubmit={handleReset} />
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="overlay">
      <div className="modal fade-in">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function ResetModal({ user, onClose, onSubmit }) {
  const [pw, setPw] = useState('');
  return (
    <Modal title={`Đặt lại mật khẩu — ${user.HoTen}`} onClose={onClose}>
      <div className="form-field">
        <label className="form-label">Mật khẩu mới (để trống = 123456)</label>
        <input className="form-input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Nhập mật khẩu mới..." />
      </div>
      <div className="modal-footer">
        <button className="btn-cancel" onClick={onClose}>Hủy</button>
        <button className="btn-primary" onClick={() => onSubmit(user.ID, pw)}><FiKey style={{ marginRight: 6 }} />Xác nhận</button>
      </div>
    </Modal>
  );
}

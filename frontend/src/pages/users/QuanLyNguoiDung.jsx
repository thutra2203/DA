import { useState, useEffect, useMemo } from 'react';
import { userAPI, vaiTroAPI, danhMucAPI } from '../../services/api';
import { usePageTitle } from '../../context/PageHeaderContext';
import { FiPlus, FiShield, FiKey, FiLock, FiUnlock, FiSearch, FiEye, FiEyeOff } from 'react-icons/fi';
import SkeletonTable from '../../components/ui/SkeletonTable';
import Pagination from '../../components/ui/Pagination';
import '../../styles/shared.css';
import './QuanLyNguoiDung.css';

const PAGE_SIZE = 10;

// Tên vai trò hiển thị lấy từ bảng VaiTro (động), KHÔNG hardcode — mã vai trò do người dùng tự đặt.
// Màu badge: ADMIN đỏ, còn lại chọn ổn định theo mã vai trò.
const PALETTE = [
  { bg: '#e3f2fd', color: '#1565c0' }, { bg: '#e8f5e9', color: '#2e7d32' },
  { bg: '#fff3e0', color: '#e65100' }, { bg: '#ede7f6', color: '#4527a0' },
  { bg: '#e0f2f1', color: '#00695c' }, { bg: '#fff8e1', color: '#f57f17' },
  { bg: '#e1f5fe', color: '#0277bd' }, { bg: '#f1f8e9', color: '#558b2f' },
];
function styleVaiTro(maVaiTro) {
  if (maVaiTro === 'ADMIN') return { bg: '#fce4ec', color: '#c62828' };
  let h = 0;
  for (const ch of maVaiTro || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function QuanLyNguoiDung() {
  usePageTitle('Quản lý người dùng');
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [vaiTros, setVaiTros] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [capBacList, setCapBacList] = useState([]);
  const [chucVuList, setChucVuList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [roleForm, setRoleForm] = useState({ vaiTro: '', maDonVi: '' });
  const [savingRole, setSavingRole] = useState(false);
  const [showResetModal, setShowResetModal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const emptyForm = { tenDangNhap: '', hoTen: '', matKhau: '', vaiTro: '', maDonVi: '', maCapBac: '', maChucVu: '', email: '', soDienThoai: '' };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      const [userRes, vtRes, khoRes, capBacRes, chucVuRes] = await Promise.all([
        userAPI.getAll(), vaiTroAPI.getAll(), danhMucAPI.getAll('kho'),
        danhMucAPI.getAll('cap-bac'), danhMucAPI.getAll('chuc-vu'),
      ]);
      setUsers(userRes.data);
      setFiltered(userRes.data);
      setVaiTros(vtRes.data);
      setKhoList(khoRes.data);
      setCapBacList(capBacRes.data);
      setChucVuList(chucVuRes.data);
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
      setForm(emptyForm);
      setErrors({});
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi tạo tài khoản', 'error'); }
  };

  // Mở modal phân quyền: nạp giá trị hiện tại của tài khoản vào form.
  const openRoleModal = (u) => {
    setShowRoleModal(u);
    setRoleForm({ vaiTro: u.VaiTro || '', maDonVi: u.MaDonVi || '' });
  };

  // Lưu 1 lần: chỉ gọi API cho phần thực sự thay đổi.
  const handleSaveRole = async () => {
    if (!showRoleModal) return;
    const u = showRoleModal;
    const doiVaiTro = roleForm.vaiTro && roleForm.vaiTro !== (u.VaiTro || '');
    const doiKho = roleForm.maDonVi !== (u.MaDonVi || '');
    if (!doiVaiTro && !doiKho) { setShowRoleModal(null); return; }
    setSavingRole(true);
    try {
      if (doiVaiTro) await userAPI.updateRole(u.ID, roleForm.vaiTro);
      if (doiKho) await userAPI.updateKho(u.ID, roleForm.maDonVi);
      showToast('Cập nhật phân quyền thành công!');
      setShowRoleModal(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi cập nhật phân quyền', 'error');
    } finally {
      setSavingRole(false);
    }
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

  const vaiTroTen = useMemo(() => Object.fromEntries(vaiTros.map(v => [v.ID, v.TenVaiTro])), [vaiTros]);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}



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
              autoComplete="off"
              name="tim-kiem-tai-khoan"
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
                    const rc = styleVaiTro(u.VaiTro);
                    const tenVaiTro = vaiTroTen[u.VaiTro] || u.VaiTro || '—';
                    return (
                      <tr key={u.ID}>
                        <td className="td-muted td-center" style={{ width: 50 }}>{startIdx + i + 1}</td>
                        <td>
                          <div className="user-row">
                            <div className="user-avatar">{u.HoTen?.[0] || 'U'}</div>
                            <span className="main-value">{u.TenDangNhap}</span>
                          </div>
                        </td>
                        <td>
                          {u.HoTen}
                          {(u.TenChucVu || u.TenCapBac) && (
                            <div className="sub-value" style={{ fontSize: 12 }}>
                              {[u.TenChucVu, u.TenCapBac].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge" style={{ background: rc.bg, color: rc.color }}>{tenVaiTro}</span>
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
                            <button className="btn-action" title="Xem chi tiết" onClick={() => setShowDetailModal(u)}>
                              <FiEye size={14} /> Chi tiết
                            </button>
                            <button className="btn-action" title="Phân quyền" onClick={() => openRoleModal(u)}>
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
        <Modal title="Thêm tài khoản mới" onClose={() => setShowModal(false)} wide>
          <form onSubmit={handleCreate} noValidate autoComplete="off">
            <div className="form-grid-2col">
              <div className="form-field">
                <label className="form-label">Tên đăng nhập *</label>
                <input className={`form-input${errors.tenDangNhap ? ' form-input--invalid' : ''}`} autoComplete="off" value={form.tenDangNhap} onChange={e => { setForm({ ...form, tenDangNhap: e.target.value }); clearError('tenDangNhap'); }} placeholder="Nhập tên đăng nhập" />
                {errors.tenDangNhap && <p className="form-error-text">{errors.tenDangNhap}</p>}
              </div>
              <div className="form-field">
                <label className="form-label">Họ và tên *</label>
                <input className={`form-input${errors.hoTen ? ' form-input--invalid' : ''}`} value={form.hoTen} onChange={e => { setForm({ ...form, hoTen: e.target.value }); clearError('hoTen'); }} placeholder="Nhập họ tên" />
                {errors.hoTen && <p className="form-error-text">{errors.hoTen}</p>}
              </div>
              <div className="form-field">
                <label className="form-label">Mật khẩu *</label>
                <input className={`form-input${errors.matKhau ? ' form-input--invalid' : ''}`} type="password" autoComplete="new-password" value={form.matKhau} onChange={e => { setForm({ ...form, matKhau: e.target.value }); clearError('matKhau'); }} placeholder="Nhập mật khẩu" />
                {errors.matKhau && <p className="form-error-text">{errors.matKhau}</p>}
              </div>
              <div className="form-field">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Nhập email" />
              </div>
              <div className="form-field">
                <label className="form-label">Số điện thoại</label>
                <input className="form-input" value={form.soDienThoai} onChange={e => setForm({ ...form, soDienThoai: e.target.value })} placeholder="Nhập số điện thoại" />
              </div>
              <div className="form-field">
                <label className="form-label">Cấp bậc</label>
                <select className="form-input" value={form.maCapBac} onChange={e => setForm({ ...form, maCapBac: e.target.value })}>
                  <option value="">-- Chọn cấp bậc --</option>
                  {capBacList.map(cb => <option key={cb.maCapBac} value={cb.maCapBac}>{cb.tenCapBac}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Chức vụ</label>
                <select className="form-input" value={form.maChucVu} onChange={e => setForm({ ...form, maChucVu: e.target.value })}>
                  <option value="">-- Chọn chức vụ --</option>
                  {chucVuList.map(cv => <option key={cv.maChucVu} value={cv.maChucVu}>{cv.tenChucVu}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Vai trò</label>
                <select className="form-input" value={form.vaiTro} onChange={e => setForm({ ...form, vaiTro: e.target.value })}>
                  {vaiTros.map(vt => <option key={vt.ID} value={vt.ID}>{vt.TenVaiTro}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Kho</label>
                <select className="form-input" value={form.maDonVi} onChange={e => setForm({ ...form, maDonVi: e.target.value })}>
                  <option value="">Không giới hạn</option>
                  {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                </select>
              </div>
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
        <Modal title={`Phân quyền cho ${showRoleModal.HoTen}`} onClose={() => setShowRoleModal(null)}>
          <div className="form-field">
            <label className="form-label">Vai trò</label>
            <select className="form-input" value={roleForm.vaiTro}
              onChange={e => setRoleForm(f => ({ ...f, vaiTro: e.target.value }))}>
              {vaiTros.map(vt => <option key={vt.ID} value={vt.ID}>{vt.TenVaiTro}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Kho</label>
            <select className="form-input" value={roleForm.maDonVi}
              onChange={e => setRoleForm(f => ({ ...f, maDonVi: e.target.value }))}>
              <option value="">Không giới hạn</option>
              {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
            </select>
          </div>
          <div className="modal-footer">
            <button className="btn-cancel" onClick={() => setShowRoleModal(null)}>Hủy</button>
            <button className="btn-primary" onClick={handleSaveRole} disabled={savingRole}>

              {savingRole ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal reset mật khẩu */}
      {showResetModal && (
        <ResetModal user={showResetModal} onClose={() => setShowResetModal(null)} onSubmit={handleReset} />
      )}

      {/* Modal xem chi tiết */}
      {showDetailModal && (
        <DetailModal user={showDetailModal} tenVaiTro={vaiTroTen[showDetailModal.VaiTro] || showDetailModal.VaiTro} onClose={() => setShowDetailModal(null)} />
      )}
    </div>
  );
}

function Modal({ title, children, onClose, wide }) {
  return (
    <div className="overlay">
      <div className={`modal fade-in${wide ? ' modal--form' : ''}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function DetailModal({ user, tenVaiTro, onClose }) {
  const rows = [
    ['Tên đăng nhập', user.TenDangNhap],
    ['Họ và tên', user.HoTen],
    ['Email', user.Email && !user.Email.endsWith('@local') ? user.Email : '—'],
    ['Số điện thoại', user.SoDienThoai || '—'],
    ['Cấp bậc', user.TenCapBac || '—'],
    ['Chức vụ', user.TenChucVu || '—'],
    ['Vai trò', tenVaiTro || '—'],
    ['Kho quản lý', user.TenDonVi || user.MaDonVi || 'Không giới hạn'],
    ['Trạng thái', user.TrangThai ? 'Đang hoạt động' : `Bị khóa${user.LyDoKhoa ? ` — ${user.LyDoKhoa}` : ''}`],
    ['Ngày tạo', new Date(user.NgayTao).toLocaleDateString('vi-VN')],
    ['Lần đăng nhập cuối', user.LanDangNhapCuoi ? new Date(user.LanDangNhapCuoi).toLocaleString('vi-VN') : 'Chưa đăng nhập'],
  ];
  return (
    <Modal title={`Chi tiết tài khoản — ${user.TenDangNhap}`} onClose={onClose} wide>
      <div className="form-grid-2col">
        {rows.map(([label, value]) => (
          <div className="form-field" key={label}>
            <label className="form-label">{label}</label>
            <div className="form-input" style={{ background: '#f5f6f8', color: '#000' }}>{value}</div>
          </div>
        ))}
      </div>
      <div className="modal-footer">
        <button className="btn-cancel" onClick={onClose}>Đóng</button>
      </div>
    </Modal>
  );
}

function ResetModal({ user, onClose, onSubmit }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);

  const loi = !pw ? 'Mật khẩu không được để trống'
    : pw.length < 6 ? 'Mật khẩu phải từ 6 ký tự trở lên'
      : pw2 !== pw ? 'Mật khẩu nhập lại không khớp'
        : '';

  const submit = () => {
    setTouched(true);
    if (loi) return;
    onSubmit(user.ID, pw);
  };

  return (
    <Modal title="Đặt lại mật khẩu " onClose={onClose}>
      <div className="form-field">
        <label className="form-label">Mật khẩu mới</label>
        <div className="pw-input">
          <input
            className="form-input"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Nhập mật khẩu mới..."
          />
          <button type="button" className="pw-toggle" tabIndex={-1}
            onClick={() => setShow(s => !s)} title={show ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}>
            {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
          </button>
        </div>
      </div>
      <div className="form-field">
        <label className="form-label">Nhập lại mật khẩu</label>
        <div className="pw-input">
          <input
            className={`form-input${touched && loi ? ' form-input--invalid' : ''}`}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={pw2}
            onChange={e => setPw2(e.target.value)}
            placeholder="Nhập lại mật khẩu mới..."
          />
        </div>
        {touched && loi && <p className="form-error-text">{loi}</p>}
      </div>
      <div className="modal-footer">
        <button className="btn-cancel" onClick={onClose}>Hủy</button>
        <button className="btn-primary" onClick={submit} disabled={touched && !!loi}>
          Xác nhận
        </button>
      </div>
    </Modal>
  );
}

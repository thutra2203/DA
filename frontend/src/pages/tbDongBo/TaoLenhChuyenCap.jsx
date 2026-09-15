import { useState, useEffect, useMemo } from 'react';
import { chuyenCapAPI, danhMucAPI } from '../../services/api';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import SkeletonTable from '../../components/ui/SkeletonTable';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

export default function TaoLenhChuyenCap() {
  usePageTitle('Tạo lệnh chuyển cấp');
  const confirm = useConfirm();
  const { user } = useAuth();
  const maKhoNguoiDung = user?.maDonVi || null;

  const [khoList, setKhoList] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [dangTao, setDangTao] = useState(false);
  const [detailLenh, setDetailLenh] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const openDetail = async (maLenh) => {
    setLoadingDetail(true);
    try {
      const res = await chuyenCapAPI.getOne(maLenh);
      setDetailLenh(res.data);
    } catch { /* bỏ qua — người dùng có thể thử lại */ }
    finally { setLoadingDetail(false); }
  };

  useEffect(() => { danhMucAPI.getAll('kho').then(res => setKhoList(res.data)).catch(() => setKhoList([])); }, []);

  const loadItems = () => {
    setLoading(true);
    return chuyenCapAPI.getAll()
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadItems(); }, []);

  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(l => [l.maLenh, l.tenKho, l.maKho].some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [items, search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ maKho: maKhoNguoiDung || '', ngayLap: new Date().toISOString().slice(0, 10), ngayKetThuc: '', canCu: '', veViec: '', ghiChu: '' });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ maKho: row.maKho ?? '', ngayLap: row.ngayLap ?? '', ngayKetThuc: row.ngayKetThuc ?? '', canCu: row.canCu ?? '', veViec: row.veViec ?? '', ghiChu: row.ghiChu ?? '' });
    setErrors({});
    setShowModal(true);
  };

  const clearError = (col) => setErrors(prev => {
    if (!prev[col]) return prev;
    const next = { ...prev };
    delete next[col];
    return next;
  });

  const validate = () => {
    const next = {};
    if (!form.maKho) next.maKho = 'Kho không được để trống';
    if (!form.ngayLap) next.ngayLap = 'Ngày lập không được để trống';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setDangTao(true);
    try {
      const payload = {
        maKho: form.maKho, ngayLap: form.ngayLap, ngayKetThuc: form.ngayKetThuc || null,
        canCu: form.canCu || null, veViec: form.veViec || null, ghiChu: form.ghiChu || null,
      };
      if (editing) {
        await chuyenCapAPI.suaLenh(editing.maLenh, payload);
        showToast('Cập nhật thành công!');
      } else {
        await chuyenCapAPI.taoLenh(payload);
        showToast('Tạo lệnh thành công! Vào "Chuyển cấp chất lượng" để thêm dòng chi tiết.');
      }
      setShowModal(false);
      loadItems();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangTao(false); }
  };

  const handleDelete = async (row) => {
    if (!(await confirm(`Xóa lệnh chuyển cấp "${row.maLenh}"? Toàn bộ dòng chi tiết trong lệnh sẽ bị xóa theo.`))) return;
    try {
      await chuyenCapAPI.xoaLenh(row.maLenh);
      showToast('Xóa thành công!');
      loadItems();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="data-card">
        <div className="table-toolbar">
          <span className="table-total">Tổng: <strong>{bySearch.length}</strong> lệnh chuyển cấp</span>
          <button className="btn-add" onClick={openAdd}>
            <FiPlus style={{ marginRight: 6 }} />Tạo lệnh chuyển cấp
          </button>
        </div>

        <div className="table-toolbar">
          <div className="search-wrap" style={{ width: 260 }}>
            <FiSearch className="search-icon" />
            <input className="search-input" placeholder="Tìm theo mã lệnh, kho..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={8} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">

            <div className="empty-state-title">Chưa có lệnh chuyển cấp nào</div>
            <div className="empty-state-desc">Nhấn "Tạo lệnh chuyển cấp" để bắt đầu</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>STT</th>
                  <th>Mã lệnh</th>
                  <th>Kho</th>
                  <th>Ngày lập</th>
                  <th>Ngày kết thúc</th>
                  <th style={{ textAlign: 'center' }}>Số dòng</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 70, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bySearch.map((r, i) => (
                  <tr key={r.maLenh}>
                    <td className="td-muted td-center">{i + 1}</td>
                    <td><span className="sub-value">{r.maLenh}</span></td>
                    <td>{r.tenKho || khoMap[r.maKho] || r.maKho}</td>
                    <td>{fmtDate(r.ngayLap)}</td>
                    <td>{fmtDate(r.ngayKetThuc)}</td>
                    <td className="td-center"><span className="badge tbdb-status-badge">{r.soDong}</span></td>
                    <td>
                      {r.daKetThuc
                        ? <span className="badge badge--active"><FiCheckCircle size={11} style={{ marginRight: 4 }} />Đã kết thúc</span>
                        : <span className="badge badge--pending">Đang soạn</span>}
                    </td>
                    <td className="td-center">
                      <div className="td-actions">
                        <button className="btn-icon-edit" disabled={loadingDetail} onClick={() => openDetail(r.maLenh)} title="Xem chi tiết">
                          <FiEye size={13} />
                        </button>
                        <button className="btn-icon-warn" disabled={r.daKetThuc} onClick={() => openEdit(r)} title={r.daKetThuc ? 'Lệnh đã kết thúc, không thể sửa' : 'Sửa'}>
                          <FiEdit2 size={13} />
                        </button>
                        <button className="btn-icon-delete" disabled={r.daKetThuc} onClick={() => handleDelete(r)} title={r.daKetThuc ? 'Lệnh đã kết thúc, không thể xóa' : 'Xóa'}>
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="overlay">
          <div className="modal modal--form fade-in">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Sửa lệnh chuyển cấp' : 'Tạo lệnh chuyển cấp'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" noValidate>
              <div className="form-field">
                <label className="form-label">Kho *</label>
                <select className={`form-input${errors.maKho ? ' form-input--invalid' : ''}`} value={form.maKho ?? ''} disabled={!!maKhoNguoiDung}
                  onChange={e => { setForm({ ...form, maKho: e.target.value }); clearError('maKho'); }}>
                  <option value="">-- Chọn kho --</option>
                  {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                </select>
                {errors.maKho && <p className="form-error-text">{errors.maKho}</p>}
              </div>
              <div className="form-field">
                <label className="form-label">Ngày lập *</label>
                <input className={`form-input${errors.ngayLap ? ' form-input--invalid' : ''}`} type="date" value={form.ngayLap ?? ''}
                  onChange={e => { setForm({ ...form, ngayLap: e.target.value }); clearError('ngayLap'); }} />
                {errors.ngayLap && <p className="form-error-text">{errors.ngayLap}</p>}
              </div>
              <div className="form-field">
                <label className="form-label">Ngày kết thúc</label>
                <input className="form-input" type="date" value={form.ngayKetThuc ?? ''}
                  onChange={e => setForm({ ...form, ngayKetThuc: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label">Căn cứ</label>
                <input className="form-input" value={form.canCu ?? ''} onChange={e => setForm({ ...form, canCu: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label">Về việc</label>
                <input className="form-input" value={form.veViec ?? ''} onChange={e => setForm({ ...form, veViec: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label">Ghi chú</label>
                <input className="form-input" value={form.ghiChu ?? ''} onChange={e => setForm({ ...form, ghiChu: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={dangTao}>
                  {editing
                    ? <><FiEdit2 style={{ marginRight: 6 }} />{dangTao ? 'Đang lưu...' : 'Cập nhật'}</>
                    : <><FiPlus style={{ marginRight: 6 }} />{dangTao ? 'Đang tạo...' : 'Tạo lệnh'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailLenh && <ChiTietLenhModal lenh={detailLenh} onClose={() => setDetailLenh(null)} />}
    </div>
  );
}

// Xem thông tin các trường của bản ghi lệnh (bảng LenhChuyenCap) — không phải dòng chi tiết.
function ChiTietLenhModal({ lenh, onClose }) {
  const rows = [
    ['Mã lệnh', lenh.maLenh],
    ['Kho', lenh.tenKho || lenh.maKho || ''],
    ['Ngày lập', fmtDate(lenh.ngayLap)],
    ['Ngày kết thúc', fmtDate(lenh.ngayKetThuc)],
    ['Người lập', lenh.nguoiTao || ''],
    ['Người kết thúc', lenh.nguoiKetThuc || ''],
    ['Trạng thái', lenh.daKetThuc ? 'Đã kết thúc' : 'Đang soạn'],
    ['Số dòng', lenh.soDong ?? (lenh.chiTiet || []).length],
    ['Căn cứ', lenh.canCu || ''],
    ['Về việc', lenh.veViec || ''],
    ['Ghi chú', lenh.ghiChu || ''],
  ];
  return (
    <div className="overlay">
      <div className="modal modal--form fade-in">
        <div className="modal-header">
          <h3 className="modal-title">Chi tiết lệnh chuyển cấp {lenh.maLenh}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2col">
            {rows.map(([label, value]) => (
              <div className={`form-field${label === 'Ghi chú' ? ' form-field--full' : ''}`} key={label}>
                <label className="form-label">{label}</label>
                <div className="form-input" style={{ background: '#f5f6f8', color: '#000', minHeight: 37 }}>{value}</div>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button className="btn-cancel" onClick={onClose}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
}

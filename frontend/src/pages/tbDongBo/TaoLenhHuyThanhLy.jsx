import { useState, useEffect, useMemo } from 'react';
import { lenhTbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import SkeletonTable from '../../components/ui/SkeletonTable';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const MA_LOAI_LENH = 'HUYTBDB'; // Xuất hủy/thanh lý

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

// Chức năng "Tạo lệnh hủy/thanh lý" — CHỈ tạo lệnh, không thêm dòng chi tiết ở đây (làm ở chức
// năng riêng "Cập nhật lệnh xuất hủy/thanh lý"). Dùng lại nguyên hệ Lệnh/CTDongBoTrongLenh của
// Nhập/Xuất — chỉ là 1 loại lệnh Xuất mới ("HUYTBDB"). Form giống lệnh Xuất bình thường, bớt các
// trường không liên quan (hình thức thanh toán, phương thức/đơn vị vận chuyển). Khác lệnh Xuất
// bình thường ở "kho nhận": thay vì chọn kho nội bộ HOẶC nhà cung cấp, ở đây LUÔN là 1 kho nghiệp
// vụ (KNV, VD "Kho hủy/thanh lý") — trang bị coi như ra khỏi lưu thông nhưng vẫn giữ dấu vết.
export default function TaoLenhHuyThanhLy() {
  usePageTitle('Tạo lệnh hủy/thanh lý');
  const confirm = useConfirm();
  const { user } = useAuth();
  const { canThem, canSua, canXoa } = useModulePerm('TBDB_HUY_LAP');
  const maKhoNguoiDung = user?.maDonVi || null;

  const [khoList, setKhoList] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKho, setSelectedKho] = useState(maKhoNguoiDung || 'ALL');
  const [selectedTrangThai, setSelectedTrangThai] = useState('ALL');
  const [toast, setToast] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [dangTao, setDangTao] = useState(false);
  const [detailRow, setDetailRow] = useState(null);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    danhMucAPI.getAll('kho').then(res => setKhoList(res.data)).catch(() => setKhoList([]));
  }, []);

  const loadItems = (maKho) => {
    setLoading(true);
    return lenhTbDongBoAPI.getAll(MA_LOAI_LENH, maKho && maKho !== 'ALL' ? maKho : undefined)
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadItems(selectedKho); }, [selectedKho]);

  const khoVatLyList = useMemo(() => khoList.filter(k => k.maLoaiKho !== 'KNV'), [khoList]);
  const khoNghiepVuList = useMemo(() => khoList.filter(k => k.maLoaiKho === 'KNV'), [khoList]);
  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(l => {
      if (selectedTrangThai !== 'ALL' && (l.trangThai || 'DANG_SOAN_THAO') !== selectedTrangThai) return false;
      if (!q) return true;
      return [l.maLenh, l.veViec, l.canCu].some(v => String(v ?? '').toLowerCase().includes(q));
    });
  }, [items, search, selectedTrangThai]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      maLenh: '', ngay: new Date().toISOString().slice(0, 10), ngayHieuLuc: '', giaTriDenNgay: '',
      canCu: '', veViec: '', maKhoXuat: maKhoNguoiDung || '', maKhoNhap: khoNghiepVuList[0]?.maKho || '', ghiChu: '',
    });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      maLenh: row.maLenh, ngay: row.ngay ?? '', ngayHieuLuc: row.ngayHieuLuc ?? '', giaTriDenNgay: row.giaTriDenNgay ?? '',
      canCu: row.canCu ?? '', veViec: row.veViec ?? '', maKhoXuat: row.maKhoXuat ?? '', maKhoNhap: row.maKhoNhap ?? '', ghiChu: row.ghiChu ?? '',
    });
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
    if (!form.maLenh || !form.maLenh.trim()) next.maLenh = 'Số lệnh không được để trống';
    if (!form.maKhoXuat) next.maKhoXuat = 'Kho xuất không được để trống';
    if (!form.maKhoNhap) next.maKhoNhap = 'Kho nhập không được để trống';
    if (!form.ngay) next.ngay = 'Ngày không được để trống';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setDangTao(true);
    try {
      if (editing) {
        await lenhTbDongBoAPI.update(editing.maLenh, {
          maLoaiLenh: MA_LOAI_LENH, trangThai: editing.trangThai,
          ngay: form.ngay, ngayHieuLuc: form.ngayHieuLuc || null, giaTriDenNgay: form.giaTriDenNgay || null,
          canCu: form.canCu || null, veViec: form.veViec || null,
          maKhoXuat: form.maKhoXuat, maKhoNhap: form.maKhoNhap, ghiChu: form.ghiChu || null,
        });
        showToast('Cập nhật thành công!');
      } else {
        await lenhTbDongBoAPI.create({
          maLenh: form.maLenh, maLoaiLenh: MA_LOAI_LENH,
          ngay: form.ngay, ngayHieuLuc: form.ngayHieuLuc || null, giaTriDenNgay: form.giaTriDenNgay || null,
          canCu: form.canCu || null, veViec: form.veViec || null,
          maKhoXuat: form.maKhoXuat, maKhoNhap: form.maKhoNhap, ghiChu: form.ghiChu || null,
        });
        showToast('Tạo lệnh thành công! Vào "Cập nhật lệnh xuất hủy/thanh lý" để thêm trang bị cần hủy.');
      }
      setShowModal(false);
      loadItems(selectedKho);
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangTao(false); }
  };

  const handleDelete = async (row) => {
    if (!(await confirm(`Xóa lệnh "${row.maLenh}"? Chỉ xóa được khi chưa có dòng chi tiết.`))) return;
    try {
      await lenhTbDongBoAPI.remove(row.maLenh);
      showToast('Xóa thành công!');
      loadItems(selectedKho);
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa, lệnh đang có dữ liệu liên quan', 'error'); }
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
          <span className="table-total">Tổng: <strong>{bySearch.length}</strong> lệnh hủy/thanh lý</span>
          {canThem && <button className="btn-add" onClick={openAdd}>
            <FiPlus style={{ marginRight: 6 }} />Tạo lệnh
          </button>}
        </div>

        <div className="table-toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ width: 290 }}>
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Tìm theo số lệnh, về việc, căn cứ..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="tbdb-filter-select" value={selectedKho} onChange={e => setSelectedKho(e.target.value)} disabled={!!maKhoNguoiDung}>
              {!maKhoNguoiDung && <option value="ALL">Tất cả kho</option>}
              {khoVatLyList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedTrangThai} onChange={e => setSelectedTrangThai(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DANG_SOAN_THAO">Đang soạn</option>
              <option value="HOAN_THANH">Đã hoàn thành</option>
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={9} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗑️</div>
            <div className="empty-state-title">Chưa có lệnh hủy/thanh lý nào</div>
            <div className="empty-state-desc">Nhấn "Tạo lệnh" để bắt đầu</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>STT</th>
                  <th>Số lệnh</th>
                  <th>Kho xuất</th>
                  <th>Kho nhập</th>
                  <th>Ngày</th>
                  <th>Giá trị đến ngày</th>
                  <th>Về việc</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 70, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bySearch.map((r, i) => (
                  <tr key={r.maLenh}>
                    <td className="td-muted td-center">{i + 1}</td>
                    <td><span className="sub-value">{r.maLenh}</span></td>
                    <td>{r.tenKhoXuat || khoMap[r.maKhoXuat] || r.maKhoXuat}</td>
                    <td>{r.tenKhoNhap || khoMap[r.maKhoNhap] || r.maKhoNhap}</td>
                    <td>{fmtDate(r.ngay)}</td>
                    <td>{fmtDate(r.giaTriDenNgay)}</td>
                    <td>{r.veViec || ''}</td>
                    <td>
                      {r.trangThai === 'HOAN_THANH'
                        ? <span className="badge badge--active"><FiCheckCircle size={11} style={{ marginRight: 4 }} />Đã hoàn thành</span>
                        : <span className="badge badge--pending">Đang xử lý</span>}
                    </td>
                    <td className="td-center">
                      <div className="td-actions">
                        <button className="btn-icon-edit" onClick={() => setDetailRow(r)} title="Xem chi tiết">
                          <FiEye size={13} />
                        </button>
                        {canSua && <button className="btn-icon-warn" disabled={r.trangThai === 'HOAN_THANH'} onClick={() => openEdit(r)}
                          title={r.trangThai === 'HOAN_THANH' ? 'Lệnh đã hoàn thành, không thể sửa' : 'Sửa'}>
                          <FiEdit2 size={13} />
                        </button>}
                        {canXoa && <button className="btn-icon-delete" disabled={r.trangThai === 'HOAN_THANH'} onClick={() => handleDelete(r)}
                          title={r.trangThai === 'HOAN_THANH' ? 'Lệnh đã hoàn thành, không thể xóa' : 'Xóa'}>
                          <FiTrash2 size={13} />
                        </button>}
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
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--form fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Sửa lệnh hủy/thanh lý' : 'Tạo lệnh hủy/thanh lý'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" noValidate>
              <div className="form-grid-2col">
                <div className="form-field">
                  <label className="form-label">Số lệnh *</label>
                  <input className={`form-input${errors.maLenh ? ' form-input--invalid' : ''}`} disabled={!!editing} value={form.maLenh ?? ''}
                    onChange={e => { setForm({ ...form, maLenh: e.target.value }); clearError('maLenh'); }} placeholder="VD: HTL2026001" />
                  {errors.maLenh && <p className="form-error-text">{errors.maLenh}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Ngày *</label>
                  <input className={`form-input${errors.ngay ? ' form-input--invalid' : ''}`} type="date" value={form.ngay ?? ''}
                    onChange={e => { setForm({ ...form, ngay: e.target.value }); clearError('ngay'); }} />
                  {errors.ngay && <p className="form-error-text">{errors.ngay}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Ngày hiệu lực</label>
                  <input className="form-input" type="date" value={form.ngayHieuLuc ?? ''}
                    onChange={e => setForm({ ...form, ngayHieuLuc: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Giá trị đến ngày</label>
                  <input className="form-input" type="date" value={form.giaTriDenNgay ?? ''}
                    onChange={e => setForm({ ...form, giaTriDenNgay: e.target.value })} />
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
                  <label className="form-label">Kho xuất *</label>
                  <select className={`form-input${errors.maKhoXuat ? ' form-input--invalid' : ''}`} value={form.maKhoXuat ?? ''} disabled={!!maKhoNguoiDung}
                    onChange={e => { setForm({ ...form, maKhoXuat: e.target.value }); clearError('maKhoXuat'); }}>
                    <option value="">-- Chọn kho --</option>
                    {khoVatLyList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                  </select>
                  {errors.maKhoXuat && <p className="form-error-text">{errors.maKhoXuat}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Kho nhập </label>
                  <select className={`form-input${errors.maKhoNhap ? ' form-input--invalid' : ''}`} value={form.maKhoNhap ?? ''}
                    onChange={e => { setForm({ ...form, maKhoNhap: e.target.value }); clearError('maKhoNhap'); }}>
                    <option value="">-- Chọn kho --</option>
                    {khoNghiepVuList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                  </select>
                  {errors.maKhoNhap && <p className="form-error-text">{errors.maKhoNhap}</p>}
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label">Ghi chú</label>
                  <input className="form-input" value={form.ghiChu ?? ''} onChange={e => setForm({ ...form, ghiChu: e.target.value })} />
                </div>
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

      {detailRow && <ChiTietLenhModal row={detailRow} khoMap={khoMap} onClose={() => setDetailRow(null)} />}
    </div>
  );
}

// Xem thông tin các trường của bản ghi lệnh (bảng Lenh) — không phải dòng chi tiết (đã có ở trang
// "Cập nhật lệnh xuất hủy/thanh lý") và không phải bản in trang trọng.
function ChiTietLenhModal({ row, khoMap, onClose }) {
  const rows = [
    ['Số lệnh', row.maLenh],
    ['Ngày', fmtDate(row.ngay)],
    ['Ngày hiệu lực', fmtDate(row.ngayHieuLuc)],
    ['Ngày hết hạn', fmtDate(row.giaTriDenNgay)],
    ['Kho xuất', row.tenKhoXuat || khoMap[row.maKhoXuat] || ''],
    ['Kho nhập', row.tenKhoNhap || khoMap[row.maKhoNhap] || ''],
    ['Trạng thái', row.trangThai === 'HOAN_THANH' ? 'Đã hoàn thành' : 'Đang xử lý'],
    ['Số dòng', row.soDongChiTiet ?? ''],
    ['Căn cứ', row.canCu || ''],
    ['Về việc', row.veViec || ''],
    ['Ghi chú', row.ghiChu || ''],
  ];
  return (
    <div className="overlay">
      <div className="modal modal--form fade-in">
        <div className="modal-header">
          <h3 className="modal-title">Chi tiết lệnh {row.maLenh}</h3>
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

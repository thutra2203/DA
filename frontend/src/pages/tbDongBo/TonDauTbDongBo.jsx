import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { tonDauTbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiPlus, FiSearch, FiArrowRight, FiCheckCircle, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import SkeletonTable from '../../components/ui/SkeletonTable';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const NAM_MAC_DINH = new Date().getFullYear();
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

// Quá hạn: lệnh chưa hoàn thành mà Ngày chốt đã qua (so sánh theo ngày, bỏ giờ phút).
const isQuaHan = (row) => {
  if (!row.ngayHieuLuc) return false;
  const hetHan = new Date(row.ngayHieuLuc); hetHan.setHours(0, 0, 0, 0);
  const homNay = new Date(); homNay.setHours(0, 0, 0, 0);
  return hetHan < homNay;
};

export default function TonDauTbDongBo() {
  usePageTitle('Tồn đầu');
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { canThem, canSua, canXoa } = useModulePerm('TBDB_TON_DAU_LAP');
  const [khoList, setKhoList] = useState([]);
  const [capQuanLyList, setCapQuanLyList] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKho, setSelectedKho] = useState('ALL');
  const [selectedCapQuanLy, setSelectedCapQuanLy] = useState('ALL');
  const [selectedNam, setSelectedNam] = useState('ALL');
  const [toast, setToast] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [dangTaoLenh, setDangTaoLenh] = useState(false);

  const [editModal, setEditModal] = useState(null); // { maLenh, ngayChot, ghiChu }
  const [dangSua, setDangSua] = useState(false);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    danhMucAPI.getAll('kho').then(res => setKhoList(res.data)).catch(() => setKhoList([]));
    danhMucAPI.getAll('cap-quan-ly').then(res => setCapQuanLyList(res.data)).catch(() => setCapQuanLyList([]));
  }, []);

  const loadItems = () => {
    setLoading(true);
    return tonDauTbDongBoAPI.getAll()
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadItems(); }, []);

  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);
  const khoCapQuanLyMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.maCapQuanLy])), [khoList]);
  const khoLocList = useMemo(() => (
    selectedCapQuanLy === 'ALL' ? khoList : khoList.filter(k => k.maCapQuanLy === selectedCapQuanLy)
  ), [khoList, selectedCapQuanLy]);
  const namList = useMemo(() => (
    [...new Set(items.map(l => l.nam).filter(Boolean))].sort((a, b) => b - a)
  ), [items]);

  useEffect(() => {
    if (selectedKho !== 'ALL' && !khoLocList.some(k => k.maKho === selectedKho)) setSelectedKho('ALL');
  }, [khoLocList]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(l => {
      if (selectedKho !== 'ALL' && l.maKho !== selectedKho) return false;
      if (selectedCapQuanLy !== 'ALL' && khoCapQuanLyMap[l.maKho] !== selectedCapQuanLy) return false;
      if (selectedNam !== 'ALL' && Number(l.nam) !== Number(selectedNam)) return false;
      if (!q) return true;
      return [l.maLenh, l.tenKho, l.maKho, l.ghiChu].some(v => String(v ?? '').toLowerCase().includes(q));
    });
  }, [items, search, selectedKho, selectedCapQuanLy, selectedNam, khoCapQuanLyMap]);

  const openAdd = () => {
    const homNay = new Date().toISOString().slice(0, 10);
    setForm({ maLenh: '', maKho: '', nam: NAM_MAC_DINH, ngay: homNay, ngayChot: homNay, ghiChu: '' });
    setErrors({});
    setShowModal(true);
  };

  const suaMaLenhGoiY = (maKho, nam) => {
    if (maKho && nam) return `TD${nam}${maKho}`;
    return '';
  };

  const clearError = (col) => setErrors(prev => {
    if (!prev[col]) return prev;
    const next = { ...prev };
    delete next[col];
    return next;
  });

  const validate = () => {
    const next = {};
    if (!form.maKho) next.maKho = 'Kho cần khởi tạo tồn đầu không được để trống';
    if (!form.nam) next.nam = 'Năm bắt đầu quản lý không được để trống';
    if (!form.maLenh || !form.maLenh.trim()) next.maLenh = 'Số (mã lệnh) không được để trống';
    if (!form.ngay) next.ngay = 'Ngày lập không được để trống';
    if (!form.ngayChot) next.ngayChot = 'Ngày chốt không được để trống';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setDangTaoLenh(true);
    try {
      await tonDauTbDongBoAPI.taoLenh({
        maLenh: form.maLenh.trim(), maKho: form.maKho, nam: Number(form.nam),
        ngay: form.ngay || null, ngayChot: form.ngayChot || null, ghiChu: form.ghiChu || null,
      });
      showToast('Tạo lệnh tồn đầu thành công!');
      setShowModal(false);
      loadItems();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangTaoLenh(false); }
  };

  const openEdit = (row) => setEditModal({ maLenh: row.maLenh, ngayChot: row.ngayHieuLuc ?? '', ghiChu: row.ghiChu ?? '' });

  const submitEdit = async (e) => {
    e.preventDefault();
    setDangSua(true);
    try {
      await tonDauTbDongBoAPI.suaLenh(editModal.maLenh, { ngayChot: editModal.ngayChot || null, ghiChu: editModal.ghiChu || null });
      showToast('Cập nhật thành công!');
      setEditModal(null);
      loadItems();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangSua(false); }
  };

  const xoaLenh = async (row) => {
    if (!(await confirm(`Xóa lệnh tồn đầu "${row.maLenh}"?`))) return;
    try {
      await tonDauTbDongBoAPI.xoaLenh(row.maLenh);
      showToast('Xóa thành công!');
      loadItems();
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa', 'error'); }
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
          <span className="table-total">Tổng: <strong>{bySearch.length}</strong> lệnh</span>
          {canThem && <button className="btn-add" onClick={openAdd}>
            <FiPlus style={{ marginRight: 6 }} />Tạo lệnh tồn đầu
          </button>}
        </div>

        <div className="table-toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ width: 260 }}>
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Tìm theo mã lệnh, kho..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="tbdb-filter-select" value={selectedCapQuanLy} onChange={e => setSelectedCapQuanLy(e.target.value)}>
              <option value="ALL">Tất cả cấp quản lý</option>
              {capQuanLyList.map(c => <option key={c.maCapQuanLy} value={c.maCapQuanLy}>{c.tenCapQuanLy}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedKho} onChange={e => setSelectedKho(e.target.value)}>
              <option value="ALL">Tất cả kho</option>
              {khoLocList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedNam} onChange={e => setSelectedNam(e.target.value)}>
              <option value="ALL">Tất cả năm</option>
              {namList.map(nam => <option key={nam} value={nam}>{nam}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={7} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-title">{items.length === 0 ? 'Chưa có lệnh tồn đầu nào' : 'Không tìm thấy kết quả'}</div>
            <div className="empty-state-desc">{items.length === 0 ? 'Nhấn "Tạo lệnh tồn đầu" để bắt đầu khởi tạo cho 1 kho' : 'Không có bản ghi nào khớp với từ khóa hiện tại'}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>STT</th>
                  <th>Mã lệnh</th>
                  <th>Kho</th>
                  <th>Năm</th>
                  <th>Ngày lập</th>
                  <th>Ngày chốt</th>
                  <th style={{ textAlign: 'center' }}>TBĐB / Lô</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 130, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bySearch.map((r, i) => (
                  <tr key={r.maLenh}>
                    <td className="td-muted td-center">{i + 1}</td>
                    <td><span className="sub-value">{r.maLenh}</span></td>
                    <td>{r.tenKho || khoMap[r.maKho] || r.maKho}</td>
                    <td>{r.nam}</td>
                    <td>{fmtDate(r.ngay)}</td>
                    <td>{fmtDate(r.ngayHieuLuc)}</td>
                    <td className="td-center">{r.soTbdb} / {r.soLo}</td>
                    <td>
                      {r.trangThai === 'HOAN_THANH'
                        ? <span className="badge badge--active"><FiCheckCircle size={11} style={{ marginRight: 4 }} />Đã hoàn thành</span>
                        : isQuaHan(r)
                          ? <span className="badge badge--locked">Quá hạn</span>
                          : <span className="badge badge--pending">Đang xử lý</span>}
                    </td>
                    <td className="td-center">
                      <div className="td-actions">
                        <button className="btn-icon-edit" onClick={() => navigate(`/tb-dong-bo/ton-dau/${r.maLenh}`)} title="Xử lý">
                          <FiArrowRight size={13} />
                        </button>
                        {canSua && (
                          <button className="btn-icon-warn" onClick={() => openEdit(r)} title="Sửa ngày chốt/ghi chú">
                            <FiEdit2 size={13} />
                          </button>
                        )}
                        {canXoa && r.trangThai !== 'HOAN_THANH' && (
                          <button className="btn-icon-delete" onClick={() => xoaLenh(r)} title="Xóa lệnh">
                            <FiTrash2 size={13} />
                          </button>
                        )}
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
              <h3 className="modal-title">Tạo lệnh tồn đầu</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" noValidate>
              <div className="form-grid-2col">
                <div className="form-field">
                  <label className="form-label">Kho cần khởi tạo tồn đầu *</label>
                  <select className={`form-input${errors.maKho ? ' form-input--invalid' : ''}`} value={form.maKho ?? ''}
                    onChange={e => { setForm({ ...form, maKho: e.target.value, maLenh: suaMaLenhGoiY(e.target.value, form.nam) }); clearError('maKho'); }}>
                    <option value="">-- Chọn kho --</option>
                    {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                  </select>
                  {errors.maKho && <p className="form-error-text">{errors.maKho}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Năm bắt đầu quản lý *</label>
                  <input className={`form-input${errors.nam ? ' form-input--invalid' : ''}`} type="number" value={form.nam ?? ''}
                    onChange={e => { setForm({ ...form, nam: e.target.value, maLenh: suaMaLenhGoiY(form.maKho, e.target.value) }); clearError('nam'); }} />
                  {errors.nam && <p className="form-error-text">{errors.nam}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Số (mã lệnh) *</label>
                  <input className={`form-input${errors.maLenh ? ' form-input--invalid' : ''}`} value={form.maLenh ?? ''}
                    onChange={e => { setForm({ ...form, maLenh: e.target.value }); clearError('maLenh'); }} placeholder="Tự gợi ý sau khi chọn kho/năm" />
                  {errors.maLenh && <p className="form-error-text">{errors.maLenh}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Ngày lập *</label>
                  <input className={`form-input${errors.ngay ? ' form-input--invalid' : ''}`} type="date" value={form.ngay ?? ''}
                    onChange={e => { setForm({ ...form, ngay: e.target.value }); clearError('ngay'); }} />
                  {errors.ngay && <p className="form-error-text">{errors.ngay}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Ngày chốt *</label>
                  <input className={`form-input${errors.ngayChot ? ' form-input--invalid' : ''}`} type="date" value={form.ngayChot ?? ''}
                    onChange={e => { setForm({ ...form, ngayChot: e.target.value }); clearError('ngayChot'); }} />
                  {errors.ngayChot && <p className="form-error-text">{errors.ngayChot}</p>}
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label">Ghi chú</label>
                  <input className="form-input" value={form.ghiChu ?? ''}
                    onChange={e => setForm({ ...form, ghiChu: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={dangTaoLenh}>
                  {dangTaoLenh ? 'Đang tạo...' : <><FiPlus style={{ marginRight: 6 }} />Tạo lệnh</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModal && (
        <div className="overlay">
          <div className="modal modal--form fade-in">
            <div className="modal-header">
              <h3 className="modal-title">Sửa lệnh tồn đầu {editModal.maLenh}</h3>
              <button className="modal-close-btn" onClick={() => setEditModal(null)}>✕</button>
            </div>
            <form onSubmit={submitEdit} className="modal-body" noValidate>
              <div className="form-hint" style={{ marginBottom: 10 }}>
                Chỉ sửa được Ngày chốt và Ghi chú.
              </div>
              <div className="form-field">
                <label className="form-label">Ngày chốt</label>
                <input className="form-input" type="date" value={editModal.ngayChot ?? ''}
                  onChange={e => setEditModal({ ...editModal, ngayChot: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label">Ghi chú</label>
                <input className="form-input" value={editModal.ghiChu ?? ''}
                  onChange={e => setEditModal({ ...editModal, ghiChu: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setEditModal(null)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={dangSua}>{dangSua ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

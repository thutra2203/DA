import { useState, useEffect, useMemo } from 'react';
import { chuyenKyAPI } from '../../services/api';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import SkeletonTable from '../../components/ui/SkeletonTable';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

export default function ChuyenKyTbDongBo() {
  usePageTitle('Chuyển kỳ');
  const confirm = useConfirm();
  const { canThem } = useModulePerm('TBDB_KIEM_KE_XL');
  const [items, setItems] = useState([]);
  const [phieuKhaDung, setPhieuKhaDung] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [dangThucHien, setDangThucHien] = useState(false);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const loadItems = () => {
    setLoading(true);
    return chuyenKyAPI.getAll()
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadItems(); }, []);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(c => [c.maChuyenKy, c.tenKho, c.maKho, c.maPhieuKiemKe].some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [items, search]);

  const openAdd = () => {
    setForm({ maPhieuKiemKe: '', namMoi: '', ngayChuyen: new Date().toISOString().slice(0, 10), ghiChu: '' });
    setErrors({});
    setShowModal(true);
    chuyenKyAPI.getPhieuKhaDung().then(res => setPhieuKhaDung(res.data)).catch(() => setPhieuKhaDung([]));
  };

  const phieuChon = phieuKhaDung.find(p => p.maPhieuKiemKe === form.maPhieuKiemKe);

  const clearError = (col) => setErrors(prev => {
    if (!prev[col]) return prev;
    const next = { ...prev };
    delete next[col];
    return next;
  });

  const validate = () => {
    const next = {};
    if (!form.maPhieuKiemKe) next.maPhieuKiemKe = 'Phiếu kiểm kê căn cứ không được để trống';
    if (!form.ngayChuyen) next.ngayChuyen = 'Ngày chuyển không được để trống';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!(await confirm(`Chuyển kỳ cho ${phieuChon?.tenKho || phieuChon?.maKho || ''} sang năm ${form.namMoi}? Số liệu tồn đầu năm mới sẽ được ghi theo số lượng thực tế đã kiểm kê, không thể hoàn tác.`))) return;
    setDangThucHien(true);
    try {
      const res = await chuyenKyAPI.thucHien({
        maPhieuKiemKe: form.maPhieuKiemKe, namMoi: Number(form.namMoi),
        ngayChuyen: form.ngayChuyen, ghiChu: form.ghiChu || null,
      });
      showToast(res.data.message || 'Chuyển kỳ thành công!');
      setShowModal(false);
      loadItems();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangThucHien(false); }
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
          <span className="table-total">Tổng: <strong>{bySearch.length}</strong> lần chuyển kỳ</span>
          {canThem && <button className="btn-add" onClick={openAdd}>
            <FiPlus style={{ marginRight: 6 }} />Thực hiện chuyển kỳ
          </button>}
        </div>

        <div className="table-toolbar">
          <div className="search-wrap" style={{ width: 260 }}>
            <FiSearch className="search-icon" />
            <input className="search-input" placeholder="Tìm theo mã, kho, phiếu kiểm kê..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={7} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔄</div>
            <div className="empty-state-title">{items.length === 0 ? 'Chưa thực hiện chuyển kỳ nào' : 'Không tìm thấy kết quả'}</div>
            <div className="empty-state-desc">{items.length === 0 ? 'Nhấn "Thực hiện chuyển kỳ" sau khi đã có phiếu kiểm kê kết thúc' : 'Không có bản ghi nào khớp với từ khóa hiện tại'}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>STT</th>
                  <th>Mã chuyển kỳ</th>
                  <th>Kho</th>
                  <th>Phiếu kiểm kê căn cứ</th>
                  <th style={{ textAlign: 'center' }}>Kỳ mới</th>
                  <th>Ngày chuyển</th>
                  <th>Người thực hiện</th>
                </tr>
              </thead>
              <tbody>
                {bySearch.map((r, i) => (
                  <tr key={r.maChuyenKy}>
                    <td className="td-muted td-center">{i + 1}</td>
                    <td><span className="sub-value">{r.maChuyenKy}</span></td>
                    <td>{r.tenKho || r.maKho}</td>
                    <td>{r.maPhieuKiemKe}</td>
                    <td className="td-center">{r.namMoi}</td>
                    <td>{fmtDate(r.ngayChuyen)}</td>
                    <td>{r.nguoiThucHien || ''}</td>
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
              <h3 className="modal-title">Thực hiện chuyển kỳ</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" noValidate>
              <div className="form-field">
                <label className="form-label">Phiếu kiểm kê căn cứ *</label>
                <select className={`form-input${errors.maPhieuKiemKe ? ' form-input--invalid' : ''}`} value={form.maPhieuKiemKe ?? ''}
                  onChange={e => {
                    const p = phieuKhaDung.find(x => x.maPhieuKiemKe === e.target.value);
                    const namMoiMacDinh = p?.ngayLap ? new Date(p.ngayLap).getFullYear() + 1 : '';
                    setForm({ ...form, maPhieuKiemKe: e.target.value, namMoi: namMoiMacDinh });
                    clearError('maPhieuKiemKe');
                  }}>
                  <option value="">-- Chọn phiếu kiểm kê đã kết thúc --</option>
                  {phieuKhaDung.map(p => (
                    <option key={p.maPhieuKiemKe} value={p.maPhieuKiemKe}>
                      {p.maPhieuKiemKe} - {p.tenKho || p.maKho} ({fmtDate(p.ngayLap)})
                    </option>
                  ))}
                </select>
                {errors.maPhieuKiemKe && <p className="form-error-text">{errors.maPhieuKiemKe}</p>}
                {phieuKhaDung.length === 0 && (
                  <p className="form-hint" style={{ marginTop: 6 }}>Chưa có phiếu kiểm kê nào đã kết thúc và chưa dùng để chuyển kỳ.</p>
                )}
              </div>
              <div className="form-grid-2col">
                <div className="form-field">
                  <label className="form-label">Năm mới</label>
                  <input className="form-input" type="number" value={form.namMoi ?? ''}
                    onChange={e => setForm({ ...form, namMoi: e.target.value })} />

                </div>
                <div className="form-field">
                  <label className="form-label">Ngày chuyển *</label>
                  <input className={`form-input${errors.ngayChuyen ? ' form-input--invalid' : ''}`} type="date" value={form.ngayChuyen ?? ''}
                    onChange={e => { setForm({ ...form, ngayChuyen: e.target.value }); clearError('ngayChuyen'); }} />
                  {errors.ngayChuyen && <p className="form-error-text">{errors.ngayChuyen}</p>}
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label">Ghi chú</label>
                  <input className="form-input" value={form.ghiChu ?? ''}
                    onChange={e => setForm({ ...form, ghiChu: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={dangThucHien || phieuKhaDung.length === 0}>
                  {dangThucHien ? 'Đang xử lý...' : <><FiPlus style={{ marginRight: 6 }} />Thực hiện</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

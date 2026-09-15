import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { kiemKeTbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiPlus, FiSearch, FiArrowRight, FiCheckCircle, FiEdit2, FiTrash2, FiPrinter } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import KiemKePrintView from './KiemKePrintView';
import SkeletonTable from '../../components/ui/SkeletonTable';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

export default function KiemKeTbDongBo() {
  usePageTitle('Kiểm kê TBĐB');
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { canThem, canSua, canXoa } = useModulePerm('TBDB_KIEM_KE_LAP');
  const [dotList, setDotList] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKho, setSelectedKho] = useState('ALL');
  const [selectedDot, setSelectedDot] = useState('ALL');
  const [selectedTrangThai, setSelectedTrangThai] = useState('ALL');
  const [toast, setToast] = useState(null);
  const [maPhieuChonIn, setMaPhieuChonIn] = useState(null); // chỉ chọn được đúng 1 phiếu để in tại 1 thời điểm
  const [printData, setPrintData] = useState(null);
  const [dangInPhieu, setDangInPhieu] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [dangTao, setDangTao] = useState(false);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    danhMucAPI.getAll('dot-kiem-ke').then(res => setDotList(res.data)).catch(() => setDotList([]));
    danhMucAPI.getAll('kho').then(res => setKhoList(res.data)).catch(() => setKhoList([]));
  }, []);

  const loadItems = () => {
    setLoading(true);
    return kiemKeTbDongBoAPI.getAll()
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadItems(); }, []);

  const toggleChonIn = (maPhieu) => setMaPhieuChonIn(prev => (prev === maPhieu ? null : maPhieu));

  // In nhanh ngay từ danh sách — tự tải dữ liệu đầy đủ của phiếu đang được chọn (checkbox),
  // render ẩn (KiemKePrintView) rồi mở hộp thoại in ngay khi có đủ dữ liệu.
  const handlePrint = async () => {
    if (!maPhieuChonIn) return;
    setDangInPhieu(true);
    try {
      const res = await kiemKeTbDongBoAPI.getOne(maPhieuChonIn);
      setPrintData(res.data);
    } catch { showToast('Không tải được dữ liệu để in', 'error'); }
    finally { setDangInPhieu(false); }
  };

  useEffect(() => {
    if (!printData) return;
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, [printData]);

  const dotMap = useMemo(() => Object.fromEntries(dotList.map(d => [d.maDotKiemKe, d.tenDotKiemKe])), [dotList]);
  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(p => {
      if (selectedKho !== 'ALL' && p.maKho !== selectedKho) return false;
      if (selectedDot !== 'ALL' && p.maDotKiemKe !== selectedDot) return false;
      if (selectedTrangThai !== 'ALL') {
        const daKetThuc = p.trangThai === 'HOAN_THANH';
        if (selectedTrangThai === 'HOAN_THANH' && !daKetThuc) return false;
        if (selectedTrangThai === 'DANG_KIEM_KE' && daKetThuc) return false;
      }
      if (!q) return true;
      return [p.maPhieuKiemKe, p.tenKho, p.maKho, p.tenDotKiemKe].some(v => String(v ?? '').toLowerCase().includes(q));
    });
  }, [items, search, selectedKho, selectedDot, selectedTrangThai]);

  const openAdd = () => {
    setEditing(null);
    setForm({ maDotKiemKe: '', maKho: '', ngayLap: new Date().toISOString().slice(0, 10), ngayKiemKe: '' });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      maDotKiemKe: row.maDotKiemKe, maKho: row.maKho,
      ngayLap: row.ngayLap ? row.ngayLap.slice(0, 10) : '', ngayKiemKe: row.ngayKiemKe ? row.ngayKiemKe.slice(0, 10) : '',
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
    if (!editing) {
      if (!form.maDotKiemKe) next.maDotKiemKe = 'Đợt kiểm kê không được để trống';
      if (!form.maKho) next.maKho = 'Kho không được để trống';
    }
    if (!form.ngayLap) next.ngayLap = 'Ngày lập không được để trống';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setDangTao(true);
    try {
      if (editing) {
        const res = await kiemKeTbDongBoAPI.suaPhieu(editing.maPhieuKiemKe, {
          ngayLap: form.ngayLap, ngayKiemKe: form.ngayKiemKe || null,
        });
        showToast(res.data.message || 'Cập nhật phiếu kiểm kê thành công!');
      } else {
        const res = await kiemKeTbDongBoAPI.taoPhieu({
          maDotKiemKe: form.maDotKiemKe, maKho: form.maKho,
          ngayLap: form.ngayLap, ngayKiemKe: form.ngayKiemKe || null,
        });
        showToast(res.data.message || 'Tạo phiếu kiểm kê thành công!');
      }
      setShowModal(false);
      loadItems();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangTao(false); }
  };

  const handleDelete = async (row) => {
    if (!(await confirm(`Xóa phiếu kiểm kê "${row.maPhieuKiemKe}"? `))) return;
    try {
      await kiemKeTbDongBoAPI.xoaPhieu(row.maPhieuKiemKe);
      showToast('Xóa phiếu kiểm kê thành công!');
      loadItems();
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa phiếu này', 'error'); }
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
          <span className="table-total">Tổng: <strong>{bySearch.length}</strong> phiếu</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-print" onClick={handlePrint} disabled={!maPhieuChonIn || dangInPhieu}>
              <FiPrinter style={{ marginRight: 6 }} /> {dangInPhieu ? 'Đang tải...' : 'In biên bản'}
            </button>
            {canThem && <button className="btn-add" onClick={openAdd}>
              <FiPlus style={{ marginRight: 6 }} />Tạo phiếu kiểm kê
            </button>}
          </div>
        </div>

        <div className="table-toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ width: 260 }}>
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Tìm theo mã phiếu, kho, đợt..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="tbdb-filter-select" value={selectedKho} onChange={e => setSelectedKho(e.target.value)}>
              <option value="ALL">Tất cả kho</option>
              {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedDot} onChange={e => setSelectedDot(e.target.value)}>
              <option value="ALL">Tất cả đợt</option>
              {dotList.map(d => <option key={d.maDotKiemKe} value={d.maDotKiemKe}>{d.tenDotKiemKe}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedTrangThai} onChange={e => setSelectedTrangThai(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="HOAN_THANH">Đã kết thúc</option>
              <option value="DANG_KIEM_KE">Đang kiểm kê</option>
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={9} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">{items.length === 0 ? 'Chưa có phiếu kiểm kê nào' : 'Không tìm thấy kết quả'}</div>
            <div className="empty-state-desc">{items.length === 0 ? 'Nhấn "Tạo phiếu kiểm kê" để bắt đầu' : 'Không có bản ghi nào khớp với từ khóa hiện tại'}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: 'center' }}></th>
                  <th style={{ width: 50 }}>STT</th>
                  <th>Mã phiếu</th>
                  <th>Đợt kiểm kê</th>
                  <th>Kho</th>
                  <th>Ngày lập</th>
                  <th>Ngày kiểm kê</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 150, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bySearch.map((r, i) => {
                  const daKetThuc = r.trangThai === 'HOAN_THANH';
                  return (
                    <tr key={r.maPhieuKiemKe}>
                      <td className="td-center">
                        <input type="checkbox" checked={maPhieuChonIn === r.maPhieuKiemKe} onChange={() => toggleChonIn(r.maPhieuKiemKe)} title="Chọn để in" />
                      </td>
                      <td className="td-muted td-center">{i + 1}</td>
                      <td><span className="sub-value">{r.maPhieuKiemKe}</span></td>
                      <td>{r.tenDotKiemKe || dotMap[r.maDotKiemKe] || r.maDotKiemKe}</td>
                      <td>{r.tenKho || khoMap[r.maKho] || r.maKho}</td>
                      <td>{fmtDate(r.ngayLap)}</td>
                      <td>{fmtDate(r.ngayKiemKe)}</td>
                      <td>
                        {daKetThuc
                          ? <span className="badge tbdb-status-badge"><FiCheckCircle size={11} style={{ marginRight: 4 }} />Đã kết thúc</span>
                          : <span className="td-muted">Đang kiểm kê</span>}
                      </td>
                      <td className="td-center">
                        <div className="td-actions">
                          <button className="btn-icon-edit" onClick={() => navigate(`/tb-dong-bo/kiem-ke/${r.maPhieuKiemKe}`)} title="Xử lý">
                            <FiArrowRight size={13} />
                          </button>
                          {!daKetThuc && (
                            <>
                              {canSua && <button className="btn-icon-warn" onClick={() => openEdit(r)} title="Sửa"><FiEdit2 size={13} /></button>}
                              {canXoa && <button className="btn-icon-delete" onClick={() => handleDelete(r)} title="Xóa"><FiTrash2 size={13} /></button>}
                            </>
                          )}
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
          <div className="modal modal--form fade-in">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? `Sửa phiếu kiểm kê — ${editing.maPhieuKiemKe}` : 'Tạo phiếu kiểm kê TBĐB'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" noValidate>
              <div className="form-grid-2col">
                <div className="form-field">
                  <label className="form-label">Đợt kiểm kê *</label>
                  <select className={`form-input${errors.maDotKiemKe ? ' form-input--invalid' : ''}`} disabled={!!editing} value={form.maDotKiemKe ?? ''}
                    onChange={e => { setForm({ ...form, maDotKiemKe: e.target.value }); clearError('maDotKiemKe'); }}>
                    <option value="">-- Chọn đợt --</option>
                    {dotList.map(d => <option key={d.maDotKiemKe} value={d.maDotKiemKe}>{d.tenDotKiemKe}</option>)}
                  </select>
                  {errors.maDotKiemKe && <p className="form-error-text">{errors.maDotKiemKe}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Kho *</label>
                  <select className={`form-input${errors.maKho ? ' form-input--invalid' : ''}`} disabled={!!editing} value={form.maKho ?? ''}
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
                  <label className="form-label">Ngày kiểm kê</label>
                  <input className="form-input" type="date" value={form.ngayKiemKe ?? ''}
                    onChange={e => setForm({ ...form, ngayKiemKe: e.target.value })} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={dangTao}>
                  {dangTao
                    ? (editing ? 'Đang lưu...' : 'Đang tạo...')
                    : editing ? <><FiEdit2 style={{ marginRight: 6 }} />Cập nhật</> : <><FiPlus style={{ marginRight: 6 }} />Tạo phiếu</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <KiemKePrintView phieu={printData} />
    </div>
  );
}

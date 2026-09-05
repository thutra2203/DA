import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { lenhTbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, FiCheckCircle, FiPrinter } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import LenhPrintView from './LenhPrintView';
import SkeletonTable from '../../components/ui/SkeletonTable';
import Pagination from '../../components/ui/Pagination';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const PAGE_SIZE = 10;
const CAP_LIST = [1, 2, 3, 4, 5];

const fmtMoney = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('vi-VN'));
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

const isXuat = (tenLoaiLenh) => (tenLoaiLenh || '').toLowerCase().includes('xuất');

// Quá hạn: lệnh chưa kết thúc mà "Giá trị đến ngày" đã qua (so sánh theo ngày, bỏ giờ phút).
const isQuaHan = (row) => {
  if (!row.giaTriDenNgay) return false;
  const hetHan = new Date(row.giaTriDenNgay); hetHan.setHours(0, 0, 0, 0);
  const homNay = new Date(); homNay.setHours(0, 0, 0, 0);
  return hetHan < homNay;
};

export default function LenhTbDongBo() {
  usePageTitle('Lệnh nhập/xuất TB đồng bộ');
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { user } = useAuth();
  const maKhoNguoiDung = user?.maDonVi || null;
  const [loaiLenhList, setLoaiLenhList] = useState([]);
  const [activeLoaiLenh, setActiveLoaiLenh] = useState('');
  const [lyDoList, setLyDoList] = useState([]);
  const [htttList, setHtttList] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [nccList, setNccList] = useState([]);
  const [htVanChuyenList, setHtVanChuyenList] = useState([]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKho, setSelectedKho] = useState(maKhoNguoiDung || 'ALL');
  const [selectedLyDo, setSelectedLyDo] = useState('ALL');
  const [selectedTrangThai, setSelectedTrangThai] = useState('ALL');
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [printData, setPrintData] = useState(null); // { lenh, rows } — dữ liệu của lệnh đang chuẩn bị in
  const [dangInLenh, setDangInLenh] = useState(false);
  const [maLenhChonIn, setMaLenhChonIn] = useState(null); // chỉ chọn được đúng 1 lệnh để in tại 1 thời điểm

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const toggleChonIn = (maLenh) => setMaLenhChonIn(prev => (prev === maLenh ? null : maLenh));

  // In nhanh ngay từ danh sách, không cần điều hướng sang trang chi tiết — tự tải thông tin lệnh
  // + danh sách dòng chi tiết của lệnh đang được chọn (checkbox), render ẩn (LenhPrintView) rồi mở
  // hộp thoại in ngay khi có đủ dữ liệu.
  const handlePrint = async () => {
    if (!maLenhChonIn) return;
    setDangInLenh(true);
    try {
      const [lenhRes, ctRes] = await Promise.all([
        lenhTbDongBoAPI.getOne(maLenhChonIn),
        lenhTbDongBoAPI.chiTiet.getAll(maLenhChonIn),
      ]);
      setPrintData({ lenh: lenhRes.data, rows: ctRes.data });
    } catch { showToast('Không tải được dữ liệu để in', 'error'); }
    finally { setDangInLenh(false); }
  };

  useEffect(() => {
    if (!printData) return;
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, [printData]);

  useEffect(() => {
    Promise.all([
      danhMucAPI.getAll('tinh-chat-nhap-xuat').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('chi-tiet-tcnx').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('httt').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('kho').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('ncc').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('ht-van-chuyen').then(res => res.data).catch(() => []),
    ]).then(([nx, ctnx, httt, kho, ncc, htvc]) => {
      // Loại "Xuất hủy/thanh lý" (NX05) đã có màn hình riêng ("Hủy/Thanh lý" ở menu), không hiện
      // lại ở đây để tránh trùng chức năng.
      const nxTbdb = nx.filter(n => n.nhomTB === 'TBDB' && n.maNX !== 'NX05');
      setLoaiLenhList(nxTbdb);
      setActiveLoaiLenh(nxTbdb[0]?.maNX || '');
      setLyDoList(ctnx);
      setHtttList(httt);
      setKhoList(kho);
      setNccList(ncc);
      setHtVanChuyenList(htvc);
    });
  }, []);

  const loadItems = (maLoaiLenh, maKho) => {
    if (!maLoaiLenh) return;
    setLoading(true);
    return lenhTbDongBoAPI.getAll(maLoaiLenh, maKho && maKho !== 'ALL' ? maKho : undefined)
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadItems(activeLoaiLenh, selectedKho); }, [activeLoaiLenh, selectedKho]);
  useEffect(() => { setSelectedLyDo('ALL'); setMaLenhChonIn(null); }, [activeLoaiLenh]);

  const activeLoai = loaiLenhList.find(n => n.maNX === activeLoaiLenh);
  const xuat = isXuat(activeLoai?.tenNX);
  // khoMap giữ TOÀN BỘ kho (kể cả KNV) để vẫn hiển thị đúng tên cho dữ liệu lịch sử nếu có; chỉ danh
  // sách CHỌN trong form/bộ lọc mới giới hạn kho vật lý — kho nghiệp vụ (KNV, VD "Kho chuyển cấp"/
  // "Kho hủy/thanh lý") là kho nội bộ dành riêng cho 2 chức năng đó, không tham gia lệnh Nhập/Xuất chung.
  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);
  const khoVatLyList = useMemo(() => khoList.filter(k => k.maLoaiKho !== 'KNV'), [khoList]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(l => {
      if (selectedLyDo !== 'ALL' && l.maLenhChiTiet !== selectedLyDo) return false;
      if (selectedTrangThai !== 'ALL') {
        const daHoanThanh = l.trangThai === 'HOAN_THANH';
        const quaHan = !daHoanThanh && isQuaHan(l);
        if (selectedTrangThai === 'HOAN_THANH' && !daHoanThanh) return false;
        if (selectedTrangThai === 'QUA_HAN' && !quaHan) return false;
        if (selectedTrangThai === 'DANG_XU_LY' && (daHoanThanh || quaHan)) return false;
      }
      if (!q) return true;
      return [l.maLenh, l.veViec, l.canCu, l.tenLyDo].some(v => String(v ?? '').toLowerCase().includes(q));
    });
  }, [items, search, selectedLyDo, selectedTrangThai]);

  useEffect(() => { setPage(1); }, [activeLoaiLenh, selectedKho, selectedLyDo, selectedTrangThai, search]);
  const paged = bySearch.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  const openAdd = () => {
    setEditing(null);
    setForm({
      maLenh: '', maLenhChiTiet: '', ngay: new Date().toISOString().slice(0, 10), ngayHieuLuc: '', giaTriDenNgay: '',
      trangThai: 'DANG_XU_LY', canCu: '', veViec: '', maHttt: '', maKhoNhap: '', maKhoXuat: '', maNcc: '', doiTacLoai: 'KHO', ptVanChuyen: '', donViChuyen: '', ghiChu: '',
    });
    setErrors({});
    setShowModal(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      maLenh: row.maLenh, maLenhChiTiet: row.maLenhChiTiet ?? '', ngay: row.ngay, ngayHieuLuc: row.ngayHieuLuc ?? '',
      giaTriDenNgay: row.giaTriDenNgay ?? '', trangThai: row.trangThai ?? '', canCu: row.canCu ?? '', veViec: row.veViec ?? '',
      maHttt: row.maHttt ?? '', maKhoNhap: row.maKhoNhap ?? '', maKhoXuat: row.maKhoXuat ?? '', maNcc: row.maNcc ?? '',
      doiTacLoai: row.maNcc ? 'NCC' : 'KHO',
      ptVanChuyen: row.ptVanChuyen ?? '', donViChuyen: row.donViChuyen ?? '', ghiChu: row.ghiChu ?? '',
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

  // khoTuThan = kho đang thao tác (kho nhập cho lệnh Nhập, kho xuất cho lệnh Xuất).
  // doiTac = bên đối diện (NCC hoặc kho khác), dùng chung state maKhoNhap/maKhoXuat tùy chiều lệnh.
  const validate = () => {
    const next = {};
    if (!form.maLenh || !form.maLenh.trim()) next.maLenh = 'Số lệnh không được để trống';
    if (!form.ngay) next.ngay = 'Ngày không được để trống';
    const khoTuThan = xuat ? form.maKhoXuat : form.maKhoNhap;
    if (!khoTuThan) next.khoTuThan = xuat ? 'Kho xuất không được để trống' : 'Kho nhập không được để trống';
    if (form.doiTacLoai === 'NCC') {
      if (!form.maNcc) next.doiTac = 'Nhà cung cấp/đối tác không được để trống';
    } else {
      const khoDoiTac = xuat ? form.maKhoNhap : form.maKhoXuat;
      if (!khoDoiTac) next.doiTac = 'Kho đối tác không được để trống';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = () => ({
    maLenh: form.maLenh || null,
    maLoaiLenh: activeLoaiLenh,
    maLenhChiTiet: form.maLenhChiTiet || null,
    ngay: form.ngay || null,
    ngayHieuLuc: form.ngayHieuLuc || null,
    giaTriDenNgay: form.giaTriDenNgay || null,
    trangThai: form.trangThai || null,
    canCu: form.canCu || null,
    veViec: form.veViec || null,
    maHttt: form.maHttt || null,
    maKhoNhap: xuat ? (form.doiTacLoai === 'KHO' ? (form.maKhoNhap || null) : null) : (form.maKhoNhap || null),
    maKhoXuat: xuat ? (form.maKhoXuat || null) : (form.doiTacLoai === 'KHO' ? (form.maKhoXuat || null) : null),
    maNcc: form.doiTacLoai === 'NCC' ? (form.maNcc || null) : null,
    ptVanChuyen: form.ptVanChuyen || null,
    donViChuyen: form.donViChuyen || null,
    ghiChu: form.ghiChu || null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (editing) {
        await lenhTbDongBoAPI.update(editing.maLenh, buildPayload());
        showToast('Cập nhật thành công!');
        setShowModal(false);
        loadItems(activeLoaiLenh, selectedKho);
      } else {
        const maLenhMoi = form.maLenh;
        await lenhTbDongBoAPI.create(buildPayload());
        setShowModal(false);
        navigate(`/tb-dong-bo/tao-lenh-nhap-xuat/${maLenhMoi}`, { state: { flash: 'Tạo lệnh thành công!' } });
      }
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const handleDelete = async (row) => {
    if (!(await confirm(`Xóa lệnh "${row.maLenh}"? Chỉ xóa được khi chưa có dòng chi tiết.`))) return;
    try {
      await lenhTbDongBoAPI.remove(row.maLenh);
      showToast('Xóa thành công!');
      loadItems(activeLoaiLenh, selectedKho);
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa, lệnh đang có dữ liệu liên quan', 'error'); }
  };

  const lyDoTrongLoai = lyDoList.filter(l => l.maNX === activeLoaiLenh);

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
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-print" onClick={handlePrint} disabled={!maLenhChonIn || dangInLenh}>
              <FiPrinter style={{ marginRight: 6 }} /> {dangInLenh ? 'Đang tải...' : 'In lệnh'}
            </button>
            <button className="btn-add" onClick={openAdd} disabled={!activeLoaiLenh}>
              <FiPlus style={{ marginRight: 6 }} /> Thêm lệnh
            </button>
          </div>
        </div>

        <div className="tbdb-loai-row">
          {loaiLenhList.map(n => (
            <button
              key={n.maNX}
              className={`tbdb-loai-chip${activeLoaiLenh === n.maNX ? ' tbdb-loai-chip--active' : ''}`}
              onClick={() => setActiveLoaiLenh(n.maNX)}
            >
              <span className="tbdb-loai-chip-label">Lệnh {n.tenNX}</span>
            </button>
          ))}
        </div>

        <div className="table-toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ width: 260 }}>
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Tìm theo số lệnh, về việc, căn cứ..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="tbdb-filter-select" value={selectedLyDo} onChange={e => setSelectedLyDo(e.target.value)}>
              <option value="ALL">Tất cả lý do</option>
              {lyDoTrongLoai.map(l => <option key={l.maCTNX} value={l.maCTNX}>{l.tenCTNX}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedKho} onChange={e => setSelectedKho(e.target.value)} disabled={!!maKhoNguoiDung}>
              {!maKhoNguoiDung && <option value="ALL">Tất cả kho</option>}
              {khoVatLyList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedTrangThai} onChange={e => setSelectedTrangThai(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="HOAN_THANH">Đã hoàn thành</option>
              <option value="DANG_XU_LY">Đang xử lý</option>
              <option value="QUA_HAN">Quá hạn</option>
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={12} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">

            <div className="empty-state-title">Chưa có lệnh {activeLoai?.tenNX?.toLowerCase()} nào</div>
            <div className="empty-state-desc">Nhấn "+ Thêm lệnh" để tạo lệnh {activeLoai?.tenNX?.toLowerCase()} đầu tiên</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: 'center' }}></th>
                    <th style={{ width: 50 }}>STT</th>
                    <th>Số lệnh</th>
                    <th>Ngày</th>
                    <th>Ngày hết hạn</th>
                    <th>Lý do</th>
                    <th>{xuat ? 'Kho xuất' : 'Kho nhập'}</th>
                    <th>Đối tác</th>
                    <th>Về việc</th>
                    <th style={{ textAlign: 'center' }}>Số dòng</th>
                    <th>Trạng thái</th>
                    <th style={{ width: 150, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => {
                    const daHoanThanh = row.trangThai === 'HOAN_THANH';
                    return (
                      <tr key={row.maLenh}>
                        <td className="td-center">
                          <input type="checkbox" checked={maLenhChonIn === row.maLenh} onChange={() => toggleChonIn(row.maLenh)} title="Chọn để in" />
                        </td>
                        <td className="td-muted td-center">{startIdx + i + 1}</td>
                        <td><span className="sub-value">{row.maLenh}</span></td>
                        <td>{fmtDate(row.ngay)}</td>
                        <td>{fmtDate(row.giaTriDenNgay)}</td>
                        <td>{row.tenLyDo || row.maLenhChiTiet || ''}</td>
                        <td>{xuat ? (row.tenKhoXuat || khoMap[row.maKhoXuat] || '') : (row.tenKhoNhap || khoMap[row.maKhoNhap] || '')}</td>
                        <td>
                          {row.maNcc
                            ? (row.tenNcc || row.maNcc)
                            : (xuat ? (row.tenKhoNhap || khoMap[row.maKhoNhap] || '') : (row.tenKhoXuat || khoMap[row.maKhoXuat] || ''))}
                        </td>
                        <td>{row.veViec || ''}</td>
                        <td className="td-center"><span className="badge tbdb-status-badge">{row.soDongChiTiet}</span></td>
                        <td>
                          {daHoanThanh
                            ? <span className="badge badge--active"><FiCheckCircle size={11} style={{ marginRight: 4 }} />Đã hoàn thành</span>
                            : isQuaHan(row)
                              ? <span className="badge badge--locked">Quá hạn</span>
                              : <span className="badge badge--pending">Đang xử lý</span>}
                        </td>
                        <td className="td-center">
                          <div className="td-actions">
                            <button className="btn-icon-edit" onClick={() => navigate(`/tb-dong-bo/tao-lenh-nhap-xuat/${row.maLenh}`)} title="Chi tiết"><FiEye size={13} /></button>
                            <button className="btn-icon-warn" disabled={daHoanThanh} onClick={() => openEdit(row)} title={daHoanThanh ? 'Lệnh đã hoàn thành, không thể sửa' : 'Sửa'}><FiEdit2 size={13} /></button>
                            <button className="btn-icon-delete" disabled={daHoanThanh} onClick={() => handleDelete(row)} title={daHoanThanh ? 'Lệnh đã hoàn thành, không thể xóa' : 'Xóa'}><FiTrash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={bySearch.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>

      {showModal && (
        <div className="overlay">
          <div className="modal modal--form fade-in">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Cập nhật' : 'Thêm mới'} - Lệnh {activeLoai?.tenNX}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" noValidate>
              <div className="form-grid-2col">
                <div className="form-field">
                  <label className="form-label">Số lệnh *</label>
                  <input className={`form-input${errors.maLenh ? ' form-input--invalid' : ''}`} disabled={!!editing} value={form.maLenh ?? ''}
                    onChange={e => { setForm({ ...form, maLenh: e.target.value }); clearError('maLenh'); }} placeholder="VD: LNTB2026001" />
                  {errors.maLenh && <p className="form-error-text">{errors.maLenh}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Lý do</label>
                  <select className="form-input" value={form.maLenhChiTiet ?? ''}
                    onChange={e => setForm({ ...form, maLenhChiTiet: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {lyDoTrongLoai.map(l => <option key={l.maCTNX} value={l.maCTNX}>{l.tenCTNX}</option>)}
                  </select>
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
                  <label className="form-label">Hình thức thanh toán</label>
                  <select className="form-input" value={form.maHttt ?? ''}
                    onChange={e => setForm({ ...form, maHttt: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {htttList.map(h => <option key={h.maHTTT} value={h.maHTTT}>{h.tenHTTT}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Căn cứ</label>
                  <input className="form-input" value={form.canCu ?? ''}
                    onChange={e => setForm({ ...form, canCu: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Về việc</label>
                  <input className="form-input" value={form.veViec ?? ''}
                    onChange={e => setForm({ ...form, veViec: e.target.value })} />
                </div>
                {!xuat ? (
                  <div className="form-field">
                    <label className="form-label">Kho nhập *</label>
                    <select className={`form-input${errors.khoTuThan ? ' form-input--invalid' : ''}`} value={form.maKhoNhap ?? ''}
                      onChange={e => { setForm({ ...form, maKhoNhap: e.target.value }); clearError('khoTuThan'); }}>
                      <option value="">-- Chọn kho --</option>
                      {khoVatLyList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                    </select>
                    {errors.khoTuThan && <p className="form-error-text">{errors.khoTuThan}</p>}
                  </div>
                ) : (
                  <div className="form-field">
                    <label className="form-label">Kho xuất *</label>
                    <select className={`form-input${errors.khoTuThan ? ' form-input--invalid' : ''}`} value={form.maKhoXuat ?? ''}
                      onChange={e => { setForm({ ...form, maKhoXuat: e.target.value }); clearError('khoTuThan'); }}>
                      <option value="">-- Chọn kho --</option>
                      {khoVatLyList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                    </select>
                    {errors.khoTuThan && <p className="form-error-text">{errors.khoTuThan}</p>}
                  </div>
                )}
                <div className="form-field">
                  <label className="form-label">{xuat ? 'Kho xuất)' : 'Kho xuất'} *</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button type="button"
                      className={`tbdb-loai-chip${form.doiTacLoai === 'KHO' ? ' tbdb-loai-chip--active' : ''}`}
                      onClick={() => setForm({ ...form, doiTacLoai: 'KHO' })}>
                      <span className="tbdb-loai-chip-label">Kho nội bộ</span>
                    </button>
                    <button type="button"
                      className={`tbdb-loai-chip${form.doiTacLoai === 'NCC' ? ' tbdb-loai-chip--active' : ''}`}
                      onClick={() => setForm({ ...form, doiTacLoai: 'NCC' })}>
                      <span className="tbdb-loai-chip-label">Nhà cung cấp</span>
                    </button>
                  </div>
                  {form.doiTacLoai === 'NCC' ? (
                    <select className={`form-input${errors.doiTac ? ' form-input--invalid' : ''}`} value={form.maNcc ?? ''}
                      onChange={e => { setForm({ ...form, maNcc: e.target.value }); clearError('doiTac'); }}>
                      <option value="">-- Chọn nhà cung cấp --</option>
                      {nccList.map(n => <option key={n.maNCC} value={n.maNCC}>{n.tenNCC}</option>)}
                    </select>
                  ) : xuat ? (
                    <select className={`form-input${errors.doiTac ? ' form-input--invalid' : ''}`} value={form.maKhoNhap ?? ''}
                      onChange={e => { setForm({ ...form, maKhoNhap: e.target.value }); clearError('doiTac'); }}>
                      <option value="">-- Chọn kho --</option>
                      {khoVatLyList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                    </select>
                  ) : (
                    <select className={`form-input${errors.doiTac ? ' form-input--invalid' : ''}`} value={form.maKhoXuat ?? ''}
                      onChange={e => { setForm({ ...form, maKhoXuat: e.target.value }); clearError('doiTac'); }}>
                      <option value="">-- Chọn kho --</option>
                      {khoVatLyList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                    </select>
                  )}
                  {errors.doiTac && <p className="form-error-text">{errors.doiTac}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Phương thức vận chuyển</label>
                  <select className="form-input" value={form.ptVanChuyen ?? ''}
                    onChange={e => setForm({ ...form, ptVanChuyen: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {form.ptVanChuyen && !htVanChuyenList.some(h => h.tenHTVC === form.ptVanChuyen) && (
                      <option value={form.ptVanChuyen}>{form.ptVanChuyen}</option>
                    )}
                    {htVanChuyenList.map(h => <option key={h.maHTVC} value={h.tenHTVC}>{h.tenHTVC}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Đơn vị chuyển</label>
                  <input className="form-input" value={form.donViChuyen ?? ''}
                    onChange={e => setForm({ ...form, donViChuyen: e.target.value })} />
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label">Ghi chú</label>
                  <input className="form-input" value={form.ghiChu ?? ''}
                    onChange={e => setForm({ ...form, ghiChu: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">
                  {editing ? <><FiEdit2 style={{ marginRight: 6 }} />Cập nhật</> : <><FiPlus style={{ marginRight: 6 }} />Thêm mới</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LenhPrintView lenh={printData?.lenh} rows={printData?.rows} />
    </div>
  );
}

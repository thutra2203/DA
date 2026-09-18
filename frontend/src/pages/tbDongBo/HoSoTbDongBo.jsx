import { useState, useEffect, useMemo } from 'react';
import { tbDongBoAPI, danhMucAPI, chiTietDongBoAPI } from '../../services/api';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, FiX, FiDownload } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import SkeletonTable from '../../components/ui/SkeletonTable';
import Pagination from '../../components/ui/Pagination';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const PAGE_SIZE = 10;

const fmtMoney = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('vi-VN'));

export default function HoSoTbDongBo() {
  usePageTitle('HỒ SƠ TRANG BỊ ĐB');
  const confirm = useConfirm();
  const { user } = useAuth();
  const { canThem, canSua, canXoa } = useModulePerm('TBDB_HOSO');
  const maKhoNguoiDung = user?.maDonVi || null; // null = không bị giới hạn theo kho (ADMIN hoặc chưa gán kho)
  const [items, setItems] = useState([]);
  const [loaiList, setLoaiList] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [loaiKhoList, setLoaiKhoList] = useState([]);
  const [capQuanLyList, setCapQuanLyList] = useState([]);
  const [dvtList, setDvtList] = useState([]);
  const [nhomSpktList, setNhomSpktList] = useState([]);
  const [loaiSpktList, setLoaiSpktList] = useState([]);
  const [kieuSpktList, setKieuSpktList] = useState([]);
  const [chiTietDongBoList, setChiTietDongBoList] = useState([]);
  const [capList, setCapList] = useState([]);
  const [trangThaiList, setTrangThaiList] = useState([]);

  const [selectedKho, setSelectedKho] = useState(maKhoNguoiDung || 'ALL');
  const [selectedCapQuanLy, setSelectedCapQuanLy] = useState('ALL');
  const [selectedLoaiKho, setSelectedLoaiKho] = useState('ALL');
  const [selectedLoai, setSelectedLoai] = useState('ALL');
  const [selectedNhomSpkt, setSelectedNhomSpkt] = useState('ALL');
  const [selectedLoaiSpkt, setSelectedLoaiSpkt] = useState('ALL');
  const [selectedCcl, setSelectedCcl] = useState('ALL');
  const [selectedTrangThai, setSelectedTrangThai] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [detailTbdb, setDetailTbdb] = useState(null);
  const [toast, setToast] = useState(null);
  const [dangXuatExcel, setDangXuatExcel] = useState(false);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const loadDanhMuc = () => Promise.all([
    danhMucAPI.getAll('loai-tbdb').then(res => res.data).catch(() => []),
    danhMucAPI.getAll('kho').then(res => res.data).catch(() => []),
    danhMucAPI.getAll('dvt').then(res => res.data).catch(() => []),
    danhMucAPI.getAll('nhom-spkt').then(res => res.data).catch(() => []),
    danhMucAPI.getAll('loai-spkt').then(res => res.data).catch(() => []),
    danhMucAPI.getAll('kieu-spkt').then(res => res.data).catch(() => []),
    danhMucAPI.getAll('cap-chat-luong').then(res => res.data).catch(() => []),
    danhMucAPI.getAll('trang-thai-tb').then(res => res.data).catch(() => []),
    danhMucAPI.getAll('loai-kho').then(res => res.data).catch(() => []),
    danhMucAPI.getAll('cap-quan-ly').then(res => res.data).catch(() => []),
    chiTietDongBoAPI.getByNhom().then(res => res.data).catch(() => []),
  ]).then(([loai, kho, dvt, nhomSpkt, loaiSpkt, kieuSpkt, cap, trangThai, loaiKho, capQuanLy, chiTietDongBo]) => {
    setLoaiList(loai);
    setKhoList(kho);
    setDvtList(dvt);
    setNhomSpktList(nhomSpkt);
    setLoaiSpktList(loaiSpkt);
    setKieuSpktList(kieuSpkt);
    setCapList(cap);
    setTrangThaiList(trangThai);
    setLoaiKhoList(loaiKho);
    setCapQuanLyList(capQuanLy);
    setChiTietDongBoList(chiTietDongBo);
  });

  const buildFilterExtra = () => {
    const extra = {};
    if (selectedLoai !== 'ALL') extra.maLoaiTbdb = selectedLoai;
    if (selectedNhomSpkt !== 'ALL') extra.maNhomSpkt = selectedNhomSpkt;
    if (selectedLoaiSpkt !== 'ALL') extra.maLoaiSpkt = selectedLoaiSpkt;
    if (selectedCcl !== 'ALL') extra.maCcl = selectedCcl;
    if (selectedTrangThai !== 'ALL') extra.maTrangThaiTb = selectedTrangThai;
    return extra;
  };

  const loadItems = () => {
    setLoading(true);
    return tbDongBoAPI.getByKho(selectedKho, buildFilterExtra())
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const xuatExcel = async () => {
    setDangXuatExcel(true);
    try {
      const res = await tbDongBoAPI.xuatExcel(selectedKho, buildFilterExtra(), search.trim() || undefined);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ho-so-tbdb-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { showToast('Không xuất được file Excel', 'error'); }
    finally { setDangXuatExcel(false); }
  };

  useEffect(() => { loadDanhMuc(); }, []);
  useEffect(() => { loadItems(); }, [selectedKho, selectedLoai, selectedNhomSpkt, selectedLoaiSpkt, selectedCcl, selectedTrangThai]);

  const loaiMap = useMemo(() => Object.fromEntries(loaiList.map(l => [l.maLoai, l.tenLoai])), [loaiList]);

  // Đồng bộ (ChiTietDongBo) gắn với Kiểu SPKT, không gắn trực tiếp với Nhóm/Loại — nên lọc theo
  // Loại SPKT phải tra qua Loại.MaKieu, còn lọc theo Nhóm SPKT phải gộp tất cả Kiểu thuộc nhóm đó.
  // Loại TBĐB (dropdown lọc) cũng ràng buộc theo cùng tập ChiTietDongBo này — chỉ hiện các Loại TBĐB
  // thực sự phối thuộc cho Kiểu SPKT đang chọn, giống các trang xử lý lệnh khác.
  const cacKieuLienQuan = useMemo(() => {
    if (selectedLoaiSpkt !== 'ALL') {
      const loai = loaiSpktList.find(l => l.maLoai === selectedLoaiSpkt);
      return loai?.maKieu ? [loai.maKieu] : [];
    }
    if (selectedNhomSpkt !== 'ALL') return kieuSpktList.filter(k => k.maNhom === selectedNhomSpkt).map(k => k.maKieu);
    return null;
  }, [selectedLoaiSpkt, selectedNhomSpkt, loaiSpktList, kieuSpktList]);

  const dongBoEntriesLienQuan = useMemo(() => (
    cacKieuLienQuan == null ? null : chiTietDongBoList.filter(c => cacKieuLienQuan.includes(c.maKieuSpkt))
  ), [cacKieuLienQuan, chiTietDongBoList]);

  const loaiTbdbLocList = useMemo(() => {
    if (dongBoEntriesLienQuan == null) return loaiList;
    const allowed = new Set(dongBoEntriesLienQuan.map(c => c.maLoaiTbdb));
    return loaiList.filter(l => allowed.has(l.maLoai));
  }, [dongBoEntriesLienQuan, loaiList]);

  useEffect(() => {
    if (selectedLoai !== 'ALL' && !loaiTbdbLocList.some(l => l.maLoai === selectedLoai)) setSelectedLoai('ALL');
  }, [loaiTbdbLocList]);

  // Lọc theo Cấp quản lý/Loại kho chỉ để RÚT GỌN danh sách kho cần chọn — không phải bộ lọc dữ liệu
  // TBĐB (dữ liệu vẫn lọc theo đúng 1 kho đã CHỌN, xem selectedKho).
  const khoLocList = useMemo(() => khoList.filter(k =>
    (selectedCapQuanLy === 'ALL' || k.maCapQuanLy === selectedCapQuanLy) &&
    (selectedLoaiKho === 'ALL' || k.maLoaiKho === selectedLoaiKho)
  ), [khoList, selectedCapQuanLy, selectedLoaiKho]);

  // Kho đang chọn không còn nằm trong danh sách đã rút gọn (do vừa đổi Cấp quản lý/Loại kho) —
  // quay về "Tất cả kho" để tránh giữ 1 lựa chọn đã ẩn khỏi dropdown.
  useEffect(() => {
    if (maKhoNguoiDung) return;
    if (selectedKho !== 'ALL' && !khoLocList.some(k => k.maKho === selectedKho)) setSelectedKho('ALL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoLocList]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(t => {
      const fields = [t.maTbdb, t.tenTbdb, t.tenLoaiTbdb, t.ghiChu];
      return fields.some(v => String(v ?? '').toLowerCase().includes(q));
    });
  }, [items, search]);

  useEffect(() => { setPage(1); }, [selectedLoai, selectedNhomSpkt, selectedLoaiSpkt, selectedKho, selectedCcl, selectedTrangThai, search]);

  const paged = bySearch.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  const openAdd = () => { setEditing(null); setForm({}); setErrors({}); setShowModal(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      maTbdb: row.maTbdb ?? '',
      tenTbdb: row.tenTbdb ?? '',
      maLoaiTbdb: row.maLoaiTbdb ?? '',
      maDvt: row.maDvt ?? '',
      ghiChu: row.ghiChu ?? '',
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
    if (!form.maTbdb || !form.maTbdb.trim()) next.maTbdb = 'Mã trang bị không được để trống';
    if (!form.tenTbdb || !form.tenTbdb.trim()) next.tenTbdb = 'Tên trang bị không được để trống';
    if (!form.maLoaiTbdb) next.maLoaiTbdb = 'Loại trang bị không được để trống';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = () => ({
    maTBDB: form.maTbdb || null,
    tenTBDB: form.tenTbdb || null,
    maLoaiTBDB: form.maLoaiTbdb || null,
    maDVT: form.maDvt || null,
    ghiChu: form.ghiChu || null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (editing) {
        await tbDongBoAPI.update(editing.maTbdb, buildPayload());
        showToast('Cập nhật thành công!');
      } else {
        await tbDongBoAPI.create(buildPayload());
        showToast('Thêm mới thành công!');
      }
      setShowModal(false);
      loadItems(selectedKho);
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const handleDelete = async (row) => {
    if (!(await confirm(`Bạn có chắc muốn xóa hồ sơ "${row.tenTbdb || row.maTbdb}"?`))) return;
    try {
      await tbDongBoAPI.remove(row.maTbdb);
      showToast('Xóa thành công!');
      loadItems(selectedKho);
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa, dữ liệu đang được sử dụng', 'error'); }
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
          <span className="table-total">
            Tổng: <strong>{bySearch.length}</strong> bản ghi
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-excel" onClick={xuatExcel} disabled={dangXuatExcel}>
              <FiDownload style={{ marginRight: 6 }} /> {dangXuatExcel ? 'Đang xuất...' : 'Xuất Excel'}
            </button>
            {canThem && <button className="btn-add" onClick={openAdd}>
              <FiPlus style={{ marginRight: 6 }} /> Thêm mới TB
            </button>}
          </div>
        </div>

        <div className="table-toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ width: 220 }}>
              <FiSearch className="search-icon" />
              <input
                className="search-input"
                placeholder="Tìm theo mã, tên, ghi chú..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="tbdb-filter-select" value={selectedCapQuanLy} onChange={e => setSelectedCapQuanLy(e.target.value)} disabled={!!maKhoNguoiDung}>
              <option value="ALL">Tất cả cấp quản lý</option>
              {capQuanLyList.map(c => <option key={c.maCapQuanLy} value={c.maCapQuanLy}>{c.tenCapQuanLy}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedLoaiKho} onChange={e => setSelectedLoaiKho(e.target.value)} disabled={!!maKhoNguoiDung}>
              <option value="ALL">Tất cả loại kho</option>
              {loaiKhoList.map(l => <option key={l.maLoaiKho} value={l.maLoaiKho}>{l.tenLoaiKho}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedKho} onChange={e => setSelectedKho(e.target.value)} disabled={!!maKhoNguoiDung}>
              {!maKhoNguoiDung && <option value="ALL">Tất cả kho</option>}
              {khoLocList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedNhomSpkt} onChange={e => { setSelectedNhomSpkt(e.target.value); setSelectedLoaiSpkt('ALL'); }}>
              <option value="ALL">Tất cả nhóm SPKT</option>
              {nhomSpktList.map(n => <option key={n.maNhom} value={n.maNhom}>{n.tenNhom}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedLoaiSpkt} onChange={e => setSelectedLoaiSpkt(e.target.value)}>
              <option value="ALL">Tất cả loại SPKT</option>
              {loaiSpktList.filter(l => selectedNhomSpkt === 'ALL' || l.maNhom === selectedNhomSpkt).map(l => <option key={l.maLoai} value={l.maLoai}>{l.tenLoai}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedLoai} onChange={e => setSelectedLoai(e.target.value)}>
              <option value="ALL">Tất cả loại</option>
              {loaiTbdbLocList.map(l => <option key={l.maLoai} value={l.maLoai}>{l.tenLoai}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedCcl} onChange={e => setSelectedCcl(e.target.value)}>
              <option value="ALL">Tất cả cấp CL</option>
              {capList.map(c => <option key={c.maCap} value={c.maCap}>{c.tenCap}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedTrangThai} onChange={e => setSelectedTrangThai(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              {trangThaiList.map(t => <option key={t.maTTTB} value={t.maTTTB}>{t.tenTTTB}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={12} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">

            <div className="empty-state-title">
              {items.length === 0 ? 'Không có trang bị nào khớp bộ lọc' : 'Không tìm thấy kết quả'}
            </div>
            <div className="empty-state-desc">
              {items.length === 0
                ? (selectedKho === 'ALL' && selectedLoai === 'ALL' && selectedNhomSpkt === 'ALL' && selectedLoaiSpkt === 'ALL' && selectedCcl === 'ALL' && selectedTrangThai === 'ALL'
                  ? 'Chưa có trang bị đồng bộ nào trong hệ thống — nhấn "+ Thêm hồ sơ" để tạo bản ghi đầu tiên'
                  : 'Không có trang bị nào khớp với bộ lọc đang chọn')
                : 'Không có bản ghi nào khớp với bộ lọc / từ khóa hiện tại'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>STT</th>
                    <th>Mã TB</th>
                    <th>Tên TB</th>
                    <th>Loại</th>
                    <th>ĐVT</th>
                    <th style={{ textAlign: 'center' }}>SL {selectedKho !== 'ALL' ? 'trong kho' : 'toàn hệ thống'}</th>
                    <th style={{ textAlign: 'center' }}>Cấp 1</th>
                    <th style={{ textAlign: 'center' }}>Cấp 2</th>
                    <th style={{ textAlign: 'center' }}>Cấp 3</th>
                    <th style={{ textAlign: 'center' }}>Cấp 4</th>
                    <th style={{ textAlign: 'center' }}>Cấp 5</th>
                    <th style={{ width: 140, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => (
                    <tr key={row.maTbdb}>
                      <td className="td-muted td-center">{startIdx + i + 1}</td>
                      <td><span className="sub-value">{row.maTbdb}</span></td>
                      <td><span className="main-value">{row.tenTbdb || ''}</span></td>
                      <td>{loaiMap[row.maLoaiTbdb] || row.maLoaiTbdb}</td>
                      <td>{row.tenDvt || row.maDvt || ''}</td>
                      <td className="td-center"><span className="badge tbdb-status-badge">{row.tongSoLuong ?? 0}</span></td>
                      <td className="td-center">{row.soLuongCap1 > 0 ? row.soLuongCap1 : ''}</td>
                      <td className="td-center">{row.soLuongCap2 > 0 ? row.soLuongCap2 : ''}</td>
                      <td className="td-center">{row.soLuongCap3 > 0 ? row.soLuongCap3 : ''}</td>
                      <td className="td-center">{row.soLuongCap4 > 0 ? row.soLuongCap4 : ''}</td>
                      <td className="td-center">{row.soLuongCap5 > 0 ? row.soLuongCap5 : ''}</td>
                      <td className="td-center">
                        <div className="td-actions">
                          <button className="btn-icon-edit" onClick={() => setDetailTbdb(row.maTbdb)} title="Xem chi tiết">
                            <FiEye size={13} />
                          </button>
                          {canSua && (
                            <button className="btn-icon-warn" onClick={() => openEdit(row)} title="Sửa hồ sơ">
                              <FiEdit2 size={13} />
                            </button>
                          )}
                          {canXoa && (
                            <button className="btn-icon-delete" onClick={() => handleDelete(row)} title="Xóa hồ sơ">
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
            <Pagination page={page} total={bySearch.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>

      {showModal && (
        <div className="overlay">
          <div className="modal fade-in">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                <h3 className="modal-title">{editing ? 'Cập nhật' : 'Thêm mới'} Trang bị đồng bộ</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" noValidate>
              <div className="form-field">
                <label className="form-label">Mã trang bị *</label>
                <input className={`form-input${errors.maTbdb ? ' form-input--invalid' : ''}`} value={form.maTbdb ?? ''} disabled={!!editing}
                  onChange={e => { setForm({ ...form, maTbdb: e.target.value }); clearError('maTbdb'); }} placeholder="Nhập mã trang bị..." />
                {errors.maTbdb && <p className="form-error-text">{errors.maTbdb}</p>}
              </div>
              <div className="form-field">
                <label className="form-label">Tên trang bị *</label>
                <input className={`form-input${errors.tenTbdb ? ' form-input--invalid' : ''}`} value={form.tenTbdb ?? ''}
                  onChange={e => { setForm({ ...form, tenTbdb: e.target.value }); clearError('tenTbdb'); }} placeholder="Nhập tên trang bị..." />
                {errors.tenTbdb && <p className="form-error-text">{errors.tenTbdb}</p>}
              </div>
              <div className="form-field">
                <label className="form-label">Loại trang bị *</label>
                <select className={`form-input${errors.maLoaiTbdb ? ' form-input--invalid' : ''}`} value={form.maLoaiTbdb ?? ''}
                  onChange={e => { setForm({ ...form, maLoaiTbdb: e.target.value }); clearError('maLoaiTbdb'); }}>
                  <option value="">-- Chọn --</option>
                  {loaiList.map(l => <option key={l.maLoai} value={l.maLoai}>{l.tenLoai}</option>)}
                </select>
                {errors.maLoaiTbdb && <p className="form-error-text">{errors.maLoaiTbdb}</p>}
              </div>
              <div className="form-field">
                <label className="form-label">Đơn vị tính</label>
                <select className="form-input" value={form.maDvt ?? ''}
                  onChange={e => setForm({ ...form, maDvt: e.target.value })}>
                  <option value="">-- Chọn --</option>
                  {dvtList.map(d => <option key={d.maDVT} value={d.maDVT}>{d.tenDVT}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Ghi chú</label>
                <input className="form-input" value={form.ghiChu ?? ''}
                  onChange={e => setForm({ ...form, ghiChu: e.target.value })} placeholder="Ghi chú..." />
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

      {detailTbdb && (
        <ChiTietModal
          maTbdb={detailTbdb}
          maKhoNgoai={selectedKho}
          khoList={khoList}
          onClose={() => setDetailTbdb(null)}
        />
      )}
    </div>
  );
}

// Modal chỉ xem (read-only) thực lực của 1 TBDB — hồ sơ không phải nơi tạo Lô/Tồn kho, việc đó
// do quy trình "Cập nhật lệnh nhập/xuất" xử lý khi kho thực nhập/thực xuất theo lệnh.
function ChiTietModal({ maTbdb, maKhoNgoai, khoList, onClose }) {
  const { user } = useAuth();
  const maKhoNguoiDung = user?.maDonVi || null;
  const [tab, setTab] = useState('chung');
  const [maKhoLoc, setMaKhoLoc] = useState(maKhoNgoai || 'ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [loSearch, setLoSearch] = useState('');
  const [loCcl, setLoCcl] = useState('ALL');
  const [loNamSx, setLoNamSx] = useState('ALL');
  const [loNuocSx, setLoNuocSx] = useState('ALL');
  const [loBaoGoi, setLoBaoGoi] = useState('ALL');
  const [loNiemCat, setLoNiemCat] = useState('ALL');
  const [dangXuatExcelLo, setDangXuatExcelLo] = useState(false);

  const [vtSearch, setVtSearch] = useState('');
  // true khi vtSearch được set từ nút "Xem vị trí của lô này" (xemViTriLo) — lúc đó phải lọc ĐÚNG
  // 1 mã lô, không dùng kiểu "chứa chuỗi" như gõ tay, vì mã lô con tách ra (VD "TBDB01-2CC1") luôn
  // chứa mã lô gốc ("TBDB01-2") làm tiền tố nên sẽ bị lẫn vào nếu lọc theo kiểu chứa chuỗi.
  const [vtSearchChinhXac, setVtSearchChinhXac] = useState(false);
  const [vtNhaKho, setVtNhaKho] = useState('ALL');
  const [vtKhu, setVtKhu] = useState('ALL');
  const [vtKhoi, setVtKhoi] = useState('ALL');
  const [vtGia, setVtGia] = useState('ALL');
  const [vtTang, setVtTang] = useState('ALL');
  const [dangXuatExcelVt, setDangXuatExcelVt] = useState(false);

  const load = () => {
    setLoading(true);
    return tbDongBoAPI.getChiTiet(maTbdb, maKhoLoc)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [maTbdb, maKhoLoc]);

  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);

  const loCclOptions = useMemo(() => {
    const map = new Map();
    (data?.los || []).forEach(lo => { if (lo.maCcl != null) map.set(lo.maCcl, lo.tenCcl || lo.maCcl); });
    return [...map.entries()];
  }, [data]);
  const loNamSxOptions = useMemo(() => {
    const set = new Set((data?.los || []).map(lo => lo.namSx).filter(v => v != null));
    return [...set].sort((a, b) => b - a);
  }, [data]);
  const loNuocSxOptions = useMemo(() => {
    const map = new Map();
    (data?.los || []).forEach(lo => { if (lo.maNuocSx != null) map.set(lo.maNuocSx, lo.tenNuocSx || lo.maNuocSx); });
    return [...map.entries()];
  }, [data]);
  const loBaoGoiOptions = useMemo(() => {
    const map = new Map();
    (data?.los || []).forEach(lo => { if (lo.maTinhTrangBaoGoi != null) map.set(lo.maTinhTrangBaoGoi, lo.tenTinhTrangBaoGoi || lo.maTinhTrangBaoGoi); });
    return [...map.entries()];
  }, [data]);
  const loNiemCatOptions = useMemo(() => {
    const map = new Map();
    (data?.los || []).forEach(lo => { if (lo.maHinhThucNiemCat != null) map.set(lo.maHinhThucNiemCat, lo.tenHinhThucNiemCat || lo.maHinhThucNiemCat); });
    return [...map.entries()];
  }, [data]);

  const losFiltered = useMemo(() => {
    const q = loSearch.trim().toLowerCase();
    return (data?.los || []).filter(lo => {
      if ((lo.soLuongTon ?? 0) <= 0) return false;
      if (loCcl !== 'ALL' && String(lo.maCcl) !== loCcl) return false;
      if (loNamSx !== 'ALL' && String(lo.namSx) !== loNamSx) return false;
      if (loNuocSx !== 'ALL' && lo.maNuocSx !== loNuocSx) return false;
      if (loBaoGoi !== 'ALL' && lo.maTinhTrangBaoGoi !== loBaoGoi) return false;
      if (loNiemCat !== 'ALL' && lo.maHinhThucNiemCat !== loNiemCat) return false;
      if (q && !`${lo.maLoTbdb} ${lo.maLenh || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, loSearch, loCcl, loNamSx, loNuocSx, loBaoGoi, loNiemCat]);

  const distinctVt = (field) => {
    const set = new Set((data?.viTris || []).map(tk => tk[field]).filter(v => v != null && v !== ''));
    return [...set].sort();
  };
  const vtNhaKhoOptions = useMemo(() => distinctVt('tenNhaKho'), [data]);
  const vtKhuOptions = useMemo(() => distinctVt('tenDinhKhu'), [data]);
  const vtKhoiOptions = useMemo(() => distinctVt('tenKhoi'), [data]);
  const vtGiaOptions = useMemo(() => distinctVt('tenGia'), [data]);
  const vtTangOptions = useMemo(() => distinctVt('tenTang'), [data]);

  const viTrisFiltered = useMemo(() => {
    const q = vtSearch.trim().toLowerCase();
    return (data?.viTris || []).filter(tk => {
      if (vtNhaKho !== 'ALL' && tk.tenNhaKho !== vtNhaKho) return false;
      if (vtKhu !== 'ALL' && tk.tenDinhKhu !== vtKhu) return false;
      if (vtKhoi !== 'ALL' && tk.tenKhoi !== vtKhoi) return false;
      if (vtGia !== 'ALL' && tk.tenGia !== vtGia) return false;
      if (vtTang !== 'ALL' && tk.tenTang !== vtTang) return false;
      if (q) {
        if (vtSearchChinhXac) {
          if (tk.maLoTbdb.toLowerCase() !== q) return false;
        } else if (!`${tk.maLoTbdb} ${tk.tenHom || ''} ${tk.moTaViTri || ''}`.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [data, vtSearch, vtSearchChinhXac, vtNhaKho, vtKhu, vtKhoi, vtGia, vtTang]);

  const xuatExcelLo = async () => {
    setDangXuatExcelLo(true);
    try {
      const extra = {};
      if (loCcl !== 'ALL') extra.maCcl = loCcl;
      if (loNamSx !== 'ALL') extra.namSx = loNamSx;
      if (loNuocSx !== 'ALL') extra.maNuocSx = loNuocSx;
      if (loBaoGoi !== 'ALL') extra.maTinhTrangBaoGoi = loBaoGoi;
      if (loNiemCat !== 'ALL') extra.maHinhThucNiemCat = loNiemCat;
      const res = await tbDongBoAPI.xuatExcelLo(maTbdb, maKhoLoc, extra, loSearch.trim() || undefined);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `lo-hang-${maTbdb}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    finally { setDangXuatExcelLo(false); }
  };

  const xemViTriLo = (maLoTbdb) => {
    // Giữ nguyên maKhoLoc đang chọn (kho của lô này đã nằm trong phạm vi đó rồi) — trước đây
    // reset về maKhoNguoiDung khiến ADMIN (không giới hạn kho) bị đổi thành "Tất cả kho", tải lại
    // lô của TOÀN HỆ THỐNG thay vì chỉ đúng kho đang xem.
    setVtNhaKho('ALL'); setVtKhu('ALL'); setVtKhoi('ALL'); setVtGia('ALL'); setVtTang('ALL');
    setVtSearch(maLoTbdb);
    setVtSearchChinhXac(true);
    setTab('vitri');
  };

  const xuatExcelViTri = async () => {
    setDangXuatExcelVt(true);
    try {
      const extra = {};
      if (vtNhaKho !== 'ALL') extra.tenNhaKho = vtNhaKho;
      if (vtKhu !== 'ALL') extra.tenDinhKhu = vtKhu;
      if (vtKhoi !== 'ALL') extra.tenKhoi = vtKhoi;
      if (vtGia !== 'ALL') extra.tenGia = vtGia;
      if (vtTang !== 'ALL') extra.tenTang = vtTang;
      const res = await tbDongBoAPI.xuatExcelViTri(maTbdb, maKhoLoc, extra, vtSearch.trim() || undefined);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `vi-tri-ton-kho-${maTbdb}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    finally { setDangXuatExcelVt(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal--wide fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

            <h2 className="modal-title">Thông tin chi tiết TB - {maTbdb}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="tbdb-tabs">
          <button className={`tbdb-tab-btn${tab === 'chung' ? ' tbdb-tab-btn--active' : ''}`} onClick={() => setTab('chung')}>Thông tin chung</button>
          <button className={`tbdb-tab-btn${tab === 'lo' ? ' tbdb-tab-btn--active' : ''}`} onClick={() => setTab('lo')}>Lô hàng {data ? `(${losFiltered.length})` : ''}</button>
          <button className={`tbdb-tab-btn${tab === 'vitri' ? ' tbdb-tab-btn--active' : ''}`} onClick={() => setTab('vitri')}>Vị trí &amp; tồn kho {data ? `(${viTrisFiltered.length})` : ''}</button>
        </div>

        <div className="modal-body">
          {loading || !data ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>Đang tải...</div>
          ) : (
            <>
              {tab === 'chung' && (
                <div className="tbdb-detail-grid">
                  <DetailItem label="Mã trang bị" value={data.tbdb.maTbdb} />
                  <DetailItem label="Tên trang bị" value={data.tbdb.tenTbdb} />
                  <DetailItem label="Loại" value={data.tbdb.tenLoaiTbdb || data.tbdb.maLoaiTbdb} />
                  <DetailItem label="Đơn vị tính" value={data.tbdb.tenDvt || data.tbdb.maDvt} />
                  <DetailItem label="Tổng số lượng" value={`${data.tongSoLuong} (${maKhoLoc === 'ALL' ? 'toàn hệ thống' : khoMap[maKhoLoc] || maKhoLoc})`} />
                  <DetailItem label="Số lô hiện có" value={data.los.length} />
                  {data.tbdb.ghiChu && (
                    <DetailItem label="Ghi chú" value={data.tbdb.ghiChu} full />
                  )}
                </div>
              )}

              {tab === 'lo' && (
                <div>
                  <div className="tbdb-tab-toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
                    <div className="search-wrap" style={{ width: 200 }}>
                      <FiSearch className="search-icon" />
                      <input
                        className="search-input"
                        placeholder="Tìm theo mã lô, nguồn..."
                        value={loSearch}
                        onChange={e => setLoSearch(e.target.value)}
                      />
                    </div>
                    <select className="tbdb-filter-select" value={loCcl} onChange={e => setLoCcl(e.target.value)}>
                      <option value="ALL">Tất cả cấp CL</option>
                      {loCclOptions.map(([ma, ten]) => <option key={ma} value={ma}>{ten}</option>)}
                    </select>
                    <select className="tbdb-filter-select" value={loNamSx} onChange={e => setLoNamSx(e.target.value)}>
                      <option value="ALL">Tất cả năm SX</option>
                      {loNamSxOptions.map(nam => <option key={nam} value={nam}>{nam}</option>)}
                    </select>
                    <select className="tbdb-filter-select" value={loNuocSx} onChange={e => setLoNuocSx(e.target.value)}>
                      <option value="ALL">Tất cả nước SX</option>
                      {loNuocSxOptions.map(([ma, ten]) => <option key={ma} value={ma}>{ten}</option>)}
                    </select>
                    <select className="tbdb-filter-select" value={loBaoGoi} onChange={e => setLoBaoGoi(e.target.value)}>
                      <option value="ALL">Tất cả tình trạng bao gói</option>
                      {loBaoGoiOptions.map(([ma, ten]) => <option key={ma} value={ma}>{ten}</option>)}
                    </select>
                    <select className="tbdb-filter-select" value={loNiemCat} onChange={e => setLoNiemCat(e.target.value)}>
                      <option value="ALL">Tất cả hình thức niêm cất</option>
                      {loNiemCatOptions.map(([ma, ten]) => <option key={ma} value={ma}>{ten}</option>)}
                    </select>
                    <button className="btn-excel" onClick={xuatExcelLo} disabled={dangXuatExcelLo} style={{ marginLeft: 'auto' }}>
                      <FiDownload style={{ marginRight: 6 }} /> {dangXuatExcelLo ? 'Đang xuất...' : 'Xuất Excel'}
                    </button>
                  </div>

                  {losFiltered.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 0' }}>
                      {data.los.length === 0 ? 'Chưa có lô hàng nào' : 'Không có lô hàng nào khớp bộ lọc'}
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table tbdb-fixed-table">
                        <thead>
                          <tr>
                            <th style={{ width: 90 }}>Mã lô</th>
                            <th style={{ width: 90 }}>Nguồn</th>
                            <th style={{ width: 60, whiteSpace: 'normal' }}>Cấp CL</th>
                            <th style={{ width: 60 }}>Năm SX</th>
                            <th style={{ width: 80, whiteSpace: 'normal' }}>Nước SX</th>
                            <th style={{ width: 100, whiteSpace: 'normal' }}>Tình trạng bao gói</th>
                            <th style={{ width: 100, whiteSpace: 'normal' }}>Hình thức niêm cất</th>
                            <th style={{ textAlign: 'right', width: 100 }}>Đơn giá</th>
                            <th style={{ textAlign: 'center', width: 80 }}>SL tồn</th>
                            <th style={{ width: 70, textAlign: 'center' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {losFiltered.map(lo => (
                            <tr key={lo.maLoTbdb}>
                              <td className="col-lo-truncate" title={lo.maLoTbdb}><span className="sub-value">{lo.maLoTbdb}</span></td>
                              <td className="col-lo-truncate" title={lo.maLenh || ''}>{lo.maLenh || ''}</td>
                              <td>{lo.tenCcl || lo.maCcl || ''}</td>
                              <td>{lo.namSx || ''}</td>
                              <td>{lo.tenNuocSx || lo.maNuocSx || ''}</td>
                              <td>{lo.tenTinhTrangBaoGoi || lo.maTinhTrangBaoGoi || ''}</td>
                              <td>{lo.tenHinhThucNiemCat || lo.maHinhThucNiemCat || ''}</td>
                              <td style={{ textAlign: 'right' }}>{fmtMoney(lo.donGia)}</td>
                              <td className="td-center">{lo.soLuongTon}</td>
                              <td className="td-center">
                                <div className="td-actions">
                                  <button className="btn-icon-edit" onClick={() => xemViTriLo(lo.maLoTbdb)} title="Xem vị trí của lô này">
                                    <FiEye size={13} />
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
              )}

              {tab === 'vitri' && (
                <div>
                  <div className="tbdb-tab-toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
                    <div className="search-wrap" style={{ width: 200 }}>
                      <FiSearch className="search-icon" />
                      <input
                        className="search-input"
                        placeholder="Tìm theo mã lô, hòm, mô tả..."
                        value={vtSearch}
                        onChange={e => { setVtSearch(e.target.value); setVtSearchChinhXac(false); }}
                      />
                    </div>
                    <select className="tbdb-filter-select" value={maKhoLoc} onChange={e => setMaKhoLoc(e.target.value)} disabled={!!maKhoNguoiDung}>
                      {!maKhoNguoiDung && <option value="ALL">Tất cả kho</option>}
                      {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                    </select>
                    <select className="tbdb-filter-select" value={vtNhaKho} onChange={e => setVtNhaKho(e.target.value)}>
                      <option value="ALL">Tất cả nhà kho</option>
                      {vtNhaKhoOptions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select className="tbdb-filter-select" value={vtKhu} onChange={e => setVtKhu(e.target.value)}>
                      <option value="ALL">Tất cả khu</option>
                      {vtKhuOptions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select className="tbdb-filter-select" value={vtKhoi} onChange={e => setVtKhoi(e.target.value)}>
                      <option value="ALL">Tất cả khối</option>
                      {vtKhoiOptions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select className="tbdb-filter-select" value={vtGia} onChange={e => setVtGia(e.target.value)}>
                      <option value="ALL">Tất cả giá</option>
                      {vtGiaOptions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select className="tbdb-filter-select" value={vtTang} onChange={e => setVtTang(e.target.value)}>
                      <option value="ALL">Tất cả tầng</option>
                      {vtTangOptions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <button className="btn-excel" onClick={xuatExcelViTri} disabled={dangXuatExcelVt} style={{ marginLeft: 'auto' }}>
                      <FiDownload style={{ marginRight: 6 }} /> {dangXuatExcelVt ? 'Đang xuất...' : 'Xuất Excel'}
                    </button>
                  </div>
                  {viTrisFiltered.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 0' }}>Chưa có tồn kho nào khớp bộ lọc</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Mã lô</th>
                            <th>Kho</th>
                            <th>Nhà kho</th>
                            <th>Khu</th>
                            <th>Khối</th>
                            <th>Giá</th>
                            <th>Tầng</th>
                            <th>Hòm</th>
                            <th>Mô tả vị trí</th>
                            <th>Trạng thái</th>
                            <th style={{ textAlign: 'center' }}>Số lượng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viTrisFiltered.map(tk => (
                            <tr key={tk.maTonKho}>
                              <td><span className="sub-value">{tk.maLoTbdb}</span></td>
                              <td>{tk.tenKho || tk.maKho || ''}</td>
                              <td>{tk.tenNhaKho || ''}</td>
                              <td>{tk.tenDinhKhu || ''}</td>
                              <td>{tk.tenKhoi || ''}</td>
                              <td>{tk.tenGia || ''}</td>
                              <td>{tk.tenTang || ''}</td>
                              <td>{tk.tenHom || ''}</td>
                              <td>{tk.moTaViTri || ''}</td>
                              <td><span className="badge tbdb-status-badge">{tk.tenTrangThaiTb || tk.maTrangThaiTb}</span></td>
                              <td className="td-center">{tk.soLuong}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '0 24px 20px' }}>
          <button type="button" className="btn-cancel" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, full }) {
  const display = value === null || value === undefined || value === '' ? '—' : value;
  return (
    <div className={`tbdb-detail-item${full ? ' tbdb-detail-item--full' : ''}`}>
      <div className="tbdb-detail-label">{label}</div>
      <div className="tbdb-detail-value">{display}</div>
    </div>
  );
}

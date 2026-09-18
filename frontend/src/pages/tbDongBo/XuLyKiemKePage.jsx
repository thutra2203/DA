import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { kiemKeTbDongBoAPI, danhMucAPI, chiTietDongBoAPI } from '../../services/api';
import { FiArrowLeft, FiCheckCircle, FiList, FiSearch, FiDownload, FiUpload, FiX } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import Pagination from '../../components/ui/Pagination';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const PAGE_SIZE = 10;

export default function XuLyKiemKePage() {
  const { maPhieu } = useParams();
  const navigate = useNavigate();
  const { canSua } = useModulePerm('TBDB_KIEM_KE_XL');
  const confirm = useConfirm();

  const [phieu, setPhieu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dangKetThuc, setDangKetThuc] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCcl, setSelectedCcl] = useState('ALL');
  const [nhomSpktList, setNhomSpktList] = useState([]);
  const [loaiSpktList, setLoaiSpktList] = useState([]);
  const [kieuSpktList, setKieuSpktList] = useState([]);
  const [loaiTbdbList, setLoaiTbdbList] = useState([]);
  const [chiTietDongBoList, setChiTietDongBoList] = useState([]);
  const [selectedNhomSpkt, setSelectedNhomSpkt] = useState('ALL');
  const [selectedLoaiSpkt, setSelectedLoaiSpkt] = useState('ALL');
  const [selectedLoaiTbdb, setSelectedLoaiTbdb] = useState('ALL');
  const [page, setPage] = useState(1);
  const [dangTaiMau, setDangTaiMau] = useState(false);
  const [dangNhapFile, setDangNhapFile] = useState(false);
  const [dangXacNhan, setDangXacNhan] = useState(false);
  const [previewModal, setPreviewModal] = useState(null); // { danhSach, checked: Set<dong> }

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    setLoading(true);
    return kiemKeTbDongBoAPI.getOne(maPhieu)
      .then(res => setPhieu(res.data))
      .catch(() => setPhieu(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [maPhieu]);

  useEffect(() => {
    danhMucAPI.getAll('nhom-spkt').then(res => setNhomSpktList(res.data)).catch(() => setNhomSpktList([]));
    danhMucAPI.getAll('loai-spkt').then(res => setLoaiSpktList(res.data)).catch(() => setLoaiSpktList([]));
    danhMucAPI.getAll('kieu-spkt').then(res => setKieuSpktList(res.data)).catch(() => setKieuSpktList([]));
    danhMucAPI.getAll('loai-tbdb').then(res => setLoaiTbdbList(res.data)).catch(() => setLoaiTbdbList([]));
    chiTietDongBoAPI.getByNhom().then(res => setChiTietDongBoList(res.data)).catch(() => setChiTietDongBoList([]));
  }, []);

  // Đồng bộ (ChiTietDongBo) gắn với Kiểu SPKT, không gắn trực tiếp với Nhóm/Loại — nên lọc theo
  // Loại SPKT phải tra qua Loại.MaKieu, còn lọc theo Nhóm SPKT phải gộp tất cả Kiểu thuộc nhóm đó
  // (giống hệt logic đã dùng ở TbDongBoController/LayDanhSachHoSoAsync bên backend). Loại TBĐB cũng
  // phải ràng buộc theo cùng tập ChiTietDongBo này (chỉ hiện các Loại TBĐB thực sự phối thuộc cho
  // Kiểu SPKT đang chọn), không phải hiện nguyên danh mục Loại TBĐB.
  const loaiSpktLocList = useMemo(() => (
    selectedNhomSpkt === 'ALL' ? loaiSpktList : loaiSpktList.filter(l => l.maNhom === selectedNhomSpkt)
  ), [loaiSpktList, selectedNhomSpkt]);

  useEffect(() => {
    if (selectedLoaiSpkt !== 'ALL' && !loaiSpktLocList.some(l => l.maLoai === selectedLoaiSpkt)) setSelectedLoaiSpkt('ALL');
  }, [loaiSpktLocList]);

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

  const maTbdbDongBo = useMemo(() => (
    dongBoEntriesLienQuan == null ? null : new Set(dongBoEntriesLienQuan.map(c => c.maTbdb))
  ), [dongBoEntriesLienQuan]);

  const loaiTbdbLocList = useMemo(() => {
    if (dongBoEntriesLienQuan == null) return loaiTbdbList;
    const allowed = new Set(dongBoEntriesLienQuan.map(c => c.maLoaiTbdb));
    return loaiTbdbList.filter(l => allowed.has(l.maLoai));
  }, [dongBoEntriesLienQuan, loaiTbdbList]);

  useEffect(() => {
    if (selectedLoaiTbdb !== 'ALL' && !loaiTbdbLocList.some(l => l.maLoai === selectedLoaiTbdb)) setSelectedLoaiTbdb('ALL');
  }, [loaiTbdbLocList]);

  usePageTitle('Kiểm kê');

  const ketThucKiemKe = async () => {
    if (!(await confirm('Kết thúc kiểm kê? Sau khi kết thúc sẽ không thể sửa số liệu của phiếu này nữa.'))) return;
    setDangKetThuc(true);
    try {
      await kiemKeTbDongBoAPI.ketThuc(maPhieu);
      showToast('Kết thúc kiểm kê thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangKetThuc(false); }
  };

  const taiMau = async () => {
    setDangTaiMau(true);
    try {
      const res = await kiemKeTbDongBoAPI.taiMauNhap(maPhieu);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `mau-kiem-ke-${maPhieu}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { showToast('Không tải được file mẫu', 'error'); }
    finally { setDangTaiMau(false); }
  };

  const chonFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setDangNhapFile(true);
    kiemKeTbDongBoAPI.xemTruocNhapTuFile(maPhieu, file)
      .then(res => {
        const danhSach = res.data.danhSach || [];
        setPreviewModal({ danhSach, checked: new Set(danhSach.filter(r => r.hopLe).map(r => r.dong)) });
      })
      .catch(err => showToast(err.response?.data?.message || 'Lỗi đọc file', 'error'))
      .finally(() => setDangNhapFile(false));
  };

  const toggleChecked = (dong) => setPreviewModal(prev => {
    const checked = new Set(prev.checked);
    if (checked.has(dong)) checked.delete(dong); else checked.add(dong);
    return { ...prev, checked };
  });

  // Kiểm tra lại sau khi người dùng sửa tay SL thực tế trên bảng xem trước — server vẫn kiểm tra
  // lại lần nữa khi bấm "Xác nhận lưu" nên đây chỉ hỗ trợ hiển thị, không phải nguồn đúng cuối cùng.
  const revalidateDanhSach = (danhSach) => danhSach.map(r => {
    if (!r.maCtKiemKeViTri) return r; // lỗi khớp dòng chi tiết — không tự sửa được
    const loiHang = [];
    if (r.soLuongThucTe === '' || r.soLuongThucTe === null || Number.isNaN(Number(r.soLuongThucTe))) loiHang.push('SL thực tế phải là số nguyên');
    else if (Number(r.soLuongThucTe) < 0) loiHang.push('SL thực tế không được âm');
    return { ...r, hopLe: loiHang.length === 0, loi: loiHang };
  });

  const updatePreviewRow = (dong, field, value) => setPreviewModal(prev => {
    const danhSach = revalidateDanhSach(prev.danhSach.map(r => r.dong === dong ? { ...r, [field]: value } : r));
    const checked = new Set(prev.checked);
    const row = danhSach.find(r => r.dong === dong);
    if (row.hopLe) checked.add(dong); else checked.delete(dong);
    return { ...prev, danhSach, checked };
  });

  const xacNhanNhapPreview = async () => {
    const danhSachLuu = previewModal.danhSach
      .filter(r => r.hopLe && previewModal.checked.has(r.dong))
      .map(r => ({ dong: r.dong, maCtKiemKeViTri: r.maCtKiemKeViTri, soLuongThucTe: Number(r.soLuongThucTe), ghiChu: r.ghiChu }));
    if (danhSachLuu.length === 0) { showToast('Chưa chọn dòng nào để lưu', 'error'); return; }
    setDangXacNhan(true);
    try {
      const res = await kiemKeTbDongBoAPI.xacNhanNhapTuFile(maPhieu, danhSachLuu);
      showToast(`Đã lưu: ${res.data.thanhCong} thành công, ${res.data.thatBai} lỗi`, res.data.thatBai > 0 ? 'error' : 'success');
      setPreviewModal(null);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi lưu dữ liệu', 'error'); }
    finally { setDangXacNhan(false); }
  };

  const cclOptions = useMemo(() => {
    const map = new Map();
    (phieu?.chiTiet || []).forEach(r => { if (r.maCcl != null) map.set(r.maCcl, r.capChatLuong || r.maCcl); });
    return [...map.entries()];
  }, [phieu]);

  const chiTietLoc = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (phieu?.chiTiet || []).filter(r => {
      if (selectedCcl !== 'ALL' && String(r.maCcl) !== selectedCcl) return false;
      if (selectedLoaiTbdb !== 'ALL' && r.maLoaiTbdb !== selectedLoaiTbdb) return false;
      if (maTbdbDongBo != null && !maTbdbDongBo.has(r.maTbdb)) return false;
      if (q && !`${r.maTbdb} ${r.tenTbdb || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [phieu, search, selectedCcl, selectedLoaiTbdb, maTbdbDongBo]);

  useEffect(() => { setPage(1); }, [search, selectedCcl, selectedNhomSpkt, selectedLoaiSpkt, selectedLoaiTbdb]);
  const paged = chiTietLoc.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  if (loading) return <div className="empty-state" style={{ padding: '40px 0' }}>Đang tải...</div>;
  if (!phieu) return <div className="empty-state" style={{ padding: '40px 0' }}>Không tìm thấy phiếu kiểm kê</div>;

  const daKetThuc = phieu.daKetThuc;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header" style={{ position: 'relative' }}>
        <div className="page-header-left">
          <button className="btn-icon-edit" style={{ width: 38, height: 38 }} onClick={() => navigate('/tb-dong-bo/kiem-ke')} title="Quay lại danh sách">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
              <span style={{ cursor: 'pointer', color: '#1a3a5c', fontWeight: 600 }} onClick={() => navigate('/tb-dong-bo/kiem-ke')}>
                Kiểm kê TBĐB
              </span>
              <span style={{ margin: '0 6px' }}>/</span>
              <span>Chi tiết phiếu</span>
            </p>
          </div>
        </div>
        {daKetThuc && (
          <span className="tbdb-finished-badge" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <FiCheckCircle size={14} style={{ marginRight: 6 }} />Đã kết thúc
          </span>
        )}
        {!daKetThuc && canSua && (
          <button className="btn-primary" disabled={dangKetThuc} onClick={ketThucKiemKe}>
            <FiCheckCircle style={{ marginRight: 6 }} />{dangKetThuc ? 'Đang xử lý...' : 'Kết thúc kiểm kê'}
          </button>
        )}
      </div>

      <div className="data-card" style={{ padding: 20 }}>
        <div className="tbdb-tab-toolbar">
          <span style={{ fontWeight: 600, fontSize: 19 }}>
            Danh sách trang bị đồng bộ {phieu.tenKho || phieu.maKho}
          </span>
          {!daKetThuc && canSua && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-excel" disabled={dangTaiMau} onClick={taiMau}>
                <FiDownload style={{ marginRight: 6 }} />{dangTaiMau ? 'Đang tải...' : 'Tải mẫu'}
              </button>
              <label className="btn-excel" style={{ cursor: 'pointer', opacity: dangNhapFile ? 0.6 : 1 }}>
                <FiUpload style={{ marginRight: 6 }} />{dangNhapFile ? 'Đang nhập...' : 'Tải từ Excel'}
                <input type="file" accept=".xlsx" hidden disabled={dangNhapFile} onChange={chonFile} />
              </label>
            </div>
          )}
        </div>

        <div className="table-toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ width: 260 }}>
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Tìm theo mã TB, tên TB..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="tbdb-filter-select" value={selectedCcl} onChange={e => setSelectedCcl(e.target.value)}>
              <option value="ALL">Tất cả cấp CL</option>
              {cclOptions.map(([ma, ten]) => <option key={ma} value={ma}>{ten}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedNhomSpkt} onChange={e => { setSelectedNhomSpkt(e.target.value); setSelectedLoaiSpkt('ALL'); }}>
              <option value="ALL">Tất cả nhóm SPKT</option>
              {nhomSpktList.map(n => <option key={n.maNhom} value={n.maNhom}>{n.tenNhom}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedLoaiSpkt} onChange={e => setSelectedLoaiSpkt(e.target.value)}>
              <option value="ALL">Tất cả loại SPKT</option>
              {loaiSpktLocList.map(l => <option key={l.maLoai} value={l.maLoai}>{l.tenLoai}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedLoaiTbdb} onChange={e => setSelectedLoaiTbdb(e.target.value)}>
              <option value="ALL">Tất cả loại TBĐB</option>
              {loaiTbdbLocList.map(l => <option key={l.maLoai} value={l.maLoai}>{l.tenLoai}</option>)}
            </select>
          </div>
        </div>

        {phieu.chiTiet.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Phiếu này chưa có dòng chi tiết nào</div>
        ) : chiTietLoc.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Không có dòng nào khớp với bộ lọc hiện tại</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table--split">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: 50 }}>STT</th>
                  <th rowSpan={2}>Mã TB</th>
                  <th rowSpan={2}>Tên TB</th>
                  <th rowSpan={2}>Cấp CL</th>
                  <th rowSpan={2} style={{ textAlign: 'center' }}>SL kỳ trước</th>
                  <th colSpan={3} style={{ textAlign: 'center' }}>Theo sổ sách</th>
                  <th colSpan={3} style={{ textAlign: 'center' }}>Thực tế kiểm kê</th>
                  <th rowSpan={2} style={{ width: 90, textAlign: 'center' }}>Thao tác</th>
                </tr>
                <tr>
                  <th style={{ textAlign: 'center' }}>Số lượng</th>
                  <th style={{ textAlign: 'center' }}>Tăng</th>
                  <th style={{ textAlign: 'center' }}>Giảm</th>
                  <th style={{ textAlign: 'center' }}>Số lượng</th>
                  <th style={{ textAlign: 'center' }}>Thừa</th>
                  <th style={{ textAlign: 'center' }}>Thiếu</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r, i) => (
                  <tr key={r.maCtKiemKe}>
                    <td className="td-muted td-center">{startIdx + i + 1}</td>
                    <td><span className="sub-value">{r.maTbdb}</span></td>
                    <td>{r.tenTbdb || ''}</td>
                    <td>{r.capChatLuong || ''}</td>
                    <td className="td-center">{r.soLuongKyTruoc}</td>
                    <td className="td-center">{r.soLuongSoSach}</td>
                    <td className="td-center">{r.tang > 0 ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>+{r.tang}</span> : ''}</td>
                    <td className="td-center">{r.giam > 0 ? <span style={{ color: '#c62828', fontWeight: 600 }}>-{r.giam}</span> : ''}</td>
                    <td className="td-center">{r.soLuongThucTe}</td>
                    <td className="td-center">{r.thua > 0 ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>+{r.thua}</span> : ''}</td>
                    <td className="td-center">{r.thieu > 0 ? <span style={{ color: '#c62828', fontWeight: 600 }}>-{r.thieu}</span> : ''}</td>
                    <td className="td-center">
                      <div className="td-actions">
                        <button className="btn-icon-edit" onClick={() => navigate(`/tb-dong-bo/kiem-ke/${maPhieu}/chi-tiet/${r.maCtKiemKe}`)} title="Chi tiết tồn kho theo lô, vị trí">
                          <FiList size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={chiTietLoc.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </div>
        )}
      </div>

      {previewModal && (
        <div className="overlay" onClick={() => setPreviewModal(null)}>
          <div className="modal modal--form-xwide fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Xem trước dữ liệu nhập từ Excel</h3>
              <button className="modal-close-btn" onClick={() => setPreviewModal(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className="form-hint" style={{ marginBottom: 10 }}>
                Danh sách dòng dự kiến cập nhật SL thực tế kiểm kê.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}></th>
                      <th style={{ width: 50 }}>Dòng</th>
                      <th>Mã TB</th>
                      <th>Tên TB</th>
                      <th style={{ width: 90 }}>Cấp</th>
                      <th style={{ width: 110 }}>Mã lô</th>
                      <th style={{ minWidth: 160 }}>Vị trí</th>
                      <th style={{ width: 100, textAlign: 'center' }}>SL sổ sách</th>
                      <th style={{ width: 100, textAlign: 'center' }}>SL thực tế</th>
                      <th style={{ width: 160 }}>Ghi chú</th>
                      <th style={{ width: 160 }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewModal.danhSach.map(r => (
                      <tr key={r.dong} style={!r.hopLe ? { background: '#fff5f5' } : undefined}>
                        <td className="td-center">
                          <input type="checkbox" disabled={!r.hopLe} checked={r.hopLe && previewModal.checked.has(r.dong)}
                            onChange={() => toggleChecked(r.dong)} />
                        </td>
                        <td className="td-muted">{r.dong}</td>
                        <td><span className="sub-value">{r.maTbdb || ''}</span></td>
                        <td>{r.tenTbdb || ''}</td>
                        <td>{r.capHienTai || ''}</td>
                        <td>{r.maLoTbdb || ''}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{r.viTri || ''}</td>
                        <td className="td-center">{r.soLuongSoSach ?? ''}</td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'center' }} type="number" min="0" value={r.soLuongThucTe ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'soLuongThucTe', e.target.value === '' ? null : Number(e.target.value))} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.ghiChu ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'ghiChu', e.target.value)} />
                        </td>
                        <td>
                          {r.hopLe
                            ? <span className="badge tbdb-status-badge">Hợp lệ</span>
                            : (
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {(Array.isArray(r.loi) ? r.loi : [r.loi]).map((l, i) => (
                                  <li key={i} className="form-error-text" style={{ marginTop: i === 0 ? 0 : 2 }}>{l}</li>
                                ))}
                              </ul>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '0 24px 20px', justifyContent: 'space-between' }}>
              <span className="form-hint">
                Đã chọn {previewModal.checked.size}/{previewModal.danhSach.filter(r => r.hopLe).length} dòng hợp lệ
                {previewModal.danhSach.some(r => !r.hopLe) && ` — ${previewModal.danhSach.filter(r => !r.hopLe).length} dòng lỗi bị bỏ qua`}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-cancel" onClick={() => setPreviewModal(null)}>Hủy</button>
                <button type="button" className="btn-primary" disabled={dangXacNhan} onClick={xacNhanNhapPreview}>
                  {dangXacNhan ? 'Đang lưu...' : 'Xác nhận lưu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

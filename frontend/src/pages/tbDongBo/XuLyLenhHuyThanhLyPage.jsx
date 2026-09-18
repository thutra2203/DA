import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lenhTbDongBoAPI, danhMucAPI, chiTietDongBoAPI } from '../../services/api';
import { FiArrowLeft, FiPlus, FiSave, FiTrash2, FiCheckCircle, FiSearch, FiDownload, FiUpload, FiX, FiPrinter } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import HuyThanhLyPrintView from './HuyThanhLyPrintView';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const moTaViTriDong = (v) => [v.tenNhaKho, v.tenDinhKhu, v.tenKhoi, v.tenGia, v.tenTang, v.tenHom]
  .filter(Boolean).join(' / ') || v.moTaViTri || '';

// Chức năng "Cập nhật lệnh xuất hủy/thanh lý" — khác lệnh Xuất bình thường ở khâu chọn trang bị
// (chọn THẲNG 1 dòng tồn kho lô + vị trí cụ thể, giống hệt cách chọn ở "Chuyển cấp chất lượng")
// VÀ ở thời điểm áp dụng: "Thêm trang bị" chỉ GHI NHẬN dòng tồn kho đã chọn (giữ chỗ), CHƯA trừ
// Tồn kho — chỉ thực trừ khi bấm "Kết thúc lệnh" (endpoint riêng huy-thanh-ly/ket-thuc, không dùng
// chung hoàn-thành của Xuất bình thường vì Xuất bình thường trừ tồn kho ngay lúc "Xuất kho").
export default function XuLyLenhHuyThanhLyPage() {
  const { maLenh } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { canThem, canSua, canXoa } = useModulePerm('TBDB_HUY_XL');

  const [lenh, setLenh] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dangKetThuc, setDangKetThuc] = useState(false);
  const [toast, setToast] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [khaDung, setKhaDung] = useState([]);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [dangThem, setDangThem] = useState(false);
  const [nhomSpktList, setNhomSpktList] = useState([]);
  const [loaiSpktList, setLoaiSpktList] = useState([]);
  const [kieuSpktList, setKieuSpktList] = useState([]);
  const [loaiTbdbList, setLoaiTbdbList] = useState([]);
  const [chiTietDongBoList, setChiTietDongBoList] = useState([]);
  const [selectedNhomSpkt, setSelectedNhomSpkt] = useState('ALL');
  const [selectedLoaiSpkt, setSelectedLoaiSpkt] = useState('ALL');
  const [selectedLoaiTbdb, setSelectedLoaiTbdb] = useState('ALL');

  const [forms, setForms] = useState({}); // { [maCtdongBoLenh]: { donGiaTheoLenh, ghiChu } }
  const [dangLuuDong, setDangLuuDong] = useState(null);

  const [dangTaiMau, setDangTaiMau] = useState(false);
  const [dangNhapFile, setDangNhapFile] = useState(false);
  const [previewModal, setPreviewModal] = useState(null); // { danhSach, checked: Set<dong> }
  const [dangXacNhan, setDangXacNhan] = useState(false);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    setLoading(true);
    return Promise.all([lenhTbDongBoAPI.getOne(maLenh), lenhTbDongBoAPI.chiTiet.getAll(maLenh)])
      .then(([lenhRes, ctRes]) => {
        setLenh(lenhRes.data);
        setRows(ctRes.data);
        setForms(Object.fromEntries(ctRes.data.map(r => [r.maCtdongBoLenh, { soLuongTheoLenh: r.soLuongTheoLenh, ghiChu: r.ghiChu ?? '' }])));
      })
      .catch(() => setLenh(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [maLenh]);
  usePageTitle('Cập nhật lệnh xuất hủy/thanh lý');

  useEffect(() => {
    danhMucAPI.getAll('nhom-spkt').then(res => setNhomSpktList(res.data)).catch(() => setNhomSpktList([]));
    danhMucAPI.getAll('loai-spkt').then(res => setLoaiSpktList(res.data)).catch(() => setLoaiSpktList([]));
    danhMucAPI.getAll('kieu-spkt').then(res => setKieuSpktList(res.data)).catch(() => setKieuSpktList([]));
    danhMucAPI.getAll('loai-tbdb').then(res => setLoaiTbdbList(res.data)).catch(() => setLoaiTbdbList([]));
    chiTietDongBoAPI.getByNhom().then(res => setChiTietDongBoList(res.data)).catch(() => setChiTietDongBoList([]));
  }, []);

  const daKetThuc = lenh?.trangThai === 'HOAN_THANH';

  const openAdd = () => {
    setForm({ maTonKho: '', soLuong: '', search: '' });
    setErrors({});
    setSelectedNhomSpkt('ALL'); setSelectedLoaiSpkt('ALL'); setSelectedLoaiTbdb('ALL');
    setShowModal(true);
    lenhTbDongBoAPI.tonKhoLoKhaDung(maLenh).then(res => setKhaDung(res.data)).catch(() => setKhaDung([]));
  };

  const dongChon = khaDung.find(l => String(l.maTonKho) === String(form.maTonKho));

  // Đồng bộ (ChiTietDongBo) gắn với Kiểu SPKT, không gắn trực tiếp với Nhóm/Loại — nên lọc theo
  // Loại SPKT phải tra qua Loại.MaKieu, còn lọc theo Nhóm SPKT phải gộp tất cả Kiểu thuộc nhóm đó.
  // Loại TBĐB cũng ràng buộc theo cùng tập ChiTietDongBo này (chỉ hiện Loại TBĐB thực sự phối thuộc
  // cho Kiểu SPKT đang chọn) — giống hệt logic đã dùng ở trang Chi tiết phiếu kiểm kê.
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

  const khaDungLoc = khaDung.filter(l => {
    if (selectedLoaiTbdb !== 'ALL' && l.maLoaiTbdb !== selectedLoaiTbdb) return false;
    if (maTbdbDongBo != null && !maTbdbDongBo.has(l.maTbdb)) return false;
    const q = (form.search || '').trim().toLowerCase();
    if (!q) return true;
    return [l.tenTbdb, l.maLoTbdb].some(v => String(v ?? '').toLowerCase().includes(q));
  });

  const chonDong = (maTonKho) => {
    const d = khaDung.find(l => String(l.maTonKho) === String(maTonKho));
    setForm(prev => ({ ...prev, maTonKho, soLuong: d ? d.soLuong : '' }));
    clearError('maTonKho');
  };

  const clearError = (col) => setErrors(prev => {
    if (!prev[col]) return prev;
    const next = { ...prev };
    delete next[col];
    return next;
  });

  const validate = () => {
    const next = {};
    if (!form.maTonKho) next.maTonKho = 'Chưa chọn dòng tồn kho';
    if (!form.soLuong || Number(form.soLuong) <= 0) next.soLuong = 'Số lượng phải lớn hơn 0';
    if (dongChon && Number(form.soLuong) > dongChon.soLuong) next.soLuong = `Chỉ còn ${dongChon.soLuong}`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setDangThem(true);
    try {
      await lenhTbDongBoAPI.chiTiet.create(maLenh, {
        maTbdb: dongChon.maTbdb, maCcl: dongChon.maCcl, soLuongTheoLenh: Number(form.soLuong),
        donGiaTheoLenh: null, ghiChu: null, maTonKho: Number(form.maTonKho),
      });
      showToast('Thêm trang bị hủy/thanh lý thành công!');
      setShowModal(false);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangThem(false); }
  };

  const suaForm = (id, field, value) => setForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  // Cho sửa trực tiếp Số lượng dự kiến hủy + Ghi chú — an toàn vì tồn kho CHƯA bị trừ trước khi
  // Kết thúc lệnh (chỉ đang "giữ chỗ"), server tự kiểm tra lại khả dụng đúng của dòng tồn kho này.
  const luuDong = async (row) => {
    const f = forms[row.maCtdongBoLenh];
    if (!f.soLuongTheoLenh || Number(f.soLuongTheoLenh) <= 0) { showToast('Số lượng phải lớn hơn 0', 'error'); return; }
    setDangLuuDong(row.maCtdongBoLenh);
    try {
      await lenhTbDongBoAPI.chiTiet.update(maLenh, row.maCtdongBoLenh, {
        maTbdb: row.maTbdb, maCcl: row.maCcl, soLuongTheoLenh: Number(f.soLuongTheoLenh),
        donGiaTheoLenh: row.donGiaTheoLenh, ghiChu: f.ghiChu || null,
      });
      showToast('Cập nhật thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangLuuDong(null); }
  };

  const xoaDong = async (row) => {
    if (!(await confirm(`Bỏ dòng "${row.tenTbdb || row.maTbdb}" khỏi lệnh này?`))) return;
    try {
      await lenhTbDongBoAPI.chiTiet.remove(maLenh, row.maCtdongBoLenh);
      showToast('Xóa thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa (đã xuất kho, không thể xóa trực tiếp)', 'error'); }
  };

  const ketThuc = async () => {
    if (!(await confirm('Kết thúc lệnh hủy/thanh lý? Toàn bộ trang bị trong lệnh sẽ bị trừ khỏi tồn kho ngay, không thể hoàn tác.'))) return;
    setDangKetThuc(true);
    try {
      await lenhTbDongBoAPI.ketThucHuyThanhLy(maLenh);
      showToast('Kết thúc lệnh thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangKetThuc(false); }
  };

  const taiMau = async () => {
    setDangTaiMau(true);
    try {
      const res = await lenhTbDongBoAPI.taiMauNhapHuyThanhLy(maLenh);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `mau-huy-thanh-ly-${maLenh}.xlsx`;
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
    lenhTbDongBoAPI.xemTruocNhapHuyThanhLyTuFile(maLenh, file)
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

  // Kiểm tra lại toàn bộ danh sách xem trước sau khi người dùng sửa tay Số lượng — chạy lại đúng
  // logic kiểm tra khả dụng ở phía server (trừ dần theo thứ tự dòng, cùng 1 dòng tồn kho có thể bị
  // nhiều dòng trong file dùng chung) để hiển thị đúng ngay trên giao diện; server vẫn kiểm tra lại
  // lần nữa khi bấm "Xác nhận lưu" nên đây chỉ hỗ trợ hiển thị, không phải nguồn đúng cuối cùng.
  // Dòng lỗi ngay từ đầu (không khớp được lô/vị trí) thì giữ nguyên lỗi gốc, không tự sửa được.
  const revalidateDanhSach = (danhSach) => {
    const conLaiTheoTonKho = {};
    return danhSach.map(r => {
      const soLuong = Number(r.soLuong);
      if (!r.maTonKho) return r; // lỗi khớp lô/vị trí — không thể tự kiểm tra lại ở đây

      const loiHang = [];
      if (!r.soLuong || soLuong <= 0) loiHang.push('Số lượng cần hủy (phải > 0)');
      else {
        const conLaiGoc = r.khaDungGoc ?? 0;
        const daDung = conLaiTheoTonKho[r.maTonKho] ?? 0;
        const conLai = conLaiGoc - daDung;
        if (soLuong > conLai) loiHang.push(`Lô "${r.maLoTbdb}" chỉ còn ${conLai} khả dụng, không thể chọn ${soLuong}`);
        else conLaiTheoTonKho[r.maTonKho] = daDung + soLuong;
      }

      return { ...r, hopLe: loiHang.length === 0, loi: loiHang };
    });
  };

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
      .map(r => ({
        dong: r.dong, maTonKho: r.maTonKho, maLoTbdb: r.maLoTbdb, soLuong: Number(r.soLuong), ghiChu: r.ghiChu,
      }));
    if (danhSachLuu.length === 0) { showToast('Chưa chọn dòng nào để lưu', 'error'); return; }
    setDangXacNhan(true);
    try {
      const res = await lenhTbDongBoAPI.xacNhanNhapHuyThanhLyTuFile(maLenh, danhSachLuu);
      showToast(`Đã lưu: ${res.data.thanhCong} thành công, ${res.data.thatBai} lỗi`, res.data.thatBai > 0 ? 'error' : 'success');
      setPreviewModal(null);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi lưu dữ liệu', 'error'); }
    finally { setDangXacNhan(false); }
  };

  if (loading) return <div className="empty-state" style={{ padding: '40px 0' }}>Đang tải...</div>;
  if (!lenh) return <div className="empty-state" style={{ padding: '40px 0' }}>Không tìm thấy lệnh</div>;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header" style={{ position: 'relative' }}>
        <div className="page-header-left">
          <button className="btn-icon-edit" style={{ width: 38, height: 38 }} onClick={() => navigate('/tb-dong-bo/huy-thanh-ly/cap-nhat')} title="Quay lại danh sách">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
              <span style={{ cursor: 'pointer', color: '#1a3a5c', fontWeight: 600 }} onClick={() => navigate('/tb-dong-bo/huy-thanh-ly/cap-nhat')}>
                Cập nhật lệnh xuất hủy/thanh lý
              </span>
              <span style={{ margin: '0 6px' }}>/</span>
              <span>Xử lý lệnh {maLenh}</span>
            </p>
          </div>
        </div>
        {daKetThuc && (
          <span className="tbdb-finished-badge" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <FiCheckCircle size={14} style={{ marginRight: 6 }} />Đã kết thúc
          </span>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-print" onClick={() => window.print()}>
            <FiPrinter style={{ marginRight: 6 }} />In lệnh
          </button>
          {!daKetThuc && canSua && (
            <button className="btn-primary" disabled={dangKetThuc || rows.length === 0} onClick={ketThuc}>
              <FiCheckCircle style={{ marginRight: 6 }} />{dangKetThuc ? 'Đang xử lý...' : 'Kết thúc lệnh'}
            </button>
          )}
        </div>
      </div>

      <div className="data-card" style={{ padding: 20 }}>
        <div className="tbdb-tab-toolbar">
          <span style={{ fontWeight: 600, fontSize: 19 }}>
            Danh sách trang bị hủy/thanh lý {lenh.tenKhoXuat || lenh.maKhoXuat}
          </span>
          {!daKetThuc && canThem && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-excel" disabled={dangTaiMau} onClick={taiMau}>
                <FiDownload style={{ marginRight: 6 }} />{dangTaiMau ? 'Đang tải...' : 'Tải mẫu'}
              </button>
              <label className="btn-excel" style={{ cursor: 'pointer', opacity: dangNhapFile ? 0.6 : 1 }}>
                <FiUpload style={{ marginRight: 6 }} />{dangNhapFile ? 'Đang nhập...' : 'Tải từ Excel'}
                <input type="file" accept=".xlsx" hidden disabled={dangNhapFile} onChange={chonFile} />
              </label>
              <button className="btn-add" onClick={openAdd}>
                <FiPlus style={{ marginRight: 6 }} />Thêm trang bị
              </button>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Chưa có trang bị nào, nhấn "Thêm trang bị" để bắt đầu</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã TB</th>
                  <th>Tên TB</th>
                  <th>Đơn vị tính</th>
                  <th>Cấp chất lượng</th>
                  <th style={{ width: 70 }}>Năm SX</th>
                  <th>Nước SX</th>
                  <th>Vị trí</th>
                  <th style={{ textAlign: 'center' }}>{daKetThuc ? 'SL đã hủy' : 'SL dự kiến hủy'}</th>
                  <th>Ghi chú</th>
                  {!daKetThuc && (canSua || canXoa) && <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const f = forms[r.maCtdongBoLenh] || {};
                  return (
                    <tr key={r.maCtdongBoLenh}>
                      <td><span className="sub-value">{r.maTbdb}</span></td>
                      <td>{r.tenTbdb || ''}</td>
                      <td>{r.tenDvt || r.maDvt || ''}</td>
                      <td>{r.tenCcl || r.maCcl}</td>
                      <td>{r.namSxThucNhap || ''}</td>
                      <td>{r.tenNuocSxThucNhap || ''}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.viTri ? moTaViTriDong(r.viTri) : ''}</td>
                      <td className="td-center">
                        {daKetThuc ? r.soLuongTheoLenh : (
                          <input className="form-input form-input--cell" style={{ padding: '6px 8px', textAlign: 'center', width: 90 }}
                            type="number" min="1" value={f.soLuongTheoLenh ?? ''}
                            onChange={e => suaForm(r.maCtdongBoLenh, 'soLuongTheoLenh', e.target.value)} />
                        )}
                      </td>
                      <td>
                        {daKetThuc ? (r.ghiChu || '') : (
                          <input className="form-input" style={{ padding: '6px 8px' }} value={f.ghiChu ?? ''}
                            onChange={e => suaForm(r.maCtdongBoLenh, 'ghiChu', e.target.value)} />
                        )}
                      </td>
                      {!daKetThuc && (canSua || canXoa) && (
                        <td className="td-center">
                          <div className="td-actions">
                            {canSua && (
                              <button className="btn-icon-edit" disabled={dangLuuDong === r.maCtdongBoLenh} onClick={() => luuDong(r)} title="Lưu">
                                <FiSave size={13} />
                              </button>
                            )}
                            {canXoa && (
                              <button className="btn-icon-delete" onClick={() => xoaDong(r)} title="Bỏ khỏi lệnh">
                                <FiTrash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--form-xwide fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm trang bị cần hủy/thanh lý</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitAdd} className="modal-body" noValidate>
              <div className="form-field">
                <label className="form-label">Chọn dòng tồn kho cần hủy/thanh lý </label>
                {khaDung.length === 0 ? (
                  <p className="form-hint" style={{ marginTop: 6 }}>Không còn dòng tồn kho nào khả dụng tại kho này.</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 15 }}>
                      <div className="search-wrap" style={{ width: 280 }}>
                        <FiSearch className="search-icon" />
                        <input className="search-input" placeholder="Tìm theo tên trang bị, mã lô..." value={form.search}
                          onChange={e => setForm({ ...form, search: e.target.value })} />
                      </div>
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
                    <div style={{ maxHeight: 320, overflowY: 'auto', border: '1.5px solid #e0e0e0', borderRadius: 0 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: 36 }}></th>
                            <th style={{ width: 70 }}>Mã TB</th>
                            <th style={{ width: 130 }}>Tên TB</th>
                            <th style={{ width: 90 }}>Mã lô</th>
                            <th style={{ width: 70 }}>Năm SX</th>
                            <th style={{ width: 90 }}>Nước SX</th>
                            <th style={{ width: 70 }}>Cấp CL</th>
                            <th style={{ width: 70 }}>Nhà kho</th>
                            <th style={{ width: 70 }}>Khu</th>
                            <th style={{ width: 70 }}>Khối</th>
                            <th style={{ width: 70 }}>Giá</th>
                            <th style={{ width: 70 }}>Tầng</th>
                            <th style={{ width: 70 }}>Hòm</th>
                            <th style={{ width: 90, textAlign: 'center' }}>Tồn kho</th>
                            <th style={{ width: 110, textAlign: 'center' }}>SL hủy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {khaDungLoc.length === 0 ? (
                            <tr><td colSpan={15} className="form-hint" style={{ padding: 12 }}>Không tìm thấy dòng tồn kho phù hợp</td></tr>
                          ) : khaDungLoc.map(l => {
                            const dangChon = String(form.maTonKho) === String(l.maTonKho);
                            return (
                              <tr key={l.maTonKho}
                                className={dangChon ? 'tbdb-pick-item--active' : ''}
                                style={{ cursor: 'pointer' }}
                                onClick={() => chonDong(l.maTonKho)}>
                                <td className="td-center"><input type="checkbox" readOnly checked={dangChon} /></td>
                                <td><span className="sub-value">{l.maTbdb}</span></td>
                                <td>{l.tenTbdb || ''}</td>
                                <td><span className="sub-value">{l.maLoTbdb}</span></td>
                                <td>{l.namSx || ''}</td>
                                <td>{l.tenNuocSx || ''}</td>
                                <td>{l.capChatLuong}</td>
                                <td>{l.tenNhaKho || ''}</td>
                                <td>{l.tenDinhKhu || ''}</td>
                                <td>{l.tenKhoi || ''}</td>
                                <td>{l.tenGia || ''}</td>
                                <td>{l.tenTang || ''}</td>
                                <td>{l.tenHom || ''}</td>
                                <td className="td-center">{l.soLuong}</td>
                                <td className="td-center" onClick={e => e.stopPropagation()}>
                                  <input className={`form-input form-input--cell${dangChon && errors.soLuong ? ' form-input--invalid' : ''}`}
                                    style={{ width: 80, textAlign: 'center', padding: '4px 6px' }}
                                    type="number" min="1" max={l.soLuong} value={dangChon ? (form.soLuong ?? '') : ''}
                                    onChange={e => {
                                      setForm(prev => ({ ...prev, maTonKho: l.maTonKho, soLuong: e.target.value }));
                                      clearError('maTonKho'); clearError('soLuong');
                                    }} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                {errors.maTonKho && <p className="form-error-text">{errors.maTonKho}</p>}
                {errors.soLuong && <p className="form-error-text">{errors.soLuong}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={dangThem || khaDung.length === 0}>
                  <FiPlus style={{ marginRight: 6 }} />{dangThem ? 'Đang thêm...' : 'Thêm vào lệnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewModal && (
        <div className="overlay" onClick={() => setPreviewModal(null)}>
          <div className="modal modal--form-xwide fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Xem trước dữ liệu nhập từ Excel</h3>
              <button className="modal-close-btn" onClick={() => setPreviewModal(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className="form-hint" style={{ marginBottom: 10 }}>
                Danh sách lô dự kiến hủy/thanh lý.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}></th>
                      <th style={{ width: 50 }}>Dòng</th>
                      <th style={{ width: 100 }}>Mã lô</th>
                      <th style={{ width: 80 }}>Mã TB</th>
                      <th style={{ width: 180 }}>Tên TB</th>
                      <th style={{ width: 70 }}>Cấp CL</th>
                      <th style={{ width: 150 }}>Vị trí</th>
                      <th style={{ width: 90, textAlign: 'center' }}>Số lượng</th>
                      <th style={{ width: 110 }}>Ghi chú</th>
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
                        <td><span className="sub-value">{r.maLoTbdb}</span></td>
                        <td>{r.maTbdb || ''}</td>
                        <td>{r.tenTbdb || ''}</td>
                        <td>{r.tenCcl || ''}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{r.viTri ? moTaViTriDong(r.viTri) : ''}</td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'center' }} type="number" min="0" value={r.soLuong ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'soLuong', e.target.value === '' ? null : Number(e.target.value))} />
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

      <HuyThanhLyPrintView lenh={lenh} rows={rows} />
    </div>
  );
}

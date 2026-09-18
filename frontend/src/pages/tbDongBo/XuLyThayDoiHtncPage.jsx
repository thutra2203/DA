import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { thayDoiHtncAPI, danhMucAPI, chiTietDongBoAPI } from '../../services/api';
import { FiArrowLeft, FiPlus, FiSave, FiTrash2, FiCheckCircle, FiSearch, FiDownload, FiUpload, FiX, FiPrinter } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import ThayDoiHtncPrintView from './ThayDoiHtncPrintView';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const moTaViTriDong = (v) => [v.tenNhaKho, v.tenDinhKhu, v.tenKhoi, v.tenGia, v.tenTang, v.tenHom]
  .filter(Boolean).join(' / ') || v.moTaViTri || '';

export default function XuLyThayDoiHtncPage() {
  const { maLenh } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { canThem, canSua, canXoa } = useModulePerm('TBDB_HTNC_XL');

  const [lenh, setLenh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [htncList, setHtncList] = useState([]);
  const [loKhaDung, setLoKhaDung] = useState([]);
  const [dangKetThuc, setDangKetThuc] = useState(false);
  const [toast, setToast] = useState(null);

  const [showModal, setShowModal] = useState(false);
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

  const [forms, setForms] = useState({}); // { [maCtLenhThayDoiHtnc]: { soLuong, maHtncMoi, ghiChu } }
  const [dangLuuDong, setDangLuuDong] = useState(null);

  const [dangTaiMau, setDangTaiMau] = useState(false);
  const [dangNhapFile, setDangNhapFile] = useState(false);
  const [previewModal, setPreviewModal] = useState(null); // { danhSach, checked: Set<dong> }
  const [dangXacNhan, setDangXacNhan] = useState(false);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    setLoading(true);
    return thayDoiHtncAPI.getOne(maLenh)
      .then(res => {
        setLenh(res.data);
        setForms(Object.fromEntries(res.data.chiTiet.map(r => [r.maCtLenhThayDoiHtnc, { soLuong: r.soLuong, maHtncMoi: r.maHtncMoi, ghiChu: r.ghiChu ?? '' }])));
      })
      .catch(() => setLenh(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [maLenh]);
  useEffect(() => { danhMucAPI.getAll('hinh-thuc-niem-cat').then(res => setHtncList(res.data)).catch(() => setHtncList([])); }, []);
  useEffect(() => {
    danhMucAPI.getAll('nhom-spkt').then(res => setNhomSpktList(res.data)).catch(() => setNhomSpktList([]));
    danhMucAPI.getAll('loai-spkt').then(res => setLoaiSpktList(res.data)).catch(() => setLoaiSpktList([]));
    danhMucAPI.getAll('kieu-spkt').then(res => setKieuSpktList(res.data)).catch(() => setKieuSpktList([]));
    danhMucAPI.getAll('loai-tbdb').then(res => setLoaiTbdbList(res.data)).catch(() => setLoaiTbdbList([]));
    chiTietDongBoAPI.getByNhom().then(res => setChiTietDongBoList(res.data)).catch(() => setChiTietDongBoList([]));
  }, []);
  usePageTitle('Thay đổi hình thức niêm cất');

  const daKetThuc = lenh?.daKetThuc;

  const openAdd = () => {
    setForm({ maTonKho: '', soLuong: '', maHtncMoi: '', ghiChu: '', search: '' });
    setErrors({});
    setSelectedNhomSpkt('ALL'); setSelectedLoaiSpkt('ALL'); setSelectedLoaiTbdb('ALL');
    setShowModal(true);
    thayDoiHtncAPI.getLoKhaDung(maLenh).then(res => setLoKhaDung(res.data)).catch(() => setLoKhaDung([]));
  };

  const dongChon = loKhaDung.find(l => String(l.maTonKho) === String(form.maTonKho));

  // Đồng bộ (ChiTietDongBo) gắn với Kiểu SPKT, không gắn trực tiếp với Nhóm/Loại — nên lọc theo
  // Loại SPKT phải tra qua Loại.MaKieu, còn lọc theo Nhóm SPKT phải gộp tất cả Kiểu thuộc nhóm đó.
  // Loại TBĐB cũng ràng buộc theo cùng tập ChiTietDongBo này (chỉ hiện Loại TBĐB thực sự phối thuộc
  // cho Kiểu SPKT đang chọn) — giống hệt logic đã dùng ở các trang xử lý lệnh khác.
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

  const loKhaDungLoc = loKhaDung.filter(l => {
    if (selectedLoaiTbdb !== 'ALL' && l.maLoaiTbdb !== selectedLoaiTbdb) return false;
    if (maTbdbDongBo != null && !maTbdbDongBo.has(l.maTbdb)) return false;
    const q = (form.search || '').trim().toLowerCase();
    if (!q) return true;
    return [l.tenTbdb, l.maLoTbdb].some(v => String(v ?? '').toLowerCase().includes(q));
  });

  const chonDong = (maTonKho) => {
    const d = loKhaDung.find(l => String(l.maTonKho) === String(maTonKho));
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
    if (!form.maHtncMoi) next.maHtncMoi = 'Chưa chọn hình thức niêm cất mới';
    if (form.maHtncMoi && dongChon && form.maHtncMoi === dongChon.maHtnc) next.maHtncMoi = 'Hình thức mới phải khác hình thức hiện tại của lô';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setDangThem(true);
    try {
      await thayDoiHtncAPI.themChiTiet(maLenh, {
        maTonKho: Number(form.maTonKho), soLuong: Number(form.soLuong),
        maHtncMoi: form.maHtncMoi, ghiChu: form.ghiChu || null,
      });
      showToast('Thêm dòng thành công!');
      setShowModal(false);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangThem(false); }
  };

  const suaForm = (id, field, value) => setForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const luuDong = async (row) => {
    const f = forms[row.maCtLenhThayDoiHtnc];
    if (!f.soLuong || Number(f.soLuong) <= 0) { showToast('Số lượng phải lớn hơn 0', 'error'); return; }
    if (!f.maHtncMoi) { showToast('Chưa chọn hình thức niêm cất mới', 'error'); return; }
    if (f.maHtncMoi === row.maHtncCu) { showToast('Hình thức mới phải khác hình thức hiện tại của lô', 'error'); return; }
    setDangLuuDong(row.maCtLenhThayDoiHtnc);
    try {
      await thayDoiHtncAPI.suaChiTiet(maLenh, row.maCtLenhThayDoiHtnc, {
        maTonKho: row.maTonKho, soLuong: Number(f.soLuong), maHtncMoi: f.maHtncMoi, ghiChu: f.ghiChu || null,
      });
      showToast('Cập nhật dòng thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangLuuDong(null); }
  };

  const xoaDong = async (row) => {
    if (!(await confirm(`Bỏ dòng lô "${row.maLoTbdb}" khỏi lệnh thay đổi hình thức niêm cất này?`))) return;
    try {
      await thayDoiHtncAPI.xoaChiTiet(maLenh, row.maCtLenhThayDoiHtnc);
      showToast('Xóa thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const ketThucThayDoiHtnc = async () => {
    if (!(await confirm('Kết thúc thay đổi hình thức niêm cất? Hình thức niêm cất của toàn bộ lô trong lệnh sẽ được cập nhật ngay, không thể hoàn tác.'))) return;
    setDangKetThuc(true);
    try {
      await thayDoiHtncAPI.ketThuc(maLenh);
      showToast('Kết thúc thay đổi hình thức niêm cất thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangKetThuc(false); }
  };

  const taiMau = async () => {
    setDangTaiMau(true);
    try {
      const res = await thayDoiHtncAPI.taiMauNhap(maLenh);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `mau-thay-doi-htnc-${maLenh}.xlsx`;
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
    thayDoiHtncAPI.xemTruocNhapTuFile(maLenh, file)
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

  // Kiểm tra lại toàn bộ danh sách xem trước sau khi người dùng sửa tay Số lượng/HTNC mới — chạy lại
  // đúng logic kiểm tra khả dụng ở phía server (trừ dần theo thứ tự dòng, cùng 1 dòng tồn kho có thể
  // bị nhiều dòng trong file dùng chung) để hiển thị đúng ngay trên giao diện; server vẫn kiểm tra
  // lại lần nữa khi bấm "Xác nhận lưu" nên đây chỉ hỗ trợ hiển thị, không phải nguồn đúng cuối cùng.
  // Dòng lỗi ngay từ đầu (không khớp được dòng tồn kho) thì giữ nguyên lỗi gốc, không tự sửa được.
  const revalidateDanhSach = (danhSach) => {
    const conLaiTheoTonKho = {};
    return danhSach.map(r => {
      const soLuong = Number(r.soLuong);
      if (!r.maTonKho) return r; // lỗi khớp dòng tồn kho — không thể tự kiểm tra lại ở đây

      const loiHang = [];
      if (!r.soLuong || soLuong <= 0) loiHang.push('SL cần đổi (phải > 0)');
      if (!r.maHtncMoi) loiHang.push('Chưa chọn HTNC mới');
      else if (r.maHtncHienTai != null && r.maHtncMoi === r.maHtncHienTai) loiHang.push('HTNC mới phải khác HTNC hiện tại của lô');
      if (r.soLuong && soLuong > 0) {
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
        dong: r.dong, maTonKho: r.maTonKho, maLoTbdb: r.maLoTbdb, soLuong: Number(r.soLuong),
        maHtncMoi: r.maHtncMoi, ghiChu: r.ghiChu,
      }));
    if (danhSachLuu.length === 0) { showToast('Chưa chọn dòng nào để lưu', 'error'); return; }
    setDangXacNhan(true);
    try {
      const res = await thayDoiHtncAPI.xacNhanNhapTuFile(maLenh, danhSachLuu);
      showToast(`Đã lưu: ${res.data.thanhCong} thành công, ${res.data.thatBai} lỗi`, res.data.thatBai > 0 ? 'error' : 'success');
      setPreviewModal(null);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi lưu dữ liệu', 'error'); }
    finally { setDangXacNhan(false); }
  };

  if (loading) return <div className="empty-state" style={{ padding: '40px 0' }}>Đang tải...</div>;
  if (!lenh) return <div className="empty-state" style={{ padding: '40px 0' }}>Không tìm thấy lệnh thay đổi hình thức niêm cất</div>;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header" style={{ position: 'relative' }}>
        <div className="page-header-left">
          <button className="btn-icon-edit" style={{ width: 38, height: 38 }} onClick={() => navigate('/tb-dong-bo/thay-doi-htnc')} title="Quay lại danh sách">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
              <span style={{ cursor: 'pointer', color: '#1a3a5c', fontWeight: 600 }} onClick={() => navigate('/tb-dong-bo/thay-doi-htnc')}>
                Thay đổi hình thức niêm cất
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
            <button className="btn-primary" disabled={dangKetThuc || lenh.chiTiet.length === 0} onClick={ketThucThayDoiHtnc}>
              <FiCheckCircle style={{ marginRight: 6 }} />{dangKetThuc ? 'Đang xử lý...' : 'Kết thúc thay đổi'}
            </button>
          )}
        </div>
      </div>

      <div className="data-card" style={{ padding: 20 }}>
        <div className="tbdb-tab-toolbar">
          <span style={{ fontWeight: 600, fontSize: 19 }}>
            Danh sách lô cần thay đổi hình thức niêm cất {lenh.tenKho || lenh.maKho}
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
                <FiPlus style={{ marginRight: 6 }} />Thêm dòng
              </button>
            </div>
          )}
        </div>

        {lenh.chiTiet.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Chưa có dòng nào trong lệnh, nhấn "Thêm dòng" để bắt đầu</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table--split">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>STT</th>
                  <th>Mã lô</th>
                  <th>Mã TB</th>
                  <th>Tên TB</th>
                  <th>Vị trí</th>
                  <th style={{ textAlign: 'center' }}>SL cần đổi</th>
                  <th>HTNC hiện tại</th>
                  <th>HTNC mới yêu cầu</th>
                  <th>Ghi chú</th>
                  {!daKetThuc && (canSua || canXoa) && <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {lenh.chiTiet.map((r, i) => {
                  const f = forms[r.maCtLenhThayDoiHtnc] || {};
                  return (
                    <tr key={r.maCtLenhThayDoiHtnc}>
                      <td className="td-muted td-center">{i + 1}</td>
                      <td><span className="sub-value">{r.maLoTbdb}</span></td>
                      <td>{r.maTbdb}</td>
                      <td>{r.tenTbdb || ''}</td>
                      <td>{moTaViTriDong(r.viTri)}</td>
                      <td className="td-center">
                        {daKetThuc ? r.soLuong : (
                          <input className="form-input form-input--cell" style={{ padding: '6px 8px', textAlign: 'center', width: 80 }}
                            type="number" min="1" value={f.soLuong ?? ''}
                            onChange={e => suaForm(r.maCtLenhThayDoiHtnc, 'soLuong', e.target.value)} />
                        )}
                      </td>
                      <td>{r.htncCu || ''}</td>
                      <td>
                        {daKetThuc ? <strong>{r.htncMoi}</strong> : (
                          <select className="form-input form-input--cell" style={{ padding: '6px 8px' }} value={f.maHtncMoi ?? ''}
                            onChange={e => suaForm(r.maCtLenhThayDoiHtnc, 'maHtncMoi', e.target.value)}>
                            {htncList.map(h => <option key={h.maHTNC} value={h.maHTNC}>{h.tenHTNC}</option>)}
                          </select>
                        )}
                      </td>
                      <td>
                        {daKetThuc ? (r.ghiChu || '') : (
                          <input className="form-input" style={{ padding: '6px 8px' }} value={f.ghiChu ?? ''}
                            onChange={e => suaForm(r.maCtLenhThayDoiHtnc, 'ghiChu', e.target.value)} />
                        )}
                      </td>
                      {!daKetThuc && (canSua || canXoa) && (
                        <td className="td-center">
                          <div className="td-actions">
                            {canSua && (
                              <button className="btn-icon-edit" disabled={dangLuuDong === r.maCtLenhThayDoiHtnc} onClick={() => luuDong(r)} title="Lưu">
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
          <div className="modal modal--form-wide fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm dòng cần thay đổi hình thức niêm cất</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitAdd} className="modal-body" noValidate>
              <div className="form-field">
                <label className="form-label">Chọn dòng tồn kho cần thay đổi hình thức niêm cất</label>
                {loKhaDung.length === 0 ? (
                  <p className="form-hint" style={{ marginTop: 6 }}>Không còn dòng tồn kho nào khả dụng tại kho này để thêm vào lệnh.</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
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
                            <th>Mã TB</th>
                            <th>Tên TB</th>
                            <th>Mã lô</th>
                            <th style={{ width: 70 }}>Năm SX</th>
                            <th>HTNC</th>
                            <th>Vị trí</th>
                            <th style={{ width: 90, textAlign: 'center' }}>Tồn kho</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loKhaDungLoc.length === 0 ? (
                            <tr><td colSpan={8} className="form-hint" style={{ padding: 12 }}>Không tìm thấy dòng tồn kho phù hợp</td></tr>
                          ) : loKhaDungLoc.map(l => (
                            <tr key={l.maTonKho}
                              className={String(form.maTonKho) === String(l.maTonKho) ? 'tbdb-pick-item--active' : ''}
                              style={{ cursor: 'pointer' }}
                              onClick={() => chonDong(l.maTonKho)}>
                              <td className="td-center"><input type="checkbox" readOnly checked={String(form.maTonKho) === String(l.maTonKho)} /></td>
                              <td><span className="sub-value">{l.maTbdb}</span></td>
                              <td>{l.tenTbdb || ''}</td>
                              <td><span className="sub-value">{l.maLoTbdb}</span></td>
                              <td>{l.namSx || ''}</td>
                              <td>{l.hinhThucNiemCat || 'chưa niêm cất'}</td>
                              <td>{moTaViTriDong(l) || 'chưa rõ vị trí'}</td>
                              <td className="td-center">{l.soLuong}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                {errors.maTonKho && <p className="form-error-text">{errors.maTonKho}</p>}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="form-label">Số lượng cần đổi *{dongChon ? ` (tối đa ${dongChon.soLuong})` : ''}</label>
                  <input className={`form-input${errors.soLuong ? ' form-input--invalid' : ''}`} type="number" min="1" max={dongChon?.soLuong}
                    value={form.soLuong ?? ''} onChange={e => { setForm({ ...form, soLuong: e.target.value }); clearError('soLuong'); }} />
                  {errors.soLuong && <p className="form-error-text">{errors.soLuong}</p>}
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="form-label">Hình thức niêm cất mới *</label>
                  <select className={`form-input${errors.maHtncMoi ? ' form-input--invalid' : ''}`} value={form.maHtncMoi ?? ''}
                    onChange={e => { setForm({ ...form, maHtncMoi: e.target.value }); clearError('maHtncMoi'); }}>
                    <option value="">-- Chọn hình thức mới --</option>
                    {htncList.map(h => <option key={h.maHTNC} value={h.maHTNC}>{h.tenHTNC}</option>)}
                  </select>
                  {errors.maHtncMoi && <p className="form-error-text">{errors.maHtncMoi}</p>}
                </div>
              </div>
              {dongChon && Number(form.soLuong) > 0 && Number(form.soLuong) < dongChon.soLuong && (
                <p className="form-hint" style={{ marginTop: -8, marginBottom: 12 }}>Chỉ đổi một phần — hệ thống sẽ tự tách lô mới cho phần này khi kết thúc, phần còn lại giữ nguyên mã lô cũ.</p>
              )}
              <div className="form-field">
                <label className="form-label">Ghi chú</label>
                <input className="form-input" value={form.ghiChu ?? ''} onChange={e => setForm({ ...form, ghiChu: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={dangThem || loKhaDung.length === 0}>
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
                Danh sách lô dự kiến thay đổi hình thức niêm cất.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}></th>
                      <th style={{ width: 50 }}>Dòng</th>
                      <th style={{ width: 110 }}>Mã lô</th>
                      <th style={{ width: 100 }}>Mã TB</th>
                      <th style={{ width: 180 }}>Tên TB</th>
                      <th style={{ width: 100 }}>HTNC hiện tại</th>
                      <th style={{ minWidth: 100 }}>Vị trí</th>
                      <th style={{ width: 100, textAlign: 'center' }}>SL cần đổi</th>
                      <th style={{ width: 150 }}>HTNC mới</th>
                      <th style={{ width: 120 }}>Ghi chú</th>
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
                        <td>{r.htncHienTai || ''}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{r.viTri ? moTaViTriDong(r.viTri) : ''}</td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'center' }} type="number" min="0" value={r.soLuong ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'soLuong', e.target.value === '' ? null : Number(e.target.value))} />
                        </td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maHtncMoi ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'maHtncMoi', e.target.value === '' ? null : e.target.value)}>
                            <option value="">-- Chọn --</option>
                            {htncList.map(h => <option key={h.maHTNC} value={h.maHTNC}>{h.tenHTNC}</option>)}
                          </select>
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

      <ThayDoiHtncPrintView lenh={lenh} />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { thayDoiViTriAPI } from '../../services/api';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiCheckCircle, FiSearch, FiPrinter, FiDownload, FiUpload, FiX } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import ThayDoiViTriPrintView from './ThayDoiViTriPrintView';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const moTaViTriDong = (v) => (v ? [v.tenNhaKho, v.tenDinhKhu, v.tenKhoi, v.tenGia, v.tenTang, v.tenHom]
  .filter(Boolean).join(' / ') || v.moTaViTri || '' : '');

// Chức năng "Thay đổi vị trí" — quy trình 2 bước giống Chuyển cấp chất lượng: Tạo lệnh (chỉ tạo
// lệnh trống) rồi vào đây "Thêm dòng" — mỗi dòng chọn đúng 1 dòng tồn kho cụ thể (lô + vị trí CŨ,
// MaTonKho) + số lượng muốn chuyển + vị trí ĐÍCH muốn chuyển tới. "Kết thúc lệnh" mới thật sự áp
// dụng (trừ dòng nguồn, cộng dồn/tạo mới dòng tồn kho ở đích) — trong lúc lệnh còn "chờ xử lý", số
// lượng chỉ đang "giữ chỗ", TonKhoTbdb chưa đổi gì.
export default function XuLyThayDoiViTriPage() {
  const { maLenh } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [lenh, setLenh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viTriKhaDung, setViTriKhaDung] = useState([]);
  const [dangKetThuc, setDangKetThuc] = useState(false);
  const [toast, setToast] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // dòng chi tiết đang sửa, null = đang thêm mới
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [dangLuu, setDangLuu] = useState(false);

  const [dangTaiMau, setDangTaiMau] = useState(false);
  const [dangNhapFile, setDangNhapFile] = useState(false);
  const [previewModal, setPreviewModal] = useState(null); // { danhSach, checked: Set<dong> }
  const [dangXacNhan, setDangXacNhan] = useState(false);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    setLoading(true);
    return thayDoiViTriAPI.getOne(maLenh)
      .then(res => setLenh(res.data))
      .catch(() => setLenh(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [maLenh]);
  usePageTitle('Thay đổi vị trí');

  const daKetThuc = lenh?.daKetThuc;

  const emptyViTriMoi = { tenNhaKhoMoi: '', tenDinhKhuMoi: '', tenKhoiMoi: '', tenGiaMoi: '', tenTangMoi: '', tenHomMoi: '', moTaViTriMoi: '' };

  const openAdd = () => {
    setEditing(null);
    setForm({ maTonKho: '', soLuong: '', ...emptyViTriMoi, ghiChu: '', search: '' });
    setErrors({});
    setShowModal(true);
    thayDoiViTriAPI.getViTriKhaDung(maLenh).then(res => setViTriKhaDung(res.data)).catch(() => setViTriKhaDung([]));
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      maTonKho: row.maTonKho, soLuong: row.soLuong,
      tenNhaKhoMoi: row.viTriMoi?.tenNhaKho ?? '', tenDinhKhuMoi: row.viTriMoi?.tenDinhKhu ?? '', tenKhoiMoi: row.viTriMoi?.tenKhoi ?? '',
      tenGiaMoi: row.viTriMoi?.tenGia ?? '', tenTangMoi: row.viTriMoi?.tenTang ?? '', tenHomMoi: row.viTriMoi?.tenHom ?? '',
      moTaViTriMoi: row.viTriMoi?.moTaViTri ?? '', ghiChu: row.ghiChu ?? '', search: '',
    });
    setErrors({});
    setShowModal(true);
  };

  const dongChon = viTriKhaDung.find(l => String(l.maTonKho) === String(form.maTonKho));

  const viTriKhaDungLoc = viTriKhaDung.filter(l => {
    const q = (form.search || '').trim().toLowerCase();
    if (!q) return true;
    return [l.tenTbdb, l.maLoTbdb].some(v => String(v ?? '').toLowerCase().includes(q));
  });

  const chonDong = (maTonKho) => {
    const d = viTriKhaDung.find(l => String(l.maTonKho) === String(maTonKho));
    setForm(prev => ({ ...prev, maTonKho, soLuong: d ? d.soLuong : '' }));
    clearError('maTonKho');
  };

  const clearError = (col) => setErrors(prev => {
    if (!prev[col]) return prev;
    const next = { ...prev };
    delete next[col];
    return next;
  });

  const coDienViTriMoi = () => Boolean(
    (form.tenNhaKhoMoi || '').trim() || (form.tenDinhKhuMoi || '').trim() || (form.tenKhoiMoi || '').trim()
    || (form.tenGiaMoi || '').trim() || (form.tenTangMoi || '').trim() || (form.tenHomMoi || '').trim() || (form.moTaViTriMoi || '').trim()
  );

  const validate = () => {
    const next = {};
    if (!editing && !form.maTonKho) next.maTonKho = 'Chưa chọn dòng tồn kho';
    if (!form.soLuong || Number(form.soLuong) <= 0) next.soLuong = 'Số lượng phải lớn hơn 0';
    if (!editing && dongChon && Number(form.soLuong) > dongChon.soLuong) next.soLuong = `Chỉ còn ${dongChon.soLuong}`;
    if (!coDienViTriMoi()) next.viTriMoi = 'Phải nhập ít nhất 1 trường vị trí mới';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setDangLuu(true);
    const payload = {
      maTonKho: Number(editing ? editing.maTonKho : form.maTonKho), soLuong: Number(form.soLuong),
      tenNhaKhoMoi: form.tenNhaKhoMoi || null, tenDinhKhuMoi: form.tenDinhKhuMoi || null, tenKhoiMoi: form.tenKhoiMoi || null,
      tenGiaMoi: form.tenGiaMoi || null, tenTangMoi: form.tenTangMoi || null, tenHomMoi: form.tenHomMoi || null,
      moTaViTriMoi: form.moTaViTriMoi || null, ghiChu: form.ghiChu || null,
    };
    try {
      if (editing) {
        await thayDoiViTriAPI.suaChiTiet(maLenh, editing.maCtLenhThayDoiViTri, payload);
        showToast('Cập nhật dòng thành công!');
      } else {
        await thayDoiViTriAPI.themChiTiet(maLenh, payload);
        showToast('Thêm dòng thành công!');
      }
      setShowModal(false);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangLuu(false); }
  };

  const xoaDong = async (row) => {
    if (!(await confirm(`Bỏ dòng lô "${row.maLoTbdb}" khỏi lệnh thay đổi vị trí này?`))) return;
    try {
      await thayDoiViTriAPI.xoaChiTiet(maLenh, row.maCtLenhThayDoiViTri);
      showToast('Xóa thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const ketThuc = async () => {
    if (!(await confirm('Kết thúc lệnh thay đổi vị trí? Vị trí của toàn bộ dòng trong lệnh sẽ được cập nhật ngay, không thể hoàn tác.'))) return;
    setDangKetThuc(true);
    try {
      await thayDoiViTriAPI.ketThuc(maLenh);
      showToast('Kết thúc lệnh thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangKetThuc(false); }
  };

  const taiMau = async () => {
    setDangTaiMau(true);
    try {
      const res = await thayDoiViTriAPI.taiMauNhap(maLenh);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `mau-thay-doi-vi-tri-${maLenh}.xlsx`;
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
    thayDoiViTriAPI.xemTruocNhapTuFile(maLenh, file)
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

  const coDienViTriMoiRow = (r) => Boolean(
    (r.tenNhaKhoMoi || '').trim() || (r.tenDinhKhuMoi || '').trim() || (r.tenKhoiMoi || '').trim()
    || (r.tenGiaMoi || '').trim() || (r.tenTangMoi || '').trim() || (r.tenHomMoi || '').trim() || (r.moTaViTriMoi || '').trim()
  );

  // Kiểm tra lại toàn bộ danh sách xem trước sau khi người dùng sửa tay Số lượng/vị trí mới — chạy
  // lại đúng logic kiểm tra khả dụng ở phía server (trừ dần theo thứ tự dòng, cùng 1 dòng tồn kho có
  // thể bị nhiều dòng trong file dùng chung) để hiển thị đúng ngay trên giao diện; server vẫn kiểm
  // tra lại lần nữa khi bấm "Xác nhận lưu" nên đây chỉ hỗ trợ hiển thị, không phải nguồn đúng cuối
  // cùng. Dòng lỗi ngay từ đầu (không khớp được dòng tồn kho) thì giữ nguyên lỗi gốc, không tự sửa được.
  const revalidateDanhSach = (danhSach) => {
    const conLaiTheoTonKho = {};
    return danhSach.map(r => {
      const soLuong = Number(r.soLuong);
      if (!r.maTonKho) return r; // lỗi khớp dòng tồn kho — không thể tự kiểm tra lại ở đây

      const loiHang = [];
      if (!r.soLuong || soLuong <= 0) loiHang.push('SL cần chuyển (phải > 0)');
      if (!coDienViTriMoiRow(r)) loiHang.push('Phải điền ít nhất 1 trường vị trí mới');
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
        tenNhaKhoMoi: r.tenNhaKhoMoi, tenDinhKhuMoi: r.tenDinhKhuMoi, tenKhoiMoi: r.tenKhoiMoi,
        tenGiaMoi: r.tenGiaMoi, tenTangMoi: r.tenTangMoi, tenHomMoi: r.tenHomMoi, moTaViTriMoi: r.moTaViTriMoi,
        ghiChu: r.ghiChu,
      }));
    if (danhSachLuu.length === 0) { showToast('Chưa chọn dòng nào để lưu', 'error'); return; }
    setDangXacNhan(true);
    try {
      const res = await thayDoiViTriAPI.xacNhanNhapTuFile(maLenh, danhSachLuu);
      showToast(`Đã lưu: ${res.data.thanhCong} thành công, ${res.data.thatBai} lỗi`, res.data.thatBai > 0 ? 'error' : 'success');
      setPreviewModal(null);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi lưu dữ liệu', 'error'); }
    finally { setDangXacNhan(false); }
  };

  if (loading) return <div className="empty-state" style={{ padding: '40px 0' }}>Đang tải...</div>;
  if (!lenh) return <div className="empty-state" style={{ padding: '40px 0' }}>Không tìm thấy lệnh thay đổi vị trí</div>;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header" style={{ position: 'relative' }}>
        <div className="page-header-left">
          <button className="btn-icon-edit" style={{ width: 38, height: 38 }} onClick={() => navigate('/tb-dong-bo/thay-doi-vi-tri')} title="Quay lại danh sách">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
              <span style={{ cursor: 'pointer', color: '#1a3a5c', fontWeight: 600 }} onClick={() => navigate('/tb-dong-bo/thay-doi-vi-tri')}>
                Thay đổi vị trí
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
          {!daKetThuc && (
            <button className="btn-primary" disabled={dangKetThuc || lenh.chiTiet.length === 0} onClick={ketThuc}>
              <FiCheckCircle style={{ marginRight: 6 }} />{dangKetThuc ? 'Đang xử lý...' : 'Kết thúc lệnh'}
            </button>
          )}
        </div>
      </div>

      <div className="data-card" style={{ padding: 20 }}>
        <div className="tbdb-tab-toolbar">
          <span style={{ fontWeight: 600, fontSize: 19 }}>
            Danh sách TB cần thay đổi vị trí {lenh.tenKho || lenh.maKho}
          </span>
          {!daKetThuc && (
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
                  <th>Cấp</th>
                  <th>Vị trí cũ</th>
                  <th style={{ textAlign: 'center' }}>Số lượng</th>
                  <th>Vị trí mới</th>
                  <th>Ghi chú</th>
                  {!daKetThuc && <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {lenh.chiTiet.map((r, i) => (
                  <tr key={r.maCtLenhThayDoiViTri}>
                    <td className="td-muted td-center">{i + 1}</td>
                    <td><span className="sub-value">{r.maLoTbdb}</span></td>
                    <td>{r.maTbdb}</td>
                    <td>{r.tenTbdb || ''}</td>
                    <td>{r.capHienTai || ''}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{moTaViTriDong(r.viTriCu)}</td>
                    <td className="td-center">{r.soLuong}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{moTaViTriDong(r.viTriMoi)}</td>
                    <td>{r.ghiChu || ''}</td>
                    {!daKetThuc && (
                      <td className="td-center">
                        <div className="td-actions">
                          <button className="btn-icon-warn" onClick={() => openEdit(r)} title="Sửa">
                            <FiEdit2 size={13} />
                          </button>
                          <button className="btn-icon-delete" onClick={() => xoaDong(r)} title="Bỏ khỏi lệnh">
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal--form-xwide fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Sửa dòng thay đổi vị trí' : 'Thêm dòng cần thay đổi vị trí'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" noValidate>
              {!editing && (
                <div className="form-field">
                  <label className="form-label">Chọn dòng tồn kho cần thay đổi vị trí</label>
                  {viTriKhaDung.length === 0 ? (
                    <p className="form-hint" style={{ marginTop: 6 }}>Không còn dòng tồn kho nào khả dụng tại kho này để thêm vào lệnh.</p>
                  ) : (
                    <>
                      <div className="search-wrap" style={{ width: 320, marginBottom: 8 }}>
                        <FiSearch className="search-icon" />
                        <input className="search-input" placeholder="Tìm theo tên trang bị, mã lô..." value={form.search}
                          onChange={e => setForm({ ...form, search: e.target.value })} />
                      </div>
                      <div style={{ maxHeight: 280, overflowY: 'auto', border: '1.5px solid #e0e0e0', borderRadius: 0 }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th style={{ width: 36 }}></th>
                              <th>Mã TB</th>
                              <th>Tên TB</th>
                              <th>Mã lô</th>
                              <th>Cấp CL</th>
                              <th style={{ width: 90 }}>Nhà kho</th>
                              <th style={{ width: 90 }}>Khu</th>
                              <th style={{ width: 90 }}>Khối</th>
                              <th style={{ width: 90 }}>Giá</th>
                              <th style={{ width: 90 }}>Tầng</th>
                              <th style={{ width: 90 }}>Hòm</th>
                              <th style={{ width: 90, textAlign: 'center' }}>Tồn kho</th>
                              <th style={{ width: 110, textAlign: 'center' }}>SL cần chuyển</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viTriKhaDungLoc.length === 0 ? (
                              <tr><td colSpan={13} className="form-hint" style={{ padding: 12 }}>Không tìm thấy dòng tồn kho phù hợp</td></tr>
                            ) : viTriKhaDungLoc.map(l => {
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
                </div>
              )}
              {editing && (
                <div className="form-field">
                  <label className="form-label">Số lượng cần chuyển *</label>
                  <input className={`form-input${errors.soLuong ? ' form-input--invalid' : ''}`} type="number" min="1"
                    value={form.soLuong ?? ''} onChange={e => { setForm({ ...form, soLuong: e.target.value }); clearError('soLuong'); }} />
                  {errors.soLuong && <p className="form-error-text">{errors.soLuong}</p>}
                </div>
              )}
              {!editing && errors.soLuong && <p className="form-error-text">{errors.soLuong}</p>}

              <div className="form-hint" style={{ margin: '12px 0 6px' }}>Vị trí mới *</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px 16px' }}>
                <div className="form-field">
                  <label className="form-label">Nhà kho</label>
                  <input className="form-input" value={form.tenNhaKhoMoi ?? ''}
                    onChange={e => { setForm({ ...form, tenNhaKhoMoi: e.target.value }); clearError('viTriMoi'); }} />
                </div>
                <div className="form-field">
                  <label className="form-label">Khu (định khu)</label>
                  <input className="form-input" value={form.tenDinhKhuMoi ?? ''}
                    onChange={e => { setForm({ ...form, tenDinhKhuMoi: e.target.value }); clearError('viTriMoi'); }} />
                </div>
                <div className="form-field">
                  <label className="form-label">Khối</label>
                  <input className="form-input" value={form.tenKhoiMoi ?? ''}
                    onChange={e => { setForm({ ...form, tenKhoiMoi: e.target.value }); clearError('viTriMoi'); }} />
                </div>
                <div className="form-field">
                  <label className="form-label">Giá (kệ)</label>
                  <input className="form-input" value={form.tenGiaMoi ?? ''}
                    onChange={e => { setForm({ ...form, tenGiaMoi: e.target.value }); clearError('viTriMoi'); }} />
                </div>
                <div className="form-field">
                  <label className="form-label">Tầng</label>
                  <input className="form-input" value={form.tenTangMoi ?? ''}
                    onChange={e => { setForm({ ...form, tenTangMoi: e.target.value }); clearError('viTriMoi'); }} />
                </div>
                <div className="form-field">
                  <label className="form-label">Hòm</label>
                  <input className="form-input" value={form.tenHomMoi ?? ''}
                    onChange={e => { setForm({ ...form, tenHomMoi: e.target.value }); clearError('viTriMoi'); }} />
                </div>
              </div>
              {errors.viTriMoi && <p className="form-error-text">{errors.viTriMoi}</p>}

              <div className="form-grid-2col" style={{ marginTop: 12 }}>
                <div className="form-field">
                  <label className="form-label">Mô tả vị trí</label>
                  <input className="form-input" value={form.moTaViTriMoi ?? ''}
                    onChange={e => { setForm({ ...form, moTaViTriMoi: e.target.value }); clearError('viTriMoi'); }} placeholder="VD: K01 - Hòm 02" />
                </div>
                <div className="form-field">
                  <label className="form-label">Ghi chú</label>
                  <input className="form-input" value={form.ghiChu ?? ''} onChange={e => setForm({ ...form, ghiChu: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={dangLuu || (!editing && viTriKhaDung.length === 0)}>
                  {editing
                    ? <><FiEdit2 style={{ marginRight: 6 }} />{dangLuu ? 'Đang lưu...' : 'Cập nhật'}</>
                    : <><FiPlus style={{ marginRight: 6 }} />{dangLuu ? 'Đang thêm...' : 'Thêm vào lệnh'}</>}
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
                Danh sách dòng dự kiến thay đổi vị trí.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}></th>
                      <th style={{ width: 50 }}>Dòng</th>
                      <th style={{ width: 110 }}>Mã lô</th>
                      <th>Mã TB</th>
                      <th>Tên TB</th>
                      <th style={{ width: 90 }}>Cấp</th>
                      <th style={{ minWidth: 160 }}>Vị trí cũ</th>
                      <th style={{ width: 100, textAlign: 'center' }}>SL cần chuyển</th>
                      <th style={{ width: 100 }}>Nhà kho mới</th>
                      <th style={{ width: 100 }}>Khu mới</th>
                      <th style={{ width: 100 }}>Khối mới</th>
                      <th style={{ width: 100 }}>Giá mới</th>
                      <th style={{ width: 100 }}>Tầng mới</th>
                      <th style={{ width: 100 }}>Hòm mới</th>
                      <th style={{ width: 140 }}>Mô tả vị trí mới</th>
                      <th style={{ width: 140 }}>Ghi chú</th>
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
                        <td>{r.capHienTai || ''}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{r.viTriCu ? moTaViTriDong(r.viTriCu) : ''}</td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'center' }} type="number" min="0" value={r.soLuong ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'soLuong', e.target.value === '' ? null : Number(e.target.value))} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenNhaKhoMoi ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenNhaKhoMoi', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenDinhKhuMoi ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenDinhKhuMoi', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenKhoiMoi ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenKhoiMoi', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenGiaMoi ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenGiaMoi', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenTangMoi ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenTangMoi', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenHomMoi ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenHomMoi', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.moTaViTriMoi ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'moTaViTriMoi', e.target.value)} />
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

      <ThayDoiViTriPrintView lenh={lenh} />
    </div>
  );
}

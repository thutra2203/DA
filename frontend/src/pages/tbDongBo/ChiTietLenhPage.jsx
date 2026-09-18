import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { lenhTbDongBoAPI, tbDongBoAPI, danhMucAPI, chiTietDongBoAPI } from '../../services/api';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiX, FiDownload, FiUpload, FiPrinter, FiCheckCircle } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import LenhPrintView from './LenhPrintView';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const CAP_LIST = [1, 2, 3, 4, 5];
const fmtMoney = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('vi-VN'));
const isXuat = (tenLoaiLenh) => (tenLoaiLenh || '').toLowerCase().includes('xuất');
const soLuongLabelStatic = (xuat) => (xuat ? 'SL phải xuất' : 'SL phải nhập');

export default function ChiTietLenhPage() {
  const { maLenh } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();

  const [lenh, setLenh] = useState(null);
  const [loadingLenh, setLoadingLenh] = useState(true);
  const [tbdbList, setTbdbList] = useState([]);
  const [cclList, setCclList] = useState([]);
  const [nhomSpktList, setNhomSpktList] = useState([]);
  const [loaiSpktList, setLoaiSpktList] = useState([]);
  // Chi tiết đồng bộ (TBĐB thành viên) của riêng Kiểu SPKT đang chọn trong modal — tải theo tiêu chí
  // từ backend (query maKieuSpkt), KHÔNG tải hết rồi lọc ở frontend, vì đây mới là danh sách ĐÚNG
  // từng TBDB thuộc 1 nhóm đồng bộ; không dùng NhomDongBo (chỉ nói "Loại TBĐB X có dùng Kiểu SPKT Y")
  // để suy luận TBĐB vì 1 Loại TBĐB có thể có nhiều TBDB nhưng chỉ 1 phần thực sự phối thuộc kiểu đó.
  const [chiTietDongBoLoc, setChiTietDongBoLoc] = useState([]);
  const [dangTaiChiTietDongBo, setDangTaiChiTietDongBo] = useState(false);

  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [toast, setToast] = useState(null);
  const [addModal, setAddModal] = useState(null); // { maTbdb, soLuongTheoCap: {1:'',2:'',...}, donGia, ghiChu, selectedLoai, search }
  const [editModal, setEditModal] = useState(null); // { row, soLuongTheoLenh, donGiaTheoLenh, ghiChu }
  const [editError, setEditError] = useState('');
  const [tonKhoTheoCap, setTonKhoTheoCap] = useState({}); // { [maTbdb]: { tongSoLuong, soLuongCap1..5 } } — chỉ có khi đã xác định kho nguồn
  const [khoNguon, setKhoNguon] = useState(null); // maKhoXuat hiện tại của lệnh — nguồn gốc thực của hàng
  const [dangTaiMau, setDangTaiMau] = useState(false);
  const [dangNhapFile, setDangNhapFile] = useState(false);
  const [previewModal, setPreviewModal] = useState(null); // { danhSach: [{dong, maTbdb, tenTbdb, maCcl, tenCcl, soLuongTheoLenh, donGiaTheoLenh, ghiChu, hopLe, loi}], checked: Set<dong> }
  const [dangXacNhan, setDangXacNhan] = useState(false);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    if (location.state?.flash) {
      showToast(location.state.flash);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  const xuat = isXuat(lenh?.tenLoaiLenh);
  const soLuongLabel = soLuongLabelStatic(xuat);

  usePageTitle(lenh ? `Chi tiết lệnh ${lenh.tenLoaiLenh}` : 'Chi tiết lệnh');

  useEffect(() => {
    setLoadingLenh(true);
    lenhTbDongBoAPI.getOne(maLenh)
      .then(res => setLenh(res.data))
      .catch(() => setLenh(null))
      .finally(() => setLoadingLenh(false));
  }, [maLenh]);

  useEffect(() => {
    Promise.all([
      tbDongBoAPI.getByKho('ALL').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('cap-chat-luong').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('nhom-spkt').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('loai-spkt').then(res => res.data).catch(() => []),
    ]).then(([tbdb, ccl, nhomSpkt, loaiSpkt]) => {
      setTbdbList(tbdb);
      setCclList(ccl);
      setNhomSpktList(nhomSpkt);
      setLoaiSpktList(loaiSpkt);
    });
  }, []);

  // Chỉ khi đã chọn đủ Nhóm SPKT + Loại SPKT cụ thể mới gọi API lấy chi tiết đồng bộ theo đúng
  // Kiểu SPKT tương ứng (truyền tham số maKieuSpkt cho backend lọc) — không tải hết rồi lọc ở client.
  useEffect(() => {
    if (!addModal) return;
    const { selectedNhomSpkt, selectedLoaiSpkt } = addModal;
    if (selectedNhomSpkt === 'ALL' || selectedLoaiSpkt === 'ALL') { setChiTietDongBoLoc([]); return; }
    const maKieu = loaiSpktList.find(l => l.maLoai === selectedLoaiSpkt)?.maKieu;
    if (!maKieu) { setChiTietDongBoLoc([]); return; }
    setDangTaiChiTietDongBo(true);
    chiTietDongBoAPI.getByNhom(maKieu)
      .then(res => setChiTietDongBoLoc(res.data))
      .catch(() => setChiTietDongBoLoc([]))
      .finally(() => setDangTaiChiTietDongBo(false));
  }, [addModal?.selectedNhomSpkt, addModal?.selectedLoaiSpkt, loaiSpktList]);

  const load = () => {
    setLoadingRows(true);
    return lenhTbDongBoAPI.chiTiet.getAll(maLenh)
      .then(res => setRows(res.data))
      .catch(() => setRows([]))
      .finally(() => setLoadingRows(false));
  };

  useEffect(() => { load(); }, [maLenh]);

  useEffect(() => {
    lenhTbDongBoAPI.getOne(maLenh)
      .then(res => {
        const maKhoXuatMoiNhat = res.data.maKhoXuat || null;
        setKhoNguon(maKhoXuatMoiNhat);
        if (!maKhoXuatMoiNhat) { setTonKhoTheoCap({}); return; }
        return tbDongBoAPI.getTonKhoTheoCap(maKhoXuatMoiNhat)
          .then(r2 => setTonKhoTheoCap(Object.fromEntries(r2.data.map(x => [x.maTbdb, x]))));
      })
      .catch(() => { setKhoNguon(null); setTonKhoTheoCap({}); });
  }, [maLenh]);

  const openAdd = () => setAddModal({
    maTbdb: '', soLuongTheoCap: { 1: '', 2: '', 3: '', 4: '', 5: '' }, donGiaTheoCap: { 1: '', 2: '', 3: '', 4: '', 5: '' },
    ghiChu: '', selectedNhomSpkt: 'ALL', selectedLoaiSpkt: 'ALL', search: '',
  });

  const taiMauNhapChiTiet = async () => {
    setDangTaiMau(true);
    try {
      const res = await lenhTbDongBoAPI.taiMauNhapChiTiet(maLenh);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `mau-nhap-chi-tiet-${maLenh}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { showToast('Không tải được file mẫu', 'error'); }
    finally { setDangTaiMau(false); }
  };

  const chonFileNhapChiTiet = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setDangNhapFile(true);
    lenhTbDongBoAPI.xemTruocNhapChiTietTuFile(maLenh, file)
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

  // Kiểm tra lại toàn bộ danh sách xem trước sau khi người dùng sửa tay 1 dòng — chạy lại đúng
  // các bước kiểm tra phía backend (mã TB tồn tại, cấp 1-5, số lượng > 0, không vượt tồn kho xuất
  // — trừ dần theo thứ tự dòng) để hiển thị đúng ngay trên giao diện; server vẫn kiểm tra lại lần
  // nữa khi bấm "Xác nhận lưu" nên đây chỉ là hỗ trợ hiển thị, không phải nguồn đúng cuối cùng.
  const revalidateDanhSach = (danhSach) => {
    const conLaiTheoCap = {};
    return danhSach.map(r => {
      const maTbdb = (r.maTbdb || '').trim();
      const tb = tbdbList.find(t => t.maTbdb === maTbdb);
      const maCcl = Number(r.maCcl) || null;
      const ccl = cclList.find(c => Number(c.maCap) === maCcl);
      const soLuong = Number(r.soLuongTheoLenh);

      const maTbdbHopLe = !!tb;
      const maCclHopLe = !!maCcl && maCcl >= 1 && maCcl <= 5;

      const loiHang = [];
      if (!maTbdbHopLe) loiHang.push('Mã TB không tồn tại');
      if (!maCclHopLe) loiHang.push('Cấp CL (phải là số 1-5)');
      if (!r.soLuongTheoLenh || soLuong <= 0) loiHang.push('Số lượng theo lệnh (phải > 0)');

      // Kiểm tra tồn kho xuất độc lập với số lượng — chỉ cần mã TB + cấp hợp lệ là tra được kho
      // có/không có trang bị này, để không bị che mất lỗi này khi số lượng cũng đang sai.
      if (khoNguon && maTbdbHopLe && maCclHopLe) {
        const key = `${maTbdb}|${maCcl}`;
        const conCapGoc = tonKhoTheoCap[maTbdb]?.[`soLuongCap${maCcl}`] ?? 0;
        const conLai = conLaiTheoCap[key] ?? conCapGoc;
        if (conCapGoc === 0) {
          loiHang.push(`Kho xuất không có tồn kho trang bị này ở cấp ${maCcl}`);
        } else if (r.soLuongTheoLenh && soLuong > 0) {
          if (soLuong > conLai) loiHang.push(`Vượt tồn kho tại kho xuất (còn ${conLai}, cấp ${maCcl})`);
          else conLaiTheoCap[key] = conLai - soLuong;
        }
      }

      return {
        ...r, maTbdb, maCcl, tenTbdb: tb?.tenTbdb || '', tenCcl: maCclHopLe ? (ccl?.tenCap || '') : '',
        soLuongTheoLenh: soLuong, hopLe: loiHang.length === 0, loi: loiHang,
      };
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
      .map(r => ({ dong: r.dong, maTbdb: r.maTbdb, maCcl: r.maCcl, soLuongTheoLenh: r.soLuongTheoLenh, donGiaTheoLenh: r.donGiaTheoLenh, ghiChu: r.ghiChu }));
    if (danhSachLuu.length === 0) { showToast('Chưa chọn dòng nào để lưu', 'error'); return; }
    setDangXacNhan(true);
    try {
      const res = await lenhTbDongBoAPI.xacNhanNhapChiTietTuFile(maLenh, danhSachLuu);
      showToast(`Đã lưu: ${res.data.thanhCong} thành công, ${res.data.thatBai} lỗi`, res.data.thatBai > 0 ? 'error' : 'success');
      setPreviewModal(null);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi lưu dữ liệu', 'error'); }
    finally { setDangXacNhan(false); }
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!addModal.maTbdb) { showToast('Chưa chọn trang bị đồng bộ', 'error'); return; }
    const caps = CAP_LIST.filter(c => addModal.soLuongTheoCap[c] !== '' && Number(addModal.soLuongTheoCap[c]) > 0);
    if (caps.length === 0) { showToast('Nhập ít nhất 1 cấp chất lượng có số lượng > 0', 'error'); return; }
    try {
      for (const cap of caps) {
        await lenhTbDongBoAPI.chiTiet.create(maLenh, {
          maTbdb: addModal.maTbdb,
          maCcl: cap,
          soLuongTheoLenh: Number(addModal.soLuongTheoCap[cap]),
          donGiaTheoLenh: addModal.donGiaTheoCap[cap] === '' ? null : Number(addModal.donGiaTheoCap[cap]),
          ghiChu: addModal.ghiChu || null,
        });
      }
      showToast('Thêm dòng chi tiết thành công!');
      setAddModal(null);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (editModal.soLuongTheoLenh === '' || editModal.soLuongTheoLenh === null || Number(editModal.soLuongTheoLenh) < 1) {
      setEditError(`${soLuongLabelStatic(xuat)} không được để trống`);
      return;
    }
    setEditError('');
    try {
      await lenhTbDongBoAPI.chiTiet.update(maLenh, editModal.row.maCtdongBoLenh, {
        maTbdb: editModal.row.maTbdb,
        maCcl: editModal.row.maCcl,
        soLuongTheoLenh: Number(editModal.soLuongTheoLenh),
        donGiaTheoLenh: editModal.donGiaTheoLenh === '' ? null : Number(editModal.donGiaTheoLenh),
        ghiChu: editModal.ghiChu || null,
      });
      showToast('Cập nhật thành công!');
      setEditModal(null);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const deleteRow = async (row) => {
    if (row.daTaoLo) { showToast('Dòng này đã tạo lô, không thể xóa', 'error'); return; }
    if (!(await confirm(`Xóa dòng "${row.tenTbdb || row.maTbdb}" (cấp ${row.maCcl})?`))) return;
    try {
      await lenhTbDongBoAPI.chiTiet.remove(maLenh, row.maCtdongBoLenh);
      showToast('Xóa thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa', 'error'); }
  };

  const handleGhiLenh = async () => {
    if (!(await confirm(`Ghi lệnh "${maLenh}"? Sau khi ghi lệnh sẽ không thể sửa lệnh hoặc thêm/sửa/xóa dòng chi tiết nữa.`))) return;
    try {
      await lenhTbDongBoAPI.ghiLenh(maLenh);
      showToast('Ghi lệnh thành công! Lệnh đã chuyển sang trạng thái đã ban hành.');
      const res = await lenhTbDongBoAPI.getOne(maLenh);
      setLenh(res.data);
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi ghi lệnh', 'error'); }
  };

  // Có kho nguồn nội bộ xác định (kho xuất, dù là lệnh Xuất hay lệnh Nhập chuyển kho nội bộ):
  // chỉ chọn được TBDB mà kho đó đang thực sự có tồn kho (chỉ tính lô đã hoàn thành). Không có
  // kho nguồn (VD lệnh Nhập từ nhà cung cấp ngoài hệ thống): chọn từ toàn bộ danh mục TBDB.
  const nguonTbdb = khoNguon ? tbdbList.filter(t => tonKhoTheoCap[t.maTbdb]) : tbdbList;

  // Chọn Nhóm SPKT rồi Loại SPKT — từ Loại SPKT tra ra nó thuộc Kiểu SPKT nào (LoaiSpkt.maKieu), rồi
  // gọi API chi-tiet-dong-bo?maKieuSpkt=... (xem useEffect ở trên) để backend trả về đúng các TBDB
  // phối thuộc — KHÔNG lấy hết TBDB cùng Loại TBĐB, vì 1 Loại TBĐB có thể có nhiều TBDB nhưng chỉ một
  // phần trong đó thực sự thuộc về Kiểu SPKT đang chọn. chiTietDongBoLoc đã là kết quả lọc theo tiêu
  // chí từ backend nên chỉ cần lấy tập maTbdb của nó.
  const tbdbTrongLoai = (selectedNhomSpkt, selectedLoaiSpkt, q) => {
    if (selectedNhomSpkt === 'ALL' || selectedLoaiSpkt === 'ALL') return [];
    const choPhep = new Set(chiTietDongBoLoc.map(c => c.maTbdb));
    return nguonTbdb.filter(t =>
      choPhep.has(t.maTbdb) &&
      (!q || `${t.maTbdb} ${t.tenTbdb}`.toLowerCase().includes(q.toLowerCase()))
    );
  };

  if (loadingLenh) return <div className="empty-state" style={{ padding: '40px 0' }}>Đang tải...</div>;
  if (!lenh) return <div className="empty-state" style={{ padding: '40px 0' }}>Không tìm thấy lệnh</div>;

  // Chỉ còn sửa được lệnh/dòng chi tiết khi đang soạn thảo — sau khi "Ghi lệnh" (DA_BAN_HANH) hoặc
  // "Kết thúc lệnh" (HOAN_THANH, ở bước xử lý thực nhập/xuất) đều khóa lại.
  const dangSoanThao = lenh.trangThai === 'DANG_SOAN_THAO';
  const daKetThuc = !dangSoanThao;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <button className="btn-icon-edit" style={{ width: 38, height: 38 }} onClick={() => navigate('/tb-dong-bo/tao-lenh-nhap-xuat')} title="Quay lại danh sách">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
              <span style={{ cursor: 'pointer', color: '#1a3a5c', fontWeight: 600 }} onClick={() => navigate('/tb-dong-bo/tao-lenh-nhap-xuat')}>
                Tạo lệnh nhập/xuất
              </span>
              <span style={{ margin: '0 6px' }}>/</span>
              <span>Chi tiết lệnh</span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lenh.trangThai === 'HOAN_THANH'
            ? <span className="badge badge--active"><FiCheckCircle size={11} style={{ marginRight: 4 }} />Đã hoàn thành</span>
            : lenh.trangThai === 'DA_BAN_HANH'
              ? <span className="badge badge--info">Đã ban hành</span>
              : <span className="badge badge--pending">Đang soạn thảo</span>}
          <button className="btn-print" onClick={() => window.print()}>
            <FiPrinter style={{ marginRight: 6 }} />In lệnh
          </button>
        </div>
      </div>

      <div className="data-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span className="table-total">Tổng: <strong>{rows.length}</strong> dòng</span>
          {!daKetThuc && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-excel" disabled={dangTaiMau} onClick={taiMauNhapChiTiet}>
                <FiDownload style={{ marginRight: 6 }} />{dangTaiMau ? 'Đang tải...' : 'Tải mẫu'}
              </button>
              <label className="btn-excel" style={{ cursor: 'pointer', opacity: dangNhapFile ? 0.6 : 1 }}>
                <FiUpload style={{ marginRight: 6 }} />{dangNhapFile ? 'Đang nhập...' : 'Tải từ Excel'}
                <input type="file" accept=".xlsx" hidden disabled={dangNhapFile} onChange={chonFileNhapChiTiet} />
              </label>
              <button className="btn-add" onClick={openAdd}><FiPlus style={{ marginRight: 6 }} />Thêm dòng</button>
              {rows.length > 0 && (
                <button className="btn-success" onClick={handleGhiLenh} title="Ghi lệnh — kết thúc soạn thảo, chuyển sang đã ban hành">
                  Ghi lệnh
                </button>
              )}
            </div>
          )}
        </div>
        {loadingRows ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Đang tải...</div>
        ) : rows.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Chưa có dữ liệu</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã TB</th>
                  <th>Tên TB</th>
                  <th>Đơn vị tính</th>
                  <th>Cấp chất lượng</th>
                  <th style={{ textAlign: 'center' }}>{soLuongLabel}</th>
                  <th style={{ textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  {!daKetThuc && <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.maCtdongBoLenh}>
                    <td><span className="sub-value">{r.maTbdb}</span></td>
                    <td>{r.tenTbdb || ''}</td>
                    <td>{r.tenDvt || r.maDvt || ''}</td>
                    <td>{r.tenCcl || r.maCcl}</td>
                    <td className="td-center">{r.soLuongTheoLenh}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(r.donGiaTheoLenh)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney((r.donGiaTheoLenh || 0) * r.soLuongTheoLenh)}</td>
                    {!daKetThuc && (
                      <td className="td-center">
                        <div className="td-actions">
                          <button className="btn-icon-warn" onClick={() => { setEditModal({ row: r, soLuongTheoLenh: r.soLuongTheoLenh, donGiaTheoLenh: r.donGiaTheoLenh ?? '', ghiChu: r.ghiChu ?? '' }); setEditError(''); }} title="Sửa"><FiEdit2 size={12} /></button>
                          <button className="btn-icon-delete" onClick={() => deleteRow(r)} title="Xóa"><FiTrash2 size={12} /></button>
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

      {addModal && (
        <div className="overlay" onClick={() => setAddModal(null)}>
          <div className="modal modal--form-wide fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm dòng chi tiết lệnh {lenh.tenLoaiLenh}</h3>
              <button className="modal-close-btn" onClick={() => setAddModal(null)}><FiX /></button>
            </div>
            <form onSubmit={submitAdd} className="modal-body">
              <div className="form-grid-pick">
                <div className="form-field">
                  <label className="form-label">Trang bị đồng bộ </label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input className="form-input" placeholder="Tìm theo mã/tên..." value={addModal.search}
                      onChange={e => setAddModal({ ...addModal, search: e.target.value })} style={{ flex: 1 }} />
                    <select className="form-input" style={{ flex: '0 0 160px' }} value={addModal.selectedNhomSpkt}
                      onChange={e => setAddModal({ ...addModal, selectedNhomSpkt: e.target.value, selectedLoaiSpkt: 'ALL' })}>
                      <option value="ALL">Tất cả nhóm SPKT</option>
                      {nhomSpktList.map(n => <option key={n.maNhom} value={n.maNhom}>{n.tenNhom}</option>)}
                    </select>
                    <select className="form-input" style={{ flex: '0 0 160px' }} value={addModal.selectedLoaiSpkt}
                      onChange={e => setAddModal({ ...addModal, selectedLoaiSpkt: e.target.value })}>
                      <option value="ALL">Tất cả loại SPKT</option>
                      {loaiSpktList
                        .filter(l => addModal.selectedNhomSpkt === 'ALL' || l.maNhom === addModal.selectedNhomSpkt)
                        .map(l => <option key={l.maLoai} value={l.maLoai}>{l.tenLoai}</option>)}
                    </select>
                  </div>
                  {(addModal.selectedNhomSpkt === 'ALL' || addModal.selectedLoaiSpkt === 'ALL') ? (
                    <div className="tbdb-pick-list">

                    </div>
                  ) : dangTaiChiTietDongBo ? (
                    <div className="tbdb-pick-list">
                      <div className="form-hint" style={{ padding: 12 }}>Đang tải...</div>
                    </div>
                  ) : tbdbTrongLoai(addModal.selectedNhomSpkt, addModal.selectedLoaiSpkt, addModal.search).length === 0 ? (
                    <div className="tbdb-pick-list">
                      <div className="form-hint" style={{ padding: 12 }}>
                        {khoNguon ? 'Kho xuất này không có tồn kho trang bị đồng bộ nào phù hợp' : 'Không tìm thấy trang bị phù hợp'}
                      </div>
                    </div>
                  ) : khoNguon ? (
                    <div style={{ maxHeight: 260, overflowY: 'auto', border: '1.5px solid #e0e0e0', borderRadius: 8 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Tên TB</th>
                            {CAP_LIST.map(cap => <th key={cap} style={{ textAlign: 'center' }}>Cấp {cap}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {tbdbTrongLoai(addModal.selectedNhomSpkt, addModal.selectedLoaiSpkt, addModal.search).map(t => {
                            const daCo = rows.some(r => r.maTbdb === t.maTbdb);
                            const ton = tonKhoTheoCap[t.maTbdb];
                            return (
                              <tr key={t.maTbdb}
                                className={addModal.maTbdb === t.maTbdb ? 'tbdb-pick-item--active' : ''}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setAddModal({ ...addModal, maTbdb: t.maTbdb })}>
                                <td>
                                  {t.tenTbdb}
                                  {daCo && <span className="badge tbdb-status-badge" style={{ marginLeft: 6 }}>Đã có trong lệnh</span>}
                                </td>
                                {CAP_LIST.map(cap => (
                                  <td key={cap} className="td-center">{ton?.[`soLuongCap${cap}`] > 0 ? ton[`soLuongCap${cap}`] : ''}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ maxHeight: 260, overflowY: 'auto', border: '1.5px solid #e0e0e0', borderRadius: 8 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Tên TB</th>
                            <th>ĐVT</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tbdbTrongLoai(addModal.selectedNhomSpkt, addModal.selectedLoaiSpkt, addModal.search).map(t => {
                            const daCo = rows.some(r => r.maTbdb === t.maTbdb);
                            return (
                              <tr key={t.maTbdb}
                                className={addModal.maTbdb === t.maTbdb ? 'tbdb-pick-item--active' : ''}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setAddModal({ ...addModal, maTbdb: t.maTbdb })}>
                                <td>{t.tenTbdb}</td>
                                <td>{t.tenDvt || t.maDvt || ''}</td>
                                <td>{daCo && <span className="badge tbdb-status-badge">Đã có trong lệnh</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {addModal.maTbdb && (
                    <div className="form-hint" style={{ marginTop: 6 }}>
                      Đã chọn: <strong>{addModal.maTbdb} — {tbdbList.find(t => t.maTbdb === addModal.maTbdb)?.tenTbdb}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <div className="form-field">
                    <label className="form-label" style={{ visibility: 'hidden' }} aria-hidden="true">Trang bị đồng bộ *</label>
                    <label className="form-label">Số lượng &amp; đơn giá theo từng cấp chất lượng ({soLuongLabelStatic(xuat)})</label>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Cấp chất lượng</th>
                          <th style={{ textAlign: 'center' }}>Số lượng</th>
                          <th style={{ textAlign: 'right' }}>Đơn giá</th>
                          <th style={{ textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CAP_LIST.map(cap => {
                          const tenCap = cclList.find(c => String(c.maCap) === String(cap))?.tenCap || `Cấp ${cap}`;
                          const conCap = khoNguon && addModal.maTbdb ? tonKhoTheoCap[addModal.maTbdb]?.[`soLuongCap${cap}`] ?? 0 : null;
                          const vuotTon = conCap != null && Number(addModal.soLuongTheoCap[cap] || 0) > conCap;
                          const thanhTienCap = (Number(addModal.soLuongTheoCap[cap]) || 0) * (Number(addModal.donGiaTheoCap[cap]) || 0);
                          return (
                            <tr key={cap}>
                              <td>{tenCap}{conCap != null ? <span className="form-hint"> (còn {conCap})</span> : ''}</td>
                              <td className="td-center" style={{ width: 130 }}>
                                <input className="form-input" type="number" min="0" max={conCap ?? undefined}
                                  value={addModal.soLuongTheoCap[cap]}
                                  style={vuotTon ? { textAlign: 'center', borderColor: '#e57373', background: '#fff5f5' } : { textAlign: 'center' }}
                                  onChange={e => setAddModal({ ...addModal, soLuongTheoCap: { ...addModal.soLuongTheoCap, [cap]: e.target.value } })} />
                                {vuotTon && <div className="form-hint" style={{ color: '#c62828' }}>Vượt tồn kho!</div>}
                              </td>
                              <td style={{ width: 140 }}>
                                <input className="form-input" style={{ textAlign: 'right' }} type="number" min="0" value={addModal.donGiaTheoCap[cap]}
                                  onChange={e => setAddModal({ ...addModal, donGiaTheoCap: { ...addModal.donGiaTheoCap, [cap]: e.target.value } })} />
                              </td>
                              <td style={{ textAlign: 'right' }}>{thanhTienCap > 0 ? fmtMoney(thanhTienCap) : ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Ghi chú</label>
                    <input className="form-input" value={addModal.ghiChu}
                      onChange={e => setAddModal({ ...addModal, ghiChu: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setAddModal(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModal && (
        <div className="overlay" onClick={() => setEditModal(null)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Sửa dòng chi tiết - {editModal.row.tenTbdb || editModal.row.maTbdb}</h3>
              <button className="modal-close-btn" onClick={() => setEditModal(null)}><FiX /></button>
            </div>
            <form onSubmit={submitEdit} className="modal-body" noValidate>
              <div className="form-field">
                <label className="form-label">Cấp chất lượng</label>
                <input className="form-input" disabled value={editModal.row.tenCcl || editModal.row.maCcl} />
              </div>
              <div className="form-field">
                <label className="form-label">{soLuongLabelStatic(xuat)} *</label>
                <input className={`form-input${editError ? ' form-input--invalid' : ''}`} type="number" min="1" value={editModal.soLuongTheoLenh}
                  onChange={e => { setEditModal({ ...editModal, soLuongTheoLenh: e.target.value }); setEditError(''); }} />
                {editError && <p className="form-error-text">{editError}</p>}
              </div>
              <div className="form-field">
                <label className="form-label">Đơn giá</label>
                <input className="form-input" type="number" min="0" value={editModal.donGiaTheoLenh}
                  onChange={e => setEditModal({ ...editModal, donGiaTheoLenh: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label">Ghi chú</label>
                <input className="form-input" value={editModal.ghiChu}
                  onChange={e => setEditModal({ ...editModal, ghiChu: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setEditModal(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu</button>
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
                Danh sách TB dự kiến sẽ nhập.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}></th>
                      <th style={{ width: 50 }}>Dòng</th>
                      <th style={{ width: 110 }}>Mã TB</th>
                      <th>Tên TB</th>
                      <th style={{ width: 90 }}>Cấp</th>
                      <th style={{ width: 100, textAlign: 'center' }}>Số lượng</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Đơn giá</th>
                      <th>Ghi chú</th>
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
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.maTbdb}
                            onChange={e => updatePreviewRow(r.dong, 'maTbdb', e.target.value)} />
                        </td>
                        <td>{r.tenTbdb || ''}</td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maCcl ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'maCcl', Number(e.target.value))}>
                            <option value="">--</option>
                            {CAP_LIST.map(cap => <option key={cap} value={cap}>{cap}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'center' }} type="number" min="0" value={r.soLuongTheoLenh ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'soLuongTheoLenh', e.target.value === '' ? null : Number(e.target.value))} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'right' }} type="number" min="0" value={r.donGiaTheoLenh ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'donGiaTheoLenh', e.target.value === '' ? null : Number(e.target.value))} />
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

      <LenhPrintView lenh={lenh} rows={rows} />
    </div>
  );
}

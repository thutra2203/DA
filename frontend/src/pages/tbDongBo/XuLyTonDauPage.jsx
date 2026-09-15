import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tbDongBoAPI, tonDauTbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiCheckCircle, FiLock, FiX, FiDownload, FiUpload } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const viTriTrong = () => ({
  tenNhaKho: '', tenDinhKhu: '', tenKhoi: '', tenGia: '', tenTang: '', tenHom: '',
  moTaViTri: '', maTrangThaiTb: '', soLuong: '',
});

const loTrong = () => ({
  maTbdb: '', maLoTbdb: '', maCcl: '', namSx: '', maNuocSx: '', maTinhTrangBaoGoi: '', maHinhThucNiemCat: '',
  donGia: '', soLuongTonDau: '', ghiChu: '', viTri: [viTriTrong()],
});

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');
const fmtMoney = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('vi-VN'));

export default function XuLyTonDauPage() {
  const { maLenh } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { canThem, canSua, canXoa } = useModulePerm('TBDB_TON_DAU_XL');

  const [tbdbCatalog, setTbdbCatalog] = useState([]);
  const [cclList, setCclList] = useState([]);
  const [nsxList, setNsxList] = useState([]);
  const [ttbgList, setTtbgList] = useState([]);
  const [htncList, setHtncList] = useState([]);
  const [trangThaiList, setTrangThaiList] = useState([]);

  const [lenh, setLenh] = useState(null);
  const [loadingLenh, setLoadingLenh] = useState(true);

  const [loList, setLoList] = useState([]);
  const [loadingLoList, setLoadingLoList] = useState(true);
  const [form, setForm] = useState(null); // { editingMaLo, data } — editingMaLo null = đang thêm mới
  const [dangLuuLo, setDangLuuLo] = useState(false);
  const [dangHoanTat, setDangHoanTat] = useState(false);

  const [dangTaiMau, setDangTaiMau] = useState(false);
  const [dangNhapFile, setDangNhapFile] = useState(false);
  const [previewModal, setPreviewModal] = useState(null); // { danhSach, checked }

  const [toast, setToast] = useState(null);
  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    Promise.all([
      danhMucAPI.getAll('cap-chat-luong').then(r => r.data).catch(() => []),
      danhMucAPI.getAll('nsx').then(r => r.data).catch(() => []),
      danhMucAPI.getAll('tinh-trang-bao-goi').then(r => r.data).catch(() => []),
      danhMucAPI.getAll('hinh-thuc-niem-cat').then(r => r.data).catch(() => []),
      danhMucAPI.getAll('trang-thai-tb').then(r => r.data).catch(() => []),
      tbDongBoAPI.getByKho('ALL').then(r => r.data).catch(() => []),
    ]).then(([ccl, nsx, ttbg, htnc, trangThaiTb, tbdb]) => {
      setCclList(ccl); setNsxList(nsx); setTtbgList(ttbg); setHtncList(htnc);
      setTrangThaiList(trangThaiTb); setTbdbCatalog(tbdb);
    });
  }, []);

  const loadLenh = () => {
    setLoadingLenh(true);
    return tonDauTbDongBoAPI.getOne(maLenh)
      .then(res => setLenh(res.data))
      .catch(() => setLenh(null))
      .finally(() => setLoadingLenh(false));
  };

  useEffect(() => { loadLenh(); }, [maLenh]);

  usePageTitle('Tồn đầu');

  // Danh sách lô đang "NHAP" (chưa Kết thúc lệnh) — ghi thẳng CSDL ngay khi thêm/sửa/xóa (xem
  // TonDauTbDongBoController), không còn staging ở localStorage của trình duyệt như trước, nên
  // không lo mất dữ liệu khi đổi máy/xóa dữ liệu duyệt web.
  const loadLoList = () => {
    setLoadingLoList(true);
    return tonDauTbDongBoAPI.lo.getAll(maLenh)
      .then(res => setLoList(res.data))
      .catch(() => setLoList([]))
      .finally(() => setLoadingLoList(false));
  };

  useEffect(() => { loadLoList(); }, [maLenh]);

  const cclMap = useMemo(() => Object.fromEntries(cclList.map(c => [String(c.maCap), c.tenCap])), [cclList]);
  const nsxMap = useMemo(() => Object.fromEntries(nsxList.map(n => [n.maNSX, n.tenNSX])), [nsxList]);
  const tbdbMap = useMemo(() => Object.fromEntries(tbdbCatalog.map(t => [t.maTbdb, t.tenTbdb])), [tbdbCatalog]);

  const goiYMaLo = (maTbdb) => {
    const soLoCungTbdb = loList.filter(l => l.maTbdb === maTbdb).length;
    return `${maTbdb}${lenh?.maKho ?? ''}${soLoCungTbdb + 1}`;
  };

  const openAdd = () => setForm({ editingMaLo: null, data: loTrong() });
  const openEdit = (l) => setForm({
    editingMaLo: l.maLoTbdb,
    data: {
      ...l, namSx: l.namSx ?? '', maNuocSx: l.maNuocSx ?? '', maTinhTrangBaoGoi: l.maTinhTrangBaoGoi ?? '',
      maHinhThucNiemCat: l.maHinhThucNiemCat ?? '', ghiChu: l.ghiChu ?? '',
      viTri: l.viTri.map(v => ({
        tenNhaKho: v.tenNhaKho ?? '', tenDinhKhu: v.tenDinhKhu ?? '', tenKhoi: v.tenKhoi ?? '', tenGia: v.tenGia ?? '',
        tenTang: v.tenTang ?? '', tenHom: v.tenHom ?? '', moTaViTri: v.moTaViTri ?? '', maTrangThaiTb: v.maTrangThaiTb ?? '', soLuong: v.soLuong,
      })),
    },
  });
  const xoaLo = async (l) => {
    if (!(await confirm(`Xóa lô "${l.maLoTbdb}" khỏi danh sách đang nhập?`))) return;
    try {
      await tonDauTbDongBoAPI.lo.remove(maLenh, l.maLoTbdb);
      showToast('Xóa thành công!');
      loadLoList();
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa', 'error'); }
  };

  const suaForm = (field, value) => setForm(prev => {
    const data = { ...prev.data, [field]: value };
    if (field === 'maTbdb' && prev.editingMaLo === null) data.maLoTbdb = goiYMaLo(value);
    return { ...prev, data };
  });
  const suaViTri = (i, field, value) => setForm(prev => ({
    ...prev, data: { ...prev.data, viTri: prev.data.viTri.map((r, idx) => idx === i ? { ...r, [field]: value } : r) },
  }));
  const themDongViTri = () => setForm(prev => ({ ...prev, data: { ...prev.data, viTri: [...prev.data.viTri, viTriTrong()] } }));
  const xoaDongViTri = (i) => setForm(prev => ({
    ...prev, data: { ...prev.data, viTri: prev.data.viTri.length > 1 ? prev.data.viTri.filter((_, idx) => idx !== i) : prev.data.viTri },
  }));

  const tongViTriForm = useMemo(() => form ? form.data.viTri.reduce((s, r) => s + (Number(r.soLuong) || 0), 0) : 0, [form]);
  const conLaiForm = form ? (Number(form.data.soLuongTonDau) || 0) - tongViTriForm : 0;

  const luuLoVaoDanhSach = async () => {
    const d = form.data;
    if (!d.maTbdb) { showToast('Chọn trang bị đồng bộ', 'error'); return; }
    if (!d.maLoTbdb.trim()) { showToast('Nhập mã lô', 'error'); return; }
    if (!d.maCcl) { showToast('Chọn cấp chất lượng', 'error'); return; }
    if (!d.soLuongTonDau || Number(d.soLuongTonDau) <= 0) { showToast('Nhập tổng số lượng hợp lệ', 'error'); return; }
    if (d.donGia === '') { showToast('Nhập đơn giá', 'error'); return; }
    if (d.viTri.some(r => !r.soLuong || Number(r.soLuong) <= 0)) { showToast('Mỗi vị trí phải có số lượng > 0', 'error'); return; }
    if (d.viTri.some(r => !r.maTrangThaiTb)) { showToast('Chọn trạng thái trang bị cho từng vị trí', 'error'); return; }
    if (tongViTriForm !== Number(d.soLuongTonDau)) {
      showToast(`Tổng số lượng theo vị trí (${tongViTriForm}) phải bằng tổng số lượng lô (${d.soLuongTonDau})`, 'error');
      return;
    }
    const trungMa = loList.some(l => l.maLoTbdb === d.maLoTbdb.trim() && l.maLoTbdb !== form.editingMaLo);
    if (trungMa) { showToast(`Mã lô "${d.maLoTbdb}" đã có trong danh sách`, 'error'); return; }

    const payload = {
      maTbdb: d.maTbdb, maLoTbdb: d.maLoTbdb.trim(), maCcl: Number(d.maCcl),
      namSx: d.namSx === '' ? null : Number(d.namSx), maNuocSx: d.maNuocSx || null,
      maTinhTrangBaoGoi: d.maTinhTrangBaoGoi || null, maHinhThucNiemCat: d.maHinhThucNiemCat || null,
      donGia: Number(d.donGia), soLuongTonDau: Number(d.soLuongTonDau),
      ghiChu: d.ghiChu || null,
      viTri: d.viTri.map(v => ({
        tenNhaKho: v.tenNhaKho || null, tenDinhKhu: v.tenDinhKhu || null, tenKhoi: v.tenKhoi || null,
        tenGia: v.tenGia || null, tenTang: v.tenTang || null, tenHom: v.tenHom || null, moTaViTri: v.moTaViTri || null,
        maTrangThaiTb: v.maTrangThaiTb, soLuong: Number(v.soLuong),
      })),
    };

    setDangLuuLo(true);
    try {
      if (form.editingMaLo === null) await tonDauTbDongBoAPI.lo.create(maLenh, payload);
      else await tonDauTbDongBoAPI.lo.update(maLenh, form.editingMaLo, payload);
      showToast(form.editingMaLo === null ? 'Thêm lô thành công!' : 'Cập nhật lô thành công!');
      setForm(null);
      loadLoList();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangLuuLo(false); }
  };

  const taiMauNhap = async () => {
    setDangTaiMau(true);
    try {
      const res = await tonDauTbDongBoAPI.taiMauNhap();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'mau-nhap-ton-dau.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { showToast('Không tải được file mẫu', 'error'); }
    finally { setDangTaiMau(false); }
  };

  const chonFileNhap = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setDangNhapFile(true);
    tonDauTbDongBoAPI.xemTruocTuFile(maLenh, file)
      .then(res => {
        const danhSach = res.data.danhSach || [];
        // goc: bản gốc do server trả về (kèm các lỗi chỉ server tra được như "mã lô đã tồn tại
        // trong CSDL") — giữ nguyên không đổi để revalidateDanhSach còn chỗ tham chiếu lại sau
        // mỗi lần người dùng sửa tay 1 ô, tránh làm mất các lỗi đó (xem revalidateDanhSach).
        setPreviewModal({ danhSach, goc: danhSach, checked: new Set(danhSach.filter(r => r.hopLe).map(r => r.dong)) });
      })
      .catch(err => showToast(err.response?.data?.message || 'Lỗi đọc file', 'error'))
      .finally(() => setDangNhapFile(false));
  };

  // Mỗi lô có thể có nhiều dòng vị trí — bấm chọn 1 dòng sẽ chọn/bỏ chọn cả nhóm cùng Mã lô để
  // tránh nhập thiếu vị trí (tổng SL tại vị trí phải khớp đúng Tổng số lượng lô).
  const toggleChecked = (maLoTbdb) => setPreviewModal(prev => {
    const dongCuaLo = prev.danhSach.filter(r => r.maLoTbdb === maLoTbdb && r.hopLe).map(r => r.dong);
    const daChonHet = dongCuaLo.every(d => prev.checked.has(d));
    const checked = new Set(prev.checked);
    dongCuaLo.forEach(d => { if (daChonHet) checked.delete(d); else checked.add(d); });
    return { ...prev, checked };
  });

  // Kiểm tra lại toàn bộ danh sách xem trước sau khi người dùng sửa tay 1 ô — chạy lại cùng logic
  // kiểm tra trường/nhóm như phía backend (KiemTraTruongTonDau/KiemTraNhomTonDau), nhưng dùng
  // thẳng danh mục đã tải sẵn ở client thay vì gọi lại API. Không tra được các lỗi cần CSDL (mã
  // lô đã tồn tại, TBĐB/cấp đã có lô khác trong lệnh...) nên phải lấy lại từ `goc` (kết quả server
  // đã tra lúc tải file lên) cho những dòng CHƯA đổi Mã TBĐB/Mã lô/Cấp CL — nếu không, sửa 1 ô bất
  // kỳ sẽ vô tình xóa mất lỗi CSDL của các dòng khác chưa hề được sửa.
  const revalidateDanhSach = (danhSach, goc) => {
    const nhomMap = {};
    danhSach.forEach(r => {
      const maLo = (r.maLoTbdb || '').trim();
      if (maLo) (nhomMap[maLo] ||= []).push(r);
    });
    const loiNhomMap = {};
    Object.entries(nhomMap).forEach(([maLo, list]) => {
      const maTbdbList = [...new Set(list.map(r => (r.maTbdb || '').trim()).filter(Boolean))];
      if (maTbdbList.length > 1) { loiNhomMap[maLo] = `Các dòng cùng Mã lô phải cùng 1 Mã TBĐB, đang có: ${maTbdbList.join(', ')}`; return; }
      const cclVals = [...new Set(list.map(r => r.maCcl).filter(v => v !== null && v !== '' && v !== undefined))];
      if (cclVals.length > 1) { loiNhomMap[maLo] = `Các dòng cùng Mã lô phải cùng 1 Cấp chất lượng, đang có: ${cclVals.join(', ')}`; return; }
      const slVals = [...new Set(list.map(r => r.soLuongTonDau).filter(v => v !== null && v !== '' && v !== undefined))];
      if (slVals.length > 1) { loiNhomMap[maLo] = `Các dòng cùng Mã lô phải cùng 1 Tổng số lượng lô, đang có: ${slVals.join(', ')}`; return; }
      if (slVals.length === 1) {
        const tong = list.reduce((s, r) => s + (Number(r.soLuong) || 0), 0);
        if (tong !== Number(slVals[0])) loiNhomMap[maLo] = `Tổng Số lượng tại vị trí (${tong}) phải bằng Tổng số lượng lô "${maLo}" (${slVals[0]})`;
      }
    });

    return danhSach.map(r => {
      const maTbdb = (r.maTbdb || '').trim();
      const maLo = (r.maLoTbdb || '').trim();
      const loi = [];
      if (!maTbdb) loi.push('Mã TBĐB');
      else if (!tbdbMap[maTbdb]) loi.push(`Không tìm thấy trang bị "${maTbdb}"`);
      if (!maLo) loi.push('Mã lô');
      if (r.maCcl === null || r.maCcl === '' || r.maCcl === undefined) loi.push('Cấp chất lượng');
      if (r.donGia === '' || r.donGia === null || r.donGia === undefined || isNaN(Number(r.donGia))) loi.push('Đơn giá phải là số');
      if (r.soLuongTonDau === '' || r.soLuongTonDau === null || r.soLuongTonDau === undefined) loi.push('Tổng số lượng lô phải là số');
      else if (Number(r.soLuongTonDau) <= 0) loi.push('Tổng số lượng lô phải > 0');
      if (!r.maTrangThaiTb) loi.push('Trạng thái TB');
      if (r.soLuong === '' || r.soLuong === null || r.soLuong === undefined) loi.push('Số lượng tại vị trí phải là số');
      else if (Number(r.soLuong) <= 0) loi.push('Số lượng tại vị trí phải > 0');
      if (maLo && loiNhomMap[maLo]) loi.push(loiNhomMap[maLo]);

      // Lỗi "mã lô đã tồn tại trong hệ thống" chỉ server tra được (client không gọi lại API) —
      // giữ nguyên lỗi đó từ lần xem-trước gốc miễn dòng chưa đổi Mã lô so với lúc server đã tra.
      const g = goc?.find(x => x.dong === r.dong);
      if (g && maLo === (g.maLoTbdb || '').trim()) {
        (g.loi || []).forEach(l => {
          if (!loi.includes(l)) loi.push(l);
        });
      }

      return { ...r, tenTbdb: tbdbMap[maTbdb] || '', hopLe: loi.length === 0, loi };
    });
  };

  const updatePreviewRow = (dong, field, value) => setPreviewModal(prev => {
    const danhSach = revalidateDanhSach(prev.danhSach.map(r => r.dong === dong ? { ...r, [field]: value } : r), prev.goc);
    // Bỏ chọn mọi dòng vừa trở thành không hợp lệ (kể cả dòng khác do lỗi mức nhóm lan sang).
    const checked = new Set([...prev.checked].filter(d => danhSach.find(r => r.dong === d)?.hopLe));
    // Một lô gồm nhiều dòng vị trí cùng Mã lô — sửa xong phải tự chọn lại CẢ NHÓM (mã lô mới của
    // dòng vừa sửa) nếu cả nhóm đó giờ đã hợp lệ, không chỉ riêng dòng vừa sửa.
    const row = danhSach.find(r => r.dong === dong);
    const maLoMoi = (row.maLoTbdb || '').trim();
    if (maLoMoi) {
      const dongCungLo = danhSach.filter(r => (r.maLoTbdb || '').trim() === maLoMoi);
      if (dongCungLo.every(r => r.hopLe)) dongCungLo.forEach(r => checked.add(r.dong));
    }
    return { ...prev, danhSach, checked };
  });

  // Gộp các dòng đã chọn theo Mã lô thành lô + danh sách vị trí, gửi lên backend lưu ngay (giống
  // hệt "Thêm lô" từng cái, chỉ khác nguồn dữ liệu) — backend tự bỏ qua lô nào trùng Mã lô hoặc
  // trùng (TBĐB, Cấp CL) với lô đã có, trả về chi tiết lô nào thành công/lỗi.
  const xacNhanNhapFilePreview = async () => {
    const rowsChecked = previewModal.danhSach.filter(r => r.hopLe && previewModal.checked.has(r.dong));
    if (rowsChecked.length === 0) { showToast('Chưa chọn lô nào để nhập', 'error'); return; }

    const nhomMap = {};
    rowsChecked.forEach(r => { (nhomMap[r.maLoTbdb] ||= []).push(r); });

    const danhSachLo = Object.entries(nhomMap).map(([maLoTbdb, list]) => {
      const first = list[0];
      return {
        maTbdb: first.maTbdb, maLoTbdb, maCcl: Number(first.maCcl),
        namSx: first.namSx ?? null, maNuocSx: first.maNuocSx || null, maTinhTrangBaoGoi: first.maTinhTrangBaoGoi || null,
        maHinhThucNiemCat: first.maHinhThucNiemCat || null,
        donGia: first.donGia, soLuongTonDau: first.soLuongTonDau, ghiChu: first.ghiChu || null,
        viTri: list.map(r => ({
          tenNhaKho: r.tenNhaKho || null, tenDinhKhu: r.tenDinhKhu || null, tenKhoi: r.tenKhoi || null,
          tenGia: r.tenGia || null, tenTang: r.tenTang || null, tenHom: r.tenHom || null,
          moTaViTri: r.moTaViTri || null, maTrangThaiTb: r.maTrangThaiTb, soLuong: r.soLuong,
        })),
      };
    });

    try {
      const res = await tonDauTbDongBoAPI.xacNhanNhapTuFile(maLenh, danhSachLo);
      showToast(`Nhập file xong: ${res.data.thanhCong} lô thành công, ${res.data.thatBai} lỗi`, res.data.thatBai > 0 ? 'error' : 'success');
      setPreviewModal(null);
      loadLoList();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi lưu dữ liệu', 'error'); }
  };

  const hoanTatKhoiTao = async () => {
    if (loList.length === 0) { showToast('Chưa có lô tồn đầu nào', 'error'); return; }
    if (!(await confirm(`Hoàn tất khởi tạo tồn đầu cho lệnh ${maLenh}? Sau khi hoàn tất sẽ không thể nhập/sửa tồn đầu nữa.`))) return;
    setDangHoanTat(true);
    try {
      const res = await tonDauTbDongBoAPI.hoanTat(maLenh);
      showToast(res.data.message || 'Hoàn tất khởi tạo thành công!');
      loadLenh();
      loadLoList();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangHoanTat(false); }
  };

  if (loadingLenh) return <div className="empty-state" style={{ padding: '40px 0' }}>Đang tải...</div>;
  if (!lenh) return <div className="empty-state" style={{ padding: '40px 0' }}>Không tìm thấy lệnh tồn đầu</div>;

  const daKhoa = lenh.daKhoa;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header" style={{ position: 'relative' }}>
        <div className="page-header-left">
          <button className="btn-icon-edit" style={{ width: 38, height: 38 }} onClick={() => navigate('/tb-dong-bo/ton-dau')} title="Quay lại danh sách">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
              <span style={{ cursor: 'pointer', color: '#1a3a5c', fontWeight: 600 }} onClick={() => navigate('/tb-dong-bo/ton-dau')}>
                Tồn đầu
              </span>
              <span style={{ margin: '0 6px' }}>/</span>
              <span>Cập nhật lệnh tồn đầu</span>
            </p>
          </div>
        </div>
        {daKhoa && (
          <span className="tbdb-finished-badge" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <FiCheckCircle size={14} style={{ marginRight: 6 }} />Đã hoàn thành
          </span>
        )}
        {!daKhoa && canSua && (
          <button type="button" className="btn-success" disabled={loList.length === 0 || dangHoanTat} onClick={hoanTatKhoiTao}>
            <FiCheckCircle style={{ marginRight: 6 }} />{dangHoanTat ? 'Đang xử lý...' : 'Kết thúc lệnh'}
          </button>
        )}
      </div>

      <div className="data-card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="tbdb-tab-toolbar">
          <span style={{ fontWeight: 600, fontSize: 19 }}>
            Danh sách lô tồn đầu
          </span>
          {!daKhoa && canThem && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-cancel" disabled={dangTaiMau} onClick={taiMauNhap}>
                <FiDownload style={{ marginRight: 6 }} />{dangTaiMau ? 'Đang tải...' : 'Tải mẫu'}
              </button>
              <label className="btn-cancel" style={{ cursor: 'pointer', opacity: dangNhapFile ? 0.6 : 1 }}>
                <FiUpload style={{ marginRight: 6 }} />{dangNhapFile ? 'Đang đọc...' : 'Nhập từ file'}
                <input type="file" accept=".xlsx" hidden disabled={dangNhapFile} onChange={chonFileNhap} />
              </label>
              <button type="button" className="btn-add" onClick={openAdd}>
                <FiPlus style={{ marginRight: 6 }} />Thêm lô tồn đầu
              </button>
            </div>
          )}
        </div>

        {loadingLoList ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Đang tải...</div>
        ) : loList.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Chưa thêm lô tồn đầu nào - nhấn "Thêm lô tồn đầu" để bắt đầu</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table--split">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>STT</th>
                  <th>TBĐB</th>
                  <th>Mã lô</th>
                  <th>CCL</th>
                  <th>Năm SX</th>
                  <th>Nước SX</th>
                  <th style={{ textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ textAlign: 'center' }}>Tổng SL</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  {!daKhoa && (canSua || canXoa) && <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {loList.map((l, i) => (
                  <tr key={l.maLoTbdb}>
                    <td className="td-muted td-center">{i + 1}</td>
                    <td>{tbdbMap[l.maTbdb] || l.maTbdb}</td>
                    <td><span className="sub-value">{l.maLoTbdb}</span></td>
                    <td>{cclMap[String(l.maCcl)] || l.maCcl}</td>
                    <td>{l.namSx || ''}</td>
                    <td>{nsxMap[l.maNuocSx] || ''}</td>
                    <td style={{ textAlign: 'right' }}>{Number(l.donGia).toLocaleString('vi-VN')}</td>
                    <td className="td-center">{l.soLuongTonDau}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(Number(l.donGia) * Number(l.soLuongTonDau))}</td>
                    {!daKhoa && (canSua || canXoa) && (
                      <td className="td-center">
                        <div className="td-actions">
                          {canSua && <button className="btn-icon-warn" onClick={() => openEdit(l)} title="Sửa"><FiEdit2 size={12} /></button>}
                          {canXoa && <button className="btn-icon-delete" onClick={() => xoaLo(l)} title="Xóa"><FiTrash2 size={12} /></button>}
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

      {form && (
        <div className="overlay" onClick={e => e.stopPropagation()}>
          <div className="modal modal--wide fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{form.editingMaLo === null ? 'Thêm' : 'Sửa'} lô tồn đầu</h3>
              <button className="modal-close-btn" onClick={() => setForm(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid-3col">
                <div className="form-field">
                  <label className="form-label">Trang bị đồng bộ *</label>
                  <select className="form-input" value={form.data.maTbdb} onChange={e => suaForm('maTbdb', e.target.value)}>
                    <option value="">-- Chọn TBĐB --</option>
                    {tbdbCatalog.map(t => <option key={t.maTbdb} value={t.maTbdb}>{t.maTbdb} - {t.tenTbdb}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Mã lô *</label>
                  <input className="form-input" value={form.data.maLoTbdb} disabled={form.editingMaLo !== null}
                    onChange={e => suaForm('maLoTbdb', e.target.value)} placeholder="Tự sinh, có thể sửa" />
                  {form.editingMaLo !== null && <p className="form-hint" style={{ marginTop: 4 }}>Không thể đổi mã lô sau khi đã lưu.</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Cấp chất lượng *</label>
                  <select className="form-input" value={form.data.maCcl} onChange={e => suaForm('maCcl', e.target.value)}>
                    <option value="">-- Chọn --</option>
                    {cclList.map(c => <option key={c.maCap} value={c.maCap}>{c.tenCap}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Năm sản xuất</label>
                  <input className="form-input" type="number" value={form.data.namSx} onChange={e => suaForm('namSx', e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Nước sản xuất</label>
                  <select className="form-input" value={form.data.maNuocSx} onChange={e => suaForm('maNuocSx', e.target.value)}>
                    <option value="">-- Chọn --</option>
                    {nsxList.map(n => <option key={n.maNSX} value={n.maNSX}>{n.tenNSX}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Tình trạng bao gói</label>
                  <select className="form-input" value={form.data.maTinhTrangBaoGoi} onChange={e => suaForm('maTinhTrangBaoGoi', e.target.value)}>
                    <option value="">-- Chọn --</option>
                    {ttbgList.map(t => <option key={t.maTTBG} value={t.maTTBG}>{t.tenTTBG}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Hình thức niêm cất</label>
                  <select className="form-input" value={form.data.maHinhThucNiemCat} onChange={e => suaForm('maHinhThucNiemCat', e.target.value)}>
                    <option value="">-- Chọn --</option>
                    {htncList.map(h => <option key={h.maHTNC} value={h.maHTNC}>{h.tenHTNC}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Đơn giá *</label>
                  <input className="form-input" type="number" min="0" value={form.data.donGia} onChange={e => suaForm('donGia', e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Tổng số lượng *</label>
                  <input className="form-input" type="number" min="1" value={form.data.soLuongTonDau} onChange={e => suaForm('soLuongTonDau', e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Thành tiền</label>
                  <input className="form-input" disabled value={fmtMoney((Number(form.data.donGia) || 0) * (Number(form.data.soLuongTonDau) || 0))} />
                </div>
              </div>

              <div className="tbdb-tab-toolbar" style={{ marginTop: 18 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Vị trí cất giữ.</span>
                <button type="button" className="btn-add" style={{ padding: '6px 12px', fontSize: 12 }} onClick={themDongViTri}>
                  <FiPlus style={{ marginRight: 4 }} />Thêm vị trí
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table data-table--split">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>STT</th>
                      <th style={{ width: 90 }}>Nhà kho</th>
                      <th style={{ width: 70 }}>Khu</th>
                      <th style={{ width: 70 }}>Khối</th>
                      <th style={{ width: 70 }}>Giá</th>
                      <th style={{ width: 70 }}>Tầng</th>
                      <th style={{ width: 70 }}>Hòm</th>
                      <th style={{ width: 140 }}>Mô tả vị trí</th>
                      <th style={{ width: 130 }}>Trạng thái *</th>
                      <th style={{ width: 90 }}>Số lượng *</th>
                      <th style={{ width: 50 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.data.viTri.map((r, i) => (
                      <tr key={i}>
                        <td className="td-muted td-center">{i + 1}</td>
                        <td><input className="form-input form-input--cell" style={{ padding: '6px 8px' }} value={r.tenNhaKho} onChange={e => suaViTri(i, 'tenNhaKho', e.target.value)} /></td>
                        <td><input className="form-input form-input--cell" style={{ padding: '6px 8px' }} value={r.tenDinhKhu} onChange={e => suaViTri(i, 'tenDinhKhu', e.target.value)} /></td>
                        <td><input className="form-input form-input--cell" style={{ padding: '6px 8px' }} value={r.tenKhoi} onChange={e => suaViTri(i, 'tenKhoi', e.target.value)} /></td>
                        <td><input className="form-input form-input--cell" style={{ padding: '6px 8px' }} value={r.tenGia} onChange={e => suaViTri(i, 'tenGia', e.target.value)} /></td>
                        <td><input className="form-input form-input--cell" style={{ padding: '6px 8px' }} value={r.tenTang} onChange={e => suaViTri(i, 'tenTang', e.target.value)} /></td>
                        <td><input className="form-input form-input--cell" style={{ padding: '6px 8px' }} value={r.tenHom} onChange={e => suaViTri(i, 'tenHom', e.target.value)} /></td>
                        <td><input className="form-input form-input--cell" style={{ padding: '6px 8px' }} value={r.moTaViTri} onChange={e => suaViTri(i, 'moTaViTri', e.target.value)} placeholder="VD: K01 - Hòm 02" /></td>
                        <td>
                          <select className="form-input form-input--cell" style={{ padding: '6px 8px' }} value={r.maTrangThaiTb} onChange={e => suaViTri(i, 'maTrangThaiTb', e.target.value)}>
                            <option value="">--</option>
                            {trangThaiList.map(t => <option key={t.maTTTB} value={t.maTTTB}>{t.tenTTTB}</option>)}
                          </select>
                        </td>
                        <td><input className="form-input form-input--cell" style={{ padding: '6px 8px', textAlign: 'center' }} type="number" min="1" value={r.soLuong} onChange={e => suaViTri(i, 'soLuong', e.target.value)} /></td>
                        <td className="td-center">
                          <button type="button" className="btn-icon-delete" onClick={() => xoaDongViTri(i)} title="Xóa dòng"><FiTrash2 size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="form-hint" style={{ marginTop: 10, background: conLaiForm === 0 ? '#f0fdf4' : '#fff8e1', padding: '8px 14px', borderRadius: 8 }}>
                Tổng theo vị trí: <strong>{tongViTriForm}</strong> / Tổng số lượng lô: <strong>{Number(form.data.soLuongTonDau) || 0}</strong>
                {conLaiForm !== 0 && <> — {conLaiForm > 0 ? `còn thiếu ${conLaiForm}` : `vượt ${-conLaiForm}`}</>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setForm(null)}>Hủy</button>
                <button type="button" className="btn-primary" disabled={dangLuuLo} onClick={luuLoVaoDanhSach}>{dangLuuLo ? 'Đang lưu...' : 'Lưu lô'}</button>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {previewModal && (
        <div className="overlay" onClick={() => setPreviewModal(null)}>
          <div className="modal modal--form-xwide fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Xem trước dữ liệu tồn đầu tải lên</h3>
              <button className="modal-close-btn" onClick={() => setPreviewModal(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className="form-hint" style={{ marginBottom: 10 }}>
                Danh sách trang bị tồn đầu.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36, textAlign: 'center' }}></th>
                      <th style={{ width: 30, textAlign: 'center' }}>Dòng</th>
                      <th style={{ width: 100 }}>Mã TBĐB</th>
                      <th style={{ minWidth: 180 }}>Tên TBĐB</th>
                      <th style={{ width: 130 }}>Mã lô</th>
                      <th style={{ width: 100 }}>Cấp</th>
                      <th style={{ width: 90 }}>Năm SX</th>
                      <th style={{ width: 130 }}>Nước SX</th>
                      <th style={{ width: 150 }}>Tình trạng bao gói</th>
                      <th style={{ width: 150 }}>Hình thức niêm cất</th>
                      <th style={{ width: 120, textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ width: 120, textAlign: 'center' }}>Tổng SL lô</th>
                      <th style={{ width: 90 }}>Nhà kho</th>
                      <th style={{ width: 90 }}>Khu</th>
                      <th style={{ width: 90 }}>Khối</th>
                      <th style={{ width: 90 }}>Giá</th>
                      <th style={{ width: 90 }}>Tầng</th>
                      <th style={{ width: 90 }}>Hòm</th>
                      <th style={{ minWidth: 130 }}>Mô tả vị trí</th>
                      <th style={{ width: 150 }}>Trạng thái TB</th>
                      <th style={{ width: 120, textAlign: 'center' }}>SL tại vị trí</th>
                      <th style={{ minWidth: 130 }}>Ghi chú</th>
                      <th style={{ minWidth: 160 }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewModal.danhSach.map(r => (
                      <tr key={r.dong} style={!r.hopLe ? { background: '#fff5f5' } : undefined}>
                        <td className="td-center">
                          <input type="checkbox" disabled={!r.hopLe} checked={r.hopLe && previewModal.checked.has(r.dong)}
                            onChange={() => toggleChecked(r.maLoTbdb)} />
                        </td>
                        <td className="td-muted">{r.dong}</td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maTbdb ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'maTbdb', e.target.value)}>
                            <option value="">-- Chọn --</option>
                            {tbdbCatalog.map(t => <option key={t.maTbdb} value={t.maTbdb}>{t.maTbdb}</option>)}
                          </select>
                        </td>
                        <td>{r.tenTbdb || ''}</td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.maLoTbdb ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'maLoTbdb', e.target.value)} />
                        </td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maCcl ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'maCcl', e.target.value === '' ? null : Number(e.target.value))}>
                            <option value="">--</option>
                            {cclList.map(c => <option key={c.maCap} value={c.maCap}>{c.tenCap}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'center' }} type="number" value={r.namSx ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'namSx', e.target.value === '' ? null : Number(e.target.value))} />
                        </td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maNuocSx ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'maNuocSx', e.target.value)}>
                            <option value="">--</option>
                            {nsxList.map(n => <option key={n.maNSX} value={n.maNSX}>{n.tenNSX}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maTinhTrangBaoGoi ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'maTinhTrangBaoGoi', e.target.value)}>
                            <option value="">--</option>
                            {ttbgList.map(t => <option key={t.maTTBG} value={t.maTTBG}>{t.tenTTBG}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maHinhThucNiemCat ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'maHinhThucNiemCat', e.target.value)}>
                            <option value="">--</option>
                            {htncList.map(h => <option key={h.maHTNC} value={h.maHTNC}>{h.tenHTNC}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'right' }} type="number" min="0" value={r.donGia ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'donGia', e.target.value === '' ? null : Number(e.target.value))} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'center' }} type="number" min="1" value={r.soLuongTonDau ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'soLuongTonDau', e.target.value === '' ? null : Number(e.target.value))} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenNhaKho ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenNhaKho', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenDinhKhu ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenDinhKhu', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenKhoi ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenKhoi', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenGia ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenGia', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenTang ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenTang', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenHom ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'tenHom', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.moTaViTri ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'moTaViTri', e.target.value)} />
                        </td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maTrangThaiTb ?? ''}
                            onChange={e => updatePreviewRow(r.dong, 'maTrangThaiTb', e.target.value)}>
                            <option value="">--</option>
                            {trangThaiList.map(t => <option key={t.maTTTB} value={t.maTTTB}>{t.tenTTTB}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'center' }} type="number" min="1" value={r.soLuong ?? ''}
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
                                {r.loi.map((l, i) => (
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
            <div className="modal-footer" style={{ justifyContent: 'space-between', padding: '10px 24px 20px' }}>
              <span className="td-muted" style={{ fontSize: 12 }}>
                Đã chọn {previewModal.checked.size}/{previewModal.danhSach.filter(r => r.hopLe).length} dòng hợp lệ
                {previewModal.danhSach.some(r => !r.hopLe) && ` — ${previewModal.danhSach.filter(r => !r.hopLe).length} dòng lỗi bị bỏ qua`}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-cancel" onClick={() => setPreviewModal(null)}>Hủy</button>
                <button type="button" className="btn-primary" onClick={xacNhanNhapFilePreview}>Xác nhận thêm vào danh sách</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}

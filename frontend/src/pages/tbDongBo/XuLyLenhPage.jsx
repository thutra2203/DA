import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lenhTbDongBoAPI, tbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiCheckCircle, FiMapPin, FiDownload, FiUpload, FiX } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useModulePerm } from '../../hooks/useModulePerm';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const fmtMoney = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('vi-VN'));
const isXuat = (tenLoaiLenh) => (tenLoaiLenh || '').toLowerCase().includes('xuất');

export default function XuLyLenhPage() {
  const { maLenh } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { canSua } = useModulePerm('TBDB_LENH_XL');

  const [lenh, setLenh] = useState(null);
  const [loadingLenh, setLoadingLenh] = useState(true);
  const [khoList, setKhoList] = useState([]);
  const [nsxList, setNsxList] = useState([]);
  const [ttbgList, setTtbgList] = useState([]);
  const [htncList, setHtncList] = useState([]);
  const [trangThaiList, setTrangThaiList] = useState([]);

  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [toast, setToast] = useState(null);
  const [loForms, setLoForms] = useState({}); // { [maCtdongBoLenh]: { maLoTbdb, soLuongThucNhap, donGia, namSx, maNuocSx, maTinhTrangBaoGoi } }
  const [editingLoId, setEditingLoId] = useState(null); // maCtdongBoLenh của dòng đang sửa lại lô đã tạo
  const [dangLuuLo, setDangLuuLo] = useState(null);
  const [viTriRow, setViTriRow] = useState(null);
  const [xuatRow, setXuatRow] = useState(null);
  const [trangThaiLenh, setTrangThaiLenh] = useState(null);
  const [dangHoanThanh, setDangHoanThanh] = useState(false);
  const [dangTaiMau, setDangTaiMau] = useState(false);
  const [dangNhapFile, setDangNhapFile] = useState(false);
  const [ketQuaNhapFile, setKetQuaNhapFile] = useState(null);
  const [previewModalLo, setPreviewModalLo] = useState(null); // { danhSach, checked: Set<dong> }
  const [dangXacNhanLo, setDangXacNhanLo] = useState(false);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    Promise.all([
      danhMucAPI.getAll('kho').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('nsx').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('tinh-trang-bao-goi').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('hinh-thuc-niem-cat').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('trang-thai-tb').then(res => res.data).catch(() => []),
    ]).then(([kho, nsx, ttbg, htnc, trangThai]) => {
      setKhoList(kho); setNsxList(nsx); setTtbgList(ttbg); setHtncList(htnc); setTrangThaiList(trangThai);
    });
  }, []);

  const loadLenh = () => {
    setLoadingLenh(true);
    return lenhTbDongBoAPI.getOne(maLenh)
      .then(res => { setLenh(res.data); setTrangThaiLenh(res.data.trangThai); })
      .catch(() => setLenh(null))
      .finally(() => setLoadingLenh(false));
  };

  const loadRows = () => {
    setLoadingRows(true);
    return lenhTbDongBoAPI.chiTiet.getAll(maLenh)
      .then(res => setRows(res.data))
      .catch(() => setRows([]))
      .finally(() => setLoadingRows(false));
  };

  useEffect(() => { loadLenh(); loadRows(); }, [maLenh]);

  usePageTitle(lenh ? `Cập nhật lệnh ${lenh.tenLoaiLenh}` : 'Cập nhật lệnh nhập/xuất');

  const xuat = isXuat(lenh?.tenLoaiLenh);
  const daKetThuc = trangThaiLenh === 'HOAN_THANH';
  const sanSangKetThuc = rows.length > 0 && (xuat
    ? rows.every(r => (r.soLuongThuc ?? 0) === r.soLuongTheoLenh)
    : rows.every(r => r.daTaoLo && r.soLuongDaPhanBo === r.soLuongThucNhap));

  // Gieo sẵn mã lô đề xuất {maTbdb}{maCtdongBoLenh} (khóa duy nhất, không trùng) cho các dòng
  // chưa tạo lô, không ghi đè nếu người dùng đã sửa.
  useEffect(() => {
    setLoForms(prev => {
      const next = { ...prev };
      rows.forEach(r => {
        if (!r.daTaoLo && !next[r.maCtdongBoLenh]) {
          next[r.maCtdongBoLenh] = {
            maLoTbdb: `${r.maTbdb}${r.maCtdongBoLenh}`,
            soLuongThucNhap: r.soLuongTheoLenh ?? '', donGia: r.donGiaTheoLenh ?? '',
            namSx: '', maNuocSx: '', maTinhTrangBaoGoi: '', maHinhThucNiemCat: '',
          };
        }
      });
      return next;
    });
  }, [rows]);

  const suaLoForm = (id, field, value) => setLoForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const luuLo = async (row) => {
    const f = loForms[row.maCtdongBoLenh];
    if (!f?.soLuongThucNhap || f.donGia === '' || (!row.daTaoLo && !f.maLoTbdb)) {
      showToast('Điền đủ Mã lô, SL thực nhập, Đơn giá', 'error');
      return;
    }
    setDangLuuLo(row.maCtdongBoLenh);
    const payload = {
      maLoTBDB: f.maLoTbdb || null,
      namSX: f.namSx === '' ? null : Number(f.namSx),
      maNuocSX: f.maNuocSx || null,
      maTinhTrangBaoGoi: f.maTinhTrangBaoGoi || null,
      maHinhThucNiemCat: f.maHinhThucNiemCat || null,
      donGia: f.donGia === '' ? 0 : Number(f.donGia),
      soLuongThucNhap: f.soLuongThucNhap === '' ? 0 : Number(f.soLuongThucNhap),
    };
    try {
      if (row.daTaoLo) {
        await lenhTbDongBoAPI.chiTiet.suaLo(maLenh, row.maCtdongBoLenh, payload);
        showToast('Cập nhật lô thành công!');
        setEditingLoId(null);
      } else {
        await lenhTbDongBoAPI.chiTiet.taoLo(maLenh, row.maCtdongBoLenh, payload);
        showToast('Tạo lô thành công — tiếp tục "Quản lý vị trí" để phân bổ vào kho!');
      }
      loadRows();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangLuuLo(null); }
  };

  const batDauSuaLo = (row) => {
    setLoForms(prev => ({
      ...prev,
      [row.maCtdongBoLenh]: {
        maLoTbdb: row.maLoTbdb, soLuongThucNhap: row.soLuongThucNhap ?? '', donGia: row.donGiaThucNhap ?? '',
        namSx: row.namSxThucNhap ?? '', maNuocSx: row.maNuocSxThucNhap ?? '', maTinhTrangBaoGoi: row.maTinhTrangBaoGoiThucNhap ?? '',
        maHinhThucNiemCat: row.maHinhThucNiemCatThucNhap ?? '',
      },
    }));
    setEditingLoId(row.maCtdongBoLenh);
  };

  const ketThucLenh = async () => {
    const canhBao = xuat
      ? 'Kết thúc lệnh? Tồn kho sẽ chính thức bị trừ ngay cho toàn bộ dòng tồn kho đã chọn, không thể hoàn tác.'
      : 'Kết thúc lệnh? Sau khi kết thúc, các lô sẽ chính thức trở thành thực lực và không thể sửa thêm.';
    if (!(await confirm(canhBao))) return;
    setDangHoanThanh(true);
    try {
      await lenhTbDongBoAPI.hoanThanh(maLenh);
      showToast('Kết thúc lệnh thành công!');
      setTrangThaiLenh('HOAN_THANH');
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangHoanThanh(false); }
  };

  const taiMauNhapLo = async () => {
    setDangTaiMau(true);
    try {
      const res = await lenhTbDongBoAPI.taiMauNhapLo(maLenh);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `mau-nhap-lo-${maLenh}.xlsx`;
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
    lenhTbDongBoAPI.xemTruocNhapLoTuFile(maLenh, file)
      .then(res => {
        const danhSach = res.data.danhSach || [];
        setPreviewModalLo({ danhSach, checked: new Set(danhSach.filter(r => r.hopLe).map(r => r.dong)) });
      })
      .catch(err => showToast(err.response?.data?.message || 'Lỗi đọc file', 'error'))
      .finally(() => setDangNhapFile(false));
  };

  // Kiểm tra lại toàn bộ danh sách xem trước sau khi người dùng sửa tay 1 dòng — chạy lại các

  const revalidateDanhSachLo = (danhSach) => {
    const nhomMap = {};
    danhSach.forEach(r => {
      const key = `${(r.maTbdb || '').trim()}|${r.maCcl ?? ''}`;
      (nhomMap[key] ||= []).push(r);
    });
    const loiNhomMap = {};
    Object.entries(nhomMap).forEach(([key, list]) => {
      if (key.endsWith('|')) return; // cấp lỗi đã báo riêng ở từng dòng
      const maLoList = [...new Set(list.map(r => (r.maLoTbdb || '').trim()).filter(Boolean))];
      if (maLoList.length > 1) {
        loiNhomMap[key] = `Các dòng cùng TB/Cấp phải cùng 1 Mã lô, đang có: ${maLoList.join(', ')}`;
        return;
      }
      const slList = [...new Set(list.map(r => r.soLuongThucTe).filter(v => v !== null && v !== '' && v !== undefined))];
      if (slList.length > 1) {
        loiNhomMap[key] = `Các dòng cùng Mã lô phải có cùng 1 Số lượng thực tế, đang có: ${slList.join(', ')}`;
        return;
      }
      const soLuongThucTe = slList.length === 1 ? Number(slList[0]) : null;
      if (soLuongThucTe !== null) {
        const tong = list.reduce((s, r) => s + (Number(r.soLuong) || 0), 0);
        if (tong > soLuongThucTe) loiNhomMap[key] = `Tổng Số lượng tại vị trí (${tong}) vượt quá Số lượng thực tế của lô (${soLuongThucTe})`;
      }
    });

    return danhSach.map(r => {
      const maTbdb = (r.maTbdb || '').trim();
      const maCcl = r.maCcl === '' || r.maCcl === null || r.maCcl === undefined ? null : Number(r.maCcl);
      const matchCt = rows.find(x => x.maTbdb === maTbdb && Number(x.maCcl) === maCcl);

      const loi = [];
      if (maCcl === null) loi.push('Cấp CL từ 1-5)');
      if (!r.maLoTbdb) loi.push('Mã lô');
      if (r.donGia === '' || r.donGia === null || r.donGia === undefined || isNaN(Number(r.donGia))) loi.push('Đơn giá thực tế phải là số');
      if (r.soLuongThucTe === '' || r.soLuongThucTe === null || r.soLuongThucTe === undefined) loi.push('Số lượng thực tế phải là số');
      else if (Number(r.soLuongThucTe) <= 0) loi.push('Số lượng thực tế phải > 0');
      if (!r.maKho) loi.push('Kho (mã)');
      if (!r.maTrangThaiTb) loi.push('Trạng thái TB (mã)');
      if (r.soLuong === '' || r.soLuong === null || r.soLuong === undefined) loi.push('Số lượng tại vị trí phải là số');
      else if (Number(r.soLuong) <= 0) loi.push('Số lượng tại vị trí (phải > 0)');

      if (maCcl !== null) {
        if (!matchCt) loi.push(`Không tìm thấy TB=${maTbdb}, Cấp=${maCcl} trong lệnh này`);
        else if (matchCt.daTaoLo) loi.push(`Dòng này đã có lô "${matchCt.maLoTbdb}" từ trước, bỏ qua`);

        const loiNhom = loiNhomMap[`${maTbdb}|${maCcl}`];
        if (loiNhom) loi.push(loiNhom);
      }

      return { ...r, maTbdb, maCcl, tenTbdb: matchCt?.tenTbdb || r.tenTbdb || '', hopLe: loi.length === 0, loi };
    });
  };

  const toggleCheckedLo = (dong) => setPreviewModalLo(prev => {
    const checked = new Set(prev.checked);
    if (checked.has(dong)) checked.delete(dong); else checked.add(dong);
    return { ...prev, checked };
  });

  const updatePreviewRowLo = (dong, field, value) => setPreviewModalLo(prev => {
    const danhSach = revalidateDanhSachLo(prev.danhSach.map(r => r.dong === dong ? { ...r, [field]: value } : r));
    // Bỏ chọn mọi dòng vừa trở thành không hợp lệ (kể cả dòng khác do lỗi mức nhóm lan sang),
    // rồi tự chọn lại đúng dòng vừa sửa nếu giờ đã hợp lệ.
    const checked = new Set([...prev.checked].filter(d => danhSach.find(r => r.dong === d)?.hopLe));
    const row = danhSach.find(r => r.dong === dong);
    if (row.hopLe) checked.add(dong);
    return { ...prev, danhSach, checked };
  });

  const xacNhanNhapLoPreview = async () => {
    const danhSachLuu = previewModalLo.danhSach
      .filter(r => r.hopLe && previewModalLo.checked.has(r.dong))
      .map(r => ({
        dong: r.dong, maTbdb: r.maTbdb, maCcl: r.maCcl, maLoTbdb: r.maLoTbdb,
        namSx: r.namSx === '' ? null : r.namSx, maNuocSx: r.maNuocSx || null, maTinhTrangBaoGoi: r.maTinhTrangBaoGoi || null,
        maHinhThucNiemCat: r.maHinhThucNiemCat || null,
        donGia: r.donGia, soLuongThucTe: r.soLuongThucTe, maKho: r.maKho,
        tenNhaKho: r.tenNhaKho || null, tenDinhKhu: r.tenDinhKhu || null, tenKhoi: r.tenKhoi || null,
        tenGia: r.tenGia || null, tenTang: r.tenTang || null, tenHom: r.tenHom || null, moTaViTri: r.moTaViTri || null,
        maTrangThaiTb: r.maTrangThaiTb, soLuong: r.soLuong, ghiChu: r.ghiChu || null,
      }));
    if (danhSachLuu.length === 0) { showToast('Chưa chọn dòng nào để lưu', 'error'); return; }
    setDangXacNhanLo(true);
    try {
      const res = await lenhTbDongBoAPI.xacNhanNhapLoTuFile(maLenh, danhSachLuu);
      setKetQuaNhapFile(res.data);
      showToast(`Nhập file xong: ${res.data.thanhCong} thành công, ${res.data.thatBai} lỗi`, res.data.thatBai > 0 ? 'error' : 'success');
      setPreviewModalLo(null);
      loadRows();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi lưu dữ liệu', 'error'); }
    finally { setDangXacNhanLo(false); }
  };

  if (loadingLenh) return <div className="empty-state" style={{ padding: '40px 0' }}>Đang tải...</div>;
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
          <button className="btn-icon-edit" style={{ width: 38, height: 38 }} onClick={() => navigate('/tb-dong-bo/cap-nhat-lenh-nhap-xuat')} title="Quay lại danh sách">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
              <span style={{ cursor: 'pointer', color: '#1a3a5c', fontWeight: 600 }} onClick={() => navigate('/tb-dong-bo/cap-nhat-lenh-nhap-xuat')}>
                Cập nhật lệnh nhập/xuất
              </span>
              <span style={{ margin: '0 6px' }}>/</span>
              <span>Xử lý lệnh</span>
            </p>
            <p className="page-sub" style={{ margin: '2px 0 0' }}>
              {lenh.maLenh}{lenh.veViec ? ` — ${lenh.veViec}` : ''}{lenh.tenLyDo ? ` — ${lenh.tenLyDo}` : ''}
            </p>
          </div>
        </div>
        {daKetThuc && (
          <span className="tbdb-finished-badge" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <FiCheckCircle size={14} style={{ marginRight: 6 }} />Đã hoàn thành !
          </span>
        )}
        {!daKetThuc && canSua && (
          <button className="btn-primary" disabled={!sanSangKetThuc || dangHoanThanh} onClick={ketThucLenh}
            title={!sanSangKetThuc ? (xuat ? 'Cần xuất đủ số lượng cho tất cả các dòng trước' : 'Cần tạo lô và phân bổ đủ tồn kho cho tất cả các dòng trước') : ''}>
            <FiCheckCircle style={{ marginRight: 6 }} />{dangHoanThanh ? 'Đang xử lý...' : 'Kết thúc lệnh'}
          </button>
        )}
      </div>

      <div className="data-card" style={{ padding: 20 }}>
        {xuat && !daKetThuc && (
          <div className="form-hint" style={{ marginBottom: 14 }}>
            Với mỗi dòng, nhấn "Xuất kho" để chọn các dòng tồn kho tại kho xuất và trừ số lượng thực tế.
          </div>
        )}

        {!xuat && !daKetThuc && canSua && (
          <div className="tbdb-tab-toolbar">

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-cancel" disabled={dangTaiMau} onClick={taiMauNhapLo}>
                <FiDownload style={{ marginRight: 6 }} />{dangTaiMau ? 'Đang tải...' : 'Tải mẫu'}
              </button>
              <label className="btn-add" style={{ padding: '10px 18px', cursor: 'pointer', opacity: dangNhapFile ? 0.6 : 1 }}>
                <FiUpload style={{ marginRight: 6 }} />{dangNhapFile ? 'Đang nhập...' : 'Nhập từ file'}
                <input type="file" accept=".xlsx" hidden disabled={dangNhapFile} onChange={chonFileNhap} />
              </label>
            </div>
          </div>
        )}

        {ketQuaNhapFile && (
          <div className="form-hint" style={{ marginBottom: 14, background: ketQuaNhapFile.thatBai > 0 ? '#fff8e1' : '#f0fdf4', padding: '10px 14px', borderRadius: 8 }}>
            <div>Kết quả nhập file: <strong>{ketQuaNhapFile.thanhCong}</strong> lô thành công / <strong>{ketQuaNhapFile.thatBai}</strong> lỗi trên tổng {ketQuaNhapFile.tongSoDong} dòng.</div>
            {ketQuaNhapFile.chiTietLoi.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {ketQuaNhapFile.chiTietLoi.map((l, i) => <li key={i}>Dòng {l.dong} (TB {l.maTbdb}): {l.loi}</li>)}
              </ul>
            )}
          </div>
        )}

        {loadingRows ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Đang tải...</div>
        ) : rows.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>Chưa có dòng chi tiết nào</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table--split tbdb-fixed-table">
              <thead>
                {!xuat ? (
                  <>
                    <tr className="group-header">
                      <th rowSpan={2} style={{ width: 50 }}>STT</th>
                      <th rowSpan={2} style={{ width: 90 }}>Mã TB</th>
                      <th rowSpan={2} style={{ width: 170, whiteSpace: 'normal' }}>Tên TB</th>
                      <th rowSpan={2} style={{ width: 70 }}>Cấp CL</th>
                      <th colSpan={2}>Theo lệnh</th>
                      <th colSpan={daKetThuc ? 4 : 8}>Thực nhập</th>
                      <th rowSpan={2} style={{ width: 110 }}>Phân bổ</th>
                      {!daKetThuc && canSua && <th rowSpan={2} style={{ width: 80 }}>Thao tác</th>}
                    </tr>
                    <tr>
                      <th style={{ width: 90, textAlign: 'center', whiteSpace: 'normal' }}>Số lượng</th>
                      <th style={{ width: 110, textAlign: 'right', whiteSpace: 'normal' }}>Đơn giá</th>
                      <th className="col-group-start col-lo-truncate" style={{ width: 120 }}>Mã lô{!daKetThuc && ' *'}</th>
                      <th style={{ width: 110, textAlign: 'center', whiteSpace: 'normal' }}>Số lượng{!daKetThuc && ' *'}</th>
                      <th style={{ width: 120, textAlign: 'right', whiteSpace: 'normal' }}>Đơn giá{!daKetThuc && ' *'}</th>
                      <th style={{ width: 120, textAlign: 'right', whiteSpace: 'normal' }}>Thành tiền</th>
                      {!daKetThuc && (
                        <>
                          <th style={{ width: 90 }}>Năm SX</th>
                          <th style={{ width: 120 }}>Nước SX</th>
                          <th style={{ width: 150 }}>Tình trạng bao gói</th>
                          <th style={{ width: 150 }}>Hình thức niêm cất</th>
                        </>
                      )}
                    </tr>
                  </>
                ) : (
                  <tr>
                    <th style={{ width: 50 }}>STT</th>
                    <th style={{ width: 90 }}>Mã TB</th>
                    <th style={{ width: 170, whiteSpace: 'normal' }}>Tên TB</th>
                    <th style={{ width: 70 }}>Cấp CL</th>
                    <th style={{ width: 75, textAlign: 'center', whiteSpace: 'normal' }}>{xuat ? 'SL phải xuất' : 'SL phải nhập'}</th>
                    <th style={{ width: 90 }}>{xuat ? 'Đã chọn' : 'Phân bổ'}</th>
                    {!daKetThuc && canSua && <th style={{ width: 80, textAlign: 'center' }}>Thao tác</th>}
                  </tr>
                )}
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const f = loForms[r.maCtdongBoLenh] || {};
                  const dangSua = editingLoId === r.maCtdongBoLenh;
                  const hienThiO = !xuat && !daKetThuc && (!r.daTaoLo || dangSua);
                  return (
                    <tr key={r.maCtdongBoLenh}>
                      <td className="td-muted td-center">{i + 1}</td>
                      <td><span className="sub-value">{r.maTbdb}</span></td>
                      <td>{r.tenTbdb || ''}</td>
                      <td className="td-center" style={{ whiteSpace: 'nowrap' }}>{r.tenCcl || r.maCcl}</td>
                      <td className="td-center">{r.soLuongTheoLenh}</td>
                      {!xuat && (
                        <td style={{ textAlign: 'right' }}>{fmtMoney(r.donGiaTheoLenh)}</td>
                      )}
                      {!xuat && (
                        hienThiO ? (
                          <>
                            <td className="col-thucte col-group-start col-lo-truncate">
                              {r.daTaoLo
                                ? <span className="sub-value" title={r.maLoTbdb}>{r.maLoTbdb}</span>
                                : <input className="form-input form-input--cell" style={{ padding: '6px 8px' }} value={f.maLoTbdb ?? ''} title={f.maLoTbdb ?? ''}
                                  onChange={e => suaLoForm(r.maCtdongBoLenh, 'maLoTbdb', e.target.value)} />}
                            </td>
                            <td className="col-thucte"><input className="form-input form-input--cell" style={{ padding: '6px 8px', textAlign: 'center' }} type="number" min="1" value={f.soLuongThucNhap ?? ''}
                              onChange={e => suaLoForm(r.maCtdongBoLenh, 'soLuongThucNhap', e.target.value)} /></td>
                            <td className="col-thucte"><input className="form-input form-input--cell" style={{ padding: '6px 8px', textAlign: 'right' }} type="number" min="0" value={f.donGia ?? ''}
                              onChange={e => suaLoForm(r.maCtdongBoLenh, 'donGia', e.target.value)} /></td>
                            <td className="col-thucte" style={{ textAlign: 'right' }}>{fmtMoney((Number(f.donGia) || 0) * (Number(f.soLuongThucNhap) || 0))}</td>
                            <td className="col-thucte"><input className="form-input" style={{ padding: '6px 8px' }} type="number" value={f.namSx ?? ''}
                              onChange={e => suaLoForm(r.maCtdongBoLenh, 'namSx', e.target.value)} /></td>
                            <td className="col-thucte">
                              <select className="form-input" style={{ padding: '6px 8px' }} value={f.maNuocSx ?? ''}
                                onChange={e => suaLoForm(r.maCtdongBoLenh, 'maNuocSx', e.target.value)}>
                                <option value="">--</option>
                                {nsxList.map(n => <option key={n.maNSX} value={n.maNSX}>{n.tenNSX}</option>)}
                              </select>
                            </td>
                            <td className="col-thucte">
                              <select className="form-input" style={{ padding: '6px 8px' }} value={f.maTinhTrangBaoGoi ?? ''}
                                onChange={e => suaLoForm(r.maCtdongBoLenh, 'maTinhTrangBaoGoi', e.target.value)}>
                                <option value="">--</option>
                                {ttbgList.map(t => <option key={t.maTTBG} value={t.maTTBG}>{t.tenTTBG}</option>)}
                              </select>
                            </td>
                            <td className="col-thucte">
                              <select className="form-input" style={{ padding: '6px 8px' }} value={f.maHinhThucNiemCat ?? ''}
                                onChange={e => suaLoForm(r.maCtdongBoLenh, 'maHinhThucNiemCat', e.target.value)}>
                                <option value="">--</option>
                                {htncList.map(h => <option key={h.maHTNC} value={h.maHTNC}>{h.tenHTNC}</option>)}
                              </select>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="sub-value col-thucte col-group-start col-lo-truncate" title={r.maLoTbdb}>{r.maLoTbdb}</td>
                            <td className="td-center col-thucte">{r.soLuongThucNhap}</td>
                            <td className="col-thucte" style={{ textAlign: 'right' }}>{fmtMoney(r.donGiaThucNhap)}</td>
                            <td className="col-thucte" style={{ textAlign: 'right' }}>{fmtMoney((r.donGiaThucNhap || 0) * (r.soLuongThucNhap || 0))}</td>
                            {!daKetThuc && (
                              <>
                                <td className="col-thucte">{r.namSxThucNhap || ''}</td>
                                <td className="col-thucte">{r.tenNuocSxThucNhap || ''}</td>
                                <td className="col-thucte">{r.tenTinhTrangBaoGoiThucNhap || ''}</td>
                                <td className="col-thucte">{r.tenHinhThucNiemCatThucNhap || ''}</td>
                              </>
                            )}
                          </>
                        )
                      )}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {xuat ? (
                          <span className="badge tbdb-status-badge">
                            {(r.soLuongThuc ?? 0) === r.soLuongTheoLenh && <FiCheckCircle size={11} style={{ marginRight: 4 }} />}
                            {r.soLuongThuc ?? 0}/{r.soLuongTheoLenh}
                          </span>
                        ) : (
                          r.daTaoLo
                            ? <span className="badge tbdb-status-badge">{!daKetThuc && <FiCheckCircle size={11} style={{ marginRight: 4 }} />}{r.soLuongDaPhanBo}/{r.soLuongThucNhap}</span>
                            : <span className="td-muted">Chưa tạo lô</span>
                        )}
                      </td>
                      {!daKetThuc && canSua && (
                        <td className="td-center">
                          {xuat ? (
                            <div className="td-actions">
                              <button className="btn-icon-edit" disabled={(r.soLuongThuc ?? 0) >= r.soLuongTheoLenh} onClick={() => setXuatRow(r)} title="Xuất kho">
                                <FiUpload size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="td-actions">
                              {!r.daTaoLo ? (
                                <button className="btn-icon-edit" disabled={dangLuuLo === r.maCtdongBoLenh} onClick={() => luuLo(r)} title="Lưu lô">
                                  <FiCheckCircle size={13} />
                                </button>
                              ) : dangSua ? (
                                <>
                                  <button className="btn-icon-edit" disabled={dangLuuLo === r.maCtdongBoLenh} onClick={() => luuLo(r)} title="Lưu"><FiCheckCircle size={13} /></button>
                                  <button className="btn-icon-delete" onClick={() => setEditingLoId(null)} title="Hủy">✕</button>
                                </>
                              ) : (
                                <>
                                  <button className="btn-icon-warn" onClick={() => batDauSuaLo(r)} title="Sửa lô"><FiEdit2 size={13} /></button>
                                  <button className="btn-icon-edit" onClick={() => setViTriRow(r)} title="Quản lý vị trí"><FiMapPin size={13} /></button>
                                </>
                              )}
                            </div>
                          )}
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

      {viTriRow && (
        <QuanLyViTriModal
          row={viTriRow}
          lenh={lenh}
          khoList={khoList}
          trangThaiList={trangThaiList}
          onClose={() => setViTriRow(null)}
          onChanged={() => loadRows()}
        />
      )}

      {xuatRow && (
        <XuatKhoModal
          row={xuatRow}
          lenh={lenh}
          onClose={() => setXuatRow(null)}
          onChanged={() => loadRows()}
        />
      )}

      {previewModalLo && (
        <div className="overlay" onClick={() => setPreviewModalLo(null)}>
          <div className="modal modal--form-xwide fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Xem trước dữ liệu nhập lô từ Excel</h3>
              <button className="modal-close-btn" onClick={() => setPreviewModalLo(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className="form-hint" style={{ marginBottom: 10 }}>
                Danh sách lô TB dự kiến sẽ tạo.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36, textAlign: 'center' }}></th>
                      <th style={{ width: 30, textAlign: 'center' }}>Dòng</th>
                      <th style={{ width: 100 }}>Mã TB</th>
                      <th style={{ minWidth: 200 }}>Tên TB</th>
                      <th style={{ width: 70 }}>Cấp</th>
                      <th style={{ width: 130 }}>Mã lô</th>
                      <th style={{ width: 110, textAlign: 'center' }}>SL thực tế</th>
                      <th style={{ width: 110, textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ width: 100 }}>Kho</th>
                      <th style={{ width: 90 }}>Nhà kho</th>
                      <th style={{ width: 90 }}>Khu</th>
                      <th style={{ width: 90 }}>Khối</th>
                      <th style={{ width: 90 }}>Giá</th>
                      <th style={{ width: 90 }}>Tầng</th>
                      <th style={{ width: 90 }}>Hòm</th>
                      <th style={{ minWidth: 120 }}>Mô tả vị trí</th>
                      <th style={{ width: 150 }}>Trạng thái TB</th>
                      <th style={{ width: 130, textAlign: 'center' }}>SL tại vị trí</th>
                      <th style={{ width: 100 }}>Năm SX</th>
                      <th style={{ width: 130 }}>Nước SX</th>
                      <th style={{ width: 150 }}>Tình trạng bao gói</th>
                      <th style={{ width: 150 }}>Hình thức niêm cất</th>
                      <th style={{ minWidth: 130 }}>Ghi chú</th>
                      <th style={{ minWidth: 160 }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewModalLo.danhSach.map(r => (
                      <tr key={r.dong} style={!r.hopLe ? { background: '#fff5f5' } : undefined}>
                        <td className="td-center">
                          <input type="checkbox" disabled={!r.hopLe} checked={r.hopLe && previewModalLo.checked.has(r.dong)}
                            onChange={() => toggleCheckedLo(r.dong)} />
                        </td>
                        <td className="td-muted">{r.dong}</td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.maTbdb}
                            onChange={e => updatePreviewRowLo(r.dong, 'maTbdb', e.target.value)} />
                        </td>
                        <td>{r.tenTbdb || ''}</td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maCcl ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'maCcl', e.target.value === '' ? null : Number(e.target.value))}>
                            <option value="">--</option>
                            {[1, 2, 3, 4, 5].map(cap => <option key={cap} value={cap}>{cap}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.maLoTbdb ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'maLoTbdb', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'center' }} type="number" min="0" value={r.soLuongThucTe ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'soLuongThucTe', e.target.value === '' ? null : Number(e.target.value))} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'right' }} type="number" min="0" value={r.donGia ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'donGia', e.target.value === '' ? null : Number(e.target.value))} />
                        </td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maKho ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'maKho', e.target.value)}>
                            <option value="">--</option>
                            {khoList.filter(k => k.maLoaiKho !== 'KNV').map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenNhaKho ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'tenNhaKho', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenDinhKhu ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'tenDinhKhu', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenKhoi ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'tenKhoi', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenGia ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'tenGia', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenTang ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'tenTang', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.tenHom ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'tenHom', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.moTaViTri ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'moTaViTri', e.target.value)} />
                        </td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maTrangThaiTb ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'maTrangThaiTb', e.target.value)}>
                            <option value="">--</option>
                            {trangThaiList.map(t => <option key={t.maTTTB} value={t.maTTTB}>{t.tenTTTB}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px', textAlign: 'center' }} type="number" min="0" value={r.soLuong ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'soLuong', e.target.value === '' ? null : Number(e.target.value))} />
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} type="number" value={r.namSx ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'namSx', e.target.value === '' ? null : Number(e.target.value))} />
                        </td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maNuocSx ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'maNuocSx', e.target.value)}>
                            <option value="">--</option>
                            {nsxList.map(n => <option key={n.maNSX} value={n.maNSX}>{n.tenNSX}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maTinhTrangBaoGoi ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'maTinhTrangBaoGoi', e.target.value)}>
                            <option value="">--</option>
                            {ttbgList.map(t => <option key={t.maTTBG} value={t.maTTBG}>{t.tenTTBG}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-input" style={{ padding: '5px 8px' }} value={r.maHinhThucNiemCat ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'maHinhThucNiemCat', e.target.value)}>
                            <option value="">--</option>
                            {htncList.map(h => <option key={h.maHTNC} value={h.maHTNC}>{h.tenHTNC}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="form-input" style={{ padding: '5px 8px' }} value={r.ghiChu ?? ''}
                            onChange={e => updatePreviewRowLo(r.dong, 'ghiChu', e.target.value)} />
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
                Đã chọn {previewModalLo.checked.size}/{previewModalLo.danhSach.filter(r => r.hopLe).length} dòng hợp lệ
                {previewModalLo.danhSach.some(r => !r.hopLe) && ` — ${previewModalLo.danhSach.filter(r => !r.hopLe).length} dòng lỗi bị bỏ qua`}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-cancel" onClick={() => setPreviewModalLo(null)}>Hủy</button>
                <button type="button" className="btn-primary" disabled={dangXacNhanLo} onClick={xacNhanNhapLoPreview}>
                  {dangXacNhanLo ? 'Đang lưu...' : 'Xác nhận lưu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Xuất kho: chọn các dòng tồn kho tại kho xuất (cùng TBDB + cấp CL, lô đã HOAN_THANH) và trừ số lượng.
function XuatKhoModal({ row, lenh, onClose, onChanged }) {
  const [dsKhaDung, setDsKhaDung] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soLuong, setSoLuong] = useState({}); // { [maTonKho]: number }
  const [dangLuu, setDangLuu] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    setLoading(true);
    lenhTbDongBoAPI.chiTiet.getTonKhoKhaDung(lenh.maLenh, row.maCtdongBoLenh)
      .then(res => setDsKhaDung(res.data))
      .catch(() => setDsKhaDung([]))
      .finally(() => setLoading(false));
  }, [lenh.maLenh, row.maCtdongBoLenh]);

  const conCanXuat = row.soLuongTheoLenh - (row.soLuongThuc ?? 0);
  const tongDaChon = Object.values(soLuong).reduce((s, v) => s + (Number(v) || 0), 0);

  const suaSoLuong = (maTonKho, value) => setSoLuong(prev => ({ ...prev, [maTonKho]: value }));

  const submit = async () => {
    const dong = Object.entries(soLuong)
      .map(([maTonKho, sl]) => ({ maTonKho: Number(maTonKho), soLuong: Number(sl) || 0 }))
      .filter(d => d.soLuong > 0);
    if (dong.length === 0) { showToast('Chọn số lượng xuất ở ít nhất một dòng', 'error'); return; }
    if (tongDaChon > conCanXuat) { showToast(`Chỉ còn cần xuất ${conCanXuat}, không thể xuất ${tongDaChon}`, 'error'); return; }
    setDangLuu(true);
    try {
      const res = await lenhTbDongBoAPI.chiTiet.xuatKho(lenh.maLenh, row.maCtdongBoLenh, dong);
      showToast(res.data.message || 'Đã ghi nhận — tồn kho sẽ được trừ khi Kết thúc lệnh');
      onChanged();
      onClose();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangLuu(false); }
  };

  return (
    <div className="overlay" onClick={e => e.stopPropagation()}>
      <div className="modal modal--wide fade-in" onClick={e => e.stopPropagation()}>
        {toast && (
          <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
            {toast.type === 'error' ? '✗' : '✓'} {toast.text}
          </div>
        )}
        <div className="modal-header">
          <h3 className="modal-title">Xuất kho — {row.tenTbdb || row.maTbdb} ({row.tenCcl || row.maCcl})</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="tbdb-tab-toolbar" style={{ background: conCanXuat > 0 ? '#fff8e1' : '#f0fdf4', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>
            <span>Số lượng phải xuất: <strong>{row.soLuongTheoLenh}</strong></span>
            <span>Đã chọn để xuất: <strong>{row.soLuongThuc ?? 0}</strong></span>
            <span>Còn cần chọn: <strong>{conCanXuat}</strong></span>
            <span>Đang chọn: <strong>{tongDaChon}</strong></span>
          </div>
          <p className="form-hint" style={{ margin: '8px 0 0' }}>
            Chọn dòng tồn kho ở đây chỉ ghi nhận trước — tồn kho chỉ thực sự bị trừ khi bấm "Kết thúc lệnh".
          </p>

          {loading ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>Đang tải...</div>
          ) : dsKhaDung.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>Không còn tồn kho khả dụng tại kho xuất cho trang bị này</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table data-table--split">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>STT</th>
                    <th>Mã lô</th>
                    <th>Nhà kho</th>
                    <th>Khu</th>
                    <th>Khối</th>
                    <th>Giá</th>
                    <th>Tầng</th>
                    <th>Hòm</th>
                    <th>Mô tả vị trí</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Tồn</th>
                    <th style={{ width: 100, textAlign: 'center' }}>SL xuất</th>
                  </tr>
                </thead>
                <tbody>
                  {dsKhaDung.map((t, i) => (
                    <tr key={t.maTonKho}>
                      <td className="td-muted td-center">{i + 1}</td>
                      <td><span className="sub-value">{t.maLoTbdb}</span></td>
                      <td>{t.tenNhaKho || ''}</td>
                      <td>{t.tenDinhKhu || ''}</td>
                      <td>{t.tenKhoi || ''}</td>
                      <td>{t.tenGia || ''}</td>
                      <td>{t.tenTang || ''}</td>
                      <td>{t.tenHom || ''}</td>
                      <td>{t.moTaViTri || ''}</td>
                      <td><span className="badge tbdb-status-badge">{t.tenTrangThaiTb || t.maTrangThaiTb}</span></td>
                      <td className="td-center">{t.soLuong}</td>
                      <td className="td-center">
                        <input className="form-input form-input--cell" style={{ padding: '6px 8px', textAlign: 'center', width: 80 }}
                          type="number" min="0" max={t.soLuong} value={soLuong[t.maTonKho] ?? ''}
                          onChange={e => suaSoLuong(t.maTonKho, e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ padding: '0 24px 20px' }}>
          <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
          <button type="button" className="btn-primary" disabled={dangLuu || dsKhaDung.length === 0} onClick={submit}>
            {dangLuu ? 'Đang xử lý...' : 'Xác nhận xuất'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 1 Lô có thể nằm ở nhiều vị trí (nhiều dòng Tồn kho) — modal này quản lý các dòng tồn kho
// của đúng lô vừa tạo cho dòng chi tiết đang chọn.
function QuanLyViTriModal({ row, lenh, khoList, trangThaiList, onClose, onChanged }) {
  const confirm = useConfirm();
  const [tonKhoList, setTonKhoList] = useState(row.tonKhoList || []);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(null); // { editing, data }
  const [errors, setErrors] = useState({});
  const [dangTaiMauVt, setDangTaiMauVt] = useState(false);
  const [dangNhapFileVt, setDangNhapFileVt] = useState(false);
  const [ketQuaNhapFileVt, setKetQuaNhapFileVt] = useState(null);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 2500); };

  const reload = () => lenhTbDongBoAPI.chiTiet.getAll(lenh.maLenh).then(res => {
    const updated = res.data.find(r => r.maCtdongBoLenh === row.maCtdongBoLenh);
    setTonKhoList(updated?.tonKhoList || []);
  }).catch(() => { });

  const taiMauViTri = async () => {
    setDangTaiMauVt(true);
    try {
      const res = await lenhTbDongBoAPI.lo.taiMauNhapViTri(lenh.maLenh, row.maLoTbdb);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `mau-nhap-vi-tri-${row.maLoTbdb}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { showToast('Không tải được file mẫu', 'error'); }
    finally { setDangTaiMauVt(false); }
  };

  const chonFileNhapViTri = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setDangNhapFileVt(true);
    lenhTbDongBoAPI.lo.nhapViTriTuFile(lenh.maLenh, row.maLoTbdb, file)
      .then(res => {
        setKetQuaNhapFileVt(res.data);
        showToast(`Nhập file xong: ${res.data.thanhCong} thành công, ${res.data.thatBai} lỗi`, res.data.thatBai > 0 ? 'error' : 'success');
        reload();
        onChanged();
      })
      .catch(err => showToast(err.response?.data?.message || 'Lỗi nhập file', 'error'))
      .finally(() => setDangNhapFileVt(false));
  };

  const soLuongDaPhanBo = tonKhoList.reduce((s, t) => s + (t.soLuong || 0), 0);
  const conLai = (row.soLuongThucNhap || 0) - soLuongDaPhanBo;

  const openAdd = () => {
    setErrors({});
    setForm({
      editing: null,
      data: {
        maKho: lenh.maKhoNhap || '', tenNhaKho: '', tenDinhKhu: '', tenKhoi: '', tenGia: '', tenTang: '', tenHom: '',
        moTaViTri: '', maTrangThaiTb: '', soLuong: conLai > 0 ? conLai : '', ghiChu: '',
      },
    });
  };
  const openEdit = (tk) => {
    setErrors({});
    setForm({
      editing: tk,
      data: {
        maKho: tk.maKho || '', tenNhaKho: tk.tenNhaKho ?? '', tenDinhKhu: tk.tenDinhKhu ?? '', tenKhoi: tk.tenKhoi ?? '',
        tenGia: tk.tenGia ?? '', tenTang: tk.tenTang ?? '', tenHom: tk.tenHom ?? '', moTaViTri: tk.moTaViTri ?? '',
        maTrangThaiTb: tk.maTrangThaiTb, soLuong: tk.soLuong ?? '', ghiChu: tk.ghiChu ?? '',
      },
    });
  };

  const clearError = (col) => setErrors(prev => {
    if (!prev[col]) return prev;
    const next = { ...prev };
    delete next[col];
    return next;
  });

  const validate = () => {
    const f = form.data;
    const next = {};
    if (!f.maKho) next.maKho = 'Kho không được để trống';
    if (f.soLuong === '' || f.soLuong === null || Number(f.soLuong) < 1) next.soLuong = 'Số lượng tại vị trí này không được để trống';
    if (!f.maTrangThaiTb) next.maTrangThaiTb = 'Trạng thái không được để trống';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const f = form.data;
    const payload = {
      maLoTBDB: row.maLoTbdb,
      maKho: f.maKho || null,
      tenNhaKho: f.tenNhaKho || null,
      tenDinhKhu: f.tenDinhKhu || null,
      tenKhoi: f.tenKhoi || null,
      tenGia: f.tenGia || null,
      tenTang: f.tenTang || null,
      tenHom: f.tenHom || null,
      moTaViTri: f.moTaViTri || null,
      maTrangThaiTB: f.maTrangThaiTb || null,
      soLuong: f.soLuong === '' ? 0 : Number(f.soLuong),
      ghiChu: f.ghiChu || null,
    };
    try {
      if (form.editing) {
        await tbDongBoAPI.tonKho.update(form.editing.maTonKho, payload);
        showToast('Cập nhật vị trí thành công!');
      } else {
        await tbDongBoAPI.tonKho.create(payload);
        showToast('Thêm vị trí thành công!');
      }
      setForm(null);
      reload();
      onChanged();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const remove = async (tk) => {
    if (!(await confirm('Xóa dòng tồn kho tại vị trí này?'))) return;
    try {
      await tbDongBoAPI.tonKho.remove(tk.maTonKho);
      showToast('Xóa thành công!');
      reload();
      onChanged();
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa', 'error'); }
  };

  return (
    <div className="overlay" onClick={e => e.stopPropagation()}>
      <div className="modal modal--wide fade-in" onClick={e => e.stopPropagation()}>
        {toast && (
          <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
            {toast.type === 'error' ? '✗' : '✓'} {toast.text}
          </div>
        )}
        <div className="modal-header">
          <h3 className="modal-title">Quản lý vị trí - Lô {row.maLoTbdb} ({row.tenTbdb || row.maTbdb})</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="tbdb-tab-toolbar" style={{ background: conLai > 0 ? '#fff8e1' : '#f0fdf4', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>
            <span>Số lượng thực nhập của lô: <strong>{row.soLuongThucNhap}</strong></span>
            <span>Đã phân bổ: <strong>{soLuongDaPhanBo}</strong></span>
            <span>{conLai > 0 ? `Còn lại chưa phân bổ: ${conLai}` : (conLai < 0 ? `Vượt quá ${-conLai}` : 'Đã phân bổ đủ')}</span>
            <button className="btn-add" style={{ padding: '6px 12px', fontSize: 12 }} onClick={openAdd}><FiPlus style={{ marginRight: 4 }} />Thêm vị trí</button>
          </div>

          <div className="tbdb-tab-toolbar">

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-cancel" disabled={dangTaiMauVt} onClick={taiMauViTri}>
                <FiDownload style={{ marginRight: 6 }} />{dangTaiMauVt ? 'Đang tải...' : 'Tải mẫu'}
              </button>
              <label className="btn-add" style={{ padding: '10px 18px', cursor: 'pointer', opacity: dangNhapFileVt ? 0.6 : 1 }}>
                <FiUpload style={{ marginRight: 6 }} />{dangNhapFileVt ? 'Đang nhập...' : 'Nhập từ file'}
                <input type="file" accept=".xlsx" hidden disabled={dangNhapFileVt} onChange={chonFileNhapViTri} />
              </label>
            </div>
          </div>

          {ketQuaNhapFileVt && (
            <div className="form-hint" style={{ marginBottom: 14, background: ketQuaNhapFileVt.thatBai > 0 ? '#fff8e1' : '#f0fdf4', padding: '10px 14px', borderRadius: 8 }}>
              <div>Kết quả nhập file: <strong>{ketQuaNhapFileVt.thanhCong}</strong> vị trí thành công / <strong>{ketQuaNhapFileVt.thatBai}</strong> lỗi trên tổng {ketQuaNhapFileVt.tongSoDong} dòng.</div>
              {ketQuaNhapFileVt.chiTietLoi.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {ketQuaNhapFileVt.chiTietLoi.map((l, i) => <li key={i}>Dòng {l.dong}: {l.loi}</li>)}
                </ul>
              )}
            </div>
          )}

          {tonKhoList.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>Lô này chưa được phân bổ vào vị trí nào</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table data-table--split">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>STT</th>
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
                    <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {tonKhoList.map((tk, i) => (
                    <tr key={tk.maTonKho}>
                      <td className="td-muted td-center">{i + 1}</td>
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
                      <td className="td-center">
                        <div className="td-actions">
                          <button className="btn-icon-warn" onClick={() => openEdit(tk)} title="Sửa"><FiEdit2 size={12} /></button>
                          <button className="btn-icon-delete" onClick={() => remove(tk)} title="Xóa"><FiTrash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ padding: '0 24px 20px' }}>
          <button type="button" className="btn-cancel" onClick={onClose}>Đóng</button>
        </div>
      </div>

      {form && (
        <div className="overlay" onClick={e => e.stopPropagation()}>
          <div className="modal modal--form fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{form.editing ? 'Cập nhật' : 'Thêm'} vị trí tồn kho</h3>
              <button className="modal-close-btn" onClick={() => setForm(null)}>✕</button>
            </div>
            <form onSubmit={submit} className="modal-body" noValidate>
              <div className="form-grid-2col">
                <div className="form-field">
                  <label className="form-label">Kho *</label>
                  <select className={`form-input${errors.maKho ? ' form-input--invalid' : ''}`} value={form.data.maKho}
                    onChange={e => { setForm({ ...form, data: { ...form.data, maKho: e.target.value } }); clearError('maKho'); }}>
                    <option value="">-- Chọn kho --</option>
                    {khoList.filter(k => k.maLoaiKho !== 'KNV').map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                  </select>
                  {errors.maKho && <p className="form-error-text">{errors.maKho}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Số lượng tại vị trí này *</label>
                  <input className={`form-input${errors.soLuong ? ' form-input--invalid' : ''}`} type="number" min="1" value={form.data.soLuong}
                    onChange={e => { setForm({ ...form, data: { ...form.data, soLuong: e.target.value } }); clearError('soLuong'); }} />
                  {errors.soLuong && <p className="form-error-text">{errors.soLuong}</p>}
                </div>
                <div className="form-field">
                  <label className="form-label">Nhà kho</label>
                  <input className="form-input" value={form.data.tenNhaKho}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenNhaKho: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Khu (định khu)</label>
                  <input className="form-input" value={form.data.tenDinhKhu}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenDinhKhu: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Khối</label>
                  <input className="form-input" value={form.data.tenKhoi}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenKhoi: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Giá (kệ)</label>
                  <input className="form-input" value={form.data.tenGia}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenGia: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Tầng</label>
                  <input className="form-input" value={form.data.tenTang}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenTang: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Hòm</label>
                  <input className="form-input" value={form.data.tenHom}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenHom: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Trạng thái *</label>
                  <select className={`form-input${errors.maTrangThaiTb ? ' form-input--invalid' : ''}`} value={form.data.maTrangThaiTb}
                    onChange={e => { setForm({ ...form, data: { ...form.data, maTrangThaiTb: e.target.value } }); clearError('maTrangThaiTb'); }}>
                    <option value="">-- Chọn --</option>
                    {trangThaiList.map(t => <option key={t.maTTTB} value={t.maTTTB}>{t.tenTTTB}</option>)}
                  </select>
                  {errors.maTrangThaiTb && <p className="form-error-text">{errors.maTrangThaiTb}</p>}
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label">Mô tả vị trí</label>
                  <input className="form-input" value={form.data.moTaViTri}
                    onChange={e => setForm({ ...form, data: { ...form.data, moTaViTri: e.target.value } })} placeholder="VD: K01 - Hòm 02" />
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label">Ghi chú</label>
                  <input className="form-input" value={form.data.ghiChu}
                    onChange={e => setForm({ ...form, data: { ...form.data, ghiChu: e.target.value } })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setForm(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

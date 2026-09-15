import { useState, useEffect, useMemo } from 'react';
import { danhMucAPI, kiemKeTbDongBoAPI, tbDongBoAPI } from '../../services/api';
import { FiX, FiPrinter, FiDownload } from 'react-icons/fi';
import BaoCaoKiemKeTbdbPrintView from './BaoCaoKiemKeTbdbPrintView';
import { taiPrintViewThanhPdf } from '../../utils/exportPdf';

const homNay = new Date();

const TIEU_DE_KHO = 'BÁO CÁO KIỂM KÊ TRANG BỊ ĐỒNG BỘ Ở KHO';
const TIEU_DE_TOAN_QUAN = 'BÁO CÁO KIỂM KÊ TRANG BỊ ĐỒNG BỘ TOÀN QUÂN';

const META_MAC_DINH = {
  donVi1: '', donVi2: '',
  so: '', kyHieu: 'BC-QK', diaDanh: '', ngay: String(homNay.getDate()), thang: String(homNay.getMonth() + 1), nam: String(homNay.getFullYear()),
  tieuDeChinh: TIEU_DE_KHO, tieuDePhu: '',
  tuNgay: '', denNgay: '',
  noiNhan: '',
  ky2: { chucVu: 'NGƯỜI LẬP BIỂU', hoTen: '' },
  ky3: { chucVu: 'THỦ TRƯỞNG ĐƠN VỊ', hoTen: '' },
};

const TIEU_MUC_STYLE = { fontWeight: 700, fontSize: 14, color: '#1a3a5c' };

// Form "Thông tin báo cáo" để tạo Báo cáo kiểm kê TBĐB — không lưu lại vào CSDL (tạo xong in
// ngay), nên "Số báo cáo" và các trường mẫu đều do người dùng tự gõ tay mỗi lần, không có bộ đếm
// tự sinh. Chọn đơn vị (kho) qua bộ lọc Cấp quản lý -> Loại kho -> Chọn kho (giống các trang khác
// trong hệ thống), rồi chọn 1 phiếu kiểm kê thuộc đúng kho đó để lập báo cáo.
export default function TaoBaoCaoKiemKeModal({ onClose }) {
  // 'KHO' = tổng hợp 1 phiếu kiểm kê tại 1 kho cụ thể (kèm số liệu kỳ trước/tăng giảm/thừa thiếu);
  // 'TOAN_QUAN' = lấy thẳng số lượng tồn kho hiện có, gộp tất cả các kho — không cần chọn kho/phiếu.
  const [phamVi, setPhamVi] = useState('KHO');
  const doiPhamVi = (pv) => {
    setPhamVi(pv);
    setPrintData(null);
    setMeta(prev => (prev.tieuDeChinh === TIEU_DE_KHO || prev.tieuDeChinh === TIEU_DE_TOAN_QUAN)
      ? { ...prev, tieuDeChinh: pv === 'TOAN_QUAN' ? TIEU_DE_TOAN_QUAN : TIEU_DE_KHO }
      : prev);
  };

  const [khoList, setKhoList] = useState([]);
  const [capQuanLyList, setCapQuanLyList] = useState([]);
  const [loaiKhoList, setLoaiKhoList] = useState([]);
  const [selectedCapQuanLy, setSelectedCapQuanLy] = useState('ALL');
  const [selectedLoaiKho, setSelectedLoaiKho] = useState('ALL');
  const [selectedKho, setSelectedKho] = useState('');

  const [phieuList, setPhieuList] = useState([]);
  const [loadingPhieu, setLoadingPhieu] = useState(false);
  const [maPhieu, setMaPhieu] = useState('');

  const [meta, setMeta] = useState(META_MAC_DINH);
  const setMetaField = (key, value) => setMeta(prev => ({ ...prev, [key]: value }));
  const setKy = (slot, field, value) => setMeta(prev => ({ ...prev, [slot]: { ...prev[slot], [field]: value } }));

  const [printData, setPrintData] = useState(null);
  const [dangTao, setDangTao] = useState(false);
  const [dangTaiPdf, setDangTaiPdf] = useState(false);
  const [loi, setLoi] = useState('');

  useEffect(() => {
    Promise.all([
      danhMucAPI.getAll('kho').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('cap-quan-ly').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('loai-kho').then(res => res.data).catch(() => []),
    ]).then(([kho, capQuanLy, loaiKho]) => {
      setKhoList(kho);
      setCapQuanLyList(capQuanLy);
      setLoaiKhoList(loaiKho);
    });
  }, []);

  const khoLocList = useMemo(() => khoList.filter(k =>
    (selectedCapQuanLy === 'ALL' || k.maCapQuanLy === selectedCapQuanLy) &&
    (selectedLoaiKho === 'ALL' || k.maLoaiKho === selectedLoaiKho)
  ), [khoList, selectedCapQuanLy, selectedLoaiKho]);

  // Kho đang chọn không còn nằm trong danh sách vừa rút gọn — bỏ chọn để tránh giữ 1 lựa chọn đã
  // ẩn khỏi dropdown.
  useEffect(() => {
    if (selectedKho && !khoLocList.some(k => k.maKho === selectedKho)) setSelectedKho('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoLocList]);

  // Đổi kho -> tải lại danh sách phiếu kiểm kê thuộc đúng kho đó, bỏ chọn phiếu cũ.
  useEffect(() => {
    setMaPhieu('');
    setPrintData(null);
    if (!selectedKho) { setPhieuList([]); return; }
    setLoadingPhieu(true);
    kiemKeTbDongBoAPI.getAll({ maKho: selectedKho })
      .then(res => setPhieuList(res.data))
      .catch(() => setPhieuList([]))
      .finally(() => setLoadingPhieu(false));
  }, [selectedKho]);

  // hanhDongCho = 'print' | 'pdf' — printData chỉ thật sự hiển thị trong DOM sau khi React render
  // lại, nên phải chờ 1 nhịp rồi mới in/chụp PDF, tùy theo hành động người dùng vừa bấm.
  const [hanhDongCho, setHanhDongCho] = useState(null);

  useEffect(() => {
    if (!printData || !hanhDongCho) return;
    const t = setTimeout(async () => {
      if (hanhDongCho === 'print') {
        window.print();
        setDangTao(false);
      } else {
        try {
          const tenFile = printData.mode === 'TOAN_QUAN'
            ? `bao-cao-kiem-ke-toan-quan-${homNay.getFullYear()}${String(homNay.getMonth() + 1).padStart(2, '0')}${String(homNay.getDate()).padStart(2, '0')}.pdf`
            : `bao-cao-kiem-ke-${printData.phieu.maPhieuKiemKe}.pdf`;
          await taiPrintViewThanhPdf(tenFile);
        } catch {
          setLoi('Không tạo được file PDF');
        } finally {
          setDangTaiPdf(false);
        }
      }
      setHanhDongCho(null);
    }, 150);
    return () => clearTimeout(t);
  }, [printData, hanhDongCho]);

  const layDuLieuVaThucHien = async (hanhDong) => {
    if (phamVi === 'KHO' && (!selectedKho || !maPhieu)) { setLoi('Vui lòng chọn kho và phiếu kiểm kê'); return; }
    setLoi('');
    if (hanhDong === 'print') setDangTao(true); else setDangTaiPdf(true);
    try {
      if (phamVi === 'TOAN_QUAN') {
        const res = await tbDongBoAPI.getByKho('ALL');
        setHanhDongCho(hanhDong);
        setPrintData({ mode: 'TOAN_QUAN', rows: res.data });
      } else {
        const res = await kiemKeTbDongBoAPI.getOne(maPhieu);
        setHanhDongCho(hanhDong);
        setPrintData({ mode: 'KHO', phieu: res.data });
      }
    } catch {
      setLoi(phamVi === 'TOAN_QUAN' ? 'Không tải được số liệu tồn kho' : 'Không tải được dữ liệu phiếu kiểm kê');
      setDangTao(false);
      setDangTaiPdf(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal--form" style={{ width: 880 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Thông tin báo cáo</h3>
          <button className="modal-close-btn" onClick={onClose}><FiX /></button>
        </div>
        <div className="modal-body">
          <div style={{ ...TIEU_MUC_STYLE, marginBottom: 8 }}>Mẫu báo cáo</div>
          <div className="form-grid-2col">
            <div className="form-field">
              <label className="form-label">Đơn vị cấp trên</label>
              <input className="form-input" value={meta.donVi1} onChange={e => setMetaField('donVi1', e.target.value)} placeholder="VD: Tổng cục Kỹ thuật" />
            </div>
            <div className="form-field">
              <label className="form-label">Đơn vị lập báo cáo</label>
              <input className="form-input" value={meta.donVi2} onChange={e => setMetaField('donVi2', e.target.value)} placeholder="VD: Cục Quản khí" />
            </div>
            <div className="form-field">
              <label className="form-label">Số</label>
              <input className="form-input" value={meta.so} onChange={e => setMetaField('so', e.target.value)} placeholder="VD: 0001" />
            </div>
            <div className="form-field">
              <label className="form-label">Ký hiệu</label>
              <input className="form-input" value={meta.kyHieu} onChange={e => setMetaField('kyHieu', e.target.value)} placeholder="VD: BC-QK" />
            </div>
            <div className="form-field">
              <label className="form-label">Địa danh</label>
              <input className="form-input" value={meta.diaDanh} onChange={e => setMetaField('diaDanh', e.target.value)} placeholder="VD: Hà Nội" />
            </div>
            <div className="form-field">
              <label className="form-label">Ngày / Tháng / Năm</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-input" style={{ width: 60 }} value={meta.ngay} onChange={e => setMetaField('ngay', e.target.value)} />
                <input className="form-input" style={{ width: 60 }} value={meta.thang} onChange={e => setMetaField('thang', e.target.value)} />
                <input className="form-input" style={{ flex: 1 }} value={meta.nam} onChange={e => setMetaField('nam', e.target.value)} />
              </div>
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Tiêu đề chính</label>
              <input className="form-input" value={meta.tieuDeChinh} onChange={e => setMetaField('tieuDeChinh', e.target.value)} />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Tiêu đề phụ</label>
              <input className="form-input" value={meta.tieuDePhu} onChange={e => setMetaField('tieuDePhu', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Từ ngày</label>
              <input type="date" className="form-input" value={meta.tuNgay} onChange={e => setMetaField('tuNgay', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Đến ngày</label>
              <input type="date" className="form-input" value={meta.denNgay} onChange={e => setMetaField('denNgay', e.target.value)} />
            </div>
          </div>

          <div style={{ ...TIEU_MUC_STYLE, margin: '14px 0 8px' }}>Chữ ký</div>
          <div className="form-grid-2col">
            <div className="form-field">
              <label className="form-label">Nơi nhận</label>
              <textarea className="form-input" rows={3} value={meta.noiNhan} onChange={e => setMetaField('noiNhan', e.target.value)}
                placeholder={''} />
            </div>
            {['ky2', 'ky3'].map((slot, i) => (
              <div className="form-field" key={slot}>
                <label className="form-label">Chức vụ {i + 1}</label>
                <input className="form-input" value={meta[slot].chucVu} onChange={e => setKy(slot, 'chucVu', e.target.value)} style={{ marginBottom: 6 }} />
                <input className="form-input" placeholder="Cấp bậc / Họ tên" value={meta[slot].hoTen} onChange={e => setKy(slot, 'hoTen', e.target.value)} />
              </div>
            ))}
          </div>

          <div style={{ ...TIEU_MUC_STYLE, margin: '14px 0 8px' }}>Phạm vi báo cáo</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" checked={phamVi === 'KHO'} onChange={() => doiPhamVi('KHO')} />
              Theo 1 kho
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" checked={phamVi === 'TOAN_QUAN'} onChange={() => doiPhamVi('TOAN_QUAN')} />
              Toàn quân
            </label>
          </div>

          {phamVi === 'KHO' && (
            <>
              <div style={{ ...TIEU_MUC_STYLE, margin: '14px 0 8px' }}>Đơn vị *</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <select className="form-input" style={{ flex: 1, minWidth: 160 }} value={selectedCapQuanLy} onChange={e => setSelectedCapQuanLy(e.target.value)}>
                  <option value="ALL">Tất cả cấp quản lý</option>
                  {capQuanLyList.map(c => <option key={c.maCapQuanLy} value={c.maCapQuanLy}>{c.tenCapQuanLy}</option>)}
                </select>
                <select className="form-input" style={{ flex: 1, minWidth: 160 }} value={selectedLoaiKho} onChange={e => setSelectedLoaiKho(e.target.value)}>
                  <option value="ALL">Tất cả loại kho</option>
                  {loaiKhoList.map(l => <option key={l.maLoaiKho} value={l.maLoaiKho}>{l.tenLoaiKho}</option>)}
                </select>
              </div>
              <div className="form-field">
                <select className="form-input" value={selectedKho} onChange={e => setSelectedKho(e.target.value)}>
                  <option value="">-- Chọn kho --</option>
                  {khoLocList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                </select>
              </div>

              <div style={{ ...TIEU_MUC_STYLE, margin: '14px 0 8px' }}>Phiếu kiểm kê *</div>
              <div className="form-field">
                <select className="form-input" value={maPhieu} disabled={!selectedKho || loadingPhieu} onChange={e => setMaPhieu(e.target.value)}>
                  <option value="">{!selectedKho ? '-- Chọn kho trước --' : loadingPhieu ? 'Đang tải...' : '-- Chọn phiếu kiểm kê --'}</option>
                  {phieuList.map(p => (
                    <option key={p.maPhieuKiemKe} value={p.maPhieuKiemKe}>
                      {p.maPhieuKiemKe} - {p.tenDotKiemKe} ({p.ngayLap})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {loi && <div className="form-error-text" style={{ marginTop: 8 }}>{loi}</div>}

          <div className="modal-footer">
            <button className="btn-cancel" onClick={onClose}>Trở về</button>
            <button className="btn-excel" onClick={() => layDuLieuVaThucHien('pdf')} disabled={dangTao || dangTaiPdf}>
              <FiDownload style={{ marginRight: 6 }} />
              {dangTaiPdf ? 'Đang tạo PDF...' : 'Tải PDF'}
            </button>
            <button className="btn-primary" onClick={() => layDuLieuVaThucHien('print')} disabled={dangTao || dangTaiPdf}>
              <FiPrinter style={{ marginRight: 6 }} />
              {dangTao ? 'Đang tạo...' : 'Xem /in'}
            </button>
          </div>
        </div>
      </div>

      <BaoCaoKiemKeTbdbPrintView data={printData} meta={meta} />
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { danhMucAPI, baoCaoAPI } from '../../services/api';
import { FiX, FiPrinter, FiDownload } from 'react-icons/fi';
import BaoCaoDongBoSungBoBinhPrintView from './BaoCaoDongBoSungBoBinhPrintView';
import { taiPrintViewThanhPdf } from '../../utils/exportPdf';

const homNay = new Date();

const META_MAC_DINH = {
  donVi1: '', donVi2: '',
  so: '', kyHieu: 'BC-QK', diaDanh: '', ngay: String(homNay.getDate()), thang: String(homNay.getMonth() + 1), nam: String(homNay.getFullYear()),
  tieuDeChinh: 'BÁO CÁO TÌNH HÌNH ĐỒNG BỘ SÚNG BỘ BINH', tieuDePhu: '',
  noiNhan: '',
  ky2: { chucVu: 'NGƯỜI LẬP BIỂU', hoTen: '' },
  ky3: { chucVu: 'THỦ TRƯỞNG ĐƠN VỊ', hoTen: '' },
};

const TIEU_MUC_STYLE = { fontWeight: 700, fontSize: 14, color: '#1a3a5c' };

// Form "Thông tin báo cáo" để tạo Báo cáo tình hình đồng bộ súng bộ binh — không lưu lại vào CSDL
// (tạo xong in ngay), giống TaoBaoCaoKiemKeModal. Khác báo cáo kiểm kê ở chỗ không gắn với 1 phiếu
// kiểm kê nào — chỉ cần chọn 1 kho, số liệu (số súng, số phụ kiện) lấy thẳng từ hệ thống qua
// baoCaoAPI.getDongBoSungBoBinh (xem BaoCaoController.cs).
export default function TaoBaoCaoDongBoModal({ onClose }) {
  const [khoList, setKhoList] = useState([]);
  const [capQuanLyList, setCapQuanLyList] = useState([]);
  const [loaiKhoList, setLoaiKhoList] = useState([]);
  const [selectedCapQuanLy, setSelectedCapQuanLy] = useState('ALL');
  const [selectedLoaiKho, setSelectedLoaiKho] = useState('ALL');
  const [selectedKho, setSelectedKho] = useState('');

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

  useEffect(() => {
    if (selectedKho && !khoLocList.some(k => k.maKho === selectedKho)) setSelectedKho('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoLocList]);

  useEffect(() => { setPrintData(null); }, [selectedKho]);

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
          await taiPrintViewThanhPdf(`bao-cao-dong-bo-sung-bo-binh-${selectedKho}.pdf`);
        } catch {
          setLoi('Không tạo được file PDF');
        } finally {
          setDangTaiPdf(false);
        }
      }
      setHanhDongCho(null);
    }, 150);
    return () => clearTimeout(t);
  }, [printData, hanhDongCho, selectedKho]);

  const layDuLieuVaThucHien = async (hanhDong) => {
    if (!selectedKho) { setLoi('Vui lòng chọn kho'); return; }
    setLoi('');
    if (hanhDong === 'print') setDangTao(true); else setDangTaiPdf(true);
    try {
      const res = await baoCaoAPI.getDongBoSungBoBinh(selectedKho);
      setHanhDongCho(hanhDong);
      setPrintData(res.data);
    } catch {
      setLoi('Không tải được số liệu đồng bộ');
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

      <BaoCaoDongBoSungBoBinhPrintView data={printData} meta={meta} />
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { lenhTbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiSearch, FiEye, FiEdit2, FiCheckCircle, FiPrinter } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useAuth } from '../../context/AuthContext';
import SkeletonTable from '../../components/ui/SkeletonTable';
import HuyThanhLyPrintView from './HuyThanhLyPrintView';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const MA_LOAI_LENH = 'NX05'; // Xuất hủy/thanh lý

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

// Chức năng "Cập nhật lệnh xuất hủy/thanh lý" — danh sách lệnh để vào thêm trang bị cần hủy và
// kết thúc lệnh.
export default function CapNhatLenhHuyThanhLy() {
  usePageTitle('Cập nhật lệnh xuất hủy/thanh lý');
  const navigate = useNavigate();
  const { user } = useAuth();
  const maKhoNguoiDung = user?.maDonVi || null;

  const [khoList, setKhoList] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKho, setSelectedKho] = useState(maKhoNguoiDung || 'ALL');
  const [selectedTrangThai, setSelectedTrangThai] = useState('ALL');
  const [printData, setPrintData] = useState(null); // { lenh, rows } — dữ liệu của lệnh đang chuẩn bị in
  const [dangInLenh, setDangInLenh] = useState(false);
  const [maLenhChonIn, setMaLenhChonIn] = useState(null); // chỉ chọn được đúng 1 lệnh để in tại 1 thời điểm
  const [detailRow, setDetailRow] = useState(null);

  const toggleChonIn = (maLenh) => setMaLenhChonIn(prev => (prev === maLenh ? null : maLenh));

  // In nhanh ngay từ danh sách, không cần điều hướng sang trang xử lý — tự tải thông tin lệnh + danh
  // sách dòng chi tiết của lệnh đang được chọn (checkbox), render ẩn (HuyThanhLyPrintView) rồi mở
  // hộp thoại in ngay khi có đủ dữ liệu.
  const handlePrint = async () => {
    if (!maLenhChonIn) return;
    setDangInLenh(true);
    try {
      const [lenhRes, ctRes] = await Promise.all([
        lenhTbDongBoAPI.getOne(maLenhChonIn),
        lenhTbDongBoAPI.chiTiet.getAll(maLenhChonIn),
      ]);
      setPrintData({ lenh: lenhRes.data, rows: ctRes.data });
    } catch { /* bỏ qua — nút In lệnh vẫn khả dụng để thử lại */ }
    finally { setDangInLenh(false); }
  };

  useEffect(() => {
    if (!printData) return;
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, [printData]);

  useEffect(() => { danhMucAPI.getAll('kho').then(res => setKhoList(res.data)).catch(() => setKhoList([])); }, []);

  const loadItems = (maKho) => {
    setLoading(true);
    return lenhTbDongBoAPI.getAll(MA_LOAI_LENH, maKho && maKho !== 'ALL' ? maKho : undefined)
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadItems(selectedKho); }, [selectedKho]);

  const khoVatLyList = useMemo(() => khoList.filter(k => k.maLoaiKho !== 'KNV'), [khoList]);
  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(l => {
      if (selectedTrangThai !== 'ALL') {
        const daHoanThanh = l.trangThai === 'HOAN_THANH';
        if (selectedTrangThai === 'HOAN_THANH' && !daHoanThanh) return false;
        if (selectedTrangThai === 'DANG_XU_LY' && daHoanThanh) return false;
      }
      if (!q) return true;
      return [l.maLenh, l.veViec, l.canCu].some(v => String(v ?? '').toLowerCase().includes(q));
    });
  }, [items, search, selectedTrangThai]);

  return (
    <div>
      <div className="data-card">
        <div className="table-toolbar">
          <span className="table-total">Tổng: <strong>{bySearch.length}</strong> lệnh hủy/thanh lý</span>
          <button className="btn-print" onClick={handlePrint} disabled={!maLenhChonIn || dangInLenh}>
            <FiPrinter style={{ marginRight: 6 }} /> {dangInLenh ? 'Đang tải...' : 'In lệnh'}
          </button>
        </div>

        <div className="table-toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ width: 260 }}>
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Tìm theo số lệnh, về việc, căn cứ..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="tbdb-filter-select" value={selectedKho} onChange={e => setSelectedKho(e.target.value)} disabled={!!maKhoNguoiDung}>
              {!maKhoNguoiDung && <option value="ALL">Tất cả kho</option>}
              {khoVatLyList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedTrangThai} onChange={e => setSelectedTrangThai(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DANG_XU_LY">Đang xử lý</option>
              <option value="HOAN_THANH">Đã hoàn thành</option>
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={11} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗑️</div>
            <div className="empty-state-title">Chưa có lệnh hủy/thanh lý nào</div>
            <div className="empty-state-desc">Lệnh mới được tạo ở trang "Tạo lệnh hủy/thanh lý"</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: 'center' }}></th>
                  <th style={{ width: 50 }}>STT</th>
                  <th>Số lệnh</th>
                  <th>Kho xuất</th>
                  <th>Kho nhập</th>
                  <th>Ngày</th>
                  <th>Giá trị đến ngày</th>
                  <th>Về việc</th>
                  <th style={{ textAlign: 'center' }}>Số dòng</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 70, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bySearch.map((r, i) => (
                  <tr key={r.maLenh}>
                    <td className="td-center">
                      <input type="checkbox" checked={maLenhChonIn === r.maLenh} onChange={() => toggleChonIn(r.maLenh)} title="Chọn để in" />
                    </td>
                    <td className="td-muted td-center">{i + 1}</td>
                    <td><span className="sub-value">{r.maLenh}</span></td>
                    <td>{r.tenKhoXuat || khoMap[r.maKhoXuat] || r.maKhoXuat}</td>
                    <td>{r.tenKhoNhap || khoMap[r.maKhoNhap] || r.maKhoNhap}</td>
                    <td>{fmtDate(r.ngay)}</td>
                    <td>{fmtDate(r.giaTriDenNgay)}</td>
                    <td>{r.veViec || ''}</td>
                    <td className="td-center"><span className="badge tbdb-status-badge">{r.soDongChiTiet}</span></td>
                    <td>
                      {r.trangThai === 'HOAN_THANH'
                        ? <span className="badge badge--active"><FiCheckCircle size={11} style={{ marginRight: 4 }} />Đã hoàn thành</span>
                        : <span className="badge badge--pending">Đang xử lý</span>}
                    </td>
                    <td className="td-center">
                      <div className="td-actions">
                        <button className="btn-icon-edit" onClick={() => setDetailRow(r)} title="Xem chi tiết">
                          <FiEye size={13} />
                        </button>
                        <button className="btn-icon-warn" onClick={() => navigate(`/tb-dong-bo/huy-thanh-ly/cap-nhat/${r.maLenh}`)} title="Xử lý">
                          <FiEdit2 size={13} />
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

      <HuyThanhLyPrintView lenh={printData?.lenh} rows={printData?.rows} />

      {detailRow && <ChiTietLenhModal row={detailRow} khoMap={khoMap} onClose={() => setDetailRow(null)} />}
    </div>
  );
}

// Xem thông tin các trường của bản ghi lệnh (bảng Lenh) — không phải dòng chi tiết (đã có ở trang
// Xử lý) và không phải bản in trang trọng (đã có ở nút "In lệnh").
function ChiTietLenhModal({ row, khoMap, onClose }) {
  const rows = [
    ['Số lệnh', row.maLenh],
    ['Ngày', fmtDate(row.ngay)],
    ['Ngày hiệu lực', fmtDate(row.ngayHieuLuc)],
    ['Ngày hết hạn', fmtDate(row.giaTriDenNgay)],
    ['Kho xuất', row.tenKhoXuat || khoMap[row.maKhoXuat] || ''],
    ['Kho nhập', row.tenKhoNhap || khoMap[row.maKhoNhap] || ''],
    ['Trạng thái', row.trangThai === 'HOAN_THANH' ? 'Đã hoàn thành' : 'Đang xử lý'],
    ['Số dòng', row.soDongChiTiet ?? ''],
    ['Căn cứ', row.canCu || ''],
    ['Về việc', row.veViec || ''],
    ['Ghi chú', row.ghiChu || ''],
  ];
  return (
    <div className="overlay">
      <div className="modal modal--form fade-in">
        <div className="modal-header">
          <h3 className="modal-title">Chi tiết lệnh {row.maLenh}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2col">
            {rows.map(([label, value]) => (
              <div className={`form-field${label === 'Ghi chú' ? ' form-field--full' : ''}`} key={label}>
                <label className="form-label">{label}</label>
                <div className="form-input" style={{ background: '#f5f6f8', color: '#000', minHeight: 37 }}>{value}</div>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button className="btn-cancel" onClick={onClose}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
}

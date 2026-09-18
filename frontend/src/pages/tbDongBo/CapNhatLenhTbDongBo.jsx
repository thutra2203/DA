import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { lenhTbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiSearch, FiEye, FiEdit2, FiCheckCircle, FiPrinter } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useAuth } from '../../context/AuthContext';
import LenhPrintView from './LenhPrintView';
import SkeletonTable from '../../components/ui/SkeletonTable';
import Pagination from '../../components/ui/Pagination';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const PAGE_SIZE = 10;

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');
const isXuat = (tenLoaiLenh) => (tenLoaiLenh || '').toLowerCase().includes('xuất');

// Quá hạn: lệnh chưa kết thúc mà "Giá trị đến ngày" đã qua (so sánh theo ngày, bỏ giờ phút).
const isQuaHan = (row) => {
  if (!row.giaTriDenNgay) return false;
  const hetHan = new Date(row.giaTriDenNgay); hetHan.setHours(0, 0, 0, 0);
  const homNay = new Date(); homNay.setHours(0, 0, 0, 0);
  return hetHan < homNay;
};

export default function CapNhatLenhTbDongBo() {
  usePageTitle('Cập nhật lệnh nhập/xuất TB đồng bộ');
  const navigate = useNavigate();
  const { user } = useAuth();
  const maKhoNguoiDung = user?.maDonVi || null;
  const [loaiLenhList, setLoaiLenhList] = useState([]);
  const [activeLoaiLenh, setActiveLoaiLenh] = useState('');
  const [khoList, setKhoList] = useState([]);
  const [lyDoList, setLyDoList] = useState([]);
  const [htttList, setHtttList] = useState([]);
  const [detailRow, setDetailRow] = useState(null); // lệnh đang xem chi tiết — dữ liệu lấy sẵn từ danh sách

  const [selectedKho] = useState(maKhoNguoiDung || 'ALL'); // không có bộ lọc trên giao diện — chỉ khoanh theo kho của người dùng nếu bị giới hạn
  const [selectedLyDo, setSelectedLyDo] = useState('ALL');
  const [selectedTrangThai, setSelectedTrangThai] = useState('ALL');
  const [selectedNam, setSelectedNam] = useState('ALL');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [printData, setPrintData] = useState(null); // { lenh, rows } — dữ liệu của lệnh đang chuẩn bị in
  const [dangInLenh, setDangInLenh] = useState(false);
  const [maLenhChonIn, setMaLenhChonIn] = useState(null); // chỉ chọn được đúng 1 lệnh để in tại 1 thời điểm

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const toggleChonIn = (maLenh) => setMaLenhChonIn(prev => (prev === maLenh ? null : maLenh));

  // In nhanh ngay từ danh sách — tự tải thông tin lệnh + danh sách dòng chi tiết của lệnh đang
  // được chọn (checkbox), render ẩn (LenhPrintView) rồi mở hộp thoại in ngay khi có đủ dữ liệu.
  const handlePrint = async () => {
    if (!maLenhChonIn) return;
    setDangInLenh(true);
    try {
      const [lenhRes, ctRes] = await Promise.all([
        lenhTbDongBoAPI.getOne(maLenhChonIn),
        lenhTbDongBoAPI.chiTiet.getAll(maLenhChonIn),
      ]);
      setPrintData({ lenh: lenhRes.data, rows: ctRes.data });
    } catch { showToast('Không tải được dữ liệu để in', 'error'); }
    finally { setDangInLenh(false); }
  };

  useEffect(() => {
    if (!printData) return;
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, [printData]);

  useEffect(() => {
    Promise.all([
      danhMucAPI.getAll('tinh-chat-nhap-xuat').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('kho').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('chi-tiet-tcnx').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('httt').then(res => res.data).catch(() => []),
    ]).then(([nx, kho, ctnx, httt]) => {
      // Trang này chỉ làm Nhập/Xuất — các loại lệnh khác (Chuyển cấp chất lượng, Xuất hủy/thanh lý,
      // Thay đổi hình thức niêm cất, Tồn đầu kỳ) đã có màn hình riêng ở menu, không hiện lại ở đây
      // để tránh trùng chức năng.
      const CHI_NHAP_XUAT = ['NHAPTBDB', 'XUATTBDB'];
      const nxTbdb = nx.filter(n => n.nhomTB === 'TBDB' && CHI_NHAP_XUAT.includes(n.maNX));
      setLoaiLenhList(nxTbdb);
      setActiveLoaiLenh(nxTbdb[0]?.maNX || '');
      setKhoList(kho);
      setLyDoList(ctnx);
      setHtttList(httt);
    });
  }, []);

  const loadItems = (maLoaiLenh, maKho) => {
    if (!maLoaiLenh) return;
    setLoading(true);
    return lenhTbDongBoAPI.getAll(maLoaiLenh, maKho === 'ALL' ? undefined : maKho)
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadItems(activeLoaiLenh, selectedKho); }, [activeLoaiLenh, selectedKho]);
  useEffect(() => { setMaLenhChonIn(null); setSelectedLyDo('ALL'); }, [activeLoaiLenh]);

  const activeLoai = loaiLenhList.find(n => n.maNX === activeLoaiLenh);
  const xuat = isXuat(activeLoai?.tenNX);
  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);
  const lyDoTrongLoai = lyDoList.filter(l => l.maNX === activeLoaiLenh);
  const namList = useMemo(() => (
    [...new Set(items.filter(l => l.ngay).map(l => new Date(l.ngay).getFullYear()))].sort((a, b) => b - a)
  ), [items]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(l => {
      // Lệnh còn đang soạn thảo (chưa "Ghi lệnh") chưa sẵn sàng xử lý thực nhập/xuất — chỉ hiện ở
      // đây từ khi đã ban hành.
      if (l.trangThai === 'DANG_SOAN_THAO') return false;
      if (selectedLyDo !== 'ALL' && l.maLenhChiTiet !== selectedLyDo) return false;
      if (selectedTrangThai !== 'ALL') {
        const daHoanThanh = l.trangThai === 'HOAN_THANH';
        const quaHan = !daHoanThanh && isQuaHan(l);
        if (selectedTrangThai === 'HOAN_THANH' && !daHoanThanh) return false;
        if (selectedTrangThai === 'QUA_HAN' && !quaHan) return false;
        if (selectedTrangThai === 'DANG_XU_LY' && (daHoanThanh || quaHan)) return false;
      }
      if (selectedNam !== 'ALL' && (!l.ngay || new Date(l.ngay).getFullYear() !== Number(selectedNam))) return false;
      if (!q) return true;
      return [l.maLenh, l.veViec, l.canCu, l.tenLyDo].some(v => String(v ?? '').toLowerCase().includes(q));
    });
  }, [items, search, selectedLyDo, selectedTrangThai, selectedNam]);

  useEffect(() => { setPage(1); }, [activeLoaiLenh, selectedKho, selectedLyDo, selectedTrangThai, selectedNam, search]);
  const paged = bySearch.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="data-card">
        <div className="table-toolbar">
          <span className="table-total">Tổng: <strong>{bySearch.length}</strong> lệnh</span>
          <button className="btn-print" onClick={handlePrint} disabled={!maLenhChonIn || dangInLenh}>
            <FiPrinter style={{ marginRight: 6 }} /> {dangInLenh ? 'Đang tải...' : 'In lệnh'}
          </button>
        </div>

        <div className="tbdb-loai-row">
          {loaiLenhList.map(n => (
            <button
              key={n.maNX}
              className={`tbdb-loai-chip${activeLoaiLenh === n.maNX ? ' tbdb-loai-chip--active' : ''}`}
              onClick={() => setActiveLoaiLenh(n.maNX)}
            >
              <span className="tbdb-loai-chip-label">Lệnh {n.tenNX}</span>
            </button>
          ))}
        </div>

        <div className="table-toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ width: 260 }}>
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Tìm theo số lệnh, về việc, căn cứ..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="tbdb-filter-select" value={selectedLyDo} onChange={e => setSelectedLyDo(e.target.value)}>
              <option value="ALL">Tất cả lý do</option>
              {lyDoTrongLoai.map(l => <option key={l.maCTNX} value={l.maCTNX}>{l.tenCTNX}</option>)}
            </select>
            <select className="tbdb-filter-select" value={selectedTrangThai} onChange={e => setSelectedTrangThai(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="HOAN_THANH">Đã hoàn thành</option>
              <option value="DANG_XU_LY">Đang xử lý</option>
              <option value="QUA_HAN">Quá hạn</option>
            </select>
            <select className="tbdb-filter-select" value={selectedNam} onChange={e => setSelectedNam(e.target.value)}>
              <option value="ALL">Tất cả năm</option>
              {namList.map(nam => <option key={nam} value={nam}>{nam}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={11} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✏️</div>
            <div className="empty-state-title">Không có lệnh {activeLoai?.tenNX?.toLowerCase()} nào</div>
            <div className="empty-state-desc">Lệnh mới được tạo ở trang "Tạo lệnh nhập/xuất"</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: 'center' }}></th>
                    <th style={{ width: 50 }}>STT</th>
                    <th>Số lệnh</th>
                    <th>Ngày</th>
                    <th>Lý do</th>
                    <th>{xuat ? 'Kho xuất' : 'Kho nhập'}</th>
                    <th>Đối tác</th>
                    <th>Về việc</th>
                    <th style={{ textAlign: 'center' }}>Số dòng</th>
                    <th>Trạng thái</th>
                    <th style={{ width: 110, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => {
                    const daHoanThanh = row.trangThai === 'HOAN_THANH';
                    return (
                    <tr key={row.maLenh}>
                      <td className="td-center">
                        <input type="checkbox" checked={maLenhChonIn === row.maLenh} onChange={() => toggleChonIn(row.maLenh)} title="Chọn để in" />
                      </td>
                      <td className="td-muted td-center">{startIdx + i + 1}</td>
                      <td><span className="sub-value">{row.maLenh}</span></td>
                      <td>{fmtDate(row.ngay)}</td>
                      <td>{row.tenLyDo || row.maLenhChiTiet || ''}</td>
                      <td>{xuat ? (row.tenKhoXuat || khoMap[row.maKhoXuat] || '') : (row.tenKhoNhap || khoMap[row.maKhoNhap] || '')}</td>
                      <td>
                        {row.maNcc
                          ? (row.tenNcc || row.maNcc)
                          : (xuat ? (row.tenKhoNhap || khoMap[row.maKhoNhap] || '') : (row.tenKhoXuat || khoMap[row.maKhoXuat] || ''))}
                      </td>
                      <td>{row.veViec || ''}</td>
                      <td className="td-center"><span className="badge tbdb-status-badge">{row.soDongChiTiet}</span></td>
                      <td>
                        {daHoanThanh
                          ? <span className="badge badge--active"><FiCheckCircle size={11} style={{ marginRight: 4 }} />Đã hoàn thành</span>
                          : isQuaHan(row)
                            ? <span className="badge badge--locked">Quá hạn</span>
                            : <span className="badge badge--pending">Đang xử lý</span>}
                      </td>
                      <td className="td-center">
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          <button className="btn-icon-edit" onClick={() => setDetailRow(row)} title="Xem chi tiết">
                            <FiEye size={13} />
                          </button>
                          <button className="btn-icon-warn" onClick={() => navigate(`/tb-dong-bo/cap-nhat-lenh-nhap-xuat/${row.maLenh}`)} title="Xử lý thực nhập/xuất">
                            <FiEdit2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={bySearch.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>

      <LenhPrintView lenh={printData?.lenh} rows={printData?.rows} />

      {detailRow && (
        <ChiTietLenhModal row={detailRow} xuat={xuat} khoMap={khoMap} htttList={htttList} onClose={() => setDetailRow(null)} />
      )}
    </div>
  );
}

// Xem thông tin các trường của bản ghi lệnh (bảng Lenh) — không phải dòng chi tiết (đã có ở trang
// Xử lý) và không phải bản in trang trọng (đã có ở nút "In lệnh"). Dữ liệu lấy thẳng từ dòng đang
// có trong danh sách, không cần gọi thêm API.
function ChiTietLenhModal({ row, xuat, khoMap, htttList, onClose }) {
  const daHoanThanh = row.trangThai === 'HOAN_THANH';
  const tenHttt = htttList.find(h => h.maHTTT === row.maHttt)?.tenHTTT || '';
  const doiTac = row.maNcc
    ? (row.tenNcc || row.maNcc)
    : (xuat ? (row.tenKhoNhap || khoMap[row.maKhoNhap] || '') : (row.tenKhoXuat || khoMap[row.maKhoXuat] || ''));

  const rows = [
    ['Số lệnh', row.maLenh],
    ['Loại lệnh', xuat ? 'Xuất' : 'Nhập'],
    ['Lý do', row.tenLyDo || ''],
    ['Ngày', fmtDate(row.ngay)],
    ['Ngày hiệu lực', fmtDate(row.ngayHieuLuc)],
    ['Ngày hết hạn', fmtDate(row.giaTriDenNgay)],
    [xuat ? 'Kho xuất' : 'Kho nhập', xuat ? (row.tenKhoXuat || khoMap[row.maKhoXuat] || '') : (row.tenKhoNhap || khoMap[row.maKhoNhap] || '')],
    ['Đối tác', doiTac],
    ['Hình thức thanh toán', tenHttt],
    ['Phương thức vận chuyển', row.ptVanChuyen || ''],
    ['Đơn vị chuyển', row.donViChuyen || ''],
    ['Trạng thái', daHoanThanh ? 'Đã hoàn thành' : isQuaHan(row) ? 'Quá hạn' : 'Đang xử lý'],
    ['Số dòng', row.soDongChiTiet],
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

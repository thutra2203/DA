import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { chuyenCapAPI, danhMucAPI } from '../../services/api';
import { FiSearch, FiEye, FiCheckCircle, FiPrinter } from 'react-icons/fi';
import { usePageTitle } from '../../context/PageHeaderContext';
import SkeletonTable from '../../components/ui/SkeletonTable';
import ChuyenCapPrintView from './ChuyenCapPrintView';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

export default function ChuyenCapChatLuong() {
  usePageTitle('Chuyển cấp chất lượng');
  const navigate = useNavigate();

  const [khoList, setKhoList] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [printData, setPrintData] = useState(null); // lệnh (kèm chiTiet) đang chuẩn bị in
  const [dangInLenh, setDangInLenh] = useState(false);
  const [maLenhChonIn, setMaLenhChonIn] = useState(null); // chỉ chọn được đúng 1 lệnh để in tại 1 thời điểm

  const toggleChonIn = (maLenh) => setMaLenhChonIn(prev => (prev === maLenh ? null : maLenh));

  // In nhanh ngay từ danh sách, không cần điều hướng sang trang xử lý — tự tải thông tin lệnh (kèm
  // chi tiết, chuyenCapAPI.getOne trả về sẵn cả 2 trong 1 lần gọi) rồi mở hộp thoại in ngay khi có
  // đủ dữ liệu.
  const handlePrint = async () => {
    if (!maLenhChonIn) return;
    setDangInLenh(true);
    try {
      const res = await chuyenCapAPI.getOne(maLenhChonIn);
      setPrintData(res.data);
    } catch { /* bỏ qua — nút In lệnh vẫn khả dụng để thử lại */ }
    finally { setDangInLenh(false); }
  };

  useEffect(() => {
    if (!printData) return;
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, [printData]);

  useEffect(() => { danhMucAPI.getAll('kho').then(res => setKhoList(res.data)).catch(() => setKhoList([])); }, []);

  useEffect(() => {
    setLoading(true);
    chuyenCapAPI.getAll()
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(l => [l.maLenh, l.tenKho, l.maKho].some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [items, search]);

  return (
    <div>
      <div className="data-card">
        <div className="table-toolbar">
          <span className="table-total">Tổng: <strong>{bySearch.length}</strong> lệnh chuyển cấp</span>
          <button className="btn-print" onClick={handlePrint} disabled={!maLenhChonIn || dangInLenh}>
            <FiPrinter style={{ marginRight: 6 }} /> {dangInLenh ? 'Đang tải...' : 'In lệnh'}
          </button>
        </div>

        <div className="table-toolbar">
          <div className="search-wrap" style={{ width: 260 }}>
            <FiSearch className="search-icon" />
            <input className="search-input" placeholder="Tìm theo mã lệnh, kho..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={9} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏅</div>
            <div className="empty-state-title">Chưa có lệnh chuyển cấp nào</div>
            <div className="empty-state-desc">Lệnh chuyển cấp do cấp trên tạo sẽ hiển thị ở đây để thực hiện</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: 'center' }}></th>
                  <th style={{ width: 50 }}>STT</th>
                  <th>Mã lệnh</th>
                  <th>Kho</th>
                  <th>Ngày lập</th>
                  <th>Ngày kết thúc</th>
                  <th style={{ textAlign: 'center' }}>Số dòng</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Thao tác</th>
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
                    <td>{r.tenKho || khoMap[r.maKho] || r.maKho}</td>
                    <td>{fmtDate(r.ngayLap)}</td>
                    <td>{fmtDate(r.ngayKetThuc)}</td>
                    <td className="td-center"><span className="badge tbdb-status-badge">{r.soDong}</span></td>
                    <td>
                      {r.daKetThuc
                        ? <span className="badge badge--active"><FiCheckCircle size={11} style={{ marginRight: 4 }} />Đã kết thúc</span>
                        : <span className="badge badge--pending">Chờ thực hiện</span>}
                    </td>
                    <td className="td-center">
                      <div className="td-actions">
                        <button className="btn-icon-edit" onClick={() => navigate(`/tb-dong-bo/chuyen-cap/${r.maLenh}`)} title="Xử lý">
                          <FiEye size={13} />
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

      <ChuyenCapPrintView lenh={printData} />
    </div>
  );
}

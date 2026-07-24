import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { nhatKyAPI } from '../services/api';
import { FiClock, FiSearch, FiShieldOff } from 'react-icons/fi';
import SkeletonTable from '../components/ui/SkeletonTable';
import Pagination from '../components/ui/Pagination';
import '../styles/shared.css';

const PAGE_SIZE = 20;

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả hành động' },
  { value: 'DANG_NHAP', label: 'Đăng nhập' },
  { value: 'DANG_XUAT', label: 'Đăng xuất' },
  { value: 'XEM', label: 'Xem' },
  { value: 'THEM', label: 'Thêm' },
  { value: 'SUA', label: 'Sửa' },
  { value: 'XOA', label: 'Xóa' },
  { value: 'PHE_DUYET', label: 'Phê duyệt' },
];

const actionConfig = {
  DANG_NHAP:  { bg: '#e8f5e9', color: '#2e7d32', label: 'Đăng nhập' },
  DANG_XUAT:  { bg: '#e3f2fd', color: '#1565c0', label: 'Đăng xuất' },
  XEM:        { bg: '#f0f4ff', color: '#3949ab', label: 'Xem' },
  THEM:       { bg: '#e3f2fd', color: '#1565c0', label: 'Thêm' },
  SUA:        { bg: '#fff3e0', color: '#e65100', label: 'Sửa' },
  XOA:        { bg: '#fce4ec', color: '#c62828', label: 'Xóa' },
  PHE_DUYET:  { bg: '#f3e5f5', color: '#6a1b9a', label: 'Phê duyệt' },
};

const ketQuaConfig = {
  THANH_CONG: { bg: '#e8f5e9', color: '#2e7d32', label: 'Thành công' },
  THAT_BAI:   { bg: '#fce4ec', color: '#c62828', label: 'Thất bại' },
};

export default function NhatKyHoatDong() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [hanhDong, setHanhDong] = useState('');
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 400);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => { setPage(1); }, [debouncedKeyword, hanhDong, tuNgay, denNgay]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await nhatKyAPI.getAll({ page, pageSize: PAGE_SIZE, keyword: debouncedKeyword, hanhDong, tuNgay, denNgay });
        setLogs(res.data.data);
        setTotal(res.data.total);
      } catch { setLogs([]); setTotal(0); } finally { setLoading(false); }
    };
    load();
  }, [page, debouncedKeyword, hanhDong, tuNgay, denNgay]);

  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-icon" style={{ background: '#e8eaf6' }}><FiClock size={20} color="#3949ab" /></div>
          <div>
            <h2 className="page-title">Nhật ký hoạt động</h2>
            <p className="page-sub">Theo dõi đăng nhập, đăng xuất và các thao tác trong hệ thống (chỉ Admin)</p>
          </div>
        </div>
      </div>

      <div className="data-card">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
            <div className="search-wrap">
              <FiSearch className="search-icon" />
              <input
                className="search-input"
                style={{ width: 220 }}
                placeholder="Tìm theo tài khoản, mô tả..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
              />
            </div>
            <select className="form-input" style={{ width: 190 }} value={hanhDong} onChange={e => { setHanhDong(e.target.value); setPage(1); }}>
              {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="date" className="form-input" style={{ width: 150 }} value={tuNgay} onChange={e => { setTuNgay(e.target.value); setPage(1); }} />
            <input type="date" className="form-input" style={{ width: 150 }} value={denNgay} onChange={e => { setDenNgay(e.target.value); setPage(1); }} />
          </div>
          <span className="table-total">Tổng: <strong>{total}</strong> hoạt động</span>
        </div>

        {loading ? (
          <SkeletonTable cols={5} rows={8} />
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FiShieldOff /></div>
            <div className="empty-state-title">Không có hoạt động nào</div>
            <div className="empty-state-desc">Không tìm thấy nhật ký khớp với bộ lọc hiện tại</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {['Thời gian', 'Tài khoản', 'Hành động', 'Mô tả', 'Kết quả'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const ac = actionConfig[log.HanhDong] || { bg: '#f0f0f0', color: '#555', label: log.HanhDong };
                    const kc = ketQuaConfig[log.KetQua] || { bg: '#f0f0f0', color: '#555', label: log.KetQua };
                    return (
                      <tr key={log.ID}>
                        <td className="td-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(log.ThoiGian).toLocaleString('vi-VN')}
                        </td>
                        <td className="main-value">{log.TenDangNhap || '—'}</td>
                        <td>
                          <span className="badge" style={{ background: ac.bg, color: ac.color }}>{ac.label}</span>
                        </td>
                        <td>{log.MoTa || log.LyDoThatBai || '—'}</td>
                        <td>
                          <span className="badge" style={{ background: kc.bg, color: kc.color }}>{kc.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { statsAPI } from '../services/api';
import { FiUsers, FiArchive, FiBook, FiGrid, FiRefreshCw } from 'react-icons/fi';
import { GiCrossedSwords } from 'react-icons/gi';
import './Dashboard.css';

const STAT_DEFS = [
  { key: 'taiKhoan',       label: 'Tài khoản',         icon: <FiUsers size={22} />,   color: '#1565c0', bg: '#e3f2fd' },
  { key: 'donVi',          label: 'Đơn vị',             icon: <FiGrid size={22} />,    color: '#2e7d32', bg: '#e8f5e9' },
  { key: 'toChucKho',      label: 'Tổ chức kho',        icon: <FiArchive size={22} />, color: '#e65100', bg: '#fff3e0' },
  { key: 'tuDienDungChung',label: 'Từ điển dùng chung', icon: <FiBook size={22} />,    color: '#6a1b9a', bg: '#f3e5f5' },
];

const quickLinks = [
  { label: 'Quản lý người dùng', desc: 'Thêm, phân quyền, khóa tài khoản', path: '/users', icon: <FiUsers size={26} />, color: '#1a3a5c' },
  { label: 'Danh mục đơn vị',   desc: 'Quản lý danh mục các đơn vị',       path: '/danh-muc/don-vi',      icon: <FiGrid size={26} />,    color: '#1b5e20' },
  { label: 'Tổ chức kho',       desc: 'Quản lý tổ chức kho vũ khí',         path: '/danh-muc/to-chuc-kho', icon: <FiArchive size={26} />, color: '#bf360c' },
  { label: 'Từ điển TBN1',      desc: 'Danh mục từ điển trang bị nhóm 1',   path: '/danh-muc/tu-dien-tbn1',icon: <FiBook size={26} />,    color: '#4a148c' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await statsAPI.get();
      setStats(res.data);
    } catch {
      setStats({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div>
      {/* Welcome banner */}
      <div className="dashboard-banner">
        <div className="dashboard-banner-icon"><GiCrossedSwords size={38} color="#fff" /></div>
        <div>
          <h2 className="dashboard-banner-title">Xin chào, {user?.hoTen}!</h2>
          <p className="dashboard-banner-sub">Chào mừng đến với Hệ thống Quản lý Vũ khí Trang bị — Kho Quân khí</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            className={`dashboard-refresh-btn${refreshing ? ' dashboard-refresh-btn--spin' : ''}`}
            onClick={() => fetchStats(true)}
            title="Làm mới thống kê"
          >
            <FiRefreshCw size={15} />
          </button>
          <div className="dashboard-banner-badge">{user?.role}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {STAT_DEFS.map((s) => (
          <div key={s.key} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div style={{ flex: 1 }}>
              {loading ? (
                <div className="stat-skeleton" />
              ) : (
                <div className="stat-value">{stats?.[s.key] ?? '—'}</div>
              )}
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <h3 className="section-title">Truy cập nhanh</h3>
      <div className="quick-grid">
        {quickLinks.map((item) => (
          <a key={item.label} href={item.path} className="quick-card">
            <div className="quick-icon" style={{ background: item.color }}>
              {item.icon}
            </div>
            <div>
              <div className="quick-title">{item.label}</div>
              <div className="quick-desc">{item.desc}</div>
            </div>
            <div className="quick-arrow">→</div>
          </a>
        ))}
      </div>

      {/* Tổng hợp danh mục */}
      <h3 className="section-title">Thống kê danh mục</h3>
      <div className="cat-grid">
        {[
          { label: 'Cấp bậc',           key: 'capBac' },
          { label: 'Chức vụ',           key: 'chucVu' },
          { label: 'Tổ chức nhân sự',   key: 'toChucNhanSu' },
          { label: 'Từ điển TBN1',      key: 'tuDienTbn1' },
          { label: 'Từ điển TBN2',      key: 'tuDienTbn2' },
          { label: 'Từ điển dùng chung',key: 'tuDienDungChung' },
        ].map(item => (
          <div key={item.key} className="cat-card">
            {loading ? (
              <div className="cat-skeleton" />
            ) : (
              <span className="cat-count">{stats?.[item.key] ?? 0}</span>
            )}
            <span className="cat-label">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="info-box">
        <div className="info-box-title">📋 Thông tin hệ thống</div>
        <div className="info-grid">
          <div><span className="info-key">Phiên bản:</span> 1.0.0</div>
          <div><span className="info-key">Môi trường:</span> Development</div>
          <div><span className="info-key">Database:</span> SQL Server</div>
          <div><span className="info-key">Năm xây dựng:</span> 2024</div>
        </div>
      </div>
    </div>
  );
}

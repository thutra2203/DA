import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiUsers, FiList, FiChevronDown, FiChevronUp,
  FiMenu, FiX, FiHome,
  FiBookOpen, FiGrid, FiArchive, FiBook,
  FiLogOut, FiUser, FiShield,
} from 'react-icons/fi';
import { GiCrossedSwords } from 'react-icons/gi';
import './MainLayout.css';

const menuItems = [
  { label: 'Tổng quan', path: '/dashboard', icon: <FiHome /> },
  { label: 'Quản lý người dùng', path: '/users', icon: <FiUsers />, adminOnly: true },
  { label: 'Quản lý vai trò', path: '/vai-tro', icon: <FiShield />, adminOnly: true },
  { label: 'Phân quyền', path: '/phan-quyen', icon: <FiShield />, adminOnly: true },
  {
    label: 'Quản lý danh mục',
    icon: <FiList />,
    children: [
      { label: 'Danh mục đơn vị', path: '/danh-muc/don-vi', icon: <FiGrid /> },
      { label: 'Danh mục cấp bậc', path: '/danh-muc/cap-bac', icon: <FiBookOpen /> },
      { label: 'Danh mục chức vụ', path: '/danh-muc/chuc-vu', icon: <FiBook /> },
      { label: 'Tổ chức và nhân sự', path: '/danh-muc/to-chuc-nhan-su', icon: <FiUsers /> },
      { label: 'Tổ chức kho', path: '/danh-muc/to-chuc-kho', icon: <FiArchive /> },
      { label: 'Từ điển TBN1', path: '/danh-muc/tu-dien-tbn1', icon: <FiBook /> },
      { label: 'Từ điển TBN2', path: '/danh-muc/tu-dien-tbn2', icon: <FiBook /> },
      { label: 'Từ điển dùng chung', path: '/danh-muc/tu-dien-dung-chung', icon: <FiBook /> },
    ],
  },
];

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState('Quản lý danh mục');
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;
  const isGroupActive = (children) => children.some(c => location.pathname === c.path);

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="layout-wrapper">
      {/* Sidebar */}
      <div className="sidebar" style={{ width: collapsed ? 64 : 250 }}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><GiCrossedSwords size={20} color="#fff" /></div>
          {!collapsed && (
            <div>
              <div className="sidebar-logo-text">QUÂN KHÍ</div>
              <div className="sidebar-logo-sub">Quản lý vũ khí trang bị</div>
            </div>
          )}
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <FiMenu color="#fff" /> : <FiX color="rgba(255,255,255,0.6)" />}
          </button>
        </div>

        {/* User info */}
        {!collapsed && (
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{user?.hoTen?.[0] || 'A'}</div>
            <div>
              <div className="sidebar-username">{user?.hoTen}</div>
              <div className="sidebar-userrole">{user?.role}</div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="sidebar-nav">
          {menuItems.filter(item => !item.adminOnly || user?.role === 'Admin').map((item) => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <div
                    className={`menu-item${isGroupActive(item.children) ? ' menu-item--group-active' : ''}`}
                    onClick={() => setOpenMenu(openMenu === item.label ? '' : item.label)}
                    title={collapsed ? item.label : ''}
                  >
                    <div className="menu-item-left">
                      <span className="menu-icon">{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                    {!collapsed && (openMenu === item.label ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />)}
                  </div>
                  {!collapsed && openMenu === item.label && (
                    <div className="sub-group">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`sub-item${isActive(child.path) ? ' sub-item--active' : ''}`}
                        >
                          <span style={{ marginRight: 8, opacity: 0.7 }}>{child.icon}</span>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  className={`menu-item${isActive(item.path) ? ' menu-item--active' : ''}`}
                  title={collapsed ? item.label : ''}
                >
                  <div className="menu-item-left">
                    <span className="menu-icon">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div className="main-content">
        {/* Header */}
        <div className="main-header">
          <div>
            <h3 className="header-title">HỆ THỐNG QUẢN LÝ VŨ KHÍ TRANG BỊ</h3>
            <p className="header-sub">Kho quân khí — Phần mềm quản lý tổng hợp</p>
          </div>

          {/* Avatar + Dropdown */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <div className="header-user" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="header-avatar">{user?.hoTen?.[0] || 'A'}</div>
              <div>
                <div className="header-name">{user?.hoTen}</div>
                <div className="header-role">{user?.role}</div>
              </div>
              <FiChevronDown
                size={14}
                color="#999"
                className={`header-chevron${showUserMenu ? ' header-chevron--open' : ''}`}
                style={{ marginLeft: 6 }}
              />
            </div>

            {showUserMenu && (
              <div className="user-dropdown fade-in">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">{user?.hoTen?.[0] || 'A'}</div>
                  <div>
                    <div className="dropdown-name">{user?.hoTen}</div>
                    <div className="dropdown-username">{user?.username}</div>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                  <FiUser size={14} />
                  Thông tin tài khoản
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item dropdown-item--danger" onClick={handleLogout}>
                  <FiLogOut size={14} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="content-area">
          <div className="fade-in">{children}</div>
        </div>
      </div>
    </div>
  );
}

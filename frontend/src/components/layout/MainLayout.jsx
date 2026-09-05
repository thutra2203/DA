import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageHeaderProvider, useHeaderTitle } from '../../context/PageHeaderContext';
import {
  FiUsers, FiList, FiChevronDown, FiChevronUp,
  FiMenu, FiX, FiHome,
  FiBookOpen, FiGrid, FiArchive, FiBook,
  FiLogOut, FiUser, FiShield, FiClock,
  FiTarget, FiLayers, FiBarChart2, FiMapPin, FiMap,
  FiFileText, FiPlusSquare, FiEdit, FiPackage,
  FiCheckSquare, FiAward, FiTrash2, FiClipboard, FiRefreshCw,
} from 'react-icons/fi';
import logoMTA from '../../assets/logo-hvktqs.png';
import './MainLayout.css';

const menuItems = [
  { label: 'Tổng quan', path: '/dashboard', icon: <FiHome /> },
  { label: 'Quản lý người dùng', path: '/users', icon: <FiUsers />, adminOnly: true },
  { label: 'Quản lý vai trò', path: '/vai-tro', icon: <FiShield />, adminOnly: true },
  { label: 'Phân quyền', path: '/phan-quyen', icon: <FiShield />, adminOnly: true },
  { label: 'Nhật ký hoạt động', path: '/nhat-ky', icon: <FiClock />, adminOnly: true },
  {
    label: 'Danh mục SPKT / TBDB',
    icon: <FiTarget />,
    children: [
      { label: 'Nhóm SPKT', path: '/danh-muc/nhom-spkt', icon: <FiBook /> },
      { label: 'Loại SPKT', path: '/danh-muc/loai-spkt', icon: <FiBook /> },
      { label: 'Kiểu SPKT', path: '/danh-muc/kieu-spkt', icon: <FiBook /> },
      { label: 'Loại trang bị đồng bộ', path: '/danh-muc/loai-tbdb', icon: <FiBook /> },
    ],
  },
  {
    label: 'Nhân sự',
    icon: <FiList />,
    children: [
      { label: 'Danh mục cấp bậc', path: '/danh-muc/cap-bac', icon: <FiBookOpen /> },
      { label: 'Danh mục chức vụ', path: '/danh-muc/chuc-vu', icon: <FiBook /> },
    ],
  },
  {
    label: 'Đơn vị hành chính',
    icon: <FiMap />,
    children: [
      { label: 'Danh mục tỉnh', path: '/danh-muc/tinh', icon: <FiMap /> },
      { label: 'Danh mục xã', path: '/danh-muc/xa', icon: <FiMapPin /> },
    ],
  },
  {
    label: 'Tổ chức kho',
    icon: <FiArchive />,
    children: [
      { label: 'Danh mục loại kho', path: '/danh-muc/loai-kho', icon: <FiLayers /> },
      { label: 'Danh mục kho', path: '/danh-muc/kho', icon: <FiArchive /> },
    ],
  },
  {
    label: 'Từ điển dùng chung',
    icon: <FiBook />,
    children: [
      { label: 'Đơn vị tính', path: '/danh-muc/dvt', icon: <FiBook /> },
      { label: 'Nước sản xuất', path: '/danh-muc/nsx', icon: <FiBook /> },
      { label: 'Hãng sản xuất', path: '/danh-muc/hang-sx', icon: <FiBook /> },
      { label: 'Nhà cung cấp', path: '/danh-muc/ncc', icon: <FiBook /> },
      { label: 'Cấp chất lượng', path: '/danh-muc/cap-chat-luong', icon: <FiBook /> },
    ],
  },
  {
    label: 'Nghiệp vụ nhập xuất',
    icon: <FiBookOpen />,
    children: [
      { label: 'Hình thức thanh toán', path: '/danh-muc/httt', icon: <FiBook /> },
      { label: 'Hình thức vận chuyển', path: '/danh-muc/ht-van-chuyen', icon: <FiBook /> },
      { label: 'Tính chất nhập xuất', path: '/danh-muc/tinh-chat-nhap-xuat', icon: <FiBook /> },
      { label: 'Chi tiết tính chất NX', path: '/danh-muc/chi-tiet-tcnx', icon: <FiBook /> },
      { label: 'Hình thức niêm cất', path: '/danh-muc/hinh-thuc-niem-cat', icon: <FiBook /> },
      { label: 'Tình trạng bao gói', path: '/danh-muc/tinh-trang-bao-goi', icon: <FiBook /> },
      { label: 'Trạng thái trang bị', path: '/danh-muc/trang-thai-tb', icon: <FiBook /> },
    ],
  },
  { label: 'Quản lý SPKT', path: '/spkt', icon: <FiTarget /> },
  {
    label: 'Quản lý TB đồng bộ',
    icon: <FiLayers />,
    children: [
      { label: 'Hồ sơ TB đồng bộ', path: '/tb-dong-bo/ho-so', icon: <FiFileText /> },
      { label: 'Tạo lệnh nhập/xuất', path: '/tb-dong-bo/tao-lenh-nhap-xuat', icon: <FiPlusSquare /> },
      { label: 'Cập nhật lệnh nhập/xuất', path: '/tb-dong-bo/cap-nhat-lenh-nhap-xuat', icon: <FiEdit /> },
      { label: 'Tồn đầu', path: '/tb-dong-bo/ton-dau', icon: <FiPackage /> },
      {
        label: 'Kiểm kê',
        icon: <FiCheckSquare />,
        children: [
          { label: 'Danh mục đợt kiểm kê', path: '/danh-muc/dot-kiem-ke', icon: <FiClipboard /> },
          { label: 'Kiểm kê TBĐB', path: '/tb-dong-bo/kiem-ke', icon: <FiCheckSquare /> },
          { label: 'Chuyển kỳ', path: '/tb-dong-bo/chuyen-ky', icon: <FiRefreshCw /> },
        ],
      },
      {
        label: 'Quản lý phân cấp chất lượng',
        icon: <FiAward />,
        children: [
          { label: 'Tạo lệnh chuyển cấp', path: '/tb-dong-bo/chuyen-cap/tao-lenh', icon: <FiPlusSquare /> },
          { label: 'Chuyển cấp chất lượng', path: '/tb-dong-bo/chuyen-cap', icon: <FiAward /> },
        ],
      },
      {
        label: 'Hủy/Thanh lý',
        icon: <FiTrash2 />,
        children: [
          { label: 'Tạo lệnh hủy/thanh lý', path: '/tb-dong-bo/huy-thanh-ly/tao-lenh', icon: <FiPlusSquare /> },
          { label: 'Cập nhật lệnh xuất hủy/thanh lý', path: '/tb-dong-bo/huy-thanh-ly/cap-nhat', icon: <FiEdit /> },
        ],
      },
      {
        label: 'Thay đổi vị trí',
        icon: <FiMapPin />,
        children: [
          { label: 'Tạo lệnh thay đổi vị trí', path: '/tb-dong-bo/thay-doi-vi-tri/tao-lenh', icon: <FiPlusSquare /> },
          { label: 'Thay đổi vị trí', path: '/tb-dong-bo/thay-doi-vi-tri', icon: <FiMapPin /> },
        ],
      },
    ],
  },
  { label: 'Tổng hợp, báo cáo', path: '/bao-cao', icon: <FiBarChart2 /> },
];

export default function MainLayout({ children }) {
  return (
    <PageHeaderProvider>
      <MainLayoutInner>{children}</MainLayoutInner>
    </PageHeaderProvider>
  );
}

function MainLayoutInner({ children }) {
  const headerTitle = useHeaderTitle();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState('');
  const [openSub, setOpenSub] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [flyoutPos, setFlyoutPos] = useState(null);
  const userMenuRef = useRef(null);

  const toggleGroup = (label, e) => {
    if (openMenu === label) {
      setOpenMenu('');
      setFlyoutPos(null);
      setOpenSub('');
      return;
    }
    if (collapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      setFlyoutPos({ top: rect.top, left: rect.right + 8 });
    }
    setOpenMenu(label);
    setOpenSub('');
  };

  const toggleSub = (label) => setOpenSub(openSub === label ? '' : label);

  // 1 mục con có thể là link lá (child.path) hoặc 1 nhóm con lồng thêm 1 cấp nữa (child.children,
  // VD "Kiểm kê" bên trong "Quản lý TB đồng bộ") — dùng chung cho cả sub-group thường và flyout.
  const renderChild = (child, flyoutMode) => {
    if (child.children) {
      return (
        <div key={child.label}>
          <div
            className={`sub-item sub-item--group${isGroupActive(child.children) ? ' sub-item--active' : ''}`}
            onClick={() => toggleSub(child.label)}
          >
            <span style={{ marginRight: 8, opacity: 0.7 }}>{child.icon}</span>
            <span style={{ flex: 1 }}>{child.label}</span>
            {openSub === child.label ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
          </div>
          {openSub === child.label && (
            <div className="sub-group sub-group--nested">
              {child.children.map(grandchild => (
                <Link
                  key={grandchild.path}
                  to={grandchild.path}
                  className={`sub-item sub-item--nested${isActive(grandchild.path) ? ' sub-item--active' : ''}`}
                  onClick={flyoutMode ? () => { setOpenMenu(''); setOpenSub(''); setFlyoutPos(null); } : undefined}
                >
                  <span style={{ marginRight: 8, opacity: 0.7 }}>{grandchild.icon}</span>
                  {grandchild.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }
    return (
      <Link
        key={child.path}
        to={child.path}
        className={`sub-item${flyoutMode ? ' sub-item--flyout' : ''}${isActive(child.path) ? ' sub-item--active' : ''}`}
        onClick={flyoutMode ? () => { setOpenMenu(''); setFlyoutPos(null); } : undefined}
      >
        <span style={{ marginRight: 8, opacity: 0.7 }}>{child.icon}</span>
        {child.label}
      </Link>
    );
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;
  const isGroupActive = (children) => children.some(c => c.path ? location.pathname === c.path : (c.children && isGroupActive(c.children)));

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (flyoutPos && !e.target.closest('.sub-group--flyout') && !e.target.closest('.menu-item')) {
        setOpenMenu('');
        setFlyoutPos(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [flyoutPos]);

  return (
    <div className="layout-wrapper">
      {/* Sidebar */}
      <div className="sidebar" style={{ width: collapsed ? 64 : 250 }}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><img src={logoMTA} alt="Học viện Kỹ thuật Quân sự" /></div>
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

        {/* Nav */}
        <nav className="sidebar-nav">
          {menuItems.filter(item => !item.adminOnly || user?.role === 'ADMIN').map((item) => (
            <div key={item.label} style={{ position: 'relative' }}>
              {item.children ? (
                <>
                  <div
                    className={`menu-item${isGroupActive(item.children) ? ' menu-item--group-active' : ''}`}
                    onClick={(e) => toggleGroup(item.label, e)}
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
                      {item.children.map((child) => renderChild(child, false))}
                    </div>
                  )}
                  {collapsed && openMenu === item.label && flyoutPos && createPortal(
                    <div
                      className="sub-group sub-group--flyout"
                      style={{ top: flyoutPos.top, left: flyoutPos.left }}
                    >
                      <div className="sub-group-title">{item.label}</div>
                      {item.children.map((child) => renderChild(child, true))}
                    </div>,
                    document.body
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="sidebar-toggle-btn"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Mở rộng thanh menu' : 'Thu nhỏ thanh menu'}
            >
              <FiMenu size={18} />
            </button>
            <div>
              <h3 className="header-title">{headerTitle}</h3>
            </div>
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

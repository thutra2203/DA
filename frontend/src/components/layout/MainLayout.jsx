import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../context/PermissionContext';
import { authAPI, thongBaoAPI } from '../../services/api';
import { modulesOfPath } from '../../config/permMap';
import { PageHeaderProvider, useHeaderTitle } from '../../context/PageHeaderContext';
import {
  FiUsers, FiList, FiChevronDown, FiChevronUp,
  FiMenu, FiX, FiHome,
  FiBookOpen, FiGrid, FiArchive, FiBook,
  FiLogOut, FiUser, FiShield, FiClock,
  FiTarget, FiLayers, FiBarChart2, FiMapPin, FiMap,
  FiFileText, FiPlusSquare, FiEdit, FiPackage,
  FiCheckSquare, FiAward, FiTrash2, FiClipboard, FiRefreshCw, FiGitBranch, FiBell, FiAlertTriangle, FiSearch,
} from 'react-icons/fi';
import logoMTA from '../../assets/logo-hvktqs.png';
import '../../styles/shared.css';
import './MainLayout.css';

const menuItems = [
  { label: 'Tổng quan', path: '/dashboard', icon: <FiHome /> },

  { type: 'section', label: 'Nghiệp vụ' },
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
      {
        label: 'Thay đổi hình thức niêm cất',
        icon: <FiRefreshCw />,
        children: [
          { label: 'Tạo lệnh thay đổi hình thức niêm cất', path: '/tb-dong-bo/thay-doi-htnc/tao-lenh', icon: <FiPlusSquare /> },
          { label: 'Thay đổi hình thức niêm cất', path: '/tb-dong-bo/thay-doi-htnc', icon: <FiRefreshCw /> },
        ],
      },
      { label: 'Đối chiếu lệnh nhập/xuất', path: '/tb-dong-bo/doi-chieu-lenh', icon: <FiSearch /> },
      { label: 'Dòng đời lô (đồ thị)', path: '/tb-dong-bo/dong-doi-lo', icon: <FiGitBranch /> },
    ],
  },
  { label: 'Tổng hợp, báo cáo', path: '/bao-cao', icon: <FiBarChart2 /> },

  { type: 'section', label: 'Danh mục' },
  {
    label: 'Danh mục từ điển về TB',
    icon: <FiTarget />,
    children: [
      { label: 'Nhóm SPKT', path: '/danh-muc/nhom-spkt', icon: <FiBook /> },
      { label: 'Loại SPKT', path: '/danh-muc/loai-spkt', icon: <FiBook /> },
      { label: 'Kiểu SPKT', path: '/danh-muc/kieu-spkt', icon: <FiBook /> },
      { label: 'Loại trang bị đồng bộ', path: '/danh-muc/loai-tbdb', icon: <FiBook /> },
      { label: 'Nhóm đồng bộ', path: '/danh-muc/nhom-dong-bo', icon: <FiLayers /> },
    ],
  },
  {
    label: 'Danh mục từ điển dùng chung',
    icon: <FiAward />,
    children: [
      { label: 'Cấp chất lượng', path: '/danh-muc/cap-chat-luong', icon: <FiBook /> },
      { label: 'Trạng thái trang bị', path: '/danh-muc/trang-thai-tb', icon: <FiBook /> },
      { label: 'Hình thức niêm cất', path: '/danh-muc/hinh-thuc-niem-cat', icon: <FiBook /> },
      { label: 'Tình trạng bao gói', path: '/danh-muc/tinh-trang-bao-goi', icon: <FiBook /> },
      { label: 'Đơn vị tính', path: '/danh-muc/dvt', icon: <FiBook /> },
      { label: 'Nước sản xuất', path: '/danh-muc/nsx', icon: <FiBook /> },
      { label: 'Hãng sản xuất', path: '/danh-muc/hang-sx', icon: <FiBook /> },
      { label: 'Nhà cung cấp', path: '/danh-muc/ncc', icon: <FiBook /> },
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
    ],
  },
  {
    label: 'Tổ chức kho',
    icon: <FiArchive />,
    children: [
      { label: 'Danh mục loại kho', path: '/danh-muc/loai-kho', icon: <FiLayers /> },
      { label: 'Danh mục cấp quản lý', path: '/danh-muc/cap-quan-ly', icon: <FiLayers /> },
      { label: 'Danh mục kho', path: '/danh-muc/kho', icon: <FiArchive /> },
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

  { type: 'section', label: 'Hệ thống', adminOnly: true },
  { label: 'Quản lý người dùng', path: '/users', icon: <FiUsers />, adminOnly: true },
  { label: 'Quản lý vai trò', path: '/vai-tro', icon: <FiShield />, adminOnly: true },
  { label: 'Phân quyền', path: '/phan-quyen', icon: <FiShield />, adminOnly: true },
  { label: 'Nhật ký hoạt động', path: '/nhat-ky', icon: <FiClock />, adminOnly: true },
];

// Lọc menu theo quyền Xem: giữ lá nếu can(module) (hoặc không map được module); giữ nhóm nếu còn
// ≥1 mục con; giữ section header (bước dedup sẵn có sẽ bỏ section rỗng).
function locMenuTheoQuyen(items, can) {
  const ket = [];
  for (const it of items) {
    if (it.type === 'section') { ket.push(it); continue; }
    if (it.children) {
      const con = locMenuTheoQuyen(it.children, can);
      if (con.length > 0) ket.push({ ...it, children: con });
      continue;
    }
    const mods = modulesOfPath(it.path);
    if (!mods || mods.some(m => can(m, 'xem'))) ket.push(it);
  }
  return ket;
}

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
  const { can, loading: permLoading } = usePermission();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState('');
  const [openSub, setOpenSub] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [flyoutPos, setFlyoutPos] = useState(null);
  const userMenuRef = useRef(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [loadingAccountInfo, setLoadingAccountInfo] = useState(false);

  const [showThongBao, setShowThongBao] = useState(false);
  const [thongBaoList, setThongBaoList] = useState([]);
  const thongBaoRef = useRef(null);

  // Thông báo tính trực tiếp từ dữ liệu (lệnh quá hạn/chờ xử lý, kiểm kê quá hạn/sắp hạn) — không
  // có trạng thái "đã đọc" vì tự biến mất khi hết quá hạn/hoàn thành. Tự làm mới định kỳ để badge
  // luôn cập nhật mà không cần hạ tầng real-time.
  useEffect(() => {
    const load = () => thongBaoAPI.getAll().then(res => setThongBaoList(res.data)).catch(() => setThongBaoList([]));
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  const openAccountInfo = () => {
    setShowUserMenu(false);
    setShowAccountModal(true);
    setLoadingAccountInfo(true);
    authAPI.me()
      .then(res => setAccountInfo(res.data))
      .catch(() => setAccountInfo(null))
      .finally(() => setLoadingAccountInfo(false));
  };

  const fmtNgay = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '—');

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

  const visibleMenuItems = (permLoading ? menuItems : locMenuTheoQuyen(menuItems, can))
    .filter(item => !item.adminOnly || user?.role === 'ADMIN')
    .filter((item, idx, arr) => item.type !== 'section' || (arr[idx + 1] && arr[idx + 1].type !== 'section'));

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;
  const isGroupActive = (children) => children.some(c => c.path ? location.pathname === c.path : (c.children && isGroupActive(c.children)));

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (thongBaoRef.current && !thongBaoRef.current.contains(e.target)) {
        setShowThongBao(false);
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
          {visibleMenuItems.map((item) => (
            <div key={item.label} style={{ position: 'relative' }}>
              {item.type === 'section' ? (
                collapsed ? (
                  <div className="sidebar-section-divider" />
                ) : (
                  <div className="sidebar-section-title">{item.label}</div>
                )
              ) : item.children ? (
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Thông báo */}
            <div ref={thongBaoRef} style={{ position: 'relative' }}>
              <div className="header-bell" onClick={() => setShowThongBao(!showThongBao)} title="Thông báo">
                <FiBell size={18} />
                {thongBaoList.length > 0 && (
                  <span className="header-bell-badge">{thongBaoList.length > 99 ? '99+' : thongBaoList.length}</span>
                )}
              </div>

              {showThongBao && (
                <div className="user-dropdown thongbao-dropdown fade-in">
                  <div className="dropdown-header">
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a5c' }}>Thông báo</div>
                  </div>
                  <div className="dropdown-divider" />
                  <div className="thongbao-list">
                    {thongBaoList.length === 0 ? (
                      <div className="thongbao-empty">Không có thông báo nào</div>
                    ) : (
                      thongBaoList.map((tb, idx) => (
                        <button
                          type="button"
                          key={idx}
                          className={`thongbao-item${tb.mucDo === 'canh_bao' ? ' thongbao-item--canh-bao' : ''}`}
                          onClick={() => { setShowThongBao(false); navigate(tb.duongDan); }}
                        >
                          <span className="thongbao-item-icon">
                            {tb.mucDo === 'canh_bao' ? <FiAlertTriangle size={16} /> : <FiBell size={16} />}
                          </span>
                          <span>
                            <div className="thongbao-item-title">{tb.tieuDe}</div>
                            <div className="thongbao-item-noidung">{tb.noiDung}</div>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
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
                  <button className="dropdown-item" onClick={openAccountInfo}>
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
        </div>

        {/* Content */}
        <div className="content-area">
          <div className="fade-in">{children}</div>
        </div>
      </div>

      {showAccountModal && (
        <div className="overlay" onClick={() => setShowAccountModal(false)}>
          <div className="modal modal--form fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thông tin tài khoản</h3>
              <button className="modal-close-btn" onClick={() => setShowAccountModal(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              {loadingAccountInfo ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>Đang tải...</div>
              ) : !accountInfo ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>Không tải được thông tin tài khoản</div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                    <div className="dropdown-avatar" style={{ width: 48, height: 48, fontSize: 20 }}>
                      {accountInfo.hoTen?.[0] || 'A'}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1a3a5c' }}>{accountInfo.hoTen}</div>
                      <div style={{ fontSize: 13, color: '#777' }}>@{accountInfo.username}</div>
                    </div>
                  </div>
                  <div className="form-grid-2col">
                    <div className="form-field">
                      <label className="form-label">Vai trò</label>
                      <div style={{ fontSize: 13.5 }}>{accountInfo.tenVaiTro || '—'}</div>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Đơn vị / Kho</label>
                      <div style={{ fontSize: 13.5 }}>{accountInfo.tenDonVi || '—'}</div>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Cấp bậc</label>
                      <div style={{ fontSize: 13.5 }}>{accountInfo.tenCapBac || '—'}</div>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Chức vụ</label>
                      <div style={{ fontSize: 13.5 }}>{accountInfo.tenChucVu || '—'}</div>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Email</label>
                      <div style={{ fontSize: 13.5 }}>{accountInfo.email || '—'}</div>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Số điện thoại</label>
                      <div style={{ fontSize: 13.5 }}>{accountInfo.soDienThoai || '—'}</div>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Lần đăng nhập cuối</label>
                      <div style={{ fontSize: 13.5 }}>{fmtNgay(accountInfo.lanDangNhapCuoi)}</div>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Ngày tạo tài khoản</label>
                      <div style={{ fontSize: 13.5 }}>{fmtNgay(accountInfo.createdAt)}</div>
                    </div>
                  </div>
                </>
              )}
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowAccountModal(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

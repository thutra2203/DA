import { useState, useEffect } from 'react';
import { danhMucAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { usePermission } from '../../context/PermissionContext';
import SkeletonTable from '../../components/ui/SkeletonTable';
import Pagination from '../../components/ui/Pagination';
import '../../styles/shared.css';

const PAGE_SIZE = 10;

const CONFIG = {
  'don-vi':             { title: 'Danh mục đơn vị',            icon: '🏢', emptyIcon: '🏢', fields: [{ key: 'MaDonVi', label: 'Mã đơn vị', apiKey: 'maDonVi' }, { key: 'TenDonVi', label: 'Tên đơn vị', apiKey: 'tenDonVi', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'cap-bac':            { title: 'Danh mục cấp bậc',           icon: '⭐', emptyIcon: '⭐', fields: [{ key: 'MaCapBac', label: 'Mã cấp bậc', apiKey: 'maCapBac' }, { key: 'TenCapBac', label: 'Tên cấp bậc', apiKey: 'tenCapBac', required: true }] },
  'chuc-vu':            { title: 'Danh mục chức vụ',           icon: '💼', emptyIcon: '💼', fields: [{ key: 'MaChucVu', label: 'Mã chức vụ', apiKey: 'maChucVu' }, { key: 'TenChucVu', label: 'Tên chức vụ', apiKey: 'tenChucVu', required: true }] },
  'to-chuc-nhan-su':    { title: 'Danh mục tổ chức và nhân sự',icon: '👥', emptyIcon: '👥', fields: [{ key: 'MaToChuc', label: 'Mã tổ chức', apiKey: 'maToChuc' }, { key: 'TenToChuc', label: 'Tên tổ chức', apiKey: 'tenToChuc', required: true }] },
  'to-chuc-kho':        { title: 'Danh mục kho',                icon: '🏭', emptyIcon: '🏭', fields: [{ key: 'MaKho', label: 'Mã kho', apiKey: 'maKho' }, { key: 'TenKho', label: 'Tên kho', apiKey: 'tenKho', required: true }, { key: 'DiaDiem', label: 'Địa điểm', apiKey: 'diaDiem' }] },

  // Đơn vị hành chính
  'tinh':               { title: 'Danh mục tỉnh',               icon: '🗺️', emptyIcon: '🗺️', fields: [{ key: 'MaTinh', label: 'Mã tỉnh', apiKey: 'maTinh' }, { key: 'TenTinh', label: 'Tên tỉnh', apiKey: 'tenTinh', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'xa':                 { title: 'Danh mục xã',                 icon: '📍', emptyIcon: '📍', fields: [{ key: 'MaXa', label: 'Mã xã', apiKey: 'maXa' }, { key: 'TenXa', label: 'Tên xã', apiKey: 'tenXa', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },

  // Tổ chức kho
  'loai-kho':           { title: 'Danh mục loại kho',           icon: '🏗️', emptyIcon: '🏗️', fields: [{ key: 'MaLoaiKho', label: 'Mã loại kho', apiKey: 'maLoaiKho' }, { key: 'TenLoaiKho', label: 'Tên loại kho', apiKey: 'tenLoaiKho', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },

  // Từ điển về TB (TBKT)
  'phan-nhom-tbkt':          { title: 'Phân nhóm trang bị TBKT',     icon: '🧱', emptyIcon: '🧱', fields: [{ key: 'MaPhanNhom', label: 'Mã phân nhóm', apiKey: 'maPhanNhom' }, { key: 'TenPhanNhom', label: 'Tên phân nhóm', apiKey: 'tenPhanNhom', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'phan-loai-tbkt':          { title: 'Phân loại trang bị TBKT',     icon: '🏷️', emptyIcon: '🏷️', fields: [{ key: 'MaPhanLoai', label: 'Mã phân loại', apiKey: 'maPhanLoai' }, { key: 'TenPhanLoai', label: 'Tên phân loại', apiKey: 'tenPhanLoai', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'kieu-tbkt':               { title: 'Danh mục kiểu TBKT',          icon: '🔧', emptyIcon: '🔧', fields: [{ key: 'MaKieu', label: 'Mã kiểu', apiKey: 'maKieu' }, { key: 'TenKieu', label: 'Tên kiểu', apiKey: 'tenKieu', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'nhom-dong-bo':            { title: 'Danh mục nhóm đồng bộ',       icon: '🧩', emptyIcon: '🧩', fields: [{ key: 'MaNhom', label: 'Mã nhóm', apiKey: 'maNhom' }, { key: 'TenNhom', label: 'Tên nhóm', apiKey: 'tenNhom', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'chi-tiet-dong-bo':        { title: 'Danh mục chi tiết đồng bộ',   icon: '🔩', emptyIcon: '🔩', fields: [{ key: 'MaChiTiet', label: 'Mã chi tiết', apiKey: 'maChiTiet' }, { key: 'TenChiTiet', label: 'Tên chi tiết', apiKey: 'tenChiTiet', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'tinh-trang-trang-bi':     { title: 'Tình trạng trang bị',         icon: '🩺', emptyIcon: '🩺', fields: [{ key: 'MaTinhTrang', label: 'Mã tình trạng', apiKey: 'maTinhTrang' }, { key: 'TenTinhTrang', label: 'Tên tình trạng', apiKey: 'tenTinhTrang', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'tinh-trang-kho-gui':      { title: 'Tình trạng kho gửi',          icon: '📦', emptyIcon: '📦', fields: [{ key: 'MaTinhTrang', label: 'Mã tình trạng', apiKey: 'maTinhTrang' }, { key: 'TenTinhTrang', label: 'Tên tình trạng', apiKey: 'tenTinhTrang', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'hinh-thuc-niem-cat':      { title: 'Hình thức niêm cất',          icon: '🔒', emptyIcon: '🔒', fields: [{ key: 'MaHinhThuc', label: 'Mã hình thức', apiKey: 'maHinhThuc' }, { key: 'TenHinhThuc', label: 'Tên hình thức', apiKey: 'tenHinhThuc', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'phan-loai-dong-bo':       { title: 'Phân loại trang bị đồng bộ',  icon: '🗂️', emptyIcon: '🗂️', fields: [{ key: 'MaPhanLoai', label: 'Mã phân loại', apiKey: 'maPhanLoai' }, { key: 'TenPhanLoai', label: 'Tên phân loại', apiKey: 'tenPhanLoai', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },

  // Từ điển dùng chung
  'phan-cap-chat-luong':     { title: 'Danh mục phân cấp chất lượng', icon: '⭐', emptyIcon: '⭐', fields: [{ key: 'MaPhanCap', label: 'Mã phân cấp', apiKey: 'maPhanCap' }, { key: 'TenPhanCap', label: 'Tên phân cấp', apiKey: 'tenPhanCap', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'don-vi-tinh':             { title: 'Danh mục đơn vị tính',         icon: '📏', emptyIcon: '📏', fields: [{ key: 'MaDonViTinh', label: 'Mã đơn vị tính', apiKey: 'maDonViTinh' }, { key: 'TenDonViTinh', label: 'Tên đơn vị tính', apiKey: 'tenDonViTinh', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'nuoc-san-xuat':           { title: 'Danh mục nước sản xuất',       icon: '🌍', emptyIcon: '🌍', fields: [{ key: 'MaNuoc', label: 'Mã nước', apiKey: 'maNuoc' }, { key: 'TenNuoc', label: 'Tên nước', apiKey: 'tenNuoc', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'hang-san-xuat':           { title: 'Danh mục hãng sản xuất',       icon: '🏷️', emptyIcon: '🏷️', fields: [{ key: 'MaHang', label: 'Mã hãng', apiKey: 'maHang' }, { key: 'TenHang', label: 'Tên hãng', apiKey: 'tenHang', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'nha-cung-cap':            { title: 'Danh mục nhà cung cấp',        icon: '🤝', emptyIcon: '🤝', fields: [{ key: 'MaNhaCungCap', label: 'Mã nhà cung cấp', apiKey: 'maNhaCungCap' }, { key: 'TenNhaCungCap', label: 'Tên nhà cung cấp', apiKey: 'tenNhaCungCap', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'hinh-thuc-thanh-toan':    { title: 'Danh mục hình thức thanh toán', icon: '💳', emptyIcon: '💳', fields: [{ key: 'MaHinhThuc', label: 'Mã hình thức', apiKey: 'maHinhThuc' }, { key: 'TenHinhThuc', label: 'Tên hình thức', apiKey: 'tenHinhThuc', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'hinh-thuc-cap-chuyen':    { title: 'Danh mục hình thức cấp chuyển', icon: '🚚', emptyIcon: '🚚', fields: [{ key: 'MaHinhThuc', label: 'Mã hình thức', apiKey: 'maHinhThuc' }, { key: 'TenHinhThuc', label: 'Tên hình thức', apiKey: 'tenHinhThuc', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
};

const MODULE_KEY = {
  'don-vi': 'danh-muc-don-vi', 'cap-bac': 'danh-muc-cap-bac',
  'chuc-vu': 'danh-muc-chuc-vu', 'to-chuc-nhan-su': 'danh-muc-to-chuc-nhan-su',
  'to-chuc-kho': 'danh-muc-to-chuc-kho',
  'tinh': 'danh-muc-tinh', 'xa': 'danh-muc-xa',
  'loai-kho': 'danh-muc-loai-kho',
  'phan-nhom-tbkt': 'danh-muc-phan-nhom-tbkt', 'phan-loai-tbkt': 'danh-muc-phan-loai-tbkt',
  'kieu-tbkt': 'danh-muc-kieu-tbkt', 'nhom-dong-bo': 'danh-muc-nhom-dong-bo',
  'chi-tiet-dong-bo': 'danh-muc-chi-tiet-dong-bo',
  'tinh-trang-trang-bi': 'danh-muc-tinh-trang-trang-bi', 'tinh-trang-kho-gui': 'danh-muc-tinh-trang-kho-gui',
  'hinh-thuc-niem-cat': 'danh-muc-hinh-thuc-niem-cat', 'phan-loai-dong-bo': 'danh-muc-phan-loai-dong-bo',
  'phan-cap-chat-luong': 'danh-muc-phan-cap-chat-luong', 'don-vi-tinh': 'danh-muc-don-vi-tinh',
  'nuoc-san-xuat': 'danh-muc-nuoc-san-xuat', 'hang-san-xuat': 'danh-muc-hang-san-xuat',
  'nha-cung-cap': 'danh-muc-nha-cung-cap',
  'hinh-thuc-thanh-toan': 'danh-muc-hinh-thuc-thanh-toan', 'hinh-thuc-cap-chuyen': 'danh-muc-hinh-thuc-cap-chuyen',
};

export default function DanhMucPage({ type }) {
  const config = CONFIG[type] || {};
  const { can } = usePermission();
  const modKey = MODULE_KEY[type] || type;
  const canThem = can(modKey, 'them');
  const canSua  = can(modKey, 'sua');
  const canXoa  = can(modKey, 'xoa');

  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await danhMucAPI.getAll(type);
      setData(res.data);
      setFiltered(res.data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); setForm({}); setEditing(null); setSearch(''); setPage(1); }, [type]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(data.filter(row =>
      config.fields?.some(f => String(row[f.key] || '').toLowerCase().includes(q))
    ));
    setPage(1);
  }, [search, data]);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const openAdd = () => { setEditing(null); setForm({}); setShowModal(true); };
  const openEdit = (row) => {
    setEditing(row);
    const f = {};
    config.fields.forEach(field => { f[field.apiKey] = row[field.key] || ''; });
    setForm(f);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await danhMucAPI.update(type, editing.ID, form);
        showToast('Cập nhật thành công!');
      } else {
        await danhMucAPI.create(type, form);
        showToast('Thêm mới thành công!');
      }
      setShowModal(false);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${name}"?`)) return;
    try {
      await danhMucAPI.remove(type, id);
      showToast('Xóa thành công!');
      load();
    } catch { showToast('Không thể xóa, dữ liệu đang được sử dụng', 'error'); }
  };

  const displayName = (row) => {
    const req = config.fields?.find(f => f.required);
    return req ? row[req.key] : '';
  };

  const colCount = (config.fields?.length || 0) + 2;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-icon" style={{ background: '#f0f4ff', fontSize: 22 }}>{config.icon}</div>
          <div>
            <h2 className="page-title">{config.title}</h2>
            <p className="page-sub">Quản lý danh mục — thêm, sửa, xóa dữ liệu</p>
          </div>
        </div>
        {canThem && (
          <button className="btn-add" onClick={openAdd}>
            <FiPlus style={{ marginRight: 6 }} /> Thêm mới
          </button>
        )}
      </div>

      <div className="data-card">
        <div className="table-toolbar">
          <div className="search-wrap" style={{ width: 280 }}>
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="table-total">
            Tổng: <strong>{filtered.length}</strong> bản ghi
          </span>
        </div>

        {loading ? (
          <SkeletonTable cols={colCount} rows={6} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{search ? '🔍' : config.emptyIcon}</div>
            <div className="empty-state-title">
              {search ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu'}
            </div>
            <div className="empty-state-desc">
              {search
                ? `Không có bản ghi nào khớp với "${search}"`
                : canThem ? 'Nhấn "+ Thêm mới" để thêm bản ghi đầu tiên' : 'Danh mục này chưa có dữ liệu'
              }
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>STT</th>
                    {config.fields?.map(f => <th key={f.key}>{f.label}</th>)}
                    <th style={{ width: 120, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => (
                    <tr key={row.ID}>
                      <td className="td-muted td-center">{startIdx + i + 1}</td>
                      {config.fields?.map(f => (
                        <td key={f.key}>
                          {f.required
                            ? <span className="main-value">{row[f.key]}</span>
                            : <span className="sub-value">{row[f.key] || '—'}</span>
                          }
                        </td>
                      ))}
                      <td className="td-center">
                        <div className="td-actions">
                          {canSua && (
                            <button className="btn-icon-edit" onClick={() => openEdit(row)} title="Sửa">
                              <FiEdit2 size={13} />
                            </button>
                          )}
                          {canXoa && (
                            <button className="btn-icon-delete" onClick={() => handleDelete(row.ID, displayName(row))} title="Xóa">
                              <FiTrash2 size={13} />
                            </button>
                          )}
                          {!canSua && !canXoa && <span className="td-muted" style={{ fontSize: 12 }}>—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>

      {showModal && (
        <div className="overlay">
          <div className="modal fade-in">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{config.icon}</span>
                <h3 className="modal-title">{editing ? 'Cập nhật' : 'Thêm mới'} — {config.title}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              {config.fields?.map(f => (
                <div key={f.key} className="form-field">
                  <label className="form-label">{f.label}{f.required ? ' *' : ''}</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form[f.apiKey] || ''}
                    onChange={(e) => setForm({ ...form, [f.apiKey]: e.target.value })}
                    required={f.required}
                    placeholder={`Nhập ${f.label.toLowerCase()}...`}
                  />
                </div>
              ))}
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">
                  {editing ? <><FiEdit2 style={{ marginRight: 6 }} />Cập nhật</> : <><FiPlus style={{ marginRight: 6 }} />Thêm mới</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

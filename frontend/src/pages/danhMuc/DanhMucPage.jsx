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
  'to-chuc-kho':        { title: 'Danh mục tổ chức kho',       icon: '🏭', emptyIcon: '🏭', fields: [{ key: 'MaKho', label: 'Mã kho', apiKey: 'maKho' }, { key: 'TenKho', label: 'Tên kho', apiKey: 'tenKho', required: true }, { key: 'DiaDiem', label: 'Địa điểm', apiKey: 'diaDiem' }] },
  'tu-dien-tbn1':       { title: 'Danh mục từ điển TBN1',      icon: '📖', emptyIcon: '📖', fields: [{ key: 'MaTuDien', label: 'Mã từ điển', apiKey: 'maTuDien' }, { key: 'TenTuDien', label: 'Tên từ điển', apiKey: 'tenTuDien', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'tu-dien-tbn2':       { title: 'Danh mục từ điển TBN2',      icon: '📗', emptyIcon: '📗', fields: [{ key: 'MaTuDien', label: 'Mã từ điển', apiKey: 'maTuDien' }, { key: 'TenTuDien', label: 'Tên từ điển', apiKey: 'tenTuDien', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
  'tu-dien-dung-chung': { title: 'Danh mục từ điển dùng chung',icon: '📚', emptyIcon: '📚', fields: [{ key: 'MaTuDien', label: 'Mã từ điển', apiKey: 'maTuDien' }, { key: 'TenTuDien', label: 'Tên từ điển', apiKey: 'tenTuDien', required: true }, { key: 'GhiChu', label: 'Ghi chú', apiKey: 'ghiChu' }] },
};

const MODULE_KEY = {
  'don-vi': 'danh-muc-don-vi', 'cap-bac': 'danh-muc-cap-bac',
  'chuc-vu': 'danh-muc-chuc-vu', 'to-chuc-nhan-su': 'danh-muc-to-chuc-nhan-su',
  'to-chuc-kho': 'danh-muc-to-chuc-kho', 'tu-dien-tbn1': 'danh-muc-tu-dien-tbn1',
  'tu-dien-tbn2': 'danh-muc-tu-dien-tbn2', 'tu-dien-dung-chung': 'danh-muc-tu-dien-dung-chung',
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

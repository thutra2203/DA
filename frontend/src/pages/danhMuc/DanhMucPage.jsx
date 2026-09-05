import { useState, useEffect } from 'react';
import { danhMucAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { usePermission } from '../../context/PermissionContext';
import { usePageTitle } from '../../context/PageHeaderContext';
import { useConfirm } from '../../context/ConfirmContext';
import SkeletonTable from '../../components/ui/SkeletonTable';
import Pagination from '../../components/ui/Pagination';
import '../../styles/shared.css';

const PAGE_SIZE = 10;

const VUNG_MIEN_OPTIONS = [
  { value: 'BAC', label: 'Bắc' },
  { value: 'TRUNG', label: 'Trung' },
  { value: 'NAM', label: 'Nam' },
];

const TRANG_THAI_DOT_KIEM_KE_OPTIONS = [
  { value: 'DANG_DIEN_RA', label: 'Đang diễn ra' },
  { value: 'KET_THUC', label: 'Kết thúc' },
];

// Quá ngày kết thúc thì luôn coi là "Kết thúc" khi hiển thị, bất kể giá trị đang lưu trong CSDL —
// không cần job nền chạy định kỳ để cập nhật lại cột trangThai.
const trangThaiDotKiemKeHienThi = (row) => {
  if (row.ngayKetThuc) {
    const homNay = new Date(); homNay.setHours(0, 0, 0, 0);
    if (new Date(row.ngayKetThuc) < homNay) return 'KET_THUC';
  }
  return row.trangThai || 'DANG_DIEN_RA';
};

const CONFIG = {
  // ==== Nhóm không có khóa ngoại bắt buộc ====
  'nhom-spkt': {
    title: 'Nhóm SPKT', icon: '🔫',
    fields: [
      { col: 'maNhom', label: 'Mã nhóm', pk: true, required: true },
      { col: 'tenNhom', label: 'Tên nhóm', required: true, display: true },
      { col: 'moTa', label: 'Mô tả' },
    ],
  },
  dvt: {
    title: 'Đơn vị tính', icon: '📏',
    fields: [
      { col: 'maDVT', label: 'Mã ĐVT', pk: true, required: true },
      { col: 'tenDVT', label: 'Tên ĐVT', required: true, display: true },
      { col: 'donViCoBan', label: 'Đơn vị cơ bản' },
      { col: 'heSoCoBan', label: 'Hệ số cơ bản', type: 'number' },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  nsx: {
    title: 'Nước sản xuất', icon: '🌍',
    fields: [
      { col: 'maNSX', label: 'Mã nước SX', pk: true, required: true },
      { col: 'tenNSX', label: 'Tên nước SX', required: true, display: true },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  httt: {
    title: 'Hình thức thanh toán', icon: '💳',
    fields: [
      { col: 'maHTTT', label: 'Mã HTTT', pk: true, required: true },
      { col: 'tenHTTT', label: 'Tên HTTT', required: true, display: true },
      { col: 'mucPhi', label: 'Mức phí', type: 'number' },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  'ht-van-chuyen': {
    title: 'Hình thức vận chuyển', icon: '🚚',
    fields: [
      { col: 'maHTVC', label: 'Mã HTVC', pk: true, required: true },
      { col: 'tenHTVC', label: 'Tên HTVC', required: true, display: true },
      { col: 'mucPhi', label: 'Mức phí', type: 'number' },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  'loai-tbdb': {
    title: 'Loại trang bị đồng bộ', icon: '🧩',
    fields: [
      { col: 'maLoai', label: 'Mã loại', pk: true, required: true },
      { col: 'tenLoai', label: 'Tên loại', required: true, display: true },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  'cap-chat-luong': {
    title: 'Cấp chất lượng', icon: '⭐',
    fields: [
      { col: 'maCap', label: 'Mã cấp (1-5)', pk: true, required: true, type: 'number' },
      { col: 'tenCap', label: 'Tên cấp', required: true, display: true },
      { col: 'moTa', label: 'Mô tả' },
    ],
  },
  'hinh-thuc-niem-cat': {
    title: 'Hình thức niêm cất', icon: '🔒',
    fields: [
      { col: 'maHTNC', label: 'Mã HTNC', pk: true, required: true },
      { col: 'tenHTNC', label: 'Tên HTNC', required: true, display: true },
    ],
  },
  'tinh-trang-bao-goi': {
    title: 'Tình trạng bao gói', icon: '📦',
    fields: [
      { col: 'maTTBG', label: 'Mã tình trạng', pk: true, required: true },
      { col: 'tenTTBG', label: 'Tên tình trạng', required: true, display: true },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  'trang-thai-tb': {
    title: 'Trạng thái trang bị', icon: '🩺',
    fields: [
      { col: 'maTTTB', label: 'Mã trạng thái', pk: true, required: true },
      { col: 'tenTTTB', label: 'Tên trạng thái', required: true, display: true },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  'cap-bac': {
    title: 'Cấp bậc', icon: '🎖️',
    fields: [
      { col: 'maCapBac', label: 'Mã cấp bậc', pk: true, required: true },
      { col: 'tenCapBac', label: 'Tên cấp bậc', required: true, display: true },
      { col: 'thuTu', label: 'Thứ tự', type: 'number' },
    ],
  },
  'chuc-vu': {
    title: 'Chức vụ', icon: '💼',
    fields: [
      { col: 'maChucVu', label: 'Mã chức vụ', pk: true, required: true },
      { col: 'tenChucVu', label: 'Tên chức vụ', required: true, display: true },
      { col: 'moTa', label: 'Mô tả' },
    ],
  },
  tinh: {
    title: 'Tỉnh / Thành phố', icon: '🗺️',
    fields: [
      { col: 'maTinh', label: 'Mã tỉnh', pk: true, required: true },
      { col: 'tenTinh', label: 'Tên tỉnh', required: true, display: true },
      { col: 'vungMien', label: 'Vùng miền', type: 'select', options: VUNG_MIEN_OPTIONS },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  'loai-kho': {
    title: 'Loại kho', icon: '🏗️',
    fields: [
      { col: 'maLoaiKho', label: 'Mã loại kho', pk: true, required: true },
      { col: 'tenLoaiKho', label: 'Tên loại kho', required: true, display: true },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  'tinh-chat-nhap-xuat': {
    title: 'Tính chất nhập xuất', icon: '🔁',
    fields: [
      { col: 'maNX', label: 'Mã tính chất', pk: true, required: true },
      { col: 'tenNX', label: 'Tên tính chất', required: true, display: true },
      { col: 'nhomTB', label: 'Nhóm trang bị' },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },

  // ==== Nhóm có khóa ngoại tùy chọn ====
  'kieu-spkt': {
    title: 'Kiểu SPKT', icon: '🔧',
    fields: [
      { col: 'maKieu', label: 'Mã kiểu', pk: true, required: true },
      { col: 'tenKieu', label: 'Tên kiểu', required: true, display: true },
      { col: 'nuocSX', label: 'Nước SX' },
      { col: 'maDVT', label: 'Đơn vị tính', type: 'select', optionsFrom: 'dvt', optionValueKey: 'maDVT', optionLabelKey: 'tenDVT' },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  'hang-sx': {
    title: 'Hãng sản xuất', icon: '🏭',
    fields: [
      { col: 'maHSX', label: 'Mã hãng SX', pk: true, required: true },
      { col: 'tenHSX', label: 'Tên hãng SX', required: true, display: true },
      { col: 'diaChi', label: 'Địa chỉ' },
      { col: 'email', label: 'Email' },
      { col: 'SDT', label: 'Số điện thoại' },
      { col: 'maNSX', label: 'Nước sản xuất', type: 'select', optionsFrom: 'nsx', optionValueKey: 'maNSX', optionLabelKey: 'tenNSX' },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  ncc: {
    title: 'Nhà cung cấp', icon: '🤝',
    fields: [
      { col: 'maNCC', label: 'Mã NCC', pk: true, required: true },
      { col: 'tenNCC', label: 'Tên NCC', required: true, display: true },
      { col: 'diaChi', label: 'Địa chỉ' },
      { col: 'email', label: 'Email' },
      { col: 'SDT', label: 'Số điện thoại' },
      { col: 'maNSX', label: 'Nước sản xuất', type: 'select', optionsFrom: 'nsx', optionValueKey: 'maNSX', optionLabelKey: 'tenNSX' },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },

  // ==== Nhóm có khóa ngoại bắt buộc ====
  xa: {
    title: 'Xã / Phường', icon: '📍',
    fields: [
      { col: 'maXa', label: 'Mã xã', pk: true, required: true },
      { col: 'maTinh', label: 'Tỉnh', required: true, type: 'select', optionsFrom: 'tinh', optionValueKey: 'maTinh', optionLabelKey: 'tenTinh' },
      { col: 'tenXa', label: 'Tên xã', required: true, display: true },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  kho: {
    title: 'Kho', icon: '🏢',
    fields: [
      { col: 'maKho', label: 'Mã kho', pk: true, required: true },
      { col: 'maLoaiKho', label: 'Loại kho', required: true, type: 'select', optionsFrom: 'loai-kho', optionValueKey: 'maLoaiKho', optionLabelKey: 'tenLoaiKho' },
      { col: 'tenKho', label: 'Tên kho', required: true, display: true },
      { col: 'dienTich', label: 'Diện tích', type: 'number' },
      { col: 'diaChi', label: 'Địa chỉ' },
      { col: 'maXa', label: 'Xã', type: 'select', optionsFrom: 'xa', optionValueKey: 'maXa', optionLabelKey: 'tenXa' },
      { col: 'maTinh', label: 'Tỉnh', type: 'select', optionsFrom: 'tinh', optionValueKey: 'maTinh', optionLabelKey: 'tenTinh' },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  'loai-spkt': {
    title: 'Loại SPKT', icon: '🎯',
    fields: [
      { col: 'maLoai', label: 'Mã loại', pk: true, required: true },
      { col: 'maNhom', label: 'Nhóm SPKT', required: true, type: 'select', optionsFrom: 'nhom-spkt', optionValueKey: 'maNhom', optionLabelKey: 'tenNhom' },
      { col: 'tenLoai', label: 'Tên loại', required: true, display: true },
      { col: 'co', label: 'Cỡ' },
      { col: 'kiHieu', label: 'Ký hiệu' },
      { col: 'nuocSX', label: 'Nước SX' },
      { col: 'maDVT', label: 'Đơn vị tính', type: 'select', optionsFrom: 'dvt', optionValueKey: 'maDVT', optionLabelKey: 'tenDVT' },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  'chi-tiet-tcnx': {
    title: 'Chi tiết tính chất nhập xuất', icon: '📋',
    fields: [
      { col: 'maCTNX', label: 'Mã chi tiết', pk: true, required: true },
      { col: 'tenCTNX', label: 'Tên chi tiết', required: true, display: true },
      { col: 'maNX', label: 'Tính chất nhập xuất', required: true, type: 'select', optionsFrom: 'tinh-chat-nhap-xuat', optionValueKey: 'maNX', optionLabelKey: 'tenNX' },
      { col: 'ghiChu', label: 'Ghi chú' },
    ],
  },
  'dot-kiem-ke': {
    title: 'Đợt kiểm kê', wide: true,
    fields: [
      { col: 'maDotKiemKe', label: 'Mã đợt', pk: true, required: true },
      { col: 'nam', label: 'Năm', type: 'number' },
      { col: 'tenDotKiemKe', label: 'Tên đợt', required: true, display: true, full: true },
      { col: 'ngayBatDau', label: 'Ngày bắt đầu', required: true, type: 'date' },
      { col: 'ngayKetThuc', label: 'Ngày kết thúc', type: 'date' },
      { col: 'trangThai', label: 'Trạng thái', type: 'select', options: TRANG_THAI_DOT_KIEM_KE_OPTIONS, compute: trangThaiDotKiemKeHienThi },
      { col: 'noiDung', label: 'Nội dung', full: true },
      { col: 'ghiChu', label: 'Ghi chú', full: true },
    ],
    filters: [
      { col: 'nam', label: 'Năm', optionsFromData: true },
      { col: 'trangThai', label: 'Trạng thái', options: TRANG_THAI_DOT_KIEM_KE_OPTIONS, compute: trangThaiDotKiemKeHienThi },
    ],
  },
};

// Trong schema mới, quyền được cấp theo chức năng lớn (10 mục), không theo từng bảng danh mục —
// nên toàn bộ trang Danh mục dùng chung 1 cổng quyền "DANH_MUC".
const MODULE_KEY = 'DANH_MUC';

export default function DanhMucPage({ type }) {
  const config = CONFIG[type] || { fields: [] };
  usePageTitle(config.title || 'Danh mục');
  const confirm = useConfirm();
  const pkField = config.fields.find(f => f.pk);
  const { can } = usePermission();
  const canThem = can(MODULE_KEY, 'them');
  const canSua = can(MODULE_KEY, 'sua');
  const canXoa = can(MODULE_KEY, 'xoa');

  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [refData, setRefData] = useState({});
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await danhMucAPI.getAll(type);
      setData(res.data);
      setFiltered(res.data);
    } catch { /* giữ danh sách rỗng nếu tải lỗi */ } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    setForm({}); setEditing(null); setSearch(''); setFilterValues({}); setPage(1);

    const selectFields = config.fields.filter(f => f.type === 'select' && f.optionsFrom);
    if (selectFields.length === 0) { setRefData({}); return; }
    Promise.all(
      [...new Set(selectFields.map(f => f.optionsFrom))].map(slug =>
        danhMucAPI.getAll(slug).then(res => [slug, res.data]).catch(() => [slug, []])
      )
    ).then(pairs => setRefData(Object.fromEntries(pairs)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    const q = search.toLowerCase();
    let result = data.filter(row =>
      config.fields.some(f => String(displayValue(f, row) ?? '').toLowerCase().includes(q))
    );
    (config.filters || []).forEach(f => {
      const val = filterValues[f.col];
      if (val === undefined || val === '') return;
      result = result.filter(row => {
        const raw = f.compute ? f.compute(row) : row[f.col];
        return String(raw ?? '') === val;
      });
    });
    setFiltered(result);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, data, refData, filterValues]);

  // Tuỳ chọn lọc động: lấy giá trị duy nhất đang có trong dữ liệu (VD các năm đợt kiểm kê đã tạo).
  const filterOptions = (f) => {
    if (f.options) return f.options;
    if (f.optionsFromData) {
      return [...new Set(data.map(r => r[f.col]).filter(v => v !== null && v !== undefined && v !== ''))]
        .sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? b - a : String(a).localeCompare(String(b))))
        .map(v => ({ value: String(v), label: String(v) }));
    }
    return [];
  };

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  // Với cột dạng select (FK hoặc enum tĩnh), hiển thị tên thân thiện thay vì mã thô trong bảng.
  // f.compute cho phép hiển thị 1 giá trị suy ra thay vì đọc thẳng từ cột (VD trạng thái đợt
  // kiểm kê tự chuyển "Kết thúc" khi đã qua ngày kết thúc, không cần job nền cập nhật CSDL).
  const displayValue = (f, row) => {
    const raw = f.compute ? f.compute(row) : row[f.col];
    if (raw === null || raw === undefined || raw === '') return raw;
    if (f.type === 'select') {
      if (f.options) {
        return f.options.find(o => o.value === raw)?.label ?? raw;
      }
      if (f.optionsFrom) {
        const match = (refData[f.optionsFrom] || []).find(r => r[f.optionValueKey] === raw);
        return match ? match[f.optionLabelKey] : raw;
      }
    }
    return raw;
  };

  const openAdd = () => { setEditing(null); setForm({}); setErrors({}); setShowModal(true); };
  const openEdit = (row) => {
    setEditing(row);
    const f = {};
    config.fields.forEach(field => { f[field.col] = row[field.col] ?? ''; });
    setForm(f);
    setErrors({});
    setShowModal(true);
  };

  // Validate các trường bắt buộc phía client để tự hiển thị cảnh báo đỏ theo đúng field thay vì
  // để trình duyệt bật popup mặc định (native "Please fill out this field").
  const validate = () => {
    const next = {};
    config.fields.forEach(f => {
      if (f.required && (form[f.col] === undefined || form[f.col] === null || String(form[f.col]).trim() === '')) {
        next[f.col] = `${f.label} không được để trống`;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = () => {
    const payload = {};
    config.fields.forEach(f => {
      const v = form[f.col];
      if (f.type === 'number') {
        payload[f.col] = (v === '' || v === undefined || v === null) ? null : Number(v);
      } else {
        payload[f.col] = v === undefined || v === '' ? null : v;
      }
    });
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (editing) {
        await danhMucAPI.update(type, editing[pkField.col], buildPayload());
        showToast('Cập nhật thành công!');
      } else {
        await danhMucAPI.create(type, buildPayload());
        showToast('Thêm mới thành công!');
      }
      setShowModal(false);
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const handleDelete = async (row) => {
    const name = displayName(row);
    if (!(await confirm(`Bạn có chắc muốn xóa "${name}"?`))) return;
    try {
      await danhMucAPI.remove(type, row[pkField.col]);
      showToast('Xóa thành công!');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa, dữ liệu đang được sử dụng', 'error'); }
  };

  const displayName = (row) => {
    const displayField = config.fields.find(f => f.display) || pkField;
    return displayField ? row[displayField.col] : '';
  };

  const clearError = (col) => setErrors(prev => {
    if (!prev[col]) return prev;
    const next = { ...prev };
    delete next[col];
    return next;
  });

  const renderInput = (f) => {
    if (f.type === 'select') {
      const opts = f.options || (refData[f.optionsFrom] || []).map(r => ({ value: r[f.optionValueKey], label: `${r[f.optionValueKey]} — ${r[f.optionLabelKey]}` }));
      return (
        <select
          className={`form-input${errors[f.col] ? ' form-input--invalid' : ''}`}
          value={form[f.col] ?? ''}
          onChange={(e) => { setForm({ ...form, [f.col]: e.target.value }); clearError(f.col); }}
          disabled={f.pk && !!editing}
        >
          <option value="">-- Chọn --</option>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <input
        className={`form-input${errors[f.col] ? ' form-input--invalid' : ''}`}
        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
        value={form[f.col] ?? ''}
        onChange={(e) => { setForm({ ...form, [f.col]: e.target.value }); clearError(f.col); }}
        disabled={f.pk && !!editing}
        placeholder={f.type === 'date' ? undefined : `Nhập ${f.label.toLowerCase()}...`}
      />
    );
  };

  const colCount = config.fields.length + 2;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
          <span className="table-total">
            Tổng: <strong>{filtered.length}</strong> bản ghi
          </span>
          {canThem && (
            <button className="btn-add" onClick={openAdd}>
              <FiPlus style={{ marginRight: 6 }} /> Thêm mới
            </button>
          )}
        </div>

        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ width: 280 }}>
              <FiSearch className="search-icon" />
              <input
                className="search-input"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {(config.filters || []).map(f => (
              <select
                key={f.col}
                className="form-input"
                style={{ width: 160 }}
                value={filterValues[f.col] ?? ''}
                onChange={e => setFilterValues({ ...filterValues, [f.col]: e.target.value })}
              >
                <option value="">-- {f.label} --</option>
                {filterOptions(f).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ))}
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={colCount} rows={6} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{search ? '🔍' : config.icon}</div>
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
                    {config.fields.map(f => <th key={f.col}>{f.label}</th>)}
                    <th style={{ width: 120, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => (
                    <tr key={row[pkField.col]}>
                      <td className="td-muted td-center">{startIdx + i + 1}</td>
                      {config.fields.map(f => (
                        <td key={f.col}>
                          {f.display
                            ? <span className="main-value">{displayValue(f, row)}</span>
                            : <span className="sub-value">{displayValue(f, row) ?? ''}</span>
                          }
                        </td>
                      ))}
                      <td className="td-center">
                        <div className="td-actions">
                          {canSua && (
                            <button className="btn-icon-warn" onClick={() => openEdit(row)} title="Sửa">
                              <FiEdit2 size={13} />
                            </button>
                          )}
                          {canXoa && (
                            <button className="btn-icon-delete" onClick={() => handleDelete(row)} title="Xóa">
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
          <div className={`modal fade-in${config.wide ? ' modal--form' : ''}`}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{config.icon}</span>
                <h3 className="modal-title">{editing ? 'Cập nhật' : 'Thêm mới'} — {config.title}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" noValidate>
              <div className={config.wide ? 'form-grid-2col' : undefined}>
                {config.fields.map(f => (
                  <div key={f.col} className={`form-field${config.wide && f.full ? ' form-field--full' : ''}`}>
                    <label className="form-label">{f.label}{f.required ? ' *' : ''}</label>
                    {renderInput(f)}
                    {errors[f.col] && <p className="form-error-text">{errors[f.col]}</p>}
                  </div>
                ))}
              </div>
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

import { useState, useEffect, useMemo } from 'react';
import { lenhTbDongBoAPI, tbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import SkeletonTable from '../../components/ui/SkeletonTable';
import Pagination from '../../components/ui/Pagination';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const PAGE_SIZE = 10;
const CAP_LIST = [1, 2, 3, 4, 5];

const fmtMoney = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('vi-VN'));
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '—');

const isXuat = (tenLoaiLenh) => (tenLoaiLenh || '').toLowerCase().includes('xuất');

export default function LenhTbDongBo() {
  const [loaiLenhList, setLoaiLenhList] = useState([]);
  const [activeLoaiLenh, setActiveLoaiLenh] = useState('');
  const [lyDoList, setLyDoList] = useState([]);
  const [htttList, setHtttList] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [nccList, setNccList] = useState([]);
  const [cclList, setCclList] = useState([]);
  const [tbdbList, setTbdbList] = useState([]);
  const [loaiTbdbList, setLoaiTbdbList] = useState([]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [detailLenh, setDetailLenh] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    Promise.all([
      danhMucAPI.getAll('tinh-chat-nhap-xuat').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('chi-tiet-tcnx').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('httt').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('kho').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('ncc').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('cap-chat-luong').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('loai-tbdb').then(res => res.data).catch(() => []),
      tbDongBoAPI.getByKho('ALL').then(res => res.data).catch(() => []),
    ]).then(([nx, ctnx, httt, kho, ncc, ccl, loaiTbdb, tbdb]) => {
      const nxTbdb = nx.filter(n => n.nhomTB === 'TBDB');
      setLoaiLenhList(nxTbdb);
      setActiveLoaiLenh(nxTbdb[0]?.maNX || '');
      setLyDoList(ctnx);
      setHtttList(httt);
      setKhoList(kho);
      setNccList(ncc);
      setCclList(ccl);
      setLoaiTbdbList(loaiTbdb);
      setTbdbList(tbdb);
    });
  }, []);

  const loadItems = (maLoaiLenh) => {
    if (!maLoaiLenh) return;
    setLoading(true);
    return lenhTbDongBoAPI.getAll(maLoaiLenh)
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadItems(activeLoaiLenh); }, [activeLoaiLenh]);

  const activeLoai = loaiLenhList.find(n => n.maNX === activeLoaiLenh);
  const xuat = isXuat(activeLoai?.tenNX);
  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(l => [l.maLenh, l.veViec, l.canCu, l.tenLyDo].some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [items, search]);

  useEffect(() => { setPage(1); }, [activeLoaiLenh, search]);
  const paged = bySearch.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  const openAdd = () => {
    setEditing(null);
    setForm({
      maLenh: '', maLenhChiTiet: '', ngay: new Date().toISOString().slice(0, 10), ngayHieuLuc: '', giaTriDenNgay: '',
      trangThai: '', canCu: '', veViec: '', maHttt: '', maKhoNhap: '', maKhoXuat: '', maNcc: '', doiTacLoai: 'KHO', ptVanChuyen: '', ghiChu: '',
    });
    setShowModal(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      maLenh: row.maLenh, maLenhChiTiet: row.maLenhChiTiet ?? '', ngay: row.ngay, ngayHieuLuc: row.ngayHieuLuc ?? '',
      giaTriDenNgay: row.giaTriDenNgay ?? '', trangThai: row.trangThai ?? '', canCu: row.canCu ?? '', veViec: row.veViec ?? '',
      maHttt: row.maHttt ?? '', maKhoNhap: row.maKhoNhap ?? '', maKhoXuat: row.maKhoXuat ?? '', maNcc: row.maNcc ?? '',
      doiTacLoai: row.maNcc ? 'NCC' : 'KHO',
      ptVanChuyen: row.ptVanChuyen ?? '', ghiChu: row.ghiChu ?? '',
    });
    setShowModal(true);
  };

  const buildPayload = () => ({
    maLenh: form.maLenh || null,
    maLoaiLenh: activeLoaiLenh,
    maLenhChiTiet: form.maLenhChiTiet || null,
    ngay: form.ngay || null,
    ngayHieuLuc: form.ngayHieuLuc || null,
    giaTriDenNgay: form.giaTriDenNgay || null,
    trangThai: form.trangThai || null,
    canCu: form.canCu || null,
    veViec: form.veViec || null,
    maHttt: form.maHttt || null,
    maKhoNhap: xuat ? (form.doiTacLoai === 'KHO' ? (form.maKhoNhap || null) : null) : (form.maKhoNhap || null),
    maKhoXuat: xuat ? (form.maKhoXuat || null) : (form.doiTacLoai === 'KHO' ? (form.maKhoXuat || null) : null),
    maNcc: form.doiTacLoai === 'NCC' ? (form.maNcc || null) : null,
    ptVanChuyen: form.ptVanChuyen || null,
    ghiChu: form.ghiChu || null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await lenhTbDongBoAPI.update(editing.maLenh, buildPayload());
        showToast('Cập nhật thành công!');
      } else {
        await lenhTbDongBoAPI.create(buildPayload());
        showToast('Thêm mới thành công!');
      }
      setShowModal(false);
      loadItems(activeLoaiLenh);
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Xóa lệnh "${row.maLenh}"? Chỉ xóa được khi chưa có dòng chi tiết.`)) return;
    try {
      await lenhTbDongBoAPI.remove(row.maLenh);
      showToast('Xóa thành công!');
      loadItems(activeLoaiLenh);
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa, lệnh đang có dữ liệu liên quan', 'error'); }
  };

  const lyDoTrongLoai = lyDoList.filter(l => l.maNX === activeLoaiLenh);

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-icon" style={{ background: '#f0f4ff', fontSize: 22 }}>📝</div>
          <div>
            <h2 className="page-title">Lệnh nhập/xuất TB đồng bộ</h2>
            <p className="page-sub">Tạo và cập nhật lệnh nhập/xuất, quản lý chi tiết đồng bộ theo lệnh</p>
          </div>
        </div>
        <button className="btn-add" onClick={openAdd} disabled={!activeLoaiLenh}>
          <FiPlus style={{ marginRight: 6 }} /> Thêm lệnh
        </button>
      </div>

      <div className="data-card">
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

        <div className="table-toolbar">
          <div className="search-wrap" style={{ width: 260 }}>
            <FiSearch className="search-icon" />
            <input className="search-input" placeholder="Tìm theo số lệnh, về việc, căn cứ..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="table-total">Tổng: <strong>{bySearch.length}</strong> lệnh</span>
        </div>

        {loading ? (
          <SkeletonTable cols={9} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">Chưa có lệnh {activeLoai?.tenNX?.toLowerCase()} nào</div>
            <div className="empty-state-desc">Nhấn "+ Thêm lệnh" để tạo lệnh {activeLoai?.tenNX?.toLowerCase()} đầu tiên</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>STT</th>
                    <th>Số lệnh</th>
                    <th>Ngày</th>
                    <th>Lý do</th>
                    <th>{xuat ? 'Kho xuất' : 'Kho nhập'}</th>
                    <th>Đối tác</th>
                    <th>Về việc</th>
                    <th style={{ textAlign: 'center' }}>Số dòng</th>
                    <th style={{ width: 150, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => (
                    <tr key={row.maLenh}>
                      <td className="td-muted td-center">{startIdx + i + 1}</td>
                      <td><span className="sub-value">{row.maLenh}</span></td>
                      <td>{fmtDate(row.ngay)}</td>
                      <td>{row.tenLyDo || row.maLenhChiTiet || '—'}</td>
                      <td>{xuat ? (row.tenKhoXuat || khoMap[row.maKhoXuat] || '—') : (row.tenKhoNhap || khoMap[row.maKhoNhap] || '—')}</td>
                      <td>
                        {row.maNcc
                          ? <span className="badge tbdb-status-badge">{row.tenNcc || row.maNcc}</span>
                          : (xuat ? (row.tenKhoNhap || khoMap[row.maKhoNhap] || '—') : (row.tenKhoXuat || khoMap[row.maKhoXuat] || '—'))}
                      </td>
                      <td>{row.veViec || '—'}</td>
                      <td className="td-center"><span className="badge tbdb-status-badge">{row.soDongChiTiet}</span></td>
                      <td className="td-center">
                        <div className="td-actions">
                          <button className="btn-icon-edit" onClick={() => setDetailLenh(row)} title="Chi tiết"><FiEye size={13} /></button>
                          <button className="btn-icon-edit" onClick={() => openEdit(row)} title="Sửa"><FiEdit2 size={13} /></button>
                          <button className="btn-icon-delete" onClick={() => handleDelete(row)} title="Xóa"><FiTrash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={bySearch.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>

      {showModal && (
        <div className="overlay">
          <div className="modal modal--form fade-in">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Cập nhật' : 'Thêm mới'} — Lệnh {activeLoai?.tenNX}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid-2col">
                <div className="form-field">
                  <label className="form-label">Số lệnh *</label>
                  <input className="form-input" required disabled={!!editing} value={form.maLenh ?? ''}
                    onChange={e => setForm({ ...form, maLenh: e.target.value })} placeholder="VD: LNTB2026001" />
                </div>
                <div className="form-field">
                  <label className="form-label">Lý do</label>
                  <select className="form-input" value={form.maLenhChiTiet ?? ''}
                    onChange={e => setForm({ ...form, maLenhChiTiet: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {lyDoTrongLoai.map(l => <option key={l.maCTNX} value={l.maCTNX}>{l.tenCTNX}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Ngày *</label>
                  <input className="form-input" type="date" required value={form.ngay ?? ''}
                    onChange={e => setForm({ ...form, ngay: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Ngày hiệu lực</label>
                  <input className="form-input" type="date" value={form.ngayHieuLuc ?? ''}
                    onChange={e => setForm({ ...form, ngayHieuLuc: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Giá trị đến ngày</label>
                  <input className="form-input" type="date" value={form.giaTriDenNgay ?? ''}
                    onChange={e => setForm({ ...form, giaTriDenNgay: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Hình thức thanh toán</label>
                  <select className="form-input" value={form.maHttt ?? ''}
                    onChange={e => setForm({ ...form, maHttt: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {htttList.map(h => <option key={h.maHTTT} value={h.maHTTT}>{h.tenHTTT}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Căn cứ</label>
                  <input className="form-input" value={form.canCu ?? ''}
                    onChange={e => setForm({ ...form, canCu: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Về việc</label>
                  <input className="form-input" value={form.veViec ?? ''}
                    onChange={e => setForm({ ...form, veViec: e.target.value })} />
                </div>
                {!xuat ? (
                  <div className="form-field">
                    <label className="form-label">Kho nhập *</label>
                    <select className="form-input" required value={form.maKhoNhap ?? ''}
                      onChange={e => setForm({ ...form, maKhoNhap: e.target.value })}>
                      <option value="">-- Chọn kho --</option>
                      {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="form-field">
                    <label className="form-label">Kho xuất *</label>
                    <select className="form-input" required value={form.maKhoXuat ?? ''}
                      onChange={e => setForm({ ...form, maKhoXuat: e.target.value })}>
                      <option value="">-- Chọn kho --</option>
                      {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-field">
                  <label className="form-label">{xuat ? 'Đối tác nhận (kho hoặc NCC)' : 'Đối tác giao (kho hoặc NCC)'} *</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button type="button"
                      className={`tbdb-loai-chip${form.doiTacLoai === 'KHO' ? ' tbdb-loai-chip--active' : ''}`}
                      onClick={() => setForm({ ...form, doiTacLoai: 'KHO' })}>
                      <span className="tbdb-loai-chip-label">Kho nội bộ khác</span>
                    </button>
                    <button type="button"
                      className={`tbdb-loai-chip${form.doiTacLoai === 'NCC' ? ' tbdb-loai-chip--active' : ''}`}
                      onClick={() => setForm({ ...form, doiTacLoai: 'NCC' })}>
                      <span className="tbdb-loai-chip-label">Nhà cung cấp/đối tác ngoài</span>
                    </button>
                  </div>
                  {form.doiTacLoai === 'NCC' ? (
                    <select className="form-input" required value={form.maNcc ?? ''}
                      onChange={e => setForm({ ...form, maNcc: e.target.value })}>
                      <option value="">-- Chọn nhà cung cấp/đối tác --</option>
                      {nccList.map(n => <option key={n.maNCC} value={n.maNCC}>{n.tenNCC}</option>)}
                    </select>
                  ) : xuat ? (
                    <select className="form-input" required value={form.maKhoNhap ?? ''}
                      onChange={e => setForm({ ...form, maKhoNhap: e.target.value })}>
                      <option value="">-- Chọn kho --</option>
                      {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                    </select>
                  ) : (
                    <select className="form-input" required value={form.maKhoXuat ?? ''}
                      onChange={e => setForm({ ...form, maKhoXuat: e.target.value })}>
                      <option value="">-- Chọn kho --</option>
                      {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                    </select>
                  )}
                </div>
                <div className="form-field">
                  <label className="form-label">Phương thức vận chuyển</label>
                  <input className="form-input" value={form.ptVanChuyen ?? ''}
                    onChange={e => setForm({ ...form, ptVanChuyen: e.target.value })} placeholder="VD: Ô tô" />
                </div>
                <div className="form-field">
                  <label className="form-label">Trạng thái</label>
                  <input className="form-input" value={form.trangThai ?? ''}
                    onChange={e => setForm({ ...form, trangThai: e.target.value })} />
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label">Ghi chú</label>
                  <input className="form-input" value={form.ghiChu ?? ''}
                    onChange={e => setForm({ ...form, ghiChu: e.target.value })} />
                </div>
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

      {detailLenh && (
        <ChiTietLenhModal
          lenh={detailLenh}
          xuat={isXuat(detailLenh.tenLoaiLenh)}
          tbdbList={tbdbList}
          loaiTbdbList={loaiTbdbList}
          cclList={cclList}
          onClose={() => setDetailLenh(null)}
          onChanged={() => loadItems(activeLoaiLenh)}
        />
      )}
    </div>
  );
}

function ChiTietLenhModal({ lenh, xuat, tbdbList, loaiTbdbList, cclList, onClose, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [addModal, setAddModal] = useState(null); // { maTbdb, soLuongTheoCap: {1:'',2:'',...}, donGia, ghiChu, selectedLoai, search }
  const [editModal, setEditModal] = useState(null); // { row, soLuongTheoLenh, donGiaTheoLenh, ghiChu }

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 2500); };

  const load = () => {
    setLoading(true);
    return lenhTbDongBoAPI.chiTiet.getAll(lenh.maLenh)
      .then(res => setRows(res.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [lenh.maLenh]);

  const soLuongLabel = xuat ? 'SL phải xuất' : 'SL phải nhập';

  const openAdd = () => setAddModal({
    maTbdb: '', soLuongTheoCap: { 1: '', 2: '', 3: '', 4: '', 5: '' }, donGia: '', ghiChu: '', selectedLoai: 'ALL', search: '',
  });

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!addModal.maTbdb) { showToast('Chưa chọn trang bị đồng bộ', 'error'); return; }
    const caps = CAP_LIST.filter(c => addModal.soLuongTheoCap[c] !== '' && Number(addModal.soLuongTheoCap[c]) > 0);
    if (caps.length === 0) { showToast('Nhập ít nhất 1 cấp chất lượng có số lượng > 0', 'error'); return; }
    try {
      for (const cap of caps) {
        await lenhTbDongBoAPI.chiTiet.create(lenh.maLenh, {
          maTbdb: addModal.maTbdb,
          maCcl: cap,
          soLuongTheoLenh: Number(addModal.soLuongTheoCap[cap]),
          donGiaTheoLenh: addModal.donGia === '' ? null : Number(addModal.donGia),
          ghiChu: addModal.ghiChu || null,
        });
      }
      showToast('Thêm dòng chi tiết thành công!');
      setAddModal(null);
      load();
      onChanged();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    try {
      await lenhTbDongBoAPI.chiTiet.update(lenh.maLenh, editModal.row.maCtdongBoLenh, {
        maTbdb: editModal.row.maTbdb,
        maCcl: editModal.row.maCcl,
        soLuongTheoLenh: Number(editModal.soLuongTheoLenh),
        donGiaTheoLenh: editModal.donGiaTheoLenh === '' ? null : Number(editModal.donGiaTheoLenh),
        ghiChu: editModal.ghiChu || null,
      });
      showToast('Cập nhật thành công!');
      setEditModal(null);
      load();
      onChanged();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const deleteRow = async (row) => {
    if (row.daTaoLo) { showToast('Dòng này đã tạo lô, không thể xóa', 'error'); return; }
    if (!window.confirm(`Xóa dòng "${row.tenTbdb || row.maTbdb}" (cấp ${row.maCcl})?`)) return;
    try {
      await lenhTbDongBoAPI.chiTiet.remove(lenh.maLenh, row.maCtdongBoLenh);
      showToast('Xóa thành công!');
      load();
      onChanged();
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa', 'error'); }
  };

  const tbdbTrongLoai = (loai, q) => tbdbList.filter(t =>
    (loai === 'ALL' || t.maLoaiTbdb === loai) &&
    (!q || `${t.maTbdb} ${t.tenTbdb}`.toLowerCase().includes(q.toLowerCase()))
  );

  const tongSoLuongAdd = addModal
    ? CAP_LIST.reduce((sum, cap) => sum + (Number(addModal.soLuongTheoCap[cap]) || 0), 0)
    : 0;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal--wide fade-in" onClick={e => e.stopPropagation()}>
        {toast && (
          <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
            {toast.type === 'error' ? '✗' : '✓'} {toast.text}
          </div>
        )}
        <div className="modal-header">
          <h3 className="modal-title">Chi tiết lệnh {lenh.tenLoaiLenh} — {lenh.maLenh}</h3>
          <button className="modal-close-btn" onClick={onClose}><FiX /></button>
        </div>
        <div className="modal-body">
          <div className="tbdb-tab-toolbar">
            <span className="form-hint">{lenh.veViec} {lenh.tenLyDo ? `— ${lenh.tenLyDo}` : ''}</span>
            <button className="btn-add" style={{ padding: '7px 14px' }} onClick={openAdd}><FiPlus style={{ marginRight: 4 }} />Thêm dòng</button>
          </div>

          {loading ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>Đang tải...</div>
          ) : rows.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>Chưa có dòng chi tiết nào</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã TB</th>
                    <th>Tên TB</th>
                    <th>Cấp chất lượng</th>
                    <th style={{ textAlign: 'center' }}>{soLuongLabel}</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.maCtdongBoLenh}>
                      <td><span className="sub-value">{r.maTbdb}</span></td>
                      <td>{r.tenTbdb || '—'}</td>
                      <td>{r.tenCcl || r.maCcl}</td>
                      <td className="td-center">{r.soLuongTheoLenh}</td>
                      <td style={{ textAlign: 'right' }}>{fmtMoney(r.donGiaTheoLenh)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtMoney((r.donGiaTheoLenh || 0) * r.soLuongTheoLenh)}</td>
                      <td className="td-center">
                        <div className="td-actions">
                          <button className="btn-icon-edit" onClick={() => setEditModal({ row: r, soLuongTheoLenh: r.soLuongTheoLenh, donGiaTheoLenh: r.donGiaTheoLenh ?? '', ghiChu: r.ghiChu ?? '' })} title="Sửa"><FiEdit2 size={12} /></button>
                          <button className="btn-icon-delete" onClick={() => deleteRow(r)} title="Xóa"><FiTrash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ padding: '0 24px 20px' }}>
          <button type="button" className="btn-cancel" onClick={onClose}>Đóng</button>
        </div>
      </div>

      {addModal && (
        <div className="overlay" onClick={e => e.stopPropagation()}>
          <div className="modal modal--form-wide fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm dòng chi tiết — {lenh.tenLoaiLenh}</h3>
              <button className="modal-close-btn" onClick={() => setAddModal(null)}>✕</button>
            </div>
            <form onSubmit={submitAdd} className="modal-body">
              <div className="form-grid-pick">
                <div className="form-field">
                  <label className="form-label">Trang bị đồng bộ *</label>
                  <div className="tbdb-loai-row" style={{ padding: '0 0 10px' }}>
                    <button type="button"
                      className={`tbdb-loai-chip${addModal.selectedLoai === 'ALL' ? ' tbdb-loai-chip--active' : ''}`}
                      onClick={() => setAddModal({ ...addModal, selectedLoai: 'ALL' })}>
                      <span className="tbdb-loai-chip-label">Tất cả</span>
                    </button>
                    {loaiTbdbList.map(l => (
                      <button type="button" key={l.maLoai}
                        className={`tbdb-loai-chip${addModal.selectedLoai === l.maLoai ? ' tbdb-loai-chip--active' : ''}`}
                        onClick={() => setAddModal({ ...addModal, selectedLoai: l.maLoai })}>
                        <span className="tbdb-loai-chip-label">{l.tenLoai}</span>
                      </button>
                    ))}
                  </div>
                  <input className="form-input" placeholder="Tìm theo mã/tên..." value={addModal.search}
                    onChange={e => setAddModal({ ...addModal, search: e.target.value })} style={{ marginBottom: 8 }} />
                  <div className="tbdb-pick-list">
                    {tbdbTrongLoai(addModal.selectedLoai, addModal.search).length === 0 ? (
                      <div className="form-hint" style={{ padding: 12 }}>Không tìm thấy trang bị phù hợp</div>
                    ) : tbdbTrongLoai(addModal.selectedLoai, addModal.search).map(t => {
                      const daCo = rows.some(r => r.maTbdb === t.maTbdb);
                      return (
                        <button type="button" key={t.maTbdb}
                          className={`tbdb-pick-item${addModal.maTbdb === t.maTbdb ? ' tbdb-pick-item--active' : ''}`}
                          onClick={() => setAddModal({ ...addModal, maTbdb: t.maTbdb })}>
                          <span className="tbdb-pick-item-main">
                            <span className="sub-value">{t.maTbdb}</span> — {t.tenTbdb}
                          </span>
                          <span className="tbdb-pick-item-meta">
                            {t.tenDvt || t.maDvt || ''}
                            {daCo && <span className="badge tbdb-status-badge" style={{ marginLeft: 6 }}>Đã có trong lệnh</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {addModal.maTbdb && (
                    <div className="form-hint" style={{ marginTop: 6 }}>
                      Đã chọn: <strong>{addModal.maTbdb} — {tbdbList.find(t => t.maTbdb === addModal.maTbdb)?.tenTbdb}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <div className="form-field">
                    <label className="form-label">Số lượng theo từng cấp chất lượng ({soLuongLabelStatic(xuat)})</label>
                    <div className="form-hint" style={{ marginBottom: 8 }}>Chỉ nhập cấp nào có hàng, để trống các cấp còn lại</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {CAP_LIST.map(cap => {
                        const tenCap = cclList.find(c => String(c.maCap) === String(cap))?.tenCap || `Cấp ${cap}`;
                        return (
                          <div key={cap}>
                            <label className="form-hint" style={{ display: 'block', marginBottom: 4 }}>{tenCap}</label>
                            <input className="form-input" type="number" min="0" value={addModal.soLuongTheoCap[cap]}
                              onChange={e => setAddModal({ ...addModal, soLuongTheoCap: { ...addModal.soLuongTheoCap, [cap]: e.target.value } })} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Đơn giá theo lệnh (áp dụng chung cho các cấp vừa nhập)</label>
                    <input className="form-input" type="number" min="0" value={addModal.donGia}
                      onChange={e => setAddModal({ ...addModal, donGia: e.target.value })} />
                  </div>
                  {tongSoLuongAdd > 0 && (
                    <div className="tbdb-tab-toolbar" style={{ background: '#f8faff', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
                      <span>Tổng SL: <strong>{tongSoLuongAdd}</strong></span>
                      <span>Thành tiền: <strong>{fmtMoney(tongSoLuongAdd * (Number(addModal.donGia) || 0))}</strong></span>
                    </div>
                  )}
                  <div className="form-field">
                    <label className="form-label">Ghi chú</label>
                    <input className="form-input" value={addModal.ghiChu}
                      onChange={e => setAddModal({ ...addModal, ghiChu: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setAddModal(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModal && (
        <div className="overlay" onClick={e => e.stopPropagation()}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Sửa dòng chi tiết — {editModal.row.tenTbdb || editModal.row.maTbdb}</h3>
              <button className="modal-close-btn" onClick={() => setEditModal(null)}>✕</button>
            </div>
            <form onSubmit={submitEdit} className="modal-body">
              <div className="form-field">
                <label className="form-label">Cấp chất lượng</label>
                <input className="form-input" disabled value={editModal.row.tenCcl || editModal.row.maCcl} />
              </div>
              <div className="form-field">
                <label className="form-label">{soLuongLabelStatic(xuat)} *</label>
                <input className="form-input" type="number" min="1" required value={editModal.soLuongTheoLenh}
                  onChange={e => setEditModal({ ...editModal, soLuongTheoLenh: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label">Đơn giá</label>
                <input className="form-input" type="number" min="0" value={editModal.donGiaTheoLenh}
                  onChange={e => setEditModal({ ...editModal, donGiaTheoLenh: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label">Ghi chú</label>
                <input className="form-input" value={editModal.ghiChu}
                  onChange={e => setEditModal({ ...editModal, ghiChu: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setEditModal(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function soLuongLabelStatic(xuat) { return xuat ? 'SL phải xuất' : 'SL phải nhập'; }

import { useState, useEffect, useMemo } from 'react';
import { tbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import SkeletonTable from '../../components/ui/SkeletonTable';
import Pagination from '../../components/ui/Pagination';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const PAGE_SIZE = 10;

const fmtMoney = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('vi-VN'));
const fmtDate = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '—');

export default function HoSoTbDongBo() {
  const [items, setItems] = useState([]);
  const [loaiList, setLoaiList] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [dvtList, setDvtList] = useState([]);

  const [selectedKho, setSelectedKho] = useState('ALL');
  const [selectedLoai, setSelectedLoai] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [detailTbdb, setDetailTbdb] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

  const loadDanhMuc = () => Promise.all([
    danhMucAPI.getAll('loai-tbdb').then(res => res.data).catch(() => []),
    danhMucAPI.getAll('kho').then(res => res.data).catch(() => []),
    danhMucAPI.getAll('dvt').then(res => res.data).catch(() => []),
  ]).then(([loai, kho, dvt]) => {
    setLoaiList(loai);
    setKhoList(kho);
    setDvtList(dvt);
  });

  const loadItems = (maKho) => {
    setLoading(true);
    return tbDongBoAPI.getByKho(maKho)
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDanhMuc(); }, []);
  useEffect(() => { loadItems(selectedKho); }, [selectedKho]);

  const loaiMap = useMemo(() => Object.fromEntries(loaiList.map(l => [l.maLoai, l.tenLoai])), [loaiList]);
  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(t => {
      const fields = [t.maTbdb, t.tenTbdb, t.tenLoaiTbdb, t.ghiChu];
      return fields.some(v => String(v ?? '').toLowerCase().includes(q));
    });
  }, [items, search]);

  const loaiCounts = useMemo(() => {
    const counts = {};
    bySearch.forEach(t => { counts[t.maLoaiTbdb] = (counts[t.maLoaiTbdb] || 0) + 1; });
    return counts;
  }, [bySearch]);

  const visible = useMemo(
    () => (selectedLoai === 'ALL' ? bySearch : bySearch.filter(t => t.maLoaiTbdb === selectedLoai)),
    [bySearch, selectedLoai]
  );

  useEffect(() => { setPage(1); }, [selectedLoai, selectedKho, search]);

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  const openAdd = () => { setEditing(null); setForm({}); setShowModal(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      maTbdb: row.maTbdb ?? '',
      tenTbdb: row.tenTbdb ?? '',
      maLoaiTbdb: row.maLoaiTbdb ?? '',
      maDvt: row.maDvt ?? '',
      ghiChu: row.ghiChu ?? '',
    });
    setShowModal(true);
  };

  const buildPayload = () => ({
    maTBDB: form.maTbdb || null,
    tenTBDB: form.tenTbdb || null,
    maLoaiTBDB: form.maLoaiTbdb || null,
    maDVT: form.maDvt || null,
    ghiChu: form.ghiChu || null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await tbDongBoAPI.update(editing.maTbdb, buildPayload());
        showToast('Cập nhật thành công!');
      } else {
        await tbDongBoAPI.create(buildPayload());
        showToast('Thêm mới thành công!');
      }
      setShowModal(false);
      loadItems(selectedKho);
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Bạn có chắc muốn xóa hồ sơ "${row.tenTbdb || row.maTbdb}"?`)) return;
    try {
      await tbDongBoAPI.remove(row.maTbdb);
      showToast('Xóa thành công!');
      loadItems(selectedKho);
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa, dữ liệu đang được sử dụng', 'error'); }
  };

  return (
    <div>
      {toast && (
        <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✗' : '✓'} {toast.text}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-icon" style={{ background: '#f0f4ff', fontSize: 22 }}>🧩</div>
          <div>
            <h2 className="page-title">Hồ sơ TB đồng bộ</h2>
            <p className="page-sub">Xem thực lực trang bị đồng bộ theo kho — số lượng, lô hàng, vị trí tồn kho hiện có</p>
          </div>
        </div>
        <button className="btn-add" onClick={openAdd}>
          <FiPlus style={{ marginRight: 6 }} /> Thêm hồ sơ
        </button>
      </div>

      <div className="data-card">
        <div className="tbdb-loai-row">
          <button
            className={`tbdb-loai-chip${selectedLoai === 'ALL' ? ' tbdb-loai-chip--active' : ''}`}
            onClick={() => setSelectedLoai('ALL')}
          >
            <span className="tbdb-loai-chip-label">Tất cả</span>
            <span className="tbdb-loai-chip-count">{bySearch.length}</span>
          </button>
          {loaiList.map(l => (
            <button
              key={l.maLoai}
              className={`tbdb-loai-chip${selectedLoai === l.maLoai ? ' tbdb-loai-chip--active' : ''}`}
              onClick={() => setSelectedLoai(l.maLoai)}
            >
              <span className="tbdb-loai-chip-label">{l.tenLoai}</span>
              <span className="tbdb-loai-chip-count">{loaiCounts[l.maLoai] || 0}</span>
            </button>
          ))}
        </div>

        <div className="table-toolbar">
          <div className="search-wrap" style={{ width: 260 }}>
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Tìm theo mã, tên, ghi chú..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="tbdb-toolbar-right">
            <select className="tbdb-filter-select" value={selectedKho} onChange={e => setSelectedKho(e.target.value)}>
              <option value="ALL">Tất cả kho</option>
              {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
            </select>
            <span className="table-total">
              Tổng: <strong>{visible.length}</strong> bản ghi
            </span>
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={7} rows={6} />
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧩</div>
            <div className="empty-state-title">
              {items.length === 0 ? 'Không có trang bị nào trong kho này' : 'Không tìm thấy kết quả'}
            </div>
            <div className="empty-state-desc">
              {items.length === 0
                ? (selectedKho === 'ALL' ? 'Chưa có trang bị đồng bộ nào trong hệ thống — nhấn "+ Thêm hồ sơ" để tạo bản ghi đầu tiên' : 'Kho này chưa có tồn kho trang bị đồng bộ nào')
                : 'Không có bản ghi nào khớp với bộ lọc / từ khóa hiện tại'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>STT</th>
                    <th>Mã TB</th>
                    <th>Tên TB</th>
                    <th>Loại</th>
                    <th>ĐVT</th>
                    <th style={{ textAlign: 'center' }}>Số lượng {selectedKho !== 'ALL' ? '(trong kho)' : '(toàn hệ thống)'}</th>
                    <th style={{ width: 140, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => (
                    <tr key={row.maTbdb}>
                      <td className="td-muted td-center">{startIdx + i + 1}</td>
                      <td><span className="sub-value">{row.maTbdb}</span></td>
                      <td><span className="main-value">{row.tenTbdb || '—'}</span></td>
                      <td>{loaiMap[row.maLoaiTbdb] || row.maLoaiTbdb}</td>
                      <td>{row.tenDvt || row.maDvt || '—'}</td>
                      <td className="td-center"><span className="badge tbdb-status-badge">{row.tongSoLuong ?? 0}</span></td>
                      <td className="td-center">
                        <div className="td-actions">
                          <button className="btn-icon-edit" onClick={() => setDetailTbdb(row.maTbdb)} title="Xem thực lực">
                            <FiEye size={13} />
                          </button>
                          <button className="btn-icon-edit" onClick={() => openEdit(row)} title="Sửa hồ sơ">
                            <FiEdit2 size={13} />
                          </button>
                          <button className="btn-icon-delete" onClick={() => handleDelete(row)} title="Xóa hồ sơ">
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={visible.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>

      {showModal && (
        <div className="overlay">
          <div className="modal fade-in">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>🧩</span>
                <h3 className="modal-title">{editing ? 'Cập nhật' : 'Thêm mới'} — Hồ sơ trang bị đồng bộ</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-field">
                <label className="form-label">Mã trang bị *</label>
                <input className="form-input" value={form.maTbdb ?? ''} required disabled={!!editing}
                  onChange={e => setForm({ ...form, maTbdb: e.target.value })} placeholder="Nhập mã trang bị..." />
              </div>
              <div className="form-field">
                <label className="form-label">Tên trang bị *</label>
                <input className="form-input" value={form.tenTbdb ?? ''} required
                  onChange={e => setForm({ ...form, tenTbdb: e.target.value })} placeholder="Nhập tên trang bị..." />
              </div>
              <div className="form-field">
                <label className="form-label">Loại trang bị *</label>
                <select className="form-input" value={form.maLoaiTbdb ?? ''} required
                  onChange={e => setForm({ ...form, maLoaiTbdb: e.target.value })}>
                  <option value="">-- Chọn --</option>
                  {loaiList.map(l => <option key={l.maLoai} value={l.maLoai}>{l.tenLoai}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Đơn vị tính</label>
                <select className="form-input" value={form.maDvt ?? ''}
                  onChange={e => setForm({ ...form, maDvt: e.target.value })}>
                  <option value="">-- Chọn --</option>
                  {dvtList.map(d => <option key={d.maDVT} value={d.maDVT}>{d.tenDVT}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Ghi chú</label>
                <input className="form-input" value={form.ghiChu ?? ''}
                  onChange={e => setForm({ ...form, ghiChu: e.target.value })} placeholder="Ghi chú..." />
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

      {detailTbdb && (
        <ChiTietModal
          maTbdb={detailTbdb}
          maKhoNgoai={selectedKho}
          khoList={khoList}
          onClose={() => setDetailTbdb(null)}
        />
      )}
    </div>
  );
}

// Modal chỉ xem (read-only) thực lực của 1 TBDB — hồ sơ không phải nơi tạo Lô/Tồn kho, việc đó
// do quy trình "Cập nhật lệnh nhập/xuất" xử lý khi kho thực nhập/thực xuất theo lệnh.
function ChiTietModal({ maTbdb, maKhoNgoai, khoList, onClose }) {
  const [tab, setTab] = useState('chung');
  const [maKhoLoc, setMaKhoLoc] = useState(maKhoNgoai || 'ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    return tbDongBoAPI.getChiTiet(maTbdb, maKhoLoc)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [maTbdb, maKhoLoc]);

  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal--wide fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🧩</span>
            <h3 className="modal-title">Thực lực trang bị đồng bộ — {maTbdb}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="tbdb-tabs">
          <button className={`tbdb-tab-btn${tab === 'chung' ? ' tbdb-tab-btn--active' : ''}`} onClick={() => setTab('chung')}>Thông tin chung</button>
          <button className={`tbdb-tab-btn${tab === 'lo' ? ' tbdb-tab-btn--active' : ''}`} onClick={() => setTab('lo')}>Lô hàng {data ? `(${data.los.length})` : ''}</button>
          <button className={`tbdb-tab-btn${tab === 'vitri' ? ' tbdb-tab-btn--active' : ''}`} onClick={() => setTab('vitri')}>Vị trí &amp; tồn kho {data ? `(${data.viTris.length})` : ''}</button>
        </div>

        <div className="modal-body">
          {loading || !data ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>Đang tải...</div>
          ) : (
            <>
              {tab === 'chung' && (
                <div className="tbdb-detail-grid">
                  <DetailItem label="Mã trang bị" value={data.tbdb.maTbdb} />
                  <DetailItem label="Tên trang bị" value={data.tbdb.tenTbdb} />
                  <DetailItem label="Loại" value={data.tbdb.tenLoaiTbdb || data.tbdb.maLoaiTbdb} />
                  <DetailItem label="Đơn vị tính" value={data.tbdb.tenDvt || data.tbdb.maDvt} />
                  <DetailItem label="Tổng số lượng" value={`${data.tongSoLuong} (${maKhoLoc === 'ALL' ? 'toàn hệ thống' : khoMap[maKhoLoc] || maKhoLoc})`} />
                  <DetailItem label="Số lô hiện có" value={data.los.length} />
                  <DetailItem label="Thời gian tạo" value={fmtDate(data.tbdb.thoiGianTao)} />
                  <DetailItem label="Cập nhật mới nhất" value={fmtDate(data.tbdb.capNhatMoiNhat)} />
                  {data.tbdb.ghiChu && (
                    <div className="tbdb-detail-item" style={{ gridColumn: '1 / -1' }}>
                      <div className="tbdb-detail-label">Ghi chú</div>
                      <div className="tbdb-detail-value" style={{ fontWeight: 400 }}>{data.tbdb.ghiChu}</div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'lo' && (
                data.los.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>Chưa có lô hàng nào</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Mã lô</th>
                          <th>Nguồn (lệnh)</th>
                          <th>Cấp chất lượng</th>
                          <th>Năm SX</th>
                          <th>Nước SX</th>
                          <th>Tình trạng bao gói</th>
                          <th style={{ textAlign: 'right' }}>Đơn giá</th>
                          <th style={{ textAlign: 'center' }}>SL nhập</th>
                          <th>Trạng thái lô</th>
                          <th style={{ textAlign: 'center' }}>SL tồn {maKhoLoc !== 'ALL' ? '(kho lọc)' : ''}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.los.map(lo => (
                          <tr key={lo.maLoTbdb}>
                            <td><span className="sub-value">{lo.maLoTbdb}</span></td>
                            <td>{lo.maLenh ? `${lo.maLenh}${lo.veViecLenh ? ` - ${lo.veViecLenh}` : ''}` : '—'}</td>
                            <td>{lo.tenCcl || lo.maCcl || '—'}</td>
                            <td>{lo.namSx || '—'}</td>
                            <td>{lo.tenNuocSx || lo.maNuocSx || '—'}</td>
                            <td>{lo.tenTinhTrangBaoGoi || lo.maTinhTrangBaoGoi || '—'}</td>
                            <td style={{ textAlign: 'right' }}>{fmtMoney(lo.donGia)}</td>
                            <td className="td-center">{lo.soLuongNhap}</td>
                            <td>{lo.trangThaiLo || '—'}</td>
                            <td className="td-center">{lo.soLuongTon}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {tab === 'vitri' && (
                <div>
                  <div className="tbdb-tab-toolbar">
                    <select className="tbdb-filter-select" value={maKhoLoc} onChange={e => setMaKhoLoc(e.target.value)}>
                      <option value="ALL">Tất cả kho</option>
                      {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                    </select>
                  </div>
                  {data.viTris.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 0' }}>Chưa có tồn kho nào khớp bộ lọc</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Mã lô</th>
                            <th>Kho</th>
                            <th>Nhà kho</th>
                            <th>Khu</th>
                            <th>Khối</th>
                            <th>Giá</th>
                            <th>Tầng</th>
                            <th>Hòm</th>
                            <th>Mô tả vị trí</th>
                            <th>Trạng thái</th>
                            <th style={{ textAlign: 'center' }}>Số lượng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.viTris.map(tk => (
                            <tr key={tk.maTonKho}>
                              <td><span className="sub-value">{tk.maLoTbdb}</span></td>
                              <td>{tk.tenKho || tk.maKho || '—'}</td>
                              <td>{tk.tenNhaKho || '—'}</td>
                              <td>{tk.tenDinhKhu || '—'}</td>
                              <td>{tk.tenKhoi || '—'}</td>
                              <td>{tk.tenGia || '—'}</td>
                              <td>{tk.tenTang || '—'}</td>
                              <td>{tk.tenHom || '—'}</td>
                              <td>{tk.moTaViTri || '—'}</td>
                              <td><span className="badge tbdb-status-badge">{tk.tenTrangThaiTb || tk.maTrangThaiTb}</span></td>
                              <td className="td-center">{tk.soLuong}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '0 24px 20px' }}>
          <button type="button" className="btn-cancel" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  const display = value === null || value === undefined || value === '' ? '—' : value;
  return (
    <div className="tbdb-detail-item">
      <div className="tbdb-detail-label">{label}</div>
      <div className="tbdb-detail-value">{display}</div>
    </div>
  );
}

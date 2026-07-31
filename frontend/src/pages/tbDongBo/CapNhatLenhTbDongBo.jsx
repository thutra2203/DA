import { useState, useEffect, useMemo } from 'react';
import { lenhTbDongBoAPI, tbDongBoAPI, danhMucAPI } from '../../services/api';
import { FiSearch, FiEye, FiPlus, FiEdit2, FiTrash2, FiCheckCircle, FiMapPin, FiDownload, FiUpload } from 'react-icons/fi';
import SkeletonTable from '../../components/ui/SkeletonTable';
import Pagination from '../../components/ui/Pagination';
import '../../styles/shared.css';
import './HoSoTbDongBo.css';

const PAGE_SIZE = 10;

const fmtMoney = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('vi-VN'));
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '—');
const isXuat = (tenLoaiLenh) => (tenLoaiLenh || '').toLowerCase().includes('xuất');

export default function CapNhatLenhTbDongBo() {
  const [loaiLenhList, setLoaiLenhList] = useState([]);
  const [activeLoaiLenh, setActiveLoaiLenh] = useState('');
  const [khoList, setKhoList] = useState([]);
  const [nsxList, setNsxList] = useState([]);
  const [ttbgList, setTtbgList] = useState([]);
  const [trangThaiList, setTrangThaiList] = useState([]);

  const [selectedKho, setSelectedKho] = useState('ALL');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailLenh, setDetailLenh] = useState(null);

  useEffect(() => {
    Promise.all([
      danhMucAPI.getAll('tinh-chat-nhap-xuat').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('kho').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('nsx').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('tinh-trang-bao-goi').then(res => res.data).catch(() => []),
      danhMucAPI.getAll('trang-thai-tb').then(res => res.data).catch(() => []),
    ]).then(([nx, kho, nsx, ttbg, trangThai]) => {
      const nxTbdb = nx.filter(n => n.nhomTB === 'TBDB');
      setLoaiLenhList(nxTbdb);
      setActiveLoaiLenh(nxTbdb[0]?.maNX || '');
      setKhoList(kho);
      setNsxList(nsx);
      setTtbgList(ttbg);
      setTrangThaiList(trangThai);
    });
  }, []);

  const loadItems = (maLoaiLenh, maKho) => {
    if (!maLoaiLenh) return;
    setLoading(true);
    return lenhTbDongBoAPI.getAll(maLoaiLenh, maKho === 'ALL' ? undefined : maKho)
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadItems(activeLoaiLenh, selectedKho); }, [activeLoaiLenh, selectedKho]);

  const activeLoai = loaiLenhList.find(n => n.maNX === activeLoaiLenh);
  const xuat = isXuat(activeLoai?.tenNX);
  const khoMap = useMemo(() => Object.fromEntries(khoList.map(k => [k.maKho, k.tenKho])), [khoList]);

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(l => [l.maLenh, l.veViec, l.canCu, l.tenLyDo].some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [items, search]);

  useEffect(() => { setPage(1); }, [activeLoaiLenh, selectedKho, search]);
  const paged = bySearch.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-icon" style={{ background: '#f0f4ff', fontSize: 22 }}>✏️</div>
          <div>
            <h2 className="page-title">Cập nhật lệnh nhập/xuất TB đồng bộ</h2>
            <p className="page-sub">Kho vào cập nhật thực nhập/thực xuất theo từng lệnh, sinh Lô hàng và Tồn kho thực tế</p>
          </div>
        </div>
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
          <div className="tbdb-toolbar-right">
            <select className="tbdb-filter-select" value={selectedKho} onChange={e => setSelectedKho(e.target.value)}>
              <option value="ALL">Tất cả kho</option>
              {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
            </select>
            <span className="table-total">Tổng: <strong>{bySearch.length}</strong> lệnh</span>
          </div>
        </div>

        {loading ? (
          <SkeletonTable cols={8} rows={6} />
        ) : bySearch.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✏️</div>
            <div className="empty-state-title">Không có lệnh {activeLoai?.tenNX?.toLowerCase()} nào {selectedKho !== 'ALL' ? `thuộc ${khoMap[selectedKho] || selectedKho}` : ''}</div>
            <div className="empty-state-desc">Lệnh mới được tạo ở trang "Tạo lệnh nhập/xuất"</div>
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
                    <th>Về việc</th>
                    <th style={{ textAlign: 'center' }}>Số dòng</th>
                    <th style={{ width: 110, textAlign: 'center' }}>Thao tác</th>
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
                      <td>{row.veViec || '—'}</td>
                      <td className="td-center"><span className="badge tbdb-status-badge">{row.soDongChiTiet}</span></td>
                      <td className="td-center">
                        <button className="btn-icon-edit" onClick={() => setDetailLenh(row)} title="Xử lý thực nhập/xuất">
                          <FiEye size={13} />
                        </button>
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

      {detailLenh && (
        <XuLyLenhModal
          lenh={detailLenh}
          xuat={isXuat(detailLenh.tenLoaiLenh)}
          khoList={khoList}
          nsxList={nsxList}
          ttbgList={ttbgList}
          trangThaiList={trangThaiList}
          onClose={() => setDetailLenh(null)}
          onChanged={() => loadItems(activeLoaiLenh, selectedKho)}
        />
      )}
    </div>
  );
}

function XuLyLenhModal({ lenh, xuat, khoList, nsxList, ttbgList, trangThaiList, onClose, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [taoLoModal, setTaoLoModal] = useState(null); // { row, form }
  const [viTriRow, setViTriRow] = useState(null); // dòng đang quản lý vị trí tồn kho
  const [trangThaiLenh, setTrangThaiLenh] = useState(lenh.trangThai);
  const [dangHoanThanh, setDangHoanThanh] = useState(false);
  const [dangTaiMau, setDangTaiMau] = useState(false);
  const [dangNhapFile, setDangNhapFile] = useState(false);
  const [ketQuaNhapFile, setKetQuaNhapFile] = useState(null);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 2500); };
  const daKetThuc = trangThaiLenh === 'HOAN_THANH';
  const sanSangKetThuc = rows.length > 0 && rows.every(r => r.daTaoLo && r.soLuongDaPhanBo === r.soLuongThucNhap);

  const ketThucLenh = async () => {
    if (!window.confirm('Kết thúc lệnh? Sau khi kết thúc, các lô sẽ chính thức trở thành thực lực và không thể tạo/sửa thêm dòng chi tiết.')) return;
    setDangHoanThanh(true);
    try {
      await lenhTbDongBoAPI.hoanThanh(lenh.maLenh);
      showToast('Kết thúc lệnh thành công — đã trở thành thực lực!');
      setTrangThaiLenh('HOAN_THANH');
      onChanged();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
    finally { setDangHoanThanh(false); }
  };

  const load = () => {
    setLoading(true);
    return lenhTbDongBoAPI.chiTiet.getAll(lenh.maLenh)
      .then(res => setRows(res.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [lenh.maLenh]);

  const taiMauNhapLo = async () => {
    setDangTaiMau(true);
    try {
      const res = await lenhTbDongBoAPI.taiMauNhapLo(lenh.maLenh);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `mau-nhap-lo-${lenh.maLenh}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { showToast('Không tải được file mẫu', 'error'); }
    finally { setDangTaiMau(false); }
  };

  const chonFileNhap = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setDangNhapFile(true);
    lenhTbDongBoAPI.nhapLoTuFile(lenh.maLenh, file)
      .then(res => {
        setKetQuaNhapFile(res.data);
        showToast(`Nhập file xong: ${res.data.thanhCong} thành công, ${res.data.thatBai} lỗi`, res.data.thatBai > 0 ? 'error' : 'success');
        load();
        onChanged();
      })
      .catch(err => showToast(err.response?.data?.message || 'Lỗi nhập file', 'error'))
      .finally(() => setDangNhapFile(false));
  };

  // Mã lô tự đề xuất theo {maTbdb}-{maCtdongBoLenh} — maCtdongBoLenh là khóa duy nhất toàn hệ
  // thống nên đảm bảo không trùng, đồng thời vẫn truy được về đúng dòng chi tiết nguồn gốc.
  // Kho vẫn sửa lại được nếu muốn đặt theo quy ước riêng.
  const openTaoLo = (row) => setTaoLoModal({
    row,
    form: {
      maLoTbdb: `${row.maTbdb}-${row.maCtdongBoLenh}`,
      soLuongThucNhap: row.soLuongTheoLenh ?? '', namSx: '', maNuocSx: '', maTinhTrangBaoGoi: '', donGia: row.donGiaTheoLenh ?? '', ghiChu: '',
    },
  });

  const submitTaoLo = async (e) => {
    e.preventDefault();
    const f = taoLoModal.form;
    try {
      await lenhTbDongBoAPI.chiTiet.taoLo(lenh.maLenh, taoLoModal.row.maCtdongBoLenh, {
        maLoTBDB: f.maLoTbdb || null,
        namSX: f.namSx === '' ? null : Number(f.namSx),
        maNuocSX: f.maNuocSx || null,
        maTinhTrangBaoGoi: f.maTinhTrangBaoGoi || null,
        donGia: f.donGia === '' ? 0 : Number(f.donGia),
        soLuongThucNhap: f.soLuongThucNhap === '' ? 0 : Number(f.soLuongThucNhap),
        ghiChu: f.ghiChu || null,
      });
      showToast('Tạo lô thành công — tiếp tục vào "Quản lý vị trí" để phân bổ vào kho!');
      setTaoLoModal(null);
      load();
      onChanged();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal--wide fade-in" onClick={e => e.stopPropagation()}>
        {toast && (
          <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
            {toast.type === 'error' ? '✗' : '✓'} {toast.text}
          </div>
        )}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 className="modal-title">Cập nhật lệnh {lenh.tenLoaiLenh} — {lenh.maLenh}</h3>
            {daKetThuc && <span className="badge tbdb-status-badge"><FiCheckCircle size={11} style={{ marginRight: 4 }} />Đã kết thúc — thực lực</span>}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-hint" style={{ marginBottom: 14 }}>{lenh.veViec} {lenh.tenLyDo ? `— ${lenh.tenLyDo}` : ''}</div>

          {!xuat && !daKetThuc && (
            <div className="form-hint" style={{ marginBottom: 14 }}>
              Bước 1: với mỗi dòng chưa xử lý, nhấn "Tạo lô" để ghi nhận số lượng/đơn giá thực nhập (mỗi dòng chỉ tạo đúng 1 lô).
              Bước 2: nhấn "Quản lý vị trí" để phân bổ lô đó vào (một hoặc nhiều) vị trí cụ thể trong kho — số lượng ở từng vị trí cộng lại thành số lượng thực nhập của lô.
              Bước 3: khi tất cả dòng đã phân bổ đủ, nhấn "Kết thúc lệnh" để chính thức ghi nhận thành thực lực đơn vị.
            </div>
          )}
          {xuat && (
            <div className="form-hint" style={{ marginBottom: 14 }}>
              Chức năng cập nhật thực xuất (trừ tồn kho) đang được thiết kế — hiện chỉ xem được danh sách kế hoạch xuất bên dưới.
            </div>
          )}

          {!xuat && !daKetThuc && (
            <div className="tbdb-tab-toolbar">
              <span className="form-hint">Có nhiều dòng? Nhập hàng loạt bằng file Excel thay vì từng dòng:</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-cancel" disabled={dangTaiMau} onClick={taiMauNhapLo}>
                  <FiDownload style={{ marginRight: 6 }} />{dangTaiMau ? 'Đang tải...' : 'Tải mẫu'}
                </button>
                <label className="btn-add" style={{ padding: '10px 18px', cursor: 'pointer', opacity: dangNhapFile ? 0.6 : 1 }}>
                  <FiUpload style={{ marginRight: 6 }} />{dangNhapFile ? 'Đang nhập...' : 'Nhập từ file'}
                  <input type="file" accept=".xlsx" hidden disabled={dangNhapFile} onChange={chonFileNhap} />
                </label>
              </div>
            </div>
          )}

          {ketQuaNhapFile && (
            <div className="form-hint" style={{ marginBottom: 14, background: ketQuaNhapFile.thatBai > 0 ? '#fff8e1' : '#f0fdf4', padding: '10px 14px', borderRadius: 8 }}>
              <div>Kết quả nhập file: <strong>{ketQuaNhapFile.thanhCong}</strong> lô thành công / <strong>{ketQuaNhapFile.thatBai}</strong> lỗi trên tổng {ketQuaNhapFile.tongSoDong} dòng.</div>
              {ketQuaNhapFile.chiTietLoi.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {ketQuaNhapFile.chiTietLoi.map((l, i) => (
                    <li key={i}>Dòng {l.dong} (TB {l.maTbdb}): {l.loi}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

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
                    <th style={{ textAlign: 'center' }}>{xuat ? 'SL phải xuất' : 'SL phải nhập'}</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá theo lệnh</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                    <th>Trạng thái xử lý</th>
                    {!xuat && <th style={{ width: 170, textAlign: 'center' }}>Thao tác</th>}
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
                      <td style={{ textAlign: 'right' }}>{fmtMoney((r.donGiaTheoLenh || 0) * (r.soLuongTheoLenh || 0))}</td>
                      <td>
                        {r.daTaoLo
                          ? (
                            <span className="badge tbdb-status-badge">
                              <FiCheckCircle size={11} style={{ marginRight: 4 }} />
                              Lô {r.maLoTbdb} — đã phân bổ {r.soLuongDaPhanBo}/{r.soLuongThucNhap}
                            </span>
                          )
                          : <span className="td-muted">Chưa tạo lô</span>}
                      </td>
                      {!xuat && (
                        <td className="td-center">
                          {daKetThuc ? (
                            <span className="td-muted">—</span>
                          ) : (
                            <div className="td-actions">
                              {!r.daTaoLo ? (
                                <button className="btn-icon-edit" onClick={() => openTaoLo(r)} title="Tạo lô"><FiPlus size={13} /></button>
                              ) : (
                                <button className="btn-icon-edit" onClick={() => setViTriRow(r)} title="Quản lý vị trí"><FiMapPin size={13} /></button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ padding: '0 24px 20px' }}>
          <button type="button" className="btn-cancel" onClick={onClose}>Đóng</button>
          {!xuat && !daKetThuc && (
            <button type="button" className="btn-primary" disabled={!sanSangKetThuc || dangHoanThanh} onClick={ketThucLenh}
              title={!sanSangKetThuc ? 'Cần tạo lô và phân bổ đủ tồn kho cho tất cả các dòng trước' : ''}>
              <FiCheckCircle style={{ marginRight: 6 }} />{dangHoanThanh ? 'Đang xử lý...' : 'Kết thúc lệnh'}
            </button>
          )}
        </div>
      </div>

      {taoLoModal && (
        <div className="overlay" onClick={e => e.stopPropagation()}>
          <div className="modal modal--form fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tạo lô — {taoLoModal.row.tenTbdb || taoLoModal.row.maTbdb} ({taoLoModal.row.tenCcl || taoLoModal.row.maCcl})</h3>
              <button className="modal-close-btn" onClick={() => setTaoLoModal(null)}>✕</button>
            </div>
            <form onSubmit={submitTaoLo} className="modal-body">
              <div className="form-grid-2col">
                <div className="form-field">
                  <label className="form-label">Mã lô *</label>
                  <input className="form-input" required value={taoLoModal.form.maLoTbdb}
                    onChange={e => setTaoLoModal({ ...taoLoModal, form: { ...taoLoModal.form, maLoTbdb: e.target.value } })} placeholder="VD: LO2026001" />
                </div>
                <div className="form-field">
                  <label className="form-label">Số lượng thực nhập *</label>
                  <input className="form-input" type="number" min="1" required value={taoLoModal.form.soLuongThucNhap}
                    onChange={e => setTaoLoModal({ ...taoLoModal, form: { ...taoLoModal.form, soLuongThucNhap: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Năm sản xuất</label>
                  <input className="form-input" type="number" value={taoLoModal.form.namSx}
                    onChange={e => setTaoLoModal({ ...taoLoModal, form: { ...taoLoModal.form, namSx: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Nước sản xuất</label>
                  <select className="form-input" value={taoLoModal.form.maNuocSx}
                    onChange={e => setTaoLoModal({ ...taoLoModal, form: { ...taoLoModal.form, maNuocSx: e.target.value } })}>
                    <option value="">-- Chọn --</option>
                    {nsxList.map(n => <option key={n.maNSX} value={n.maNSX}>{n.tenNSX}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Tình trạng bao gói</label>
                  <select className="form-input" value={taoLoModal.form.maTinhTrangBaoGoi}
                    onChange={e => setTaoLoModal({ ...taoLoModal, form: { ...taoLoModal.form, maTinhTrangBaoGoi: e.target.value } })}>
                    <option value="">-- Chọn --</option>
                    {ttbgList.map(t => <option key={t.maTTBG} value={t.maTTBG}>{t.tenTTBG}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Đơn giá thực tế *</label>
                  <input className="form-input" type="number" min="0" required value={taoLoModal.form.donGia}
                    onChange={e => setTaoLoModal({ ...taoLoModal, form: { ...taoLoModal.form, donGia: e.target.value } })} />
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label">Ghi chú</label>
                  <input className="form-input" value={taoLoModal.form.ghiChu}
                    onChange={e => setTaoLoModal({ ...taoLoModal, form: { ...taoLoModal.form, ghiChu: e.target.value } })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setTaoLoModal(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Tạo lô</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viTriRow && (
        <QuanLyViTriModal
          row={viTriRow}
          lenh={lenh}
          khoList={khoList}
          trangThaiList={trangThaiList}
          onClose={() => setViTriRow(null)}
          onChanged={() => { load(); onChanged(); }}
        />
      )}
    </div>
  );
}

// 1 Lô có thể nằm ở nhiều vị trí (nhiều dòng Tồn kho) — modal này quản lý các dòng tồn kho
// của đúng lô vừa tạo cho dòng chi tiết đang chọn.
function QuanLyViTriModal({ row, lenh, khoList, trangThaiList, onClose, onChanged }) {
  const [tonKhoList, setTonKhoList] = useState(row.tonKhoList || []);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(null); // { editing, data }

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 2500); };

  const reload = () => lenhTbDongBoAPI.chiTiet.getAll(lenh.maLenh).then(res => {
    const updated = res.data.find(r => r.maCtdongBoLenh === row.maCtdongBoLenh);
    setTonKhoList(updated?.tonKhoList || []);
  }).catch(() => {});

  const soLuongDaPhanBo = tonKhoList.reduce((s, t) => s + (t.soLuong || 0), 0);
  const conLai = (row.soLuongThucNhap || 0) - soLuongDaPhanBo;

  const openAdd = () => setForm({
    editing: null,
    data: {
      maKho: lenh.maKhoNhap || '', tenNhaKho: '', tenDinhKhu: '', tenKhoi: '', tenGia: '', tenTang: '', tenHom: '',
      moTaViTri: '', maTrangThaiTb: '', soLuong: conLai > 0 ? conLai : '', ghiChu: '',
    },
  });
  const openEdit = (tk) => setForm({
    editing: tk,
    data: {
      maKho: tk.maKho || '', tenNhaKho: tk.tenNhaKho ?? '', tenDinhKhu: tk.tenDinhKhu ?? '', tenKhoi: tk.tenKhoi ?? '',
      tenGia: tk.tenGia ?? '', tenTang: tk.tenTang ?? '', tenHom: tk.tenHom ?? '', moTaViTri: tk.moTaViTri ?? '',
      maTrangThaiTb: tk.maTrangThaiTb, soLuong: tk.soLuong ?? '', ghiChu: tk.ghiChu ?? '',
    },
  });

  const submit = async (e) => {
    e.preventDefault();
    const f = form.data;
    const payload = {
      maLoTBDB: row.maLoTbdb,
      maKho: f.maKho || null,
      tenNhaKho: f.tenNhaKho || null,
      tenDinhKhu: f.tenDinhKhu || null,
      tenKhoi: f.tenKhoi || null,
      tenGia: f.tenGia || null,
      tenTang: f.tenTang || null,
      tenHom: f.tenHom || null,
      moTaViTri: f.moTaViTri || null,
      maTrangThaiTB: f.maTrangThaiTb || null,
      soLuong: f.soLuong === '' ? 0 : Number(f.soLuong),
      ghiChu: f.ghiChu || null,
    };
    try {
      if (form.editing) {
        await tbDongBoAPI.tonKho.update(form.editing.maTonKho, payload);
        showToast('Cập nhật vị trí thành công!');
      } else {
        await tbDongBoAPI.tonKho.create(payload);
        showToast('Thêm vị trí thành công!');
      }
      setForm(null);
      reload();
      onChanged();
    } catch (err) { showToast(err.response?.data?.message || 'Lỗi thao tác', 'error'); }
  };

  const remove = async (tk) => {
    if (!window.confirm('Xóa dòng tồn kho tại vị trí này?')) return;
    try {
      await tbDongBoAPI.tonKho.remove(tk.maTonKho);
      showToast('Xóa thành công!');
      reload();
      onChanged();
    } catch (err) { showToast(err.response?.data?.message || 'Không thể xóa', 'error'); }
  };

  return (
    <div className="overlay" onClick={e => e.stopPropagation()}>
      <div className="modal modal--wide fade-in" onClick={e => e.stopPropagation()}>
        {toast && (
          <div className={`toast toast--${toast.type === 'error' ? 'error' : 'success'}`}>
            {toast.type === 'error' ? '✗' : '✓'} {toast.text}
          </div>
        )}
        <div className="modal-header">
          <h3 className="modal-title">Quản lý vị trí — Lô {row.maLoTbdb} ({row.tenTbdb || row.maTbdb})</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="tbdb-tab-toolbar" style={{ background: conLai > 0 ? '#fff8e1' : '#f0fdf4', padding: '10px 14px', borderRadius: 8 }}>
            <span>Số lượng thực nhập của lô: <strong>{row.soLuongThucNhap}</strong></span>
            <span>Đã phân bổ: <strong>{soLuongDaPhanBo}</strong></span>
            <span>{conLai > 0 ? `Còn lại chưa phân bổ: ${conLai}` : (conLai < 0 ? `Vượt quá ${-conLai}` : 'Đã phân bổ đủ')}</span>
            <button className="btn-add" style={{ padding: '7px 14px' }} onClick={openAdd}><FiPlus style={{ marginRight: 4 }} />Thêm vị trí</button>
          </div>

          {tonKhoList.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>Lô này chưa được phân bổ vào vị trí nào</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
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
                    <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {tonKhoList.map(tk => (
                    <tr key={tk.maTonKho}>
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
                      <td className="td-center">
                        <div className="td-actions">
                          <button className="btn-icon-edit" onClick={() => openEdit(tk)} title="Sửa"><FiEdit2 size={12} /></button>
                          <button className="btn-icon-delete" onClick={() => remove(tk)} title="Xóa"><FiTrash2 size={12} /></button>
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

      {form && (
        <div className="overlay" onClick={e => e.stopPropagation()}>
          <div className="modal modal--form fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{form.editing ? 'Cập nhật' : 'Thêm'} vị trí tồn kho</h3>
              <button className="modal-close-btn" onClick={() => setForm(null)}>✕</button>
            </div>
            <form onSubmit={submit} className="modal-body">
              <div className="form-grid-2col">
                <div className="form-field">
                  <label className="form-label">Kho *</label>
                  <select className="form-input" required value={form.data.maKho}
                    onChange={e => setForm({ ...form, data: { ...form.data, maKho: e.target.value } })}>
                    <option value="">-- Chọn kho --</option>
                    {khoList.map(k => <option key={k.maKho} value={k.maKho}>{k.tenKho}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Số lượng tại vị trí này *</label>
                  <input className="form-input" type="number" min="1" required value={form.data.soLuong}
                    onChange={e => setForm({ ...form, data: { ...form.data, soLuong: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Nhà kho</label>
                  <input className="form-input" value={form.data.tenNhaKho}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenNhaKho: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Khu (định khu)</label>
                  <input className="form-input" value={form.data.tenDinhKhu}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenDinhKhu: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Khối</label>
                  <input className="form-input" value={form.data.tenKhoi}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenKhoi: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Giá (kệ)</label>
                  <input className="form-input" value={form.data.tenGia}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenGia: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Tầng</label>
                  <input className="form-input" value={form.data.tenTang}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenTang: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Hòm</label>
                  <input className="form-input" value={form.data.tenHom}
                    onChange={e => setForm({ ...form, data: { ...form.data, tenHom: e.target.value } })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Trạng thái *</label>
                  <select className="form-input" required value={form.data.maTrangThaiTb}
                    onChange={e => setForm({ ...form, data: { ...form.data, maTrangThaiTb: e.target.value } })}>
                    <option value="">-- Chọn --</option>
                    {trangThaiList.map(t => <option key={t.maTTTB} value={t.maTTTB}>{t.tenTTTB}</option>)}
                  </select>
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label">Mô tả vị trí</label>
                  <input className="form-input" value={form.data.moTaViTri}
                    onChange={e => setForm({ ...form, data: { ...form.data, moTaViTri: e.target.value } })} placeholder="VD: K01 - Hòm 02" />
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label">Ghi chú</label>
                  <input className="form-input" value={form.data.ghiChu}
                    onChange={e => setForm({ ...form, data: { ...form.data, ghiChu: e.target.value } })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setForm(null)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

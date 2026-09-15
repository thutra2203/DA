const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

// Gộp danh sách chi tiết (mỗi dòng = 1 TBĐB x 1 cấp chất lượng) thành 1 dòng / TBĐB, tách số
// lượng thực tế ra từng cột Cấp 1-5 — đúng bố cục mẫu "Báo cáo kiểm kê súng pháo khí tài ở kho".
const CAP_LIST = [1, 2, 3, 4, 5];

function gomTheoTbdb(chiTiet) {
  const map = new Map();
  for (const r of chiTiet) {
    if (!map.has(r.maTbdb)) {
      map.set(r.maTbdb, {
        maTbdb: r.maTbdb, tenTbdb: r.tenTbdb, tenDvt: r.tenDvt,
        nuocSx: new Set(), tinhTrangBaoGoi: new Set(), soLuongKyTruoc: 0, tang: 0, giam: 0,
        soLuongSoSach: 0, soLuongThucTe: 0, thua: 0, thieu: 0,
        theoCap: {}, ghiChu: [],
      });
    }
    const g = map.get(r.maTbdb);
    if (r.nuocSx) g.nuocSx.add(r.nuocSx);
    if (r.tinhTrangBaoGoi) g.tinhTrangBaoGoi.add(r.tinhTrangBaoGoi);
    g.soLuongKyTruoc += r.soLuongKyTruoc || 0;
    g.tang += r.tang || 0;
    g.giam += r.giam || 0;
    g.soLuongSoSach += r.soLuongSoSach || 0;
    g.soLuongThucTe += r.soLuongThucTe || 0;
    g.thua += r.thua || 0;
    g.thieu += r.thieu || 0;
    if (r.maCcl) g.theoCap[r.maCcl] = (g.theoCap[r.maCcl] || 0) + (r.soLuongThucTe || 0);
    if (r.ghiChu) g.ghiChu.push(r.ghiChu);
  }
  return [...map.values()].map(g => ({
    ...g, nuocSx: [...g.nuocSx].join(', '), tinhTrangBaoGoi: [...g.tinhTrangBaoGoi].join(', '), ghiChu: g.ghiChu.join('; '),
  }));
}

// Báo cáo kiểm kê TBĐB theo mẫu "Báo cáo kiểm kê súng pháo khí tài ở kho" — khác với Biên bản
// kiểm kê (KiemKePrintView, mẫu 10/18/QK, ký tại chỗ lúc kiểm đếm): đây là báo cáo tổng hợp nộp
// sau kiểm kê, có thêm cột Tăng/giảm trong kỳ, Phân cấp tách theo từng cấp, và cột "Trạng thái cất
// giữ" lấy từ Tình trạng bao gói của lô (xem tinhTrangBaoGoi ở KiemKeTbDongBoController.GetOne) —
// hệ thống không có khái niệm "có hòm/trên giá/kê kích" riêng nên dùng chung 1 cột này.
// Bản "toàn quân" (data.mode === 'TOAN_QUAN') không gắn với 1 phiếu kiểm kê cụ thể mà lấy thẳng số
// lượng tồn kho hiện có, gộp tất cả các kho (xem tbDongBoAPI.getByKho('ALL')) — nên không có các cột
// riêng của 1 đợt kiểm kê (SL kỳ trước/tăng giảm/sổ sách-thực tế/thừa-thiếu/trạng thái cất giữ),
// chỉ còn Nước SX, ĐVT và Số lượng theo cấp lấy thẳng từ hệ thống.
// `meta` (số, ký hiệu, địa danh, ngày tháng, tiêu đề, chữ ký) do người dùng điền ở
// form "Thông tin báo cáo" (BaoCaoTongHop.jsx), không lấy từ dữ liệu phiếu kiểm kê. Ẩn khi xem
// trên màn hình, chỉ hiện khi in — xem class .print-only trong HoSoTbDongBo.css.
export default function BaoCaoKiemKeTbdbPrintView({ data, meta }) {
  if (!data || !meta) return null;
  const laToanQuan = data.mode === 'TOAN_QUAN';
  const dong = laToanQuan ? [] : gomTheoTbdb(data.phieu?.chiTiet || []);
  const dongToanQuan = laToanQuan ? (data.rows || []) : [];
  const chuKy = [meta.ky2, meta.ky3].filter(k => k && (k.chucVu || k.hoTen));
  const noiNhanList = (meta.noiNhan || '').split('\n').map(s => s.trim()).filter(Boolean);

  return (
    <div className="print-only">
      <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: 13, marginBottom: 4 }}>
        <div style={{ width: 220, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>
          {meta.donVi1}{meta.donVi1 && meta.donVi2 && <br />}{meta.donVi2}
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 16 }}>
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
          <strong><u>Độc lập - Tự do - Hạnh phúc</u></strong>
          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 400 }}>
            {meta.diaDanh || '...........'}, ngày {meta.ngay || '...'} tháng {meta.thang || '...'} năm {meta.nam || '......'}
          </div>
        </div>
        <div style={{ width: 220 }}></div>
      </div>
      <div style={{ fontSize: 13, marginBottom: 4 }}>Số: {meta.so || '.....'}{meta.kyHieu ? `/${meta.kyHieu}` : ''}</div>

      <div className="print-title" style={{ marginTop: 12, marginBottom: 2, fontSize: 20 }}>
        {meta.tieuDeChinh || 'Báo cáo kiểm kê trang bị đồng bộ ở kho'}
      </div>
      {meta.tieuDePhu && (
        <div style={{ textAlign: 'center', marginBottom: 4, fontSize: 14 }}>{meta.tieuDePhu}</div>
      )}
      {!laToanQuan && (
        <div style={{ textAlign: 'center', marginBottom: 14, fontSize: 13, fontStyle: 'italic' }}>
          (Từ ngày {fmtDate(meta.tuNgay) || '.........'} đến ngày {fmtDate(meta.denNgay) || '.........'})
        </div>
      )}
      <div style={{ textAlign: 'right', fontSize: 13, marginBottom: 4 }}>Tờ số:.............</div>

      {laToanQuan ? (
        <table className="print-table" style={{ fontSize: 10.5 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: 24 }}>TT</th>
              <th rowSpan={2}>Tên trang bị đồng bộ</th>
              <th rowSpan={2}>Nước SX</th>
              <th rowSpan={2}>ĐVT</th>
              <th colSpan={6}>Số lượng</th>
            </tr>
            <tr>
              <th>Tổng</th>
              {CAP_LIST.map(c => <th key={c}>Cấp {c}</th>)}
            </tr>
          </thead>
          <tbody>
            {dongToanQuan.map((r, i) => (
              <tr key={r.maTbdb}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{r.tenTbdb || r.maTbdb}</td>
                <td style={{ textAlign: 'center' }}>{r.nuocSx}</td>
                <td style={{ textAlign: 'center' }}>{r.tenDvt}</td>
                <td style={{ textAlign: 'center' }}>{r.tongSoLuong}</td>
                {CAP_LIST.map(c => (
                  <td key={c} style={{ textAlign: 'center' }}>{r[`soLuongCap${c}`] > 0 ? r[`soLuongCap${c}`] : ''}</td>
                ))}
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 5 - dongToanQuan.length) }).map((_, i) => (
              <tr key={`trong-${i}`}>
                {Array.from({ length: 10 }).map((_, j) => <td key={j}>&nbsp;</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="print-table" style={{ fontSize: 10.5 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: 24 }}>TT</th>
              <th rowSpan={2}>Tên trang bị đồng bộ</th>
              <th rowSpan={2}>Nước SX</th>
              <th rowSpan={2}>ĐVT</th>
              <th rowSpan={2}>SL KK<br />kỳ trước</th>
              <th colSpan={2}>Tăng giảm trong kỳ</th>
              <th colSpan={2}>Số lượng hiện có</th>
              <th colSpan={2}>So sánh</th>
              <th colSpan={5}>Phân cấp</th>
              <th rowSpan={2}>Trạng thái<br />cất giữ</th>
              <th rowSpan={2}>Ghi chú</th>
            </tr>
            <tr>
              <th>Tăng</th>
              <th>Giảm</th>
              <th>Sổ sách</th>
              <th>Thực tế</th>
              <th>Thừa</th>
              <th>Thiếu</th>
              {CAP_LIST.map(c => <th key={c}>Cấp {c}</th>)}
            </tr>
          </thead>
          <tbody>
            {dong.map((r, i) => (
              <tr key={r.maTbdb}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{r.tenTbdb || r.maTbdb}</td>
                <td style={{ textAlign: 'center' }}>{r.nuocSx}</td>
                <td style={{ textAlign: 'center' }}>{r.tenDvt}</td>
                <td style={{ textAlign: 'center' }}>{r.soLuongKyTruoc}</td>
                <td style={{ textAlign: 'center' }}>{r.tang > 0 ? r.tang : ''}</td>
                <td style={{ textAlign: 'center' }}>{r.giam > 0 ? r.giam : ''}</td>
                <td style={{ textAlign: 'center' }}>{r.soLuongSoSach}</td>
                <td style={{ textAlign: 'center' }}>{r.soLuongThucTe}</td>
                <td style={{ textAlign: 'center' }}>{r.thua > 0 ? r.thua : ''}</td>
                <td style={{ textAlign: 'center' }}>{r.thieu > 0 ? r.thieu : ''}</td>
                {CAP_LIST.map(c => (
                  <td key={c} style={{ textAlign: 'center' }}>{r.theoCap[c] > 0 ? r.theoCap[c] : ''}</td>
                ))}
                <td style={{ textAlign: 'center' }}>{r.tinhTrangBaoGoi}</td>
                <td>{r.ghiChu}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 5 - dong.length) }).map((_, i) => (
              <tr key={`trong-${i}`}>
                {Array.from({ length: 18 }).map((_, j) => <td key={j}>&nbsp;</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <div style={{ fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Nơi nhận:</div>
          {noiNhanList.length === 0 ? (
            <>
              <div>- .........................................................</div>
              <div>- .........................................................</div>
            </>
          ) : noiNhanList.map((n, i) => <div key={i}>- {n}</div>)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', flex: 1 }}>
          {chuKy.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 50 }}>THỦ TRƯỞNG ĐƠN VỊ</div>
              <div>(Ký tên, đóng dấu)</div>
            </div>
          ) : chuKy.map((k, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 50 }}>{k.chucVu}</div>
              <div>{k.hoTen}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Báo cáo tình hình đồng bộ súng bộ binh — khác báo cáo kiểm kê TBĐB (BaoCaoKiemKeTbdbPrintView):
// đối tượng chính ở đây là SÚNG (Loại SPKT thuộc Nhóm "Súng bộ binh"), các cột còn lại là số lượng
// từng loại phụ kiện đồng bộ (TBĐB) hiện có, tính theo đúng thuật toán phân bổ ở BaoCaoController.
// Cột "Phân cấp" giữ nguyên theo đúng bố cục mẫu giấy nhưng luôn để trống, vì báo cáo này gộp chung
// tất cả Cấp chất lượng vào 1 dòng/súng (không tách theo Cấp) — xem trao đổi thiết kế lúc làm báo cáo.
// `meta` do người dùng điền ở form "Thông tin báo cáo" (TaoBaoCaoDongBoModal.jsx). Ẩn khi xem trên
// màn hình, chỉ hiện khi in — xem class .print-only trong HoSoTbDongBo.css.
export default function BaoCaoDongBoSungBoBinhPrintView({ data, meta }) {
  if (!data || !meta) return null;
  const tinhHinhDongBo = data.tinhHinhDongBo || [];
  const trangCu = data.trangCu || [];
  const rows = data.rows || [];
  const soCot = 5 + tinhHinhDongBo.length + trangCu.length + 1;

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
        {meta.tieuDeChinh || 'Báo cáo tình hình đồng bộ súng bộ binh'}
      </div>
      {meta.tieuDePhu && (
        <div style={{ textAlign: 'center', marginBottom: 4, fontSize: 14 }}>{meta.tieuDePhu}</div>
      )}
      <div style={{ textAlign: 'right', fontSize: 13, marginBottom: 4 }}>Tờ số:.............</div>

      <table className="print-table" style={{ fontSize: 10.5 }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: 24 }}>TT</th>
            <th rowSpan={2}>Tên súng</th>
            <th rowSpan={2}>ĐVT</th>
            <th rowSpan={2}>Phân cấp</th>
            <th rowSpan={2}>Số lượng</th>
            <th colSpan={tinhHinhDongBo.length}>Tình hình đồng bộ</th>
            <th colSpan={trangCu.length}>Trang cụ</th>
            <th rowSpan={2}>Ghi chú</th>
          </tr>
          <tr>
            {tinhHinhDongBo.map(c => <th key={c}>{c}</th>)}
            {trangCu.map(c => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.maLoai}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td>{r.tenLoai || r.maLoai}</td>
              <td style={{ textAlign: 'center' }}>{r.tenDvt}</td>
              <td style={{ textAlign: 'center' }}></td>
              <td style={{ textAlign: 'center' }}>{r.soLuong}</td>
              {tinhHinhDongBo.map(c => (
                <td key={c} style={{ textAlign: 'center' }}>{r.phuKien?.[c] > 0 ? r.phuKien[c] : ''}</td>
              ))}
              {trangCu.map(c => (
                <td key={c} style={{ textAlign: 'center' }}>{r.phuKien?.[c] > 0 ? r.phuKien[c] : ''}</td>
              ))}
              <td>{r.ghiChu}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 5 - rows.length) }).map((_, i) => (
            <tr key={`trong-${i}`}>
              {Array.from({ length: soCot }).map((_, j) => <td key={j}>&nbsp;</td>)}
            </tr>
          ))}
        </tbody>
      </table>

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

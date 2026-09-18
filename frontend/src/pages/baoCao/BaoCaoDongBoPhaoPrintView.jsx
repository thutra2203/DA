// Báo cáo tình hình đồng bộ các loại pháo — cùng cấu trúc/thuật toán với báo cáo đồng bộ súng bộ
// binh (BaoCaoDongBoSungBoBinhPrintView), chỉ khác ở chỗ cột phụ kiện (`cotPhuKien`) có nhóm cột cha
// (VD "Kính ngắm" gộp Trực tiếp/Gián tiếp/Cao xạ) nên header bảng in có thêm 1 cấp so với báo cáo
// súng bộ binh — xem BaoCaoController.GetDongBoPhao. Cột "Phân cấp" cũng luôn để trống như báo cáo
// súng bộ binh (gộp chung mọi Cấp chất lượng vào 1 dòng/loại pháo).
export default function BaoCaoDongBoPhaoPrintView({ data, meta }) {
  if (!data || !meta) return null;
  const cotPhuKien = data.cotPhuKien || [];
  const rows = data.rows || [];
  const soCot = 5 + cotPhuKien.length + 1;

  // Gộp các cột liền kề cùng 1 "nhom" (cột cha) lại thành từng khối để render header 2 cấp — cột
  // không có nhom (đứng riêng, VD "Bộ A") thì mỗi cột tự thành 1 khối rowSpan=2.
  const nhomHeader = [];
  cotPhuKien.forEach(c => {
    const cuoi = nhomHeader[nhomHeader.length - 1];
    if (c.nhom && cuoi && cuoi.nhom === c.nhom) cuoi.items.push(c);
    else nhomHeader.push({ nhom: c.nhom, items: [c] });
  });

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
        {meta.tieuDeChinh || 'Báo cáo tình hình đồng bộ các loại pháo'}
      </div>
      {meta.tieuDePhu && (
        <div style={{ textAlign: 'center', marginBottom: 4, fontSize: 14 }}>{meta.tieuDePhu}</div>
      )}
      <div style={{ textAlign: 'right', fontSize: 13, marginBottom: 4 }}>Tờ số:.............</div>

      <table className="print-table" style={{ fontSize: 9.5 }}>
        <thead>
          <tr>
            <th rowSpan={3} style={{ width: 24 }}>TT</th>
            <th rowSpan={3}>Tên pháo</th>
            <th rowSpan={3}>ĐVT</th>
            <th rowSpan={3}>Phân cấp</th>
            <th rowSpan={3}>Số lượng</th>
            <th colSpan={cotPhuKien.length}>Tình hình đồng bộ</th>
            <th rowSpan={3}>Ghi chú</th>
          </tr>
          <tr>
            {nhomHeader.map((g, i) => g.nhom
              ? <th key={i} colSpan={g.items.length}>{g.nhom}</th>
              : <th key={i} rowSpan={2}>{g.items[0].nhan}</th>)}
          </tr>
          <tr>
            {nhomHeader.filter(g => g.nhom).flatMap(g => g.items.map(c => <th key={c.ten}>{c.nhan}</th>))}
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
              {cotPhuKien.map(c => (
                <td key={c.ten} style={{ textAlign: 'center' }}>{r.phuKien?.[c.ten] > 0 ? r.phuKien[c.ten] : ''}</td>
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

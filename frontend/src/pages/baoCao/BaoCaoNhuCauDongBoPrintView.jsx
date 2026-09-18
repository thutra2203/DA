const fmtSl = (v) => (v === null || v === undefined ? '' : v);
const fmtTien = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('vi-VN'));

// Báo cáo nhu cầu đồng bộ súng pháo khí tài (Mẫu số 34/18/QK-VK) — khác 2 báo cáo đồng bộ kia ở chỗ
// PHỤ TÙNG là các DÒNG (không phải cột cố định): mỗi dòng "NHOM" (Nhóm SPKT) là tiêu đề nhóm, mỗi
// dòng "SPKT" là 1 Loại SPKT cụ thể (chỉ hiện Số lượng hiện có ở cột riêng — súng/pháo không tự có
// "nhu cầu đồng bộ" với chính nó), mỗi dòng "PHUTUNG" là 1 phụ tùng đồng bộ chi tiết (Nhu cầu/Hiện
// có/Cần bổ sung/Ngân sách). Đây chỉ là phần "Tổng cộng" của mẫu giấy gốc (1 kho/đơn vị) — mẫu gốc
// còn có thêm các cột so sánh song song nhiều đơn vị trực thuộc mà hệ thống hiện chưa hỗ trợ, xem
// chú thích ở BaoCaoController.GetNhuCauDongBo.
export default function BaoCaoNhuCauDongBoPrintView({ data, meta }) {
  if (!data || !meta) return null;
  const rows = data.rows || [];

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
        {meta.tieuDeChinh || 'Báo cáo nhu cầu đồng bộ súng pháo khí tài'}
      </div>
      {meta.tieuDePhu && (
        <div style={{ textAlign: 'center', marginBottom: 4, fontSize: 14 }}>{meta.tieuDePhu}</div>
      )}
      <div style={{ textAlign: 'right', fontSize: 13, marginBottom: 4 }}>Tờ số:.............</div>

      <table className="print-table" style={{ fontSize: 10.5 }}>
        <thead>
          <tr>
            <th style={{ width: 24 }}>TT</th>
            <th>Danh mục</th>
            <th style={{ width: 60 }}>ĐVT</th>
            <th style={{ width: 70 }}>Số lượng</th>
            <th style={{ width: 70 }}>Nhu cầu</th>
            <th style={{ width: 70 }}>Hiện có</th>
            <th style={{ width: 90 }}>Cần bổ sung</th>
            <th style={{ width: 100 }}>Ngân sách (tham khảo)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: 'center' }}>Kho chưa có SPKT nào để báo cáo</td></tr>
          ) : rows.map((r, i) => (
            <tr key={`${r.loai}-${r.ma}-${i}`}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td style={{
                fontWeight: r.loai === 'NHOM' ? 700 : r.loai === 'SPKT' ? 600 : 400,
                paddingLeft: r.loai === 'NHOM' ? 4 : r.loai === 'SPKT' ? 16 : 28,
                textTransform: r.loai === 'NHOM' ? 'uppercase' : 'none',
              }}>
                {r.ten}
              </td>
              <td style={{ textAlign: 'center' }}>{r.tenDvt}</td>
              <td style={{ textAlign: 'center' }}>{fmtSl(r.soLuongCo)}</td>
              <td style={{ textAlign: 'center' }}>{fmtSl(r.nhuCau)}</td>
              <td style={{ textAlign: 'center' }}>{fmtSl(r.hienCo)}</td>
              <td style={{ textAlign: 'center', fontWeight: r.canBoSung > 0 ? 700 : 400 }}>{fmtSl(r.canBoSung)}</td>
              <td style={{ textAlign: 'right' }}>{fmtTien(r.nganSach)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>
        Ghi chú: "Ngân sách" là số tham khảo, ước tính theo đơn giá bình quân các lô đã nhập của đúng phụ tùng đó — để trống nếu phụ tùng chưa từng được nhập kho.
      </div>

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

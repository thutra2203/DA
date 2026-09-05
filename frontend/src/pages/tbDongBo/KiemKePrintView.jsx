const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

// Biên bản kiểm kê theo mẫu 10/18/QK — in trực tiếp từ trang danh sách phiếu kiểm kê (chọn 1
// phiếu bằng checkbox), không cần điều hướng sang trang chi tiết. Ẩn khi xem trên màn hình, chỉ
// hiện khi in — xem class .print-only trong HoSoTbDongBo.css.
export default function KiemKePrintView({ phieu }) {
  if (!phieu) return null;
  const chiTiet = phieu.chiTiet || [];

  return (
    <div className="print-only">
      <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: 13, marginBottom: 4 }}>
        <div style={{ width: 220 }}>.......................<br />.......................</div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 16 }}>
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
          <strong><u>Độc lập - Tự do - Hạnh phúc</u></strong>
          <div style={{ marginTop: 14, fontSize: 13, fontWeight: 400 }}>..........., ngày....... tháng....... năm...........</div>
        </div>
        <div style={{ width: 220 }}></div>
      </div>
      <div style={{ fontSize: 13, marginBottom: 4 }}>Số: {phieu.maPhieuKiemKe}</div>

      <div className="print-title" style={{ marginTop: 12, marginBottom: 4, fontSize: 20 }}>Biên bản kiểm kê</div>
      <div style={{ textAlign: 'center', marginBottom: 14, fontSize: 13 }}>
        LOẠI VẬT PHẨM: TRANG BỊ ĐỒNG BỘ
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span>Địa điểm kiểm kê: {phieu.tenKho || phieu.maKho}</span>
        <span>Thời gian kiểm kê: {fmtDate(phieu.ngayKiemKe) || '..........................'}</span>
      </div>
      <div style={{ textAlign: 'right', fontSize: 13, marginBottom: 4 }}>Tờ số:.............</div>

      <table className="print-table">
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: 28 }}>TT</th>
            <th rowSpan={2}>Danh mục</th>
            <th rowSpan={2}>Năm SX</th>
            <th rowSpan={2}>Nước sản xuất</th>
            <th rowSpan={2}>Đơn vị tính</th>
            <th rowSpan={2}>Phân cấp</th>
            <th rowSpan={2}>Số lượng theo sổ sách</th>
            <th rowSpan={2}>Số lượng kiểm kê thực tế</th>
            <th colSpan={2}>Chênh lệch</th>
            <th rowSpan={2}>Thuyết minh thừa, thiếu</th>
          </tr>
          <tr>
            <th>Thừa</th>
            <th>Thiếu</th>
          </tr>
        </thead>
        <tbody>
          {chiTiet.map((r, i) => (
            <tr key={r.maCtKiemKe}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td>{r.tenTbdb || r.maTbdb}</td>
              <td style={{ textAlign: 'center' }}>{r.namSx || ''}</td>
              <td style={{ textAlign: 'center' }}>{r.nuocSx || ''}</td>
              <td style={{ textAlign: 'center' }}>{r.tenDvt || ''}</td>
              <td style={{ textAlign: 'center' }}>{r.capChatLuong || r.maCcl || ''}</td>
              <td style={{ textAlign: 'center' }}>{r.soLuongSoSach}</td>
              <td style={{ textAlign: 'center' }}>{r.soLuongThucTe}</td>
              <td style={{ textAlign: 'center' }}>{r.thua > 0 ? r.thua : ''}</td>
              <td style={{ textAlign: 'center' }}>{r.thieu > 0 ? r.thieu : ''}</td>
              <td>{r.ghiChu || ''}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 5 - chiTiet.length) }).map((_, i) => (
            <tr key={`trong-${i}`}>
              <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <div style={{ fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Các thành viên tổ kiểm kê</div>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} style={{ marginBottom: 6 }}>{n}.........................................................</div>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 50 }}>THỦ TRƯỞNG ĐƠN VỊ</div>
          <div>(Ký tên, đóng dấu)</div>
        </div>
      </div>
    </div>
  );
}

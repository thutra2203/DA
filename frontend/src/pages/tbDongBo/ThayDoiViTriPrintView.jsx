const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

const moTaViTriDong = (v) => (v ? [v.tenNhaKho, v.tenDinhKhu, v.tenKhoi, v.tenGia, v.tenTang, v.tenHom]
  .filter(Boolean).join(' / ') || v.moTaViTri || '' : '');

// Nội dung "phiếu in" cho 1 lệnh thay đổi vị trí — dùng chung cho cả trang Xử lý lệnh (in ngay tại
// chỗ, dữ liệu đã có sẵn) và trang Thay đổi vị trí (danh sách, in nhanh từ nút trên bảng, không cần
// điều hướng sang trang xử lý). Giống hệt cơ chế đã làm cho ChuyenCapPrintView — ẩn khi xem trên
// màn hình, chỉ hiện khi in (xem .print-only trong HoSoTbDongBo.css).
export default function ThayDoiViTriPrintView({ lenh }) {
  if (!lenh) return null;
  const danhSach = lenh.chiTiet || [];

  return (
    <div className="print-only">
      <div className="print-quochieu">
        <div className="print-quochieu-dong1">Cộng hòa xã hội chủ nghĩa Việt Nam</div>
        <div className="print-quochieu-dong2">Độc lập - Tự do - Hạnh phúc</div>
      </div>
      <div className="print-title">Lệnh thay đổi vị trí</div>
      <table className="print-info">
        <tbody>
          <tr>
            <td><strong>Số lệnh:</strong> {lenh.maLenh}</td>
            <td><strong>Ngày lập:</strong> {fmtDate(lenh.ngayLap)}</td>
          </tr>
          <tr>
            <td><strong>Kho:</strong> {lenh.tenKho || lenh.maKho || ''}</td>
            <td><strong>Ngày kết thúc:</strong> {fmtDate(lenh.ngayKetThuc)}</td>
          </tr>
          <tr>
            <td><strong>Người lập:</strong> {lenh.nguoiTao || ''}</td>
            <td><strong>Người kết thúc:</strong> {lenh.nguoiKetThuc || ''}</td>
          </tr>
          <tr>
            <td><strong>Căn cứ:</strong> {lenh.canCu || ''}</td>
            <td><strong>Về việc:</strong> {lenh.veViec || ''}</td>
          </tr>
          {lenh.ghiChu && (
            <tr>
              <td colSpan={2}><strong>Ghi chú:</strong> {lenh.ghiChu}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ fontWeight: 200, fontSize: 18, marginBottom: 6 }}>Danh sách TB thay đổi vị trí</div>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}>TT</th>
            <th>Mã lô</th>
            <th>Tên TB</th>
            <th>Vị trí cũ</th>
            <th>Số lượng</th>
            <th>Vị trí mới</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {danhSach.map((r, i) => (
            <tr key={r.maCtLenhThayDoiViTri}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td>{r.maLoTbdb}</td>
              <td>{r.tenTbdb || r.maTbdb}</td>
              <td>{moTaViTriDong(r.viTriCu)}</td>
              <td style={{ textAlign: 'center' }}>{r.soLuong}</td>
              <td>{moTaViTriDong(r.viTriMoi)}</td>
              <td>{r.ghiChu || ''}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 3 - danhSach.length) }).map((_, i) => (
            <tr key={`trong-${i}`}>
              <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-signatures">
        <div>
          <div className="print-signature-top">&nbsp;</div>
          <div className="print-signature-title">Người lập lệnh</div>
        </div>
        <div>
          <div className="print-signature-top">Đã thực hiện xong ngày.........tháng.........năm.............</div>
          <div className="print-signature-title">Người thực hiện</div>
        </div>
        <div>
          <div className="print-signature-top">Ngày.........tháng.........năm.............</div>
          <div className="print-signature-title">Thủ trưởng phê duyệt</div>
        </div>
      </div>
    </div>
  );
}

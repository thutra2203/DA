const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');

const moTaViTriDong = (v) => (v ? [v.tenNhaKho, v.tenDinhKhu, v.tenKhoi, v.tenGia, v.tenTang, v.tenHom]
  .filter(Boolean).join(' / ') || v.moTaViTri || '' : '');

// Nội dung "phiếu in" cho 1 lệnh xuất hủy/thanh lý — dùng chung cho cả trang Xử lý lệnh (in ngay
// tại chỗ, dữ liệu đã có sẵn) và trang Cập nhật lệnh xuất hủy/thanh lý (danh sách, in nhanh từ nút
// trên bảng, không cần điều hướng sang trang xử lý). Giống hệt cơ chế đã làm cho LenhPrintView
// (Nhập/Xuất) và ChuyenCapPrintView — ẩn khi xem trên màn hình, chỉ hiện khi in.
export default function HuyThanhLyPrintView({ lenh, rows }) {
  if (!lenh) return null;
  const danhSach = rows || [];
  const daKetThuc = lenh.trangThai === 'HOAN_THANH';
  const slLabel = daKetThuc ? 'SL đã hủy' : 'SL dự kiến hủy';

  return (
    <div className="print-only">
      <div className="print-quochieu">
        <div className="print-quochieu-dong1">Cộng hòa xã hội chủ nghĩa Việt Nam</div>
        <div className="print-quochieu-dong2">Độc lập - Tự do - Hạnh phúc</div>
      </div>
      <div className="print-title">Lệnh xuất hủy/thanh lý</div>
      <table className="print-info">
        <tbody>
          <tr>
            <td><strong>Số lệnh:</strong> {lenh.maLenh}</td>
            <td><strong>Ngày:</strong> {fmtDate(lenh.ngay)}</td>
          </tr>
          <tr>
            <td><strong>Kho xuất:</strong> {lenh.tenKhoXuat || lenh.maKhoXuat || ''}</td>
            <td><strong>Giá trị đến ngày:</strong> {fmtDate(lenh.giaTriDenNgay)}</td>
          </tr>
          <tr>
            <td><strong>Về việc:</strong> {lenh.veViec || ''}</td>
            <td><strong>Căn cứ:</strong> {lenh.canCu || ''}</td>
          </tr>
          <tr>
            <td><strong>Người lập:</strong> {lenh.nguoiTao || ''}</td>
            <td></td>
          </tr>
          {lenh.ghiChu && (
            <tr>
              <td colSpan={2}><strong>Ghi chú:</strong> {lenh.ghiChu}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ fontWeight: 200, fontSize: 18, marginBottom: 6 }}>Danh sách trang bị hủy/thanh lý</div>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}>TT</th>
            <th>Mã TB</th>
            <th>Tên TB</th>
            <th>Vị trí</th>
            <th>Cấp</th>
            <th>{slLabel}</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {danhSach.map((r, i) => (
            <tr key={r.maCtdongBoLenh}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td>{r.maTbdb}</td>
              <td>{r.tenTbdb || ''}</td>
              <td>{moTaViTriDong(r.viTri)}</td>
              <td style={{ textAlign: 'center' }}>{r.tenCcl || r.maCcl}</td>
              <td style={{ textAlign: 'center' }}>{daKetThuc ? r.soLuongThuc : r.soLuongTheoLenh}</td>
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
          <div className="print-signature-top" style={{ fontWeight: 700 }}>Đơn vị xuất</div>
          <div className="print-signature-title">Người giao</div>
        </div>
        <div>
          <div className="print-signature-top">Đã thực hiện xong ngày.........tháng.........năm.............</div>
          <div className="print-signature-title">Người nhận phiếu</div>
        </div>
        <div>
          <div className="print-signature-top">Ngày.........tháng.........năm.............</div>
          <div className="print-signature-title">Thủ trưởng ra lệnh</div>
        </div>
      </div>
    </div>
  );
}

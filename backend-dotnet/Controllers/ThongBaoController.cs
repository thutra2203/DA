using backend_dotnet.Models;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

// Thông báo — KHÔNG lưu bảng riêng, mà tính trực tiếp từ dữ liệu hiện có mỗi lần gọi API (luôn
// chính xác, không cần dọn dẹp/đánh dấu đã đọc): lệnh nhập/xuất/hủy-thanh lý quá hạn hoặc đã ban
// hành đang chờ xử lý, và phiếu kiểm kê quá hạn/sắp đến hạn. Theo đúng kho phụ trách của người
// dùng (IsGioiHanKho) — ADMIN thấy toàn hệ thống.
public record ThongBaoDto(string Loai, string TieuDe, string NoiDung, string DuongDan, DateOnly Ngay, string MucDo);

[ApiController]
[Authorize]
[Route("api/thong-bao")]
public class ThongBaoController(QuanLyKhoQuanKhiContext db) : ControllerBase
{
    private static bool LaHuyThanhLy(string? tenNx) =>
        (tenNx ?? "").Contains("hủy", StringComparison.OrdinalIgnoreCase)
        || (tenNx ?? "").Contains("thanh lý", StringComparison.OrdinalIgnoreCase);

    // Trang xử lý tương ứng của 1 lệnh — khác nhau giữa Nhập/Xuất và Hủy/Thanh lý, và giữa lúc còn
    // soạn thảo (sửa chi tiết) với lúc đã ban hành (xử lý thực nhập/xuất).
    private static string DuongDanLenh(string maLenh, string? tenNx, string? trangThai)
    {
        var laHuy = LaHuyThanhLy(tenNx);
        if (trangThai == "DANG_SOAN_THAO")
            return laHuy ? "/tb-dong-bo/huy-thanh-ly/tao-lenh" : $"/tb-dong-bo/tao-lenh-nhap-xuat/{maLenh}";
        return laHuy ? $"/tb-dong-bo/huy-thanh-ly/cap-nhat/{maLenh}" : $"/tb-dong-bo/cap-nhat-lenh-nhap-xuat/{maLenh}";
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var gioiHanKho = this.IsGioiHanKho();
        var maKhoNguoiDung = this.CurrentMaKho();
        var homNay = DateOnly.FromDateTime(DateTime.Now);
        var ketQua = new List<ThongBaoDto>();

        // ===== Lệnh nhập/xuất/hủy-thanh lý: quá hạn hoặc đã ban hành chờ xử lý =====
        var lenhQuery = db.Lenhs.Where(l => l.TrangThai != "HOAN_THANH" && l.TrangThai != null);
        if (gioiHanKho) lenhQuery = lenhQuery.Where(l => l.MaKhoNhap == maKhoNguoiDung || l.MaKhoXuat == maKhoNguoiDung);
        var lenhList = await lenhQuery
            .Select(l => new
            {
                l.MaLenh,
                l.TrangThai,
                l.GiaTriDenNgay,
                TenNx = l.MaLoaiLenhNavigation.TenNx,
            })
            .ToListAsync();

        foreach (var l in lenhList)
        {
            var duongDan = DuongDanLenh(l.MaLenh, l.TenNx, l.TrangThai);
            if (l.GiaTriDenNgay != null && l.GiaTriDenNgay < homNay)
            {
                ketQua.Add(new ThongBaoDto("LENH_QUA_HAN", $"Lệnh \"{l.MaLenh}\" đã quá hạn",
                    $"Giá trị đến ngày {l.GiaTriDenNgay:dd/MM/yyyy} đã qua mà lệnh vẫn chưa hoàn thành",
                    duongDan, l.GiaTriDenNgay.Value, "canh_bao"));
            }
            else if (l.GiaTriDenNgay != null && l.GiaTriDenNgay.Value.DayNumber - homNay.DayNumber <= 3)
            {
                ketQua.Add(new ThongBaoDto("LENH_SAP_HAN", $"Lệnh \"{l.MaLenh}\" sắp đến hạn",
                    $"Giá trị đến ngày {l.GiaTriDenNgay:dd/MM/yyyy} mà lệnh vẫn chưa hoàn thành",
                    duongDan, l.GiaTriDenNgay.Value, "thong_tin"));
            }
            else if (l.TrangThai == "DA_BAN_HANH")
            {
                ketQua.Add(new ThongBaoDto("LENH_CHO_XU_LY", $"Lệnh \"{l.MaLenh}\" đang chờ xử lý",
                    "Lệnh đã ban hành, đang chờ xử lý nhập/xuất thực tế",
                    duongDan, homNay, "thong_tin"));
            }
        }

        // ===== Kiểm kê: phiếu chưa hoàn thành mà đợt đã/sắp quá hạn =====
        var phieuQuery = db.PhieuKiemKes.Include(p => p.MaDotKiemKeNavigation)
            .Where(p => p.TrangThai != "HOAN_THANH" && p.TrangThai != null);
        if (gioiHanKho) phieuQuery = phieuQuery.Where(p => p.MaKho == maKhoNguoiDung);
        var phieuList = await phieuQuery.ToListAsync();

        foreach (var p in phieuList)
        {
            var han = p.MaDotKiemKeNavigation.NgayKetThuc;
            if (han == null) continue;
            var duongDan = $"/tb-dong-bo/kiem-ke/{p.MaPhieuKiemKe}";
            if (han < homNay)
            {
                ketQua.Add(new ThongBaoDto("KIEM_KE_QUA_HAN", $"Phiếu kiểm kê \"{p.MaPhieuKiemKe}\" đã quá hạn",
                    $"Đợt kiểm kê \"{p.MaDotKiemKeNavigation.TenDotKiemKe}\" đã kết thúc ngày {han:dd/MM/yyyy} mà phiếu chưa hoàn thành",
                    duongDan, han.Value, "canh_bao"));
            }
            else if (han.Value.DayNumber - homNay.DayNumber <= 3)
            {
                ketQua.Add(new ThongBaoDto("KIEM_KE_SAP_HAN", $"Phiếu kiểm kê \"{p.MaPhieuKiemKe}\" sắp đến hạn",
                    $"Đợt kiểm kê \"{p.MaDotKiemKeNavigation.TenDotKiemKe}\" kết thúc ngày {han:dd/MM/yyyy} mà phiếu chưa hoàn thành",
                    duongDan, han.Value, "thong_tin"));
            }
        }

        return Ok(ketQua.OrderBy(x => x.MucDo == "canh_bao" ? 0 : 1).ThenBy(x => x.Ngay));
    }
}

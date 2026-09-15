using backend_dotnet.Models;
using backend_dotnet.Services;
using backend_dotnet.Services.Rbac;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

// Các API tổng hợp riêng cho trang "Tổng hợp, báo cáo" — khác DanhMucControllers/TbDongBoController
// (vốn phục vụ nghiệp vụ nhập/xuất/kiểm kê hằng ngày), mỗi endpoint ở đây gộp dữ liệu từ nhiều module
// lại đúng theo bố cục 1 mẫu báo cáo giấy cụ thể, không phục vụ mục đích nào khác.
[ApiController]
[Authorize]
[Route("api/bao-cao")]
[YeuCauQuyen(Cn.BaoCao)]
public class BaoCaoController(QuanLyKhoQuanKhiContext db) : ControllerBase
{
    // 13 loại phụ kiện cố định theo đúng mẫu giấy "Báo cáo tình hình đồng bộ súng bộ binh" — khớp bằng
    // tên Loại TBĐB (LoaiTbdb.TenLoai, không phân biệt hoa/thường, bỏ khoảng trắng thừa 2 đầu). Loại
    // TBĐB nào trong danh mục Đồng bộ chưa đặt đúng 1 trong 13 tên này thì cột tương ứng luôn = 0 — cần
    // rà lại danh mục Đồng bộ (Danh mục -> Đồng bộ) để đặt tên khớp mẫu.
    private static readonly string[] TinhHinhDongBo =
        ["Bộ phụ tùng", "Bộ thông nòng", "Hộp tiếp đạn", "Kính ngắm", "Bộ chiếu sáng", "Nòng phụ", "Lê"];
    private static readonly string[] TrangCu =
        ["Dây súng", "Áo súng", "Áo nòng", "Mũ nòng", "Túi hộp tiếp đạn", "Túi phụ tùng"];
    private static readonly string[] CotPhuKien = [.. TinhHinhDongBo, .. TrangCu];

    // GET api/bao-cao/dong-bo-sung-bo-binh?maKho=
    // Với mỗi Loại SPKT thuộc Nhóm SPKT "Súng bộ binh": số súng hiện có tại kho (gộp Hồ sơ SPKT, không
    // tách theo Cấp chất lượng) + số lượng từng loại phụ kiện đồng bộ đang có tại kho.
    //
    // Định mức đồng bộ (ChiTietDongBo) và tồn kho phụ kiện (TonKhoTbdb) đều chỉ gắn ở cấp Kiểu SPKT,
    // trong khi số súng thực tế lại đếm theo Loại SPKT (nhiều Loại có thể cùng 1 Kiểu) — nên khi 1 Kiểu
    // có nhiều Loại, tồn kho phụ kiện (dùng chung cho cả Kiểu) được phân bổ TUẦN TỰ theo đúng thứ tự Loại
    // SPKT đang liệt kê: Loại đứng trước lấy đủ theo định mức trước, Loại đứng sau chỉ còn lại phần dư —
    // không có cách nào tách chính xác vì bản thân tồn kho phụ kiện không gắn với 1 Loại SPKT cụ thể.
    [HttpGet("dong-bo-sung-bo-binh")]
    public async Task<IActionResult> GetDongBoSungBoBinh([FromQuery] string? maKho)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        if (string.IsNullOrWhiteSpace(maKho)) return BadRequest(new { message = "Vui lòng chọn kho" });

        var nhom = await db.NhomSpkts.FirstOrDefaultAsync(n => n.TenNhom == "Súng bộ binh");
        if (nhom == null) return Ok(new { tinhHinhDongBo = TinhHinhDongBo, trangCu = TrangCu, rows = Array.Empty<object>() });

        var loaiList = await db.LoaiSpkts.Where(l => l.MaNhom == nhom.MaNhom).OrderBy(l => l.MaLoai).ToListAsync();
        if (loaiList.Count == 0) return Ok(new { tinhHinhDongBo = TinhHinhDongBo, trangCu = TrangCu, rows = Array.Empty<object>() });

        var dvtMap = await db.Dvts.ToDictionaryAsync(d => d.MaDvt, d => d.TenDvt);

        // Số súng hiện có tại kho theo Loại SPKT.
        var soLuongTheoLoai = await db.HoSoSpkts
            .Where(h => h.MaKho == maKho)
            .GroupBy(h => h.MaLoaiSpkt)
            .Select(g => new { MaLoai = g.Key, Tong = g.Sum(x => x.SoLuong) })
            .ToDictionaryAsync(x => x.MaLoai, x => x.Tong);

        // Định mức: với mỗi Kiểu SPKT, gộp các dòng ChiTietDongBo có Loại TBĐB khớp 1 trong 13 cột lại
        // thành số lượng phụ kiện cần cho MỖI 1 khẩu súng thuộc kiểu đó.
        var cacKieu = loaiList.Where(l => l.MaKieu != null).Select(l => l.MaKieu!).Distinct().ToList();
        var dinhMucRaw = cacKieu.Count == 0 ? [] : await db.ChiTietDongBos
            .Where(c => cacKieu.Contains(c.MaKieuSpkt))
            .Select(c => new { c.MaKieuSpkt, TenLoaiTbdb = c.MaTbdbNavigation.MaLoaiTbdbNavigation.TenLoai, c.SoLuongSpktcoSo, c.SldinhMuc })
            .ToListAsync();

        var dinhMuc = new Dictionary<string, Dictionary<string, double>>();
        foreach (var d in dinhMucRaw)
        {
            var cot = CotPhuKien.FirstOrDefault(c => string.Equals(c, d.TenLoaiTbdb?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (cot == null || d.SoLuongSpktcoSo <= 0) continue;
            if (!dinhMuc.TryGetValue(d.MaKieuSpkt, out var theoCot)) dinhMuc[d.MaKieuSpkt] = theoCot = [];
            theoCot[cot] = theoCot.GetValueOrDefault(cot) + (double)d.SldinhMuc / d.SoLuongSpktcoSo;
        }

        // Tồn kho phụ kiện tại kho, gộp theo đúng 13 cột — dùng chung cho mọi Kiểu SPKT (chỉ tính lô đã
        // HOÀN THÀNH, giống quy ước tính "thực lực" ở TbDongBoController.GetByKho).
        var tonKhoRaw = await db.TonKhoTbdbs
            .Where(t => t.MaKho == maKho && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH")
            .Select(t => new { TenLoaiTbdb = t.MaLoTbdbNavigation.MaTbdbNavigation.MaLoaiTbdbNavigation.TenLoai, t.SoLuong })
            .ToListAsync();
        var tonKhoTheoCot = new Dictionary<string, int>();
        foreach (var t in tonKhoRaw)
        {
            var cot = CotPhuKien.FirstOrDefault(c => string.Equals(c, t.TenLoaiTbdb?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (cot == null) continue;
            tonKhoTheoCot[cot] = tonKhoTheoCot.GetValueOrDefault(cot) + t.SoLuong;
        }

        // Phân bổ tuần tự theo đúng thứ tự loaiList (mã Loại SPKT tăng dần).
        var rows = new List<object>();
        foreach (var loai in loaiList)
        {
            var soLuongSung = soLuongTheoLoai.GetValueOrDefault(loai.MaLoai);
            var dinhMucKieu = loai.MaKieu != null ? dinhMuc.GetValueOrDefault(loai.MaKieu) : null;
            var phuKien = new Dictionary<string, int>();
            foreach (var cot in CotPhuKien)
            {
                var canThiet = dinhMucKieu != null && dinhMucKieu.TryGetValue(cot, out var dm)
                    ? (int)Math.Round(dm * soLuongSung, MidpointRounding.AwayFromZero)
                    : 0;
                var conLai = tonKhoTheoCot.GetValueOrDefault(cot);
                var cap = Math.Min(canThiet, conLai);
                phuKien[cot] = cap;
                tonKhoTheoCot[cot] = conLai - cap;
            }

            rows.Add(new
            {
                maLoai = loai.MaLoai,
                tenLoai = loai.TenLoai,
                tenDvt = loai.MaDvt != null ? dvtMap.GetValueOrDefault(loai.MaDvt) : null,
                soLuong = soLuongSung,
                phuKien,
                ghiChu = loai.GhiChu,
            });
        }

        return Ok(new { tinhHinhDongBo = TinhHinhDongBo, trangCu = TrangCu, rows });
    }
}

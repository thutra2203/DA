using backend_dotnet.Models;
using backend_dotnet.Services;
using backend_dotnet.Services.Rbac;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace backend_dotnet.Controllers;

// Chuyển kỳ: chốt số liệu từ 1 phiếu kiểm kê TBĐB đã kết thúc (căn cứ) thành tồn đầu (TonDauKy)
// của năm mới cho đúng kho đó — SoLuong lấy từ SoLuongThucTe của từng dòng ChiTietKiemKe, không
// phải soLuongSoSach, vì mục đích chuyển kỳ là đưa số liệu đã kiểm đếm thực tế làm mốc khởi đầu
// năm sau. NguonTao ghi "CHUYEN_KY" để phân biệt với tồn đầu nhập tay khi mới triển khai hệ
// thống (NguonTao = "KHOI_TAO").
public record ThucHienChuyenKyDto(string MaPhieuKiemKe, int NamMoi, DateOnly NgayChuyen, string? GhiChu);

[ApiController]
[Authorize]
[Microsoft.AspNetCore.Mvc.Route("api/tb-dong-bo/chuyen-ky")]
[YeuCauQuyen(Cn.TbdbKiemKeXl)]
public class ChuyenKyController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    private const string NguonTaoChuyenKy = "CHUYEN_KY";

    // GET api/tb-dong-bo/chuyen-ky
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var query = db.ChuyenKies
            .Include(c => c.MaPhieuKiemKeNavigation).ThenInclude(p => p!.MaKhoNavigation)
            .AsQueryable();
        if (this.IsGioiHanKho()) query = query.Where(c => c.MaPhieuKiemKeNavigation!.MaKho == this.CurrentMaKho());

        var list = await query
            .OrderByDescending(c => c.NgayChuyen)
            .Select(c => new
            {
                maChuyenKy = c.MaChuyenKy,
                maPhieuKiemKe = c.MaPhieuKiemKe,
                maKho = c.MaPhieuKiemKeNavigation!.MaKho,
                tenKho = c.MaPhieuKiemKeNavigation!.MaKhoNavigation != null ? c.MaPhieuKiemKeNavigation!.MaKhoNavigation.TenKho : null,
                namCu = c.NamCu,
                namMoi = c.NamMoi,
                ngayChuyen = c.NgayChuyen,
                trangThai = c.TrangThai,
                nguoiThucHien = c.NguoiThucHien,
                ghiChu = c.GhiChu,
            })
            .ToListAsync();

        return Ok(list);
    }

    // GET api/tb-dong-bo/chuyen-ky/phieu-kha-dung
    // Các phiếu kiểm kê TBĐB đã kết thúc (HOAN_THANH) và CHƯA từng được dùng làm căn cứ chuyển kỳ.
    [HttpGet("phieu-kha-dung")]
    public async Task<IActionResult> GetPhieuKhaDung()
    {
        var maPhieuDaDung = await db.ChuyenKies.Select(c => c.MaPhieuKiemKe).ToListAsync();

        var query = db.PhieuKiemKes
            .Include(p => p.MaKhoNavigation)
            .Include(p => p.MaDotKiemKeNavigation)
            .Where(p => p.NhomTb == "TBDB" && p.TrangThai == "HOAN_THANH" && !maPhieuDaDung.Contains(p.MaPhieuKiemKe));
        if (this.IsGioiHanKho()) query = query.Where(p => p.MaKho == this.CurrentMaKho());

        var list = await query
            .OrderByDescending(p => p.NgayLap)
            .Select(p => new
            {
                maPhieuKiemKe = p.MaPhieuKiemKe,
                maKho = p.MaKho,
                tenKho = p.MaKhoNavigation != null ? p.MaKhoNavigation.TenKho : null,
                tenDotKiemKe = p.MaDotKiemKeNavigation != null ? p.MaDotKiemKeNavigation.TenDotKiemKe : null,
                ngayLap = p.NgayLap,
                ngayKetThuc = p.NgayKetThuc,
            })
            .ToListAsync();

        return Ok(list);
    }

    // POST api/tb-dong-bo/chuyen-ky/thuc-hien
    // Tạo 1 bản ghi ChuyenKy và ghi hàng loạt TonDauKy cho năm mới từ số liệu thực tế của phiếu
    // kiểm kê căn cứ — trong 1 transaction.
    [HttpPost("thuc-hien")]
    public async Task<IActionResult> ThucHien([FromBody] ThucHienChuyenKyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.MaPhieuKiemKe)) return BadRequest(new { message = "Thiếu phiếu kiểm kê căn cứ" });

        var phieu = await db.PhieuKiemKes.FirstOrDefaultAsync(p => p.MaPhieuKiemKe == dto.MaPhieuKiemKe && p.NhomTb == "TBDB");
        if (phieu == null) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });
        if (this.IsGioiHanKho() && phieu.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });
        if (phieu.TrangThai != "HOAN_THANH") return BadRequest(new { message = "Chỉ chuyển kỳ được từ phiếu kiểm kê đã kết thúc" });

        if (await db.ChuyenKies.AnyAsync(c => c.MaPhieuKiemKe == dto.MaPhieuKiemKe))
            return BadRequest(new { message = "Phiếu kiểm kê này đã được dùng để chuyển kỳ trước đó" });

        var namCu = phieu.NgayLap.Year;
        if (dto.NamMoi <= namCu) return BadRequest(new { message = $"Năm mới phải sau năm {namCu} (năm của phiếu kiểm kê)" });

        var chiTiet = await db.ChiTietKiemKes.Where(c => c.MaPhieuKiemKe == dto.MaPhieuKiemKe).ToListAsync();
        if (chiTiet.Count == 0) return BadRequest(new { message = "Phiếu kiểm kê này chưa có dòng chi tiết nào" });

        var maChuyenKy = await TaoMaChuyenKyAsync();

        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var nguoiThucHien = this.CurrentUsername();

            db.ChuyenKies.Add(new ChuyenKy
            {
                MaChuyenKy = maChuyenKy,
                MaPhieuKiemKe = dto.MaPhieuKiemKe,
                NamCu = namCu,
                NamMoi = dto.NamMoi,
                NgayChuyen = dto.NgayChuyen,
                TrangThai = "HOAN_THANH",
                NguoiThucHien = nguoiThucHien,
                GhiChu = dto.GhiChu,
            });

            foreach (var ct in chiTiet.Where(c => c.MaTbdb != null))
            {
                var tonDau = await db.TonDauKies.FirstOrDefaultAsync(t =>
                    t.Nam == dto.NamMoi && t.MaKho == phieu.MaKho && t.NhomTb == "TBDB" && t.MaTbdb == ct.MaTbdb && t.MaCcl == ct.MaCcl);
                if (tonDau == null)
                {
                    tonDau = new TonDauKy { Nam = dto.NamMoi, MaKho = phieu.MaKho, NhomTb = "TBDB", MaTbdb = ct.MaTbdb, MaCcl = ct.MaCcl, NguonTao = NguonTaoChuyenKy };
                    db.TonDauKies.Add(tonDau);
                }
                tonDau.SoLuong = ct.SoLuongThucTe;
                tonDau.NguonTao = NguonTaoChuyenKy;
                tonDau.MaChuyenKy = maChuyenKy;
                tonDau.NgayTao = DateTime.Now;
                tonDau.NguoiTao = nguoiThucHien;
            }

            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            await tx.RollbackAsync();
            return BadRequest(new { message = DbErrorTranslator.Translate(ex) });
        }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "ChuyenKy", maChuyenKy,
            $"Chuyển kỳ \"{maChuyenKy}\" — kho \"{phieu.MaKho}\": {namCu} → {dto.NamMoi}, căn cứ phiếu kiểm kê \"{dto.MaPhieuKiemKe}\"");

        return Ok(new { message = "Chuyển kỳ thành công", maChuyenKy, soDong = chiTiet.Count(c => c.MaTbdb != null) });
    }

    // Mã chuyển kỳ dạng CK + số tự nhiên 4 chữ số, bắt đầu từ CK0001, tăng dần theo bản ghi lớn
    // nhất hiện có (không phân biệt theo kho).
    private async Task<string> TaoMaChuyenKyAsync()
    {
        var maHienCo = await db.ChuyenKies.Select(c => c.MaChuyenKy).ToListAsync();

        var soLonNhat = maHienCo
            .Select(m => Regex.Match(m, @"^CK(\d{4})$"))
            .Where(m => m.Success)
            .Select(m => int.Parse(m.Groups[1].Value))
            .DefaultIfEmpty(0)
            .Max();

        var maChuyenKy = $"CK{soLonNhat + 1:D4}";
        while (await db.ChuyenKies.AnyAsync(c => c.MaChuyenKy == maChuyenKy))
        {
            soLonNhat++;
            maChuyenKy = $"CK{soLonNhat + 1:D4}";
        }
        return maChuyenKy;
    }
}

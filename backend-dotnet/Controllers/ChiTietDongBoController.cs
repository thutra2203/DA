using backend_dotnet.Models;
using backend_dotnet.Services;
using backend_dotnet.Services.Rbac;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

// Danh mục "Chi tiết đồng bộ" — với mỗi Nhóm đồng bộ (Kiểu SPKT + Loại TBĐB), liệt kê các TBĐB
// thành phần cùng số lượng định mức. Khóa chính ghép (3 cột).
public record ChiTietDongBoDto(string MaKieuSpkt, string MaLoaiTbdb, string MaTbdb, int SoLuongSpktCoSo, int SlDinhMuc, string? GhiChu);

[ApiController]
[Authorize]
[Route("api/danh-muc/chi-tiet-dong-bo")]
[YeuCauQuyen(Cn.DanhMuc)]
public class ChiTietDongBoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    // GET api/danh-muc/chi-tiet-dong-bo?maKieuSpkt=&maLoaiTbdb=
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? maKieuSpkt, [FromQuery] string? maLoaiTbdb)
    {
        var query = db.ChiTietDongBos.Include(c => c.MaTbdbNavigation).AsQueryable();
        if (!string.IsNullOrWhiteSpace(maKieuSpkt)) query = query.Where(c => c.MaKieuSpkt == maKieuSpkt);
        if (!string.IsNullOrWhiteSpace(maLoaiTbdb)) query = query.Where(c => c.MaLoaiTbdb == maLoaiTbdb);

        var list = await query
            .OrderBy(c => c.MaKieuSpkt).ThenBy(c => c.MaLoaiTbdb).ThenBy(c => c.MaTbdb)
            .Select(c => new
            {
                maKieuSpkt = c.MaKieuSpkt,
                maLoaiTbdb = c.MaLoaiTbdb,
                maTbdb = c.MaTbdb,
                tenTbdb = c.MaTbdbNavigation.TenTbdb,
                soLuongSpktCoSo = c.SoLuongSpktcoSo,
                slDinhMuc = c.SldinhMuc,
                ghiChu = c.GhiChu,
            })
            .ToListAsync();
        return Ok(list);
    }

    // Danh sách TBĐB để chọn khi thêm dòng chi tiết.
    [HttpGet("tbdb")]
    public async Task<IActionResult> GetTbdbList()
        => Ok(await db.Tbdbs.OrderBy(t => t.MaTbdb)
            .Select(t => new { maTbdb = t.MaTbdb, tenTbdb = t.TenTbdb }).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ChiTietDongBoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.MaTbdb)) return BadRequest(new { message = "Chưa chọn trang bị đồng bộ" });
        if (dto.SlDinhMuc <= 0) return BadRequest(new { message = "Số lượng định mức phải lớn hơn 0" });
        if (!await db.NhomDongBos.AnyAsync(n => n.MaKieuSpkt == dto.MaKieuSpkt && n.MaLoaiTbdb == dto.MaLoaiTbdb))
            return BadRequest(new { message = "Nhóm đồng bộ không tồn tại" });
        if (await db.Tbdbs.FindAsync(dto.MaTbdb) == null) return BadRequest(new { message = "Trang bị đồng bộ không tồn tại" });
        if (await db.ChiTietDongBos.AnyAsync(c => c.MaKieuSpkt == dto.MaKieuSpkt && c.MaLoaiTbdb == dto.MaLoaiTbdb && c.MaTbdb == dto.MaTbdb))
            return BadRequest(new { message = "Trang bị này đã có trong nhóm" });

        db.ChiTietDongBos.Add(new ChiTietDongBo
        {
            MaKieuSpkt = dto.MaKieuSpkt,
            MaLoaiTbdb = dto.MaLoaiTbdb,
            MaTbdb = dto.MaTbdb,
            SoLuongSpktcoSo = dto.SoLuongSpktCoSo,
            SldinhMuc = dto.SlDinhMuc,
            GhiChu = dto.GhiChu,
        });
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "ChiTietDongBo",
            $"{dto.MaKieuSpkt}|{dto.MaLoaiTbdb}|{dto.MaTbdb}", $"Thêm chi tiết đồng bộ \"{dto.MaTbdb}\" vào nhóm \"{dto.MaKieuSpkt} + {dto.MaLoaiTbdb}\"");
        return Ok(new { message = "Thêm thành công" });
    }

    [HttpPut("{maKieuSpkt}/{maLoaiTbdb}/{maTbdb}")]
    public async Task<IActionResult> Update(string maKieuSpkt, string maLoaiTbdb, string maTbdb, [FromBody] ChiTietDongBoDto dto)
    {
        var ct = await db.ChiTietDongBos.FirstOrDefaultAsync(c =>
            c.MaKieuSpkt == maKieuSpkt && c.MaLoaiTbdb == maLoaiTbdb && c.MaTbdb == maTbdb);
        if (ct == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });
        if (dto.SlDinhMuc <= 0) return BadRequest(new { message = "Số lượng định mức phải lớn hơn 0" });

        ct.SoLuongSpktcoSo = dto.SoLuongSpktCoSo;
        ct.SldinhMuc = dto.SlDinhMuc;
        ct.GhiChu = dto.GhiChu;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "ChiTietDongBo",
            $"{maKieuSpkt}|{maLoaiTbdb}|{maTbdb}", $"Cập nhật chi tiết đồng bộ \"{maTbdb}\" trong nhóm \"{maKieuSpkt} + {maLoaiTbdb}\"");
        return Ok(new { message = "Cập nhật thành công" });
    }

    [HttpDelete("{maKieuSpkt}/{maLoaiTbdb}/{maTbdb}")]
    public async Task<IActionResult> Remove(string maKieuSpkt, string maLoaiTbdb, string maTbdb)
    {
        var ct = await db.ChiTietDongBos.FirstOrDefaultAsync(c =>
            c.MaKieuSpkt == maKieuSpkt && c.MaLoaiTbdb == maLoaiTbdb && c.MaTbdb == maTbdb);
        if (ct == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

        db.ChiTietDongBos.Remove(ct);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "ChiTietDongBo",
            $"{maKieuSpkt}|{maLoaiTbdb}|{maTbdb}", $"Xóa chi tiết đồng bộ \"{maTbdb}\" khỏi nhóm \"{maKieuSpkt} + {maLoaiTbdb}\"");
        return Ok(new { message = "Xóa thành công" });
    }
}

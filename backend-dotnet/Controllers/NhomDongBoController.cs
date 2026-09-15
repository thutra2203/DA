using backend_dotnet.Models;
using backend_dotnet.Services;
using backend_dotnet.Services.Rbac;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

// Danh mục "Nhóm đồng bộ" — mỗi nhóm = 1 cặp (Kiểu SPKT + Loại TBĐB), là "bộ" trang bị đồng bộ.
// Khóa chính ghép nên không dùng được DanhMucControllerBase (chỉ hỗ trợ khóa 1 cột).
public record NhomDongBoDto(string MaKieuSpkt, string MaLoaiTbdb, string? GhiChu);

[ApiController]
[Authorize]
[Route("api/danh-muc/nhom-dong-bo")]
[YeuCauQuyen(Cn.DanhMuc)]
public class NhomDongBoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await db.NhomDongBos
            .Include(n => n.MaKieuSpktNavigation)
            .Include(n => n.MaLoaiTbdbNavigation)
            .OrderBy(n => n.MaKieuSpkt).ThenBy(n => n.MaLoaiTbdb)
            .Select(n => new
            {
                maKieuSpkt = n.MaKieuSpkt,
                tenKieuSpkt = n.MaKieuSpktNavigation.TenKieu,
                maLoaiTbdb = n.MaLoaiTbdb,
                tenLoaiTbdb = n.MaLoaiTbdbNavigation.TenLoai,
                ghiChu = n.GhiChu,
                soChiTiet = n.ChiTietDongBos.Count,
            })
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NhomDongBoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.MaKieuSpkt) || string.IsNullOrWhiteSpace(dto.MaLoaiTbdb))
            return BadRequest(new { message = "Chưa chọn Kiểu SPKT và Loại TBĐB" });
        if (await db.KieuSpkts.FindAsync(dto.MaKieuSpkt) == null) return BadRequest(new { message = "Kiểu SPKT không tồn tại" });
        if (await db.LoaiTbdbs.FindAsync(dto.MaLoaiTbdb) == null) return BadRequest(new { message = "Loại TBĐB không tồn tại" });
        if (await db.NhomDongBos.AnyAsync(n => n.MaKieuSpkt == dto.MaKieuSpkt && n.MaLoaiTbdb == dto.MaLoaiTbdb))
            return BadRequest(new { message = "Nhóm đồng bộ này đã tồn tại" });

        db.NhomDongBos.Add(new NhomDongBo { MaKieuSpkt = dto.MaKieuSpkt, MaLoaiTbdb = dto.MaLoaiTbdb, GhiChu = dto.GhiChu });
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "NhomDongBo", $"{dto.MaKieuSpkt}|{dto.MaLoaiTbdb}",
            $"Thêm nhóm đồng bộ \"{dto.MaKieuSpkt} + {dto.MaLoaiTbdb}\"");
        return Ok(new { message = "Thêm thành công" });
    }

    [HttpPut("{maKieuSpkt}/{maLoaiTbdb}")]
    public async Task<IActionResult> Update(string maKieuSpkt, string maLoaiTbdb, [FromBody] NhomDongBoDto dto)
    {
        var nhom = await db.NhomDongBos.FirstOrDefaultAsync(n => n.MaKieuSpkt == maKieuSpkt && n.MaLoaiTbdb == maLoaiTbdb);
        if (nhom == null) return NotFound(new { message = "Không tìm thấy nhóm đồng bộ" });

        nhom.GhiChu = dto.GhiChu;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "NhomDongBo", $"{maKieuSpkt}|{maLoaiTbdb}",
            $"Cập nhật nhóm đồng bộ \"{maKieuSpkt} + {maLoaiTbdb}\"");
        return Ok(new { message = "Cập nhật thành công" });
    }

    [HttpDelete("{maKieuSpkt}/{maLoaiTbdb}")]
    public async Task<IActionResult> Remove(string maKieuSpkt, string maLoaiTbdb)
    {
        var nhom = await db.NhomDongBos.FirstOrDefaultAsync(n => n.MaKieuSpkt == maKieuSpkt && n.MaLoaiTbdb == maLoaiTbdb);
        if (nhom == null) return NotFound(new { message = "Không tìm thấy nhóm đồng bộ" });

        var soChiTiet = await db.ChiTietDongBos.CountAsync(c => c.MaKieuSpkt == maKieuSpkt && c.MaLoaiTbdb == maLoaiTbdb);
        if (soChiTiet > 0) return BadRequest(new { message = $"Nhóm còn {soChiTiet} dòng chi tiết, không thể xóa" });

        db.NhomDongBos.Remove(nhom);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "NhomDongBo", $"{maKieuSpkt}|{maLoaiTbdb}",
            $"Xóa nhóm đồng bộ \"{maKieuSpkt} + {maLoaiTbdb}\"");
        return Ok(new { message = "Xóa thành công" });
    }
}

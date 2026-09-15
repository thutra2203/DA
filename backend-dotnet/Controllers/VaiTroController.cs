using backend_dotnet.Dtos;
using backend_dotnet.Models;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/vai-tro")]
[Authorize]
public class VaiTroController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    private const string ProtectedRole = "ADMIN";

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await db.VaiTros
            .OrderBy(v => v.MaVaiTro)
            .Select(v => new VaiTroItem { Id = v.MaVaiTro, TenVaiTro = v.TenVaiTro, MoTa = v.MoTa })
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateVaiTroRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.TenVaiTro))
            return BadRequest(new { message = "Tên vai trò không được để trống" });

        var dupName = await db.VaiTros.AnyAsync(v => v.TenVaiTro == body.TenVaiTro);
        if (dupName) return BadRequest(new { message = "Tên vai trò đã tồn tại" });

        var maVaiTro = RoleSlugifier.Slugify(body.TenVaiTro);
        if (await db.VaiTros.AnyAsync(v => v.MaVaiTro == maVaiTro))
            maVaiTro = $"{maVaiTro}{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() % 10000}";

        // Vai trò mới KHÔNG có quyền nào — phải vào "Phân quyền" cấp quyền thì mới xem/thao tác được.
        db.VaiTros.Add(new VaiTro { MaVaiTro = maVaiTro, TenVaiTro = body.TenVaiTro, MoTa = body.MoTa ?? "" });
        await db.SaveChangesAsync();

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "VaiTro", maVaiTro,
            $"Tạo vai trò mới \"{body.TenVaiTro}\" (mã {maVaiTro})");

        return StatusCode(201, new { message = "Tạo vai trò thành công" });
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateVaiTroRequest body)
    {
        var vt = await db.VaiTros.FindAsync(id);
        if (vt == null) return NotFound(new { message = "Không tìm thấy vai trò" });
        if (id == ProtectedRole) return BadRequest(new { message = "Không thể sửa vai trò mặc định" });

        var tenMoi = body.TenVaiTro?.Trim();
        if (string.IsNullOrWhiteSpace(tenMoi))
            return BadRequest(new { message = "Tên vai trò không được để trống" });
        if (await db.VaiTros.AnyAsync(v => v.TenVaiTro == tenMoi && v.MaVaiTro != id))
            return BadRequest(new { message = "Tên vai trò đã tồn tại" });

        vt.TenVaiTro = tenMoi;
        vt.MoTa = body.MoTa ?? "";
        await db.SaveChangesAsync();

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "VaiTro", id,
            $"Cập nhật vai trò \"{vt.TenVaiTro}\" (mã {id})");

        return Ok(new { message = "Cập nhật thành công" });
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Remove(string id)
    {
        var vt = await db.VaiTros.FindAsync(id);
        if (vt == null) return NotFound(new { message = "Không tìm thấy vai trò" });
        if (id == ProtectedRole) return BadRequest(new { message = "Không thể xóa vai trò mặc định của hệ thống" });

        var soNguoi = await db.NguoiDungVaiTros.CountAsync(x => x.MaVaiTro == id);
        if (soNguoi > 0) return BadRequest(new { message = $"Còn {soNguoi} tài khoản đang dùng vai trò này" });

        db.VaiTroChucNangQuyens.RemoveRange(db.VaiTroChucNangQuyens.Where(x => x.MaVaiTro == id));
        await db.SaveChangesAsync();
        db.VaiTros.Remove(vt);
        await db.SaveChangesAsync();

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "VaiTro", id, $"Xóa vai trò \"{vt.TenVaiTro}\"");

        return Ok(new { message = "Xóa vai trò thành công" });
    }
}

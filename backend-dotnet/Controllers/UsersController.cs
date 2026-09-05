using backend_dotnet.Dtos;
using backend_dotnet.Models;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await (
            from nd in db.NguoiDungs
            join ndvt in db.NguoiDungVaiTros on nd.MaNd equals ndvt.MaNguoiDung into vtJoin
            from ndvt in vtJoin.DefaultIfEmpty()
            join vt in db.VaiTros on ndvt.MaVaiTro equals vt.MaVaiTro into vtJoin2
            from vt in vtJoin2.DefaultIfEmpty()
            join kho in db.Khos on nd.MaDonVi equals kho.MaKho into khoJoin
            from kho in khoJoin.DefaultIfEmpty()
            orderby nd.CreatedAt descending
            select new UserListItem
            {
                Id = nd.MaNd,
                TenDangNhap = nd.TenDangNhap,
                HoTen = nd.HoTen,
                VaiTro = vt.MaVaiTro,
                TrangThai = nd.BiKhoa ? 0 : 1,
                NgayTao = nd.CreatedAt,
                MaDonVi = nd.MaDonVi,
                TenDonVi = kho.TenKho,
            }
        ).ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest body)
    {
        if (string.IsNullOrEmpty(body.TenDangNhap) || string.IsNullOrEmpty(body.MatKhau) || string.IsNullOrEmpty(body.HoTen))
            return BadRequest(new { message = "Thiếu thông tin bắt buộc" });

        var exists = await db.NguoiDungs.AnyAsync(u => u.TenDangNhap == body.TenDangNhap);
        if (exists) return BadRequest(new { message = "Tên đăng nhập đã tồn tại" });

        var hashed = BCrypt.Net.BCrypt.HashPassword(body.MatKhau, 10);
        // NguoiDung.email là UNIQUE — sinh placeholder duy nhất vì form không thu thập email.
        var placeholderEmail = $"{body.TenDangNhap}@local";

        var newUser = new NguoiDung
        {
            TenDangNhap = body.TenDangNhap,
            MatKhauHash = hashed,
            HoTen = body.HoTen,
            Email = placeholderEmail,
            IsActive = true,
            BiKhoa = false,
            CreatedAt = DateTime.Now,
            MaDonVi = string.IsNullOrWhiteSpace(body.MaDonVi) ? null : body.MaDonVi,
        };
        db.NguoiDungs.Add(newUser);

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        db.NguoiDungVaiTros.Add(new NguoiDungVaiTro { MaNguoiDung = newUser.MaNd, MaVaiTro = body.VaiTro! });
        await db.SaveChangesAsync();

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "NguoiDung", newUser.MaNd.ToString(),
            $"Tạo tài khoản mới \"{body.TenDangNhap}\" (vai trò: {body.VaiTro})");

        return StatusCode(201, new { message = "Tạo tài khoản thành công" });
    }

    [HttpPut("{id:int}/role")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleRequest body)
    {
        var existing = db.NguoiDungVaiTros.Where(x => x.MaNguoiDung == id);
        db.NguoiDungVaiTros.RemoveRange(existing);
        await db.SaveChangesAsync();

        db.NguoiDungVaiTros.Add(new NguoiDungVaiTro { MaNguoiDung = id, MaVaiTro = body.VaiTro! });
        await db.SaveChangesAsync();

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "NguoiDung", id.ToString(),
            $"Đổi vai trò tài khoản ID {id} thành \"{body.VaiTro}\"");

        return Ok(new { message = "Cập nhật quyền thành công" });
    }

    [HttpPut("{id:int}/kho")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> UpdateKho(int id, [FromBody] UpdateUserKhoRequest body)
    {
        var user = await db.NguoiDungs.FindAsync(id);
        if (user == null) return NotFound(new { message = "Không tìm thấy tài khoản" });

        user.MaDonVi = string.IsNullOrWhiteSpace(body.MaDonVi) ? null : body.MaDonVi;

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "NguoiDung", id.ToString(),
            $"Gán kho cho tài khoản ID {id}: {(user.MaDonVi ?? "(không giới hạn)")}");

        return Ok(new { message = "Cập nhật kho thành công" });
    }

    [HttpPut("{id:int}/reset-password")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequest body)
    {
        var user = await db.NguoiDungs.FindAsync(id);
        if (user == null) return NotFound(new { message = "Không tìm thấy tài khoản" });

        user.MatKhauHash = BCrypt.Net.BCrypt.HashPassword(string.IsNullOrEmpty(body.MatKhauMoi) ? "123456" : body.MatKhauMoi, 10);
        await db.SaveChangesAsync();

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "NguoiDung", id.ToString(),
            $"Đặt lại mật khẩu cho tài khoản ID {id}");

        return Ok(new { message = "Đặt lại mật khẩu thành công" });
    }

    [HttpPut("{id:int}/toggle-lock")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> ToggleLock(int id)
    {
        var user = await db.NguoiDungs.FindAsync(id);
        if (user == null) return NotFound(new { message = "Không tìm thấy tài khoản" });

        user.BiKhoa = !user.BiKhoa;
        user.LyDoKhoa = user.BiKhoa ? "Khóa bởi quản trị viên" : null;
        await db.SaveChangesAsync();

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "NguoiDung", id.ToString(),
            $"{(user.BiKhoa ? "Khóa" : "Mở khóa")} tài khoản ID {id}");

        return Ok(new { message = "Cập nhật trạng thái tài khoản thành công" });
    }
}

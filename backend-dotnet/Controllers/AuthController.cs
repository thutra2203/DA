using backend_dotnet.Dtos;
using backend_dotnet.Models;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(QuanLyKhoQuanKhiContext db, TokenService tokenService, IActivityLogger log) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest body)
    {
        if (string.IsNullOrEmpty(body.Username) || string.IsNullOrEmpty(body.Password))
            return BadRequest(new { message = "Vui lòng nhập tài khoản và mật khẩu" });

        var user = await db.NguoiDungs.FirstOrDefaultAsync(u => u.TenDangNhap == body.Username);

        if (user == null)
        {
            await log.LogAsync(null, body.Username, "DANG_NHAP", ketQua: "THAT_BAI", lyDoThatBai: "Tài khoản không tồn tại");
            return Unauthorized(new { message = "Tài khoản không tồn tại hoặc đã bị khóa" });
        }

        if (!user.IsActive || user.BiKhoa)
        {
            await log.LogAsync(user.MaNd, user.TenDangNhap, "DANG_NHAP", ketQua: "THAT_BAI", lyDoThatBai: "Tài khoản đã bị khóa");
            return Unauthorized(new { message = "Tài khoản không tồn tại hoặc đã bị khóa" });
        }

        if (!BCrypt.Net.BCrypt.Verify(body.Password, user.MatKhauHash))
        {
            user.SoLanSaiMk += 1;
            await db.SaveChangesAsync();
            await log.LogAsync(user.MaNd, user.TenDangNhap, "DANG_NHAP", ketQua: "THAT_BAI", lyDoThatBai: "Sai mật khẩu");
            return Unauthorized(new { message = "Mật khẩu không đúng" });
        }

        var maVaiTro = await db.NguoiDungVaiTros
            .Where(x => x.MaNguoiDung == user.MaNd)
            .Select(x => x.MaVaiTro)
            .FirstOrDefaultAsync();

        user.SoLanSaiMk = 0;
        user.LanDangNhapCuoi = DateTime.Now;
        await db.SaveChangesAsync();

        var token = tokenService.GenerateToken(user.MaNd, user.TenDangNhap, maVaiTro ?? "");

        await log.LogAsync(user.MaNd, user.TenDangNhap, "DANG_NHAP", ketQua: "THANH_CONG");

        return Ok(new LoginResponse(
            "Đăng nhập thành công",
            token,
            new UserSummary(user.MaNd, user.TenDangNhap, user.HoTen, maVaiTro)));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "DANG_XUAT", ketQua: "THANH_CONG");
        return Ok(new { message = "Đăng xuất thành công" });
    }
}

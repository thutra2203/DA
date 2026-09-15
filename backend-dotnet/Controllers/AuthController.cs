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

        var user = await db.NguoiDungs.Include(u => u.MaDonViNavigation).FirstOrDefaultAsync(u => u.TenDangNhap == body.Username);

        if (user == null)
        {
            await log.LogAsync(null, body.Username, "DANG_NHAP", ketQua: "THAT_BAI", lyDoThatBai: "Tài khoản không tồn tại");
            return Unauthorized(new { message = "Tài khoản không tồn tại hoặc đã bị khóa" });
        }

        if (!user.IsActive || user.BiKhoa)
        {
            await log.LogAsync(user.MaNd, user.TenDangNhap, "DANG_NHAP", ketQua: "THAT_BAI", lyDoThatBai: "Tài khoản đã bị khóa");
            var lyDo = string.IsNullOrWhiteSpace(user.LyDoKhoa) ? null : $" Lý do: {user.LyDoKhoa}.";
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = $"Tài khoản của bạn đã bị khóa.{lyDo} Vui lòng liên hệ quản trị viên." });
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

        var token = tokenService.GenerateToken(user.MaNd, user.TenDangNhap, maVaiTro ?? "", user.MaDonVi);

        await log.LogAsync(user.MaNd, user.TenDangNhap, "DANG_NHAP", ketQua: "THANH_CONG");

        return Ok(new LoginResponse(
            "Đăng nhập thành công",
            token,
            new UserSummary(user.MaNd, user.TenDangNhap, user.HoTen, maVaiTro, user.MaDonVi, user.MaDonViNavigation?.TenKho)));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "DANG_XUAT", ketQua: "THANH_CONG");
        return Ok(new { message = "Đăng xuất thành công" });
    }

    // GET api/auth/me — thông tin tài khoản của chính người đang đăng nhập, cho mục "Thông tin tài
    // khoản" ở menu người dùng. Không dùng YeuCauQuyen(HtNguoiDung) như UsersController vì đây là
    // xem thông tin CỦA CHÍNH MÌNH, không phải quản trị người dùng khác — ai đăng nhập cũng xem được.
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var maNd = this.CurrentUserId();
        var info = await (
            from nd in db.NguoiDungs
            join ndvt in db.NguoiDungVaiTros on nd.MaNd equals ndvt.MaNguoiDung into vtJoin
            from ndvt in vtJoin.DefaultIfEmpty()
            join vt in db.VaiTros on ndvt.MaVaiTro equals vt.MaVaiTro into vtJoin2
            from vt in vtJoin2.DefaultIfEmpty()
            join kho in db.Khos on nd.MaDonVi equals kho.MaKho into khoJoin
            from kho in khoJoin.DefaultIfEmpty()
            join cb in db.CapBacs on nd.MaCapBac equals cb.MaCapBac into cbJoin
            from cb in cbJoin.DefaultIfEmpty()
            join cv in db.ChucVus on nd.MaChucVu equals cv.MaChucVu into cvJoin
            from cv in cvJoin.DefaultIfEmpty()
            where nd.MaNd == maNd
            select new MeResponse(
                nd.MaNd, nd.TenDangNhap, nd.HoTen,
                nd.MaCapBac, cb.TenCapBac,
                nd.MaChucVu, cv.TenChucVu,
                nd.MaDonVi, kho.TenKho,
                vt.MaVaiTro, vt.TenVaiTro,
                nd.Email, nd.SoDienThoai,
                nd.LanDangNhapCuoi, nd.CreatedAt)
        ).FirstOrDefaultAsync();

        if (info == null) return NotFound(new { message = "Không tìm thấy thông tin tài khoản" });
        return Ok(info);
    }
}

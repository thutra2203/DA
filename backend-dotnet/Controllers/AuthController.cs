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
    // Số lần nhập sai mật khẩu liên tiếp tối đa trước khi tự động khóa tài khoản.
    private const int SoLanSaiToiDa = 5;

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
            var vuaBiKhoa = user.SoLanSaiMk >= SoLanSaiToiDa;
            if (vuaBiKhoa)
            {
                user.BiKhoa = true;
                user.LyDoKhoa = $"Khóa tự động do nhập sai mật khẩu {SoLanSaiToiDa} lần liên tiếp";
            }
            await db.SaveChangesAsync();
            await log.LogAsync(user.MaNd, user.TenDangNhap, "DANG_NHAP", ketQua: "THAT_BAI",
                lyDoThatBai: vuaBiKhoa ? $"Sai mật khẩu — đã khóa tài khoản sau {SoLanSaiToiDa} lần sai" : "Sai mật khẩu");
            if (vuaBiKhoa)
                return StatusCode(StatusCodes.Status403Forbidden,
                    new { message = $"Tài khoản đã bị khóa do nhập sai mật khẩu {SoLanSaiToiDa} lần liên tiếp. Vui lòng liên hệ quản trị viên." });
            return Unauthorized(new { message = $"Mật khẩu không đúng (còn {SoLanSaiToiDa - user.SoLanSaiMk} lần thử trước khi tài khoản bị khóa)" });
        }

        var maVaiTro = await db.NguoiDungVaiTros
            .Where(x => x.MaNguoiDung == user.MaNd)
            .Select(x => x.MaVaiTro)
            .FirstOrDefaultAsync();

        user.SoLanSaiMk = 0;
        user.LanDangNhapCuoi = DateTime.Now;

        var token = tokenService.GenerateToken(user.MaNd, user.TenDangNhap, maVaiTro ?? "", user.MaDonVi);
        var refreshTokenValue = TokenService.TaoRefreshTokenValue();
        db.RefreshTokens.Add(new RefreshToken
        {
            MaNguoiDung = user.MaNd,
            TokenHash = TokenService.HashToken(refreshTokenValue),
            NgayHetHan = DateTime.UtcNow.AddDays(tokenService.RefreshTokenExpiresInDays),
        });
        await db.SaveChangesAsync();

        await log.LogAsync(user.MaNd, user.TenDangNhap, "DANG_NHAP", ketQua: "THANH_CONG");

        return Ok(new LoginResponse(
            "Đăng nhập thành công",
            token,
            refreshTokenValue,
            new UserSummary(user.MaNd, user.TenDangNhap, user.HoTen, maVaiTro, user.MaDonVi, user.MaDonViNavigation?.TenKho)));
    }

    // Access token hết hạn (15 phút) -> frontend tự gọi endpoint này bằng refresh token đang giữ để
    // lấy cặp token mới, không bắt người dùng đăng nhập lại. Mỗi lần refresh XOAY VÒNG: thu hồi refresh
    // token cũ, phát hành refresh token mới — nếu 1 refresh token đã bị thu hồi mà vẫn có người đem
    // dùng lại (dấu hiệu bị đánh cắp), thu hồi LUÔN toàn bộ phiên đang hoạt động của tài khoản đó.
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest body)
    {
        if (string.IsNullOrEmpty(body.RefreshToken)) return Unauthorized(new { message = "Thiếu refresh token" });

        var hash = TokenService.HashToken(body.RefreshToken);
        var rt = await db.RefreshTokens.Include(r => r.MaNguoiDungNavigation)
            .FirstOrDefaultAsync(r => r.TokenHash == hash);

        if (rt == null) return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại" });

        if (rt.DaThuHoi)
        {
            var dangHoatDong = await db.RefreshTokens.Where(r => r.MaNguoiDung == rt.MaNguoiDung && !r.DaThuHoi).ToListAsync();
            foreach (var a in dangHoatDong) { a.DaThuHoi = true; a.NgayThuHoi = DateTime.UtcNow; }
            await db.SaveChangesAsync();
            return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại" });
        }

        if (rt.NgayHetHan < DateTime.UtcNow)
            return Unauthorized(new { message = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" });

        var user = rt.MaNguoiDungNavigation;
        if (!user.IsActive || user.BiKhoa)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Tài khoản đã bị khóa" });

        rt.DaThuHoi = true;
        rt.NgayThuHoi = DateTime.UtcNow;

        var maVaiTro = await db.NguoiDungVaiTros
            .Where(x => x.MaNguoiDung == user.MaNd)
            .Select(x => x.MaVaiTro)
            .FirstOrDefaultAsync();

        var newToken = tokenService.GenerateToken(user.MaNd, user.TenDangNhap, maVaiTro ?? "", user.MaDonVi);
        var newRefreshTokenValue = TokenService.TaoRefreshTokenValue();
        db.RefreshTokens.Add(new RefreshToken
        {
            MaNguoiDung = user.MaNd,
            TokenHash = TokenService.HashToken(newRefreshTokenValue),
            NgayHetHan = DateTime.UtcNow.AddDays(tokenService.RefreshTokenExpiresInDays),
        });
        await db.SaveChangesAsync();

        return Ok(new RefreshResponse(newToken, newRefreshTokenValue));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest? body)
    {
        if (!string.IsNullOrEmpty(body?.RefreshToken))
        {
            var hash = TokenService.HashToken(body.RefreshToken);
            var rt = await db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == hash && !r.DaThuHoi);
            if (rt != null)
            {
                rt.DaThuHoi = true;
                rt.NgayThuHoi = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }
        }

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

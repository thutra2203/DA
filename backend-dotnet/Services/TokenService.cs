using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace backend_dotnet.Services;

// Access token (JWT, sống ngắn — mặc định 15 phút) + refresh token (chuỗi ngẫu nhiên, sống dài hơn
// nhiều — mặc định 7 ngày, xem AuthController.Refresh) để vừa giới hạn thời gian 1 access token bị
// lộ có thể dùng được, vừa không bắt người dùng đăng nhập lại liên tục. Refresh token KHÔNG lưu
// plaintext trong DB — chỉ lưu HashToken(...) của nó (xem RefreshToken.TokenHash), giống cách mật
// khẩu không lưu plaintext, để lộ CSDL cũng không lấy được refresh token dùng được ngay.
public class TokenService(IConfiguration config)
{
    public int ExpiresInMinutes => config.GetValue("Jwt:ExpiresInMinutes", 15);
    public int RefreshTokenExpiresInDays => config.GetValue("Jwt:RefreshTokenExpiresInDays", 7);

    public string GenerateToken(int id, string username, string role, string? maDonVi = null)
    {
        var secret = config["Jwt:Secret"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, id.ToString()),
            new(ClaimTypes.Name, username),
            new(ClaimTypes.Role, role),
        };
        if (!string.IsNullOrEmpty(maDonVi)) claims.Add(new Claim("maDonVi", maDonVi));

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(ExpiresInMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // Chuỗi ngẫu nhiên 512 bit — không phải JWT, chỉ là 1 "vé" tra cứu trong bảng RefreshToken.
    public static string TaoRefreshTokenValue() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public static string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}

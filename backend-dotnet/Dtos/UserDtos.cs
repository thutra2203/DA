using System.Text.Json.Serialization;

namespace backend_dotnet.Dtos;

// Casing PascalCase giữ nguyên y hệt backend Node (userController.js) để frontend không cần đổi.
public class UserListItem
{
    [JsonPropertyName("ID")] public int Id { get; set; }
    [JsonPropertyName("TenDangNhap")] public string TenDangNhap { get; set; } = "";
    [JsonPropertyName("HoTen")] public string HoTen { get; set; } = "";
    [JsonPropertyName("VaiTro")] public string? VaiTro { get; set; }
    [JsonPropertyName("TrangThai")] public int TrangThai { get; set; }
    [JsonPropertyName("NgayTao")] public DateTime NgayTao { get; set; }
    [JsonPropertyName("MaDonVi")] public string? MaDonVi { get; set; }
    [JsonPropertyName("TenDonVi")] public string? TenDonVi { get; set; }
    [JsonPropertyName("MaCapBac")] public string? MaCapBac { get; set; }
    [JsonPropertyName("TenCapBac")] public string? TenCapBac { get; set; }
    [JsonPropertyName("MaChucVu")] public string? MaChucVu { get; set; }
    [JsonPropertyName("TenChucVu")] public string? TenChucVu { get; set; }
    [JsonPropertyName("Email")] public string? Email { get; set; }
    [JsonPropertyName("SoDienThoai")] public string? SoDienThoai { get; set; }
    [JsonPropertyName("LyDoKhoa")] public string? LyDoKhoa { get; set; }
    [JsonPropertyName("LanDangNhapCuoi")] public DateTime? LanDangNhapCuoi { get; set; }
}

public record CreateUserRequest(string? TenDangNhap, string? HoTen, string? MatKhau, string? VaiTro, string? MaDonVi,
    string? MaCapBac, string? MaChucVu, string? Email, string? SoDienThoai);
public record UpdateUserRoleRequest(string? VaiTro);
public record UpdateUserKhoRequest(string? MaDonVi);
public record ResetPasswordRequest(string? MatKhauMoi);

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
}

public record CreateUserRequest(string? TenDangNhap, string? HoTen, string? MatKhau, string? VaiTro);
public record UpdateUserRoleRequest(string? VaiTro);
public record ResetPasswordRequest(string? MatKhauMoi);

namespace backend_dotnet.Dtos;

public record LoginRequest(string? Username, string? Password);

public record UserSummary(int Id, string Username, string HoTen, string? Role, string? MaDonVi, string? TenDonVi);

public record LoginResponse(string Message, string Token, string RefreshToken, UserSummary User);

// Access token sống ngắn (mặc định 15 phút) — khi hết hạn, frontend tự gọi endpoint này bằng
// RefreshToken còn hiệu lực (mặc định 7 ngày) để lấy cặp token mới mà không cần đăng nhập lại.
public record RefreshRequest(string? RefreshToken);
public record RefreshResponse(string Token, string RefreshToken);
public record LogoutRequest(string? RefreshToken);

// Thông tin tài khoản đầy đủ của người dùng đang đăng nhập — dùng cho mục "Thông tin tài khoản"
// (chỉ xem, không có ở đây quyền quản trị nào — ai đăng nhập cũng xem được thông tin của chính mình).
public record MeResponse(
    int Id, string Username, string HoTen,
    string? MaCapBac, string? TenCapBac,
    string? MaChucVu, string? TenChucVu,
    string? MaDonVi, string? TenDonVi,
    string? MaVaiTro, string? TenVaiTro,
    string? Email, string? SoDienThoai,
    DateTime? LanDangNhapCuoi, DateTime CreatedAt);

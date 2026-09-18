namespace backend_dotnet.Services;

// Ràng buộc độ mạnh mật khẩu — dùng chung cho tạo tài khoản mới và đặt lại mật khẩu
// (UsersController.Create/ResetPassword) để không lặp lại luật ở 2 nơi.
public static class MatKhauValidator
{
    public const int DoDaiToiThieu = 8;

    // Trả về thông báo lỗi đầu tiên chưa đạt, hoặc null nếu mật khẩu hợp lệ.
    public static string? KiemTra(string matKhau)
    {
        if (matKhau.Length < DoDaiToiThieu) return $"Mật khẩu phải có ít nhất {DoDaiToiThieu} ký tự";
        if (!matKhau.Any(char.IsUpper)) return "Mật khẩu phải có ít nhất 1 chữ hoa";
        if (!matKhau.Any(char.IsLower)) return "Mật khẩu phải có ít nhất 1 chữ thường";
        if (!matKhau.Any(char.IsDigit)) return "Mật khẩu phải có ít nhất 1 chữ số";
        if (!matKhau.Any(c => !char.IsLetterOrDigit(c))) return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt";
        return null;
    }
}

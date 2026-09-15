using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace backend_dotnet.Services;

// Bỏ dấu tiếng Việt, viết hoa, loại bỏ mọi ký tự không phải chữ/số (kể cả khoảng trắng)
// -> dùng làm mã vai trò (maVaiTro). VD: "Trưởng kho" -> "TRUONGKHO".
public static class RoleSlugifier
{
    public static string Slugify(string? name)
    {
        var input = (name ?? string.Empty).Replace('đ', 'd').Replace('Đ', 'D');
        var normalized = input.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        var code = sb.ToString().ToUpperInvariant();
        code = Regex.Replace(code, "[^A-Z0-9]+", "");
        return string.IsNullOrEmpty(code) ? $"VT{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}" : code;
    }
}

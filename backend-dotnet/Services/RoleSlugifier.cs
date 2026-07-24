using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace backend_dotnet.Services;

// Tương đương slugifyRoleCode trong backend/src/controllers/vaiTroController.js:
// bỏ dấu tiếng Việt, viết hoa, nối bằng dấu gạch dưới -> dùng làm mã vai trò (maVaiTro).
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
        var code = sb.ToString().Trim().ToUpperInvariant();
        code = Regex.Replace(code, "[^A-Z0-9]+", "_");
        code = code.Trim('_');
        return string.IsNullOrEmpty(code) ? $"VT_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}" : code;
    }
}

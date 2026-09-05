using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace backend_dotnet.Services;

public static class ControllerUserExtensions
{
    public static int CurrentUserId(this ControllerBase c)
        => int.Parse(c.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public static string CurrentUsername(this ControllerBase c)
        => c.User.FindFirstValue(ClaimTypes.Name) ?? "";

    public static string CurrentRole(this ControllerBase c)
        => c.User.FindFirstValue(ClaimTypes.Role) ?? "";

    // Kho (đơn vị) được gán cho người dùng hiện tại — null nếu không bị giới hạn theo kho.
    public static string? CurrentMaKho(this ControllerBase c)
        => c.User.FindFirstValue("maDonVi");

    // ADMIN và người dùng chưa được gán kho (MaDonVi null) xem được toàn bộ dữ liệu; chỉ người
    // dùng đã gán kho mới bị giới hạn — theo đúng yêu cầu nghiệp vụ.
    public static bool IsGioiHanKho(this ControllerBase c)
        => c.CurrentRole() != "ADMIN" && !string.IsNullOrEmpty(c.CurrentMaKho());
}

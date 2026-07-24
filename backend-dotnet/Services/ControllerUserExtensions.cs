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
}

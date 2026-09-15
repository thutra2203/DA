using System.Security.Claims;
using backend_dotnet.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services.Rbac;

public enum QuyenHanhDong { Xem, Them, Sua, Xoa }

// Đặt trên controller hoặc action để yêu cầu vai trò người dùng được cấp quyền tương ứng với (một
// trong các) nhóm chức năng. ADMIN luôn bỏ qua.
//
//   [YeuCauQuyen(Cn.TbdbCclXl)]                          -> suy hành động theo HTTP method
//   [YeuCauQuyen(Cn.TbdbCclLap, QuyenHanhDong.Them)]     -> ép cứng 1 hành động
//   [YeuCauQuyen(Cn.TbdbCclLap, Cn.TbdbCclXl)]           -> chỉ cần có quyền ở 1 trong 2 module (dùng
//                                                           cho GET danh sách mà cả người lập lẫn
//                                                           người xử lý đều cần xem)
//
// Nếu action có [YeuCauQuyen] riêng thì cái ở cấp controller tự động nhường (không cộng dồn yêu cầu).
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class YeuCauQuyenAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string[] _maCns;
    private readonly QuyenHanhDong? _hanhDong;

    public YeuCauQuyenAttribute(string maCn) => (_maCns, _hanhDong) = ([maCn], null);
    public YeuCauQuyenAttribute(string maCn, QuyenHanhDong hanhDong) => (_maCns, _hanhDong) = ([maCn], hanhDong);
    public YeuCauQuyenAttribute(string maCn1, string maCn2) => (_maCns, _hanhDong) = ([maCn1, maCn2], null);
    public YeuCauQuyenAttribute(string maCn1, string maCn2, QuyenHanhDong hanhDong) => (_maCns, _hanhDong) = ([maCn1, maCn2], hanhDong);

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (context.ActionDescriptor.EndpointMetadata.OfType<IAllowAnonymous>().Any())
            return;

        // Action có [YeuCauQuyen] cụ thể hơn -> cái cấp controller nhường.
        var tatCa = context.ActionDescriptor.EndpointMetadata.OfType<YeuCauQuyenAttribute>().ToList();
        if (tatCa.Count > 1 && !ReferenceEquals(tatCa[^1], this))
            return;

        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var role = user.FindFirstValue(ClaimTypes.Role) ?? "";
        if (role == "ADMIN") return;

        var td = _hanhDong ?? SuyTuMethod(context.HttpContext.Request.Method);
        var tenQuyen = td switch
        {
            QuyenHanhDong.Them => QuyenCodes.Them,
            QuyenHanhDong.Sua => QuyenCodes.Sua,
            QuyenHanhDong.Xoa => QuyenCodes.Xoa,
            _ => QuyenCodes.Xem,
        };

        var db = context.HttpContext.RequestServices.GetRequiredService<QuanLyKhoQuanKhiContext>();
        var duocPhep = await (
            from v in db.VaiTroChucNangQuyens
            join q in db.Quyens on v.MaQuyen equals q.MaQuyen
            where v.MaVaiTro == role && _maCns.Contains(v.MaCn) && q.TenQuyen == tenQuyen
            select v.MaCn
        ).AnyAsync();

        if (!duocPhep)
            context.Result = new ObjectResult(new { message = $"Bạn không có quyền \"{tenQuyen}\" với chức năng này" })
            {
                StatusCode = StatusCodes.Status403Forbidden,
            };
    }

    private static QuyenHanhDong SuyTuMethod(string method) => method.ToUpperInvariant() switch
    {
        "POST" => QuyenHanhDong.Them,
        "PUT" or "PATCH" => QuyenHanhDong.Sua,
        "DELETE" => QuyenHanhDong.Xoa,
        _ => QuyenHanhDong.Xem,
    };
}

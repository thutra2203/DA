using backend_dotnet.Dtos;
using backend_dotnet.Models;
using backend_dotnet.Services;
using backend_dotnet.Services.Rbac;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/phan-quyen")]
[Authorize]
public class PhanQuyenController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    private static readonly string[] QuyenCodes = ["XEM", "THEM", "SUA", "XOA"];

    // Nạp toàn bộ VaiTroChucNangQuyen (join Quyen) vào bộ nhớ rồi dựng ma trận —
    // bảng nhỏ (tối đa vài trăm dòng) nên đơn giản và ổn định hơn dịch EXISTS lồng nhau sang SQL.
    private async Task<Dictionary<(string VaiTro, string Module), HashSet<string>>> LoadGrantedMapAsync()
    {
        var rows = await (
            from v in db.VaiTroChucNangQuyens
            join q in db.Quyens on v.MaQuyen equals q.MaQuyen
            select new { v.MaVaiTro, v.MaCn, q.TenQuyen }
        ).ToListAsync();

        var map = new Dictionary<(string, string), HashSet<string>>();
        foreach (var r in rows)
        {
            var key = (r.MaVaiTro, r.MaCn);
            if (!map.TryGetValue(key, out var set))
                map[key] = set = [];
            set.Add(r.TenQuyen);
        }
        return map;
    }

    private static PhanQuyenItem BuildItem(string vaiTro, string module, HashSet<string>? granted) => new()
    {
        VaiTro = vaiTro,
        Module = module,
        CoTheXem = granted?.Contains("XEM") == true ? 1 : 0,
        CoTheThemMoi = granted?.Contains("THEM") == true ? 1 : 0,
        CoTheSua = granted?.Contains("SUA") == true ? 1 : 0,
        CoTheXoa = granted?.Contains("XOA") == true ? 1 : 0,
    };

    // Danh sách nhóm chức năng để frontend dựng bảng (theo đúng thứ tự hiển thị trong Cn.DanhSach;
    // mã lạ ngoài danh sách — nếu có — được đưa xuống cuối).
    [HttpGet("chuc-nang")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> GetChucNangs()
    {
        var ten = await db.ChucNangs.ToDictionaryAsync(c => c.MaCn, c => c.TenCn);
        var thuTu = Cn.DanhSach.Select((x, i) => (x.Ma, i)).ToDictionary(x => x.Ma, x => x.i);
        var result = ten
            .Select(kv => new { maCn = kv.Key, tenCn = kv.Value, sort = thuTu.GetValueOrDefault(kv.Key, 999) })
            .OrderBy(x => x.sort).ThenBy(x => x.maCn)
            .Select(x => new { x.maCn, x.tenCn });
        return Ok(result);
    }

    [HttpGet]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> GetAll()
    {
        var vaiTros = await db.VaiTros.OrderBy(v => v.MaVaiTro).Select(v => v.MaVaiTro).ToListAsync();
        var chucNangs = await db.ChucNangs.OrderBy(c => c.MaCn).Select(c => c.MaCn).ToListAsync();
        var map = await LoadGrantedMapAsync();

        var result = new List<PhanQuyenItem>();
        foreach (var vt in vaiTros)
            foreach (var cn in chucNangs)
                result.Add(BuildItem(vt, cn, map.GetValueOrDefault((vt, cn))));

        return Ok(result);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyPermissions()
    {
        var role = this.CurrentRole();
        var chucNangs = await db.ChucNangs.Select(c => c.MaCn).ToListAsync();
        var map = await LoadGrantedMapAsync();

        var result = new Dictionary<string, PhanQuyenItem>();
        foreach (var cn in chucNangs)
            result[cn] = BuildItem(role, cn, map.GetValueOrDefault((role, cn)));

        return Ok(result);
    }

    [HttpPut]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> UpdatePermission([FromBody] UpdatePermissionRequest body)
    {
        var flags = new Dictionary<string, bool>
        {
            ["XEM"] = body.CoTheXem,
            ["THEM"] = body.CoTheThemMoi,
            ["SUA"] = body.CoTheSua,
            ["XOA"] = body.CoTheXoa,
        };

        var quyenRows = await db.Quyens.Where(q => QuyenCodes.Contains(q.TenQuyen)).ToListAsync();

        foreach (var q in quyenRows)
        {
            var granted = flags.GetValueOrDefault(q.TenQuyen);
            var existing = await db.VaiTroChucNangQuyens.FirstOrDefaultAsync(
                x => x.MaVaiTro == body.VaiTro && x.MaQuyen == q.MaQuyen && x.MaCn == body.Module);

            if (granted && existing == null)
            {
                db.VaiTroChucNangQuyens.Add(new VaiTroChucNangQuyen { MaVaiTro = body.VaiTro!, MaQuyen = q.MaQuyen, MaCn = body.Module! });
            }
            else if (!granted && existing != null)
            {
                db.VaiTroChucNangQuyens.Remove(existing);
            }
        }
        await db.SaveChangesAsync();

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "VaiTroChucNangQuyen", $"{body.VaiTro}:{body.Module}",
            $"Cập nhật phân quyền chức năng \"{body.Module}\" cho vai trò \"{body.VaiTro}\"");

        return Ok(new { message = "Cập nhật quyền thành công" });
    }
}

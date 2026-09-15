using backend_dotnet.Models;
using backend_dotnet.Services.Rbac;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/stats")]
[Authorize]
[YeuCauQuyen(Cn.TongQuan)]
public class StatsController(QuanLyKhoQuanKhiContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetStats()
    {
        var stats = new Dictionary<string, int>
        {
            ["taiKhoan"] = await db.NguoiDungs.CountAsync(),
            ["kho"] = await db.Khos.CountAsync(),
            ["loaiSpkt"] = await db.LoaiSpkts.CountAsync(),
            ["nhaCungCap"] = await db.Nccs.CountAsync(),
            ["capBac"] = await db.CapBacs.CountAsync(),
            ["chucVu"] = await db.ChucVus.CountAsync(),
            ["dvt"] = await db.Dvts.CountAsync(),
            ["nsx"] = await db.Nsxes.CountAsync(),
            ["loaiTbdb"] = await db.LoaiTbdbs.CountAsync(),
            ["tinh"] = await db.Tinhs.CountAsync(),
        };
        return Ok(stats);
    }
}

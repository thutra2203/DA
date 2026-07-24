using backend_dotnet.Dtos;
using backend_dotnet.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/nhat-ky")]
[Authorize(Policy = "Admin")]
public class NhatKyController(QuanLyKhoQuanKhiContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string hanhDong = "", [FromQuery] string keyword = "",
        [FromQuery] string tuNgay = "", [FromQuery] string denNgay = "")
    {
        var query = db.NhatKyHoatDongs.AsQueryable();

        if (!string.IsNullOrEmpty(hanhDong))
            query = query.Where(x => x.HanhDong == hanhDong);
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(x => (x.TenDangNhap != null && x.TenDangNhap.Contains(keyword))
                                   || (x.MoTa != null && x.MoTa.Contains(keyword)));
        if (!string.IsNullOrEmpty(tuNgay) && DateTime.TryParse(tuNgay, out var tu))
            query = query.Where(x => x.ThoiGian >= tu);
        if (!string.IsNullOrEmpty(denNgay) && DateTime.TryParse(denNgay, out var den))
            query = query.Where(x => x.ThoiGian <= den.AddDays(1).AddTicks(-1));

        var total = await query.CountAsync();

        var data = await query
            .OrderByDescending(x => x.ThoiGian)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new NhatKyItem
            {
                Id = x.Id,
                MaNguoiDung = x.MaNguoiDung,
                TenDangNhap = x.TenDangNhap,
                HanhDong = x.HanhDong,
                DoiTuong = x.DoiTuong,
                MaDoiTuong = x.MaDoiTuong,
                MoTa = x.MoTa,
                ThoiGian = x.ThoiGian,
                KetQua = x.KetQua,
                LyDoThatBai = x.LyDoThatBai,
            })
            .ToListAsync();

        return Ok(new NhatKyResponse { Data = data, Total = total });
    }
}

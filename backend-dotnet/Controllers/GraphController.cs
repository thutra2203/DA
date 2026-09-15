using backend_dotnet.Services;
using backend_dotnet.Services.Graph;
using backend_dotnet.Services.Rbac;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend_dotnet.Controllers;

// Đồ thị (Neo4j) cho phần Tổng quan: KPI dòng đời lô, mạng luân chuyển giữa kho, và tra dòng đời
// của một lô cụ thể. Nếu Neo4j bị tắt hoặc không kết nối được, mọi endpoint trả 503 kèm
// { available: false, message } để giao diện hiển thị trạng thái "chưa bật" thay vì lỗi.
[ApiController]
[Authorize]
[Route("api/graph")]
[YeuCauQuyen(Cn.TongQuan)]
public class GraphController(
    GraphQueryService query,
    GraphSyncService sync,
    ILogger<GraphController> logger) : ControllerBase
{
    private IActionResult Unavailable(GraphUnavailableException ex)
    {
        logger.LogWarning(ex, "Truy vấn đồ thị không khả dụng");
        return StatusCode(503, new { available = false, message = ex.Message });
    }

    // GET api/graph/tong-quan
    [HttpGet("tong-quan")]
    public async Task<IActionResult> TongQuan()
    {
        try { return Ok(await query.TongQuanAsync()); }
        catch (GraphUnavailableException ex) { return Unavailable(ex); }
    }

    // GET api/graph/luan-chuyen-kho
    [HttpGet("luan-chuyen-kho")]
    public async Task<IActionResult> LuanChuyenKho()
    {
        try { return Ok(await query.LuanChuyenKhoAsync()); }
        catch (GraphUnavailableException ex) { return Unavailable(ex); }
    }

    // GET api/graph/lo?q=
    [HttpGet("lo")]
    [YeuCauQuyen(Cn.TbdbDongDoiLo)]
    public async Task<IActionResult> TimLo([FromQuery] string? q)
    {
        try { return Ok(await query.TimLoAsync(q)); }
        catch (GraphUnavailableException ex) { return Unavailable(ex); }
    }

    // GET api/graph/kho/{maKho}/thuc-luc
    [HttpGet("kho/{maKho}/thuc-luc")]
    public async Task<IActionResult> KhoThucLuc(string maKho)
    {
        try { return Ok(await query.KhoThucLucAsync(maKho)); }
        catch (GraphUnavailableException ex) { return Unavailable(ex); }
    }

    // GET api/graph/dong-doi-lo/{maLo}
    [HttpGet("dong-doi-lo/{maLo}")]
    [YeuCauQuyen(Cn.TbdbDongDoiLo)]
    public async Task<IActionResult> DongDoiLo(string maLo)
    {
        try { return Ok(await query.DongDoiLoAsync(maLo)); }
        catch (GraphUnavailableException ex) { return Unavailable(ex); }
    }

    // POST api/graph/dong-bo — dựng lại toàn bộ đồ thị từ SQL Server (chỉ ADMIN).
    [HttpPost("dong-bo")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> DongBo(CancellationToken ct)
    {
        try
        {
            var kq = await sync.DongBoToanBoAsync(ct);
            return Ok(new { available = true, message = "Đồng bộ đồ thị thành công", ketQua = kq });
        }
        catch (GraphUnavailableException ex) { return Unavailable(ex); }
        catch (Exception ex)
        {
            logger.LogError(ex, "Đồng bộ đồ thị thất bại");
            return StatusCode(503, new { available = false, message = "Đồng bộ thất bại: " + ex.Message });
        }
    }
}

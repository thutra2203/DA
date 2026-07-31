using backend_dotnet.Models;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

// Controller riêng cho các nghiệp vụ "Quản lý TB đồng bộ" (khác với DanhMucControllers.cs
// vốn chỉ dành cho các bảng danh mục/tra cứu đơn giản). Cấu trúc dữ liệu hiện tại:
//   - TBDB: hồ sơ định danh trang bị (mã/tên/loại/ĐVT), không chứa số lượng/vị trí.
//   - LoTBDB: từng lô hàng thực nhập, luôn gắn 1-1 với 1 dòng CTDongBoTrongLenh (nguồn
//     gốc nhập theo lệnh) — mang cấp chất lượng, năm SX, nước SX, tình trạng bao gói,
//     đơn giá, số lượng nhập, trạng thái lô.
//   - TonKhoTBDB: tồn kho thực tế của 1 lô tại 1 kho, vị trí lưu dạng text tự do
//     (tên nhà kho/định khu/khối/giá/tầng/hòm/mô tả vị trí) chứ không còn FK tới bảng
//     vị trí kho riêng.
// Các endpoint dưới đây tổng hợp dữ liệu từ 3 bảng đó để phục vụ màn hình
// "chọn kho -> xem TB trong kho -> xem chi tiết theo tab".
[Microsoft.AspNetCore.Mvc.Route("api/tb-dong-bo/ho-so")]
public class TbDongBoHoSoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<Tbdb>(db, log)
{
    protected override string TableLabel => "Hồ sơ trang bị đồng bộ";

    private readonly QuanLyKhoQuanKhiContext _db = db;

    // GET api/tb-dong-bo/ho-so/by-kho?maKho=ALL|<maKho>
    // Danh sách TBDB kèm tổng số lượng tồn trong kho được chọn (hoặc toàn bộ nếu maKho = ALL/rỗng).
    [HttpGet("by-kho")]
    public async Task<IActionResult> GetByKho([FromQuery] string? maKho)
    {
        // Chỉ tính vào "thực lực" các tồn kho thuộc lô đã HOÀN THÀNH (lệnh đã được kết thúc).
        // Lô còn đang xử lý (trangThaiLo = NHAP) chưa chính thức nên không được tính.
        var tonKhoQuery = _db.TonKhoTbdbs.Where(t => t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH");
        if (!string.IsNullOrEmpty(maKho) && maKho != "ALL")
        {
            tonKhoQuery = tonKhoQuery.Where(t => t.MaKho == maKho);
        }

        var soLuongTheoTbdb = await tonKhoQuery
            .GroupBy(t => t.MaLoTbdbNavigation.MaTbdb)
            .Select(g => new { MaTbdb = g.Key, TongSoLuong = g.Sum(x => x.SoLuong) })
            .ToDictionaryAsync(g => g.MaTbdb, g => g.TongSoLuong);

        var chiLoc = !string.IsNullOrEmpty(maKho) && maKho != "ALL";

        var list = await _db.Tbdbs
            .Include(t => t.MaLoaiTbdbNavigation)
            .Include(t => t.MaDvtNavigation)
            .OrderBy(t => t.MaTbdb)
            .ToListAsync();

        var result = list
            .Where(t => !chiLoc || soLuongTheoTbdb.ContainsKey(t.MaTbdb))
            .Select(t => new
            {
                maTbdb = t.MaTbdb,
                tenTbdb = t.TenTbdb,
                maLoaiTbdb = t.MaLoaiTbdb,
                tenLoaiTbdb = t.MaLoaiTbdbNavigation?.TenLoai,
                maDvt = t.MaDvt,
                tenDvt = t.MaDvtNavigation?.TenDvt,
                ghiChu = t.GhiChu,
                thoiGianTao = t.ThoiGianTao,
                capNhatMoiNhat = t.CapNhatMoiNhat,
                tongSoLuong = soLuongTheoTbdb.TryGetValue(t.MaTbdb, out var sl) ? sl : 0,
            });

        return Ok(result);
    }

    // GET api/tb-dong-bo/ho-so/{maTbdb}/chi-tiet?maKho=ALL|<maKho>
    // Chi tiết 1 TBDB: thông tin chung + danh sách lô + danh sách tồn kho theo vị trí
    // (lọc theo kho nếu maKho khác ALL) — dữ liệu cho modal 3 tab ở giao diện.
    [HttpGet("{maTbdb}/chi-tiet")]
    public async Task<IActionResult> GetChiTiet(string maTbdb, [FromQuery] string? maKho)
    {
        var tbdb = await _db.Tbdbs
            .Include(t => t.MaLoaiTbdbNavigation)
            .Include(t => t.MaDvtNavigation)
            .FirstOrDefaultAsync(t => t.MaTbdb == maTbdb);
        if (tbdb == null) return NotFound(new { message = "Không tìm thấy trang bị đồng bộ" });

        // Chỉ tính vào "thực lực" các tồn kho thuộc lô đã HOÀN THÀNH — xem ghi chú ở GetByKho.
        var tonKhoQuery = _db.TonKhoTbdbs
            .Include(t => t.MaKhoNavigation)
            .Include(t => t.MaTrangThaiTbNavigation)
            .Where(t => t.MaLoTbdbNavigation.MaTbdb == maTbdb && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH");

        if (!string.IsNullOrEmpty(maKho) && maKho != "ALL")
        {
            tonKhoQuery = tonKhoQuery.Where(t => t.MaKho == maKho);
        }

        var tonKhoList = await tonKhoQuery.OrderBy(t => t.MaLoTbdb).ThenBy(t => t.MaKho).ToListAsync();
        var soLuongTheoLo = tonKhoList.GroupBy(t => t.MaLoTbdb).ToDictionary(g => g.Key, g => g.Sum(x => x.SoLuong));

        var los = await _db.LoTbdbs
            .Include(l => l.MaCclNavigation)
            .Include(l => l.MaNuocSxNavigation)
            .Include(l => l.MaTinhTrangBaoGoiNavigation)
            .Include(l => l.MaCtdongBoLenhNavigation).ThenInclude(c => c.MaLenhNavigation)
            .Where(l => l.MaTbdb == maTbdb)
            .OrderBy(l => l.MaLoTbdb)
            .ToListAsync();

        return Ok(new
        {
            tbdb = new
            {
                maTbdb = tbdb.MaTbdb,
                tenTbdb = tbdb.TenTbdb,
                maLoaiTbdb = tbdb.MaLoaiTbdb,
                tenLoaiTbdb = tbdb.MaLoaiTbdbNavigation?.TenLoai,
                maDvt = tbdb.MaDvt,
                tenDvt = tbdb.MaDvtNavigation?.TenDvt,
                ghiChu = tbdb.GhiChu,
                thoiGianTao = tbdb.ThoiGianTao,
                capNhatMoiNhat = tbdb.CapNhatMoiNhat,
            },
            tongSoLuong = tonKhoList.Sum(t => t.SoLuong),
            los = los.Select(l => new
            {
                maLoTbdb = l.MaLoTbdb,
                maTbdb = l.MaTbdb,
                maCtdongBoLenh = l.MaCtdongBoLenh,
                maLenh = l.MaCtdongBoLenhNavigation?.MaLenhNavigation?.MaLenh,
                veViecLenh = l.MaCtdongBoLenhNavigation?.MaLenhNavigation?.VeViec,
                maCcl = l.MaCcl,
                tenCcl = l.MaCclNavigation?.TenCap,
                namSx = l.NamSx,
                maNuocSx = l.MaNuocSx,
                tenNuocSx = l.MaNuocSxNavigation?.TenNsx,
                maTinhTrangBaoGoi = l.MaTinhTrangBaoGoi,
                tenTinhTrangBaoGoi = l.MaTinhTrangBaoGoiNavigation?.TenTtbg,
                donGia = l.DonGia,
                soLuongNhap = l.SoLuongNhap,
                trangThaiLo = l.TrangThaiLo,
                ghiChu = l.GhiChu,
                thoiGianTao = l.ThoiGianTao,
                capNhatMoiNhat = l.CapNhatMoiNhat,
                soLuongTon = soLuongTheoLo.TryGetValue(l.MaLoTbdb, out var sl) ? sl : 0,
            }),
            viTris = tonKhoList.Select(t => new
            {
                maTonKho = t.MaTonKho,
                maLoTbdb = t.MaLoTbdb,
                maKho = t.MaKho,
                tenKho = t.MaKhoNavigation?.TenKho,
                tenNhaKho = t.TenNhaKho,
                tenDinhKhu = t.TenDinhKhu,
                tenKhoi = t.TenKhoi,
                tenGia = t.TenGia,
                tenTang = t.TenTang,
                tenHom = t.TenHom,
                moTaViTri = t.MoTaViTri,
                maTrangThaiTb = t.MaTrangThaiTb,
                tenTrangThaiTb = t.MaTrangThaiTbNavigation?.TenTttb,
                soLuong = t.SoLuong,
                ghiChu = t.GhiChu,
                capNhatMoiNhat = t.CapNhatMoiNhat,
            }),
        });
    }

    // GET api/tb-dong-bo/ho-so/{maTbdb}/ctdb-kha-dung
    // Danh sách dòng "chi tiết đồng bộ trong lệnh" của TBDB này mà chưa được tạo lô
    // (LoTbdb == null) — dùng để chọn nguồn gốc khi tạo lô hàng mới.
    [HttpGet("{maTbdb}/ctdb-kha-dung")]
    public async Task<IActionResult> GetCtdbKhaDung(string maTbdb)
    {
        var list = await _db.CtdongBoTrongLenhs
            .Include(c => c.MaLenhNavigation)
            .Include(c => c.MaCclNavigation)
            .Where(c => c.MaTbdb == maTbdb && c.LoTbdb == null)
            .OrderByDescending(c => c.MaLenhNavigation.Ngay)
            .Select(c => new
            {
                maCtdongBoLenh = c.MaCtdongBoLenh,
                maLenh = c.MaLenh,
                ngayLenh = c.MaLenhNavigation.Ngay,
                veViecLenh = c.MaLenhNavigation.VeViec,
                maCcl = c.MaCcl,
                tenCcl = c.MaCclNavigation != null ? c.MaCclNavigation.TenCap : null,
                soLuongTheoLenh = c.SoLuongTheoLenh,
                donGiaTheoLenh = c.DonGiaTheoLenh,
                ghiChu = c.GhiChu,
            })
            .ToListAsync();

        return Ok(list);
    }
}

// CRUD cho từng lô hàng của TBDB (nguồn gốc nhập, năm SX, nước SX, tình trạng bao gói, đơn giá...).
[Microsoft.AspNetCore.Mvc.Route("api/tb-dong-bo/lo")]
public class TbDongBoLoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<LoTbdb>(db, log)
{ protected override string TableLabel => "Lô trang bị đồng bộ"; }

// CRUD cho tồn kho thực tế của từng lô theo kho/vị trí/trạng thái.
[Microsoft.AspNetCore.Mvc.Route("api/tb-dong-bo/ton-kho")]
public class TbDongBoTonKhoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<TonKhoTbdb>(db, log)
{ protected override string TableLabel => "Tồn kho trang bị đồng bộ"; }

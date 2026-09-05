using backend_dotnet.Models;
using backend_dotnet.Services;
using ClosedXML.Excel;
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

    private record HoSoRow(
        string MaTbdb, string? TenTbdb, string MaLoaiTbdb, string? TenLoaiTbdb,
        string? MaDvt, string? TenDvt, string? GhiChu,
        DateTime ThoiGianTao, DateTime? CapNhatMoiNhat, int TongSoLuong,
        int SoLuongCap1, int SoLuongCap2, int SoLuongCap3, int SoLuongCap4, int SoLuongCap5);

    // Lọc danh sách TBDB theo kho/loại/kiểu SPKT/cấp chất lượng/trạng thái — dùng chung cho cả
    // GET by-kho (hiển thị danh sách) và xuat-excel (xuất đúng những gì đang hiển thị theo bộ lọc)
    // để 2 nơi luôn khớp nhau. Xem ghi chú chi tiết ở GetByKho bên dưới.
    private async Task<List<HoSoRow>> LayDanhSachHoSoAsync(
        string? maKho, string? maLoaiTbdb, string? maKieuSpkt, int? maCcl, string? maTrangThaiTb)
    {
        // Chỉ tính vào "thực lực" các tồn kho thuộc lô đã HOÀN THÀNH (lệnh đã được kết thúc).
        // Lô còn đang xử lý (trangThaiLo = NHAP) chưa chính thức nên không được tính.
        var tonKhoQuery = _db.TonKhoTbdbs.Where(t => t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH");
        var locTheoKho = !string.IsNullOrEmpty(maKho) && maKho != "ALL";
        if (locTheoKho) tonKhoQuery = tonKhoQuery.Where(t => t.MaKho == maKho);
        if (maCcl.HasValue) tonKhoQuery = tonKhoQuery.Where(t => t.MaLoTbdbNavigation.MaCcl == maCcl.Value);
        if (!string.IsNullOrEmpty(maTrangThaiTb)) tonKhoQuery = tonKhoQuery.Where(t => t.MaTrangThaiTb == maTrangThaiTb);

        var tonKhoRaw = await tonKhoQuery
            .Select(t => new { MaTbdb = t.MaLoTbdbNavigation.MaTbdb, MaCcl = t.MaLoTbdbNavigation.MaCcl, t.SoLuong })
            .ToListAsync();

        var theoTbdb = tonKhoRaw
            .GroupBy(x => x.MaTbdb)
            .ToDictionary(g => g.Key, g => new
            {
                Tong = g.Sum(x => x.SoLuong),
                TheoCap = g.GroupBy(x => x.MaCcl).ToDictionary(gc => gc.Key, gc => gc.Sum(x => x.SoLuong)),
            });

        var chiLocTonKho = locTheoKho || maCcl.HasValue || !string.IsNullOrEmpty(maTrangThaiTb);

        HashSet<string>? maTbdbDongBoKieuSpkt = null;
        if (!string.IsNullOrEmpty(maKieuSpkt))
        {
            maTbdbDongBoKieuSpkt = (await _db.ChiTietDongBos
                .Where(c => c.MaKieuSpkt == maKieuSpkt)
                .Select(c => c.MaTbdb)
                .Distinct()
                .ToListAsync())
                .ToHashSet();
        }

        var tbdbQuery = _db.Tbdbs
            .Include(t => t.MaLoaiTbdbNavigation)
            .Include(t => t.MaDvtNavigation)
            .AsQueryable();
        if (!string.IsNullOrEmpty(maLoaiTbdb)) tbdbQuery = tbdbQuery.Where(t => t.MaLoaiTbdb == maLoaiTbdb);

        var list = await tbdbQuery.OrderBy(t => t.MaTbdb).ToListAsync();

        return list
            .Where(t => !chiLocTonKho || theoTbdb.ContainsKey(t.MaTbdb))
            .Where(t => maTbdbDongBoKieuSpkt == null || maTbdbDongBoKieuSpkt.Contains(t.MaTbdb))
            .Select(t =>
            {
                theoTbdb.TryGetValue(t.MaTbdb, out var tk);
                return new HoSoRow(
                    t.MaTbdb, t.TenTbdb, t.MaLoaiTbdb, t.MaLoaiTbdbNavigation?.TenLoai,
                    t.MaDvt, t.MaDvtNavigation?.TenDvt, t.GhiChu,
                    t.ThoiGianTao, t.CapNhatMoiNhat, tk?.Tong ?? 0,
                    tk?.TheoCap.GetValueOrDefault(1) ?? 0, tk?.TheoCap.GetValueOrDefault(2) ?? 0,
                    tk?.TheoCap.GetValueOrDefault(3) ?? 0, tk?.TheoCap.GetValueOrDefault(4) ?? 0,
                    tk?.TheoCap.GetValueOrDefault(5) ?? 0);
            })
            .ToList();
    }

    // GET api/tb-dong-bo/ho-so/by-kho?maKho=ALL|<maKho>&maLoaiTbdb=&maKieuSpkt=&maCcl=&maTrangThaiTb=
    // Danh sách TBDB kèm tổng số lượng tồn khớp bộ lọc — có thể lọc theo kho, loại TBĐB, kiểu
    // SPKT (chỉ TBĐB đã khai đồng bộ cho kiểu đó — bảng ChiTietDongBo), cấp chất lượng và trạng
    // thái trang bị. maLoaiTbdb/maKieuSpkt lọc theo định danh; maKho/maCcl/maTrangThaiTb lọc theo
    // tồn kho nên khi có ít nhất 1 điều kiện tồn kho, chỉ hiện TBĐB thực sự có tồn khớp (tránh
    // liệt kê "SL = 0" gây hiểu nhầm).
    [HttpGet("by-kho")]
    public async Task<IActionResult> GetByKho(
        [FromQuery] string? maKho, [FromQuery] string? maLoaiTbdb, [FromQuery] string? maKieuSpkt,
        [FromQuery] int? maCcl, [FromQuery] string? maTrangThaiTb)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        var list = await LayDanhSachHoSoAsync(maKho, maLoaiTbdb, maKieuSpkt, maCcl, maTrangThaiTb);

        var result = list.Select(t => new
        {
            maTbdb = t.MaTbdb,
            tenTbdb = t.TenTbdb,
            maLoaiTbdb = t.MaLoaiTbdb,
            tenLoaiTbdb = t.TenLoaiTbdb,
            maDvt = t.MaDvt,
            tenDvt = t.TenDvt,
            ghiChu = t.GhiChu,
            thoiGianTao = t.ThoiGianTao,
            capNhatMoiNhat = t.CapNhatMoiNhat,
            tongSoLuong = t.TongSoLuong,
            soLuongCap1 = t.SoLuongCap1,
            soLuongCap2 = t.SoLuongCap2,
            soLuongCap3 = t.SoLuongCap3,
            soLuongCap4 = t.SoLuongCap4,
            soLuongCap5 = t.SoLuongCap5,
        });

        return Ok(result);
    }

    // GET api/tb-dong-bo/ho-so/xuat-excel?maKho=ALL|<maKho>&maLoaiTbdb=&maKieuSpkt=&maCcl=&maTrangThaiTb=&search=
    // Xuất Excel danh sách hồ sơ TBĐB đúng theo bộ lọc đang áp dụng trên màn hình (dùng chung
    // LayDanhSachHoSoAsync với GetByKho nên luôn khớp với bảng đang hiển thị) — kèm cả từ khóa tìm
    // kiếm đang gõ trên ô tìm kiếm (lọc thêm ở đây vì ô tìm kiếm lọc phía client, không qua API).
    [HttpGet("xuat-excel")]
    public async Task<IActionResult> XuatExcel(
        [FromQuery] string? maKho, [FromQuery] string? maLoaiTbdb, [FromQuery] string? maKieuSpkt,
        [FromQuery] int? maCcl, [FromQuery] string? maTrangThaiTb, [FromQuery] string? search)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        var list = await LayDanhSachHoSoAsync(maKho, maLoaiTbdb, maKieuSpkt, maCcl, maTrangThaiTb);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim();
            list = list.Where(t =>
                (t.MaTbdb?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (t.TenTbdb?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (t.TenLoaiTbdb?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (t.GhiChu?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false))
                .ToList();
        }

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Ho so TBDB");

        string[] headers = ["Mã TB", "Tên TB", "Loại", "ĐVT", "Cấp 1", "Cấp 2", "Cấp 3", "Cấp 4", "Cấp 5", "Số lượng", "Ghi chú"];
        for (var i = 0; i < headers.Length; i++) ws.Cell(1, i + 1).Value = headers[i];
        ws.Row(1).Style.Font.Bold = true;
        ws.Row(1).Style.Fill.BackgroundColor = XLColor.FromArgb(234, 240, 251);

        var r = 2;
        foreach (var t in list)
        {
            ws.Cell(r, 1).Value = t.MaTbdb;
            ws.Cell(r, 2).Value = t.TenTbdb;
            ws.Cell(r, 3).Value = t.TenLoaiTbdb ?? t.MaLoaiTbdb;
            ws.Cell(r, 4).Value = t.TenDvt ?? t.MaDvt;
            ws.Cell(r, 5).Value = t.SoLuongCap1;
            ws.Cell(r, 6).Value = t.SoLuongCap2;
            ws.Cell(r, 7).Value = t.SoLuongCap3;
            ws.Cell(r, 8).Value = t.SoLuongCap4;
            ws.Cell(r, 9).Value = t.SoLuongCap5;
            ws.Cell(r, 10).Value = t.TongSoLuong;
            ws.Cell(r, 11).Value = t.GhiChu;
            r++;
        }
        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        var tenFile = $"ho-so-tbdb-{DateTime.Now:yyyyMMdd-HHmmss}.xlsx";
        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", tenFile);
    }

    // GET api/tb-dong-bo/ho-so/{maTbdb}/chi-tiet?maKho=ALL|<maKho>
    // Chi tiết 1 TBDB: thông tin chung + danh sách lô + danh sách tồn kho theo vị trí
    // (lọc theo kho nếu maKho khác ALL) — dữ liệu cho modal 3 tab ở giao diện.
    [HttpGet("{maTbdb}/chi-tiet")]
    public async Task<IActionResult> GetChiTiet(string maTbdb, [FromQuery] string? maKho)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
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

        // Nếu đang lọc theo 1 kho cụ thể, chỉ liệt kê những lô thực sự có tồn kho tại kho đó —
        // tránh hiện lẫn lô của kho khác kèm "SL tồn = 0" gây hiểu nhầm là lô bị mất/sai dữ liệu.
        var loQuery = _db.LoTbdbs
            .Include(l => l.MaCclNavigation)
            .Include(l => l.MaNuocSxNavigation)
            .Include(l => l.MaTinhTrangBaoGoiNavigation)
            .Include(l => l.MaHinhThucNiemCatNavigation)
            .Include(l => l.MaCtdongBoLenhNavigation).ThenInclude(c => c.MaLenhNavigation)
            .Where(l => l.MaTbdb == maTbdb);

        var chiLocKho = !string.IsNullOrEmpty(maKho) && maKho != "ALL";
        if (chiLocKho)
        {
            var maLoCoTonTaiKho = soLuongTheoLo.Keys;
            loQuery = loQuery.Where(l => maLoCoTonTaiKho.Contains(l.MaLoTbdb));
        }

        var los = await loQuery.OrderBy(l => l.MaLoTbdb).ToListAsync();

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
                maCcl = l.MaCcl,
                tenCcl = l.MaCclNavigation?.TenCap,
                namSx = l.NamSx,
                maNuocSx = l.MaNuocSx,
                tenNuocSx = l.MaNuocSxNavigation?.TenNsx,
                maTinhTrangBaoGoi = l.MaTinhTrangBaoGoi,
                tenTinhTrangBaoGoi = l.MaTinhTrangBaoGoiNavigation?.TenTtbg,
                maHinhThucNiemCat = l.MaHinhThucNiemCat,
                tenHinhThucNiemCat = l.MaHinhThucNiemCatNavigation?.TenHtnc,
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

    // GET api/tb-dong-bo/ho-so/{maTbdb}/lo/xuat-excel?maKho=ALL|<maKho>&maCcl=&namSx=&maNuocSx=&maTinhTrangBaoGoi=&maHinhThucNiemCat=&search=
    // Xuất Excel danh sách lô hàng của 1 TBDB, khớp với bộ lọc/tìm kiếm đang áp dụng ở tab
    // "Lô hàng" trên giao diện (lọc phía client nên nhận lại đủ tham số ở đây để export đúng).
    [HttpGet("{maTbdb}/lo/xuat-excel")]
    public async Task<IActionResult> XuatExcelLo(
        string maTbdb, [FromQuery] string? maKho, [FromQuery] int? maCcl, [FromQuery] int? namSx,
        [FromQuery] string? maNuocSx, [FromQuery] string? maTinhTrangBaoGoi, [FromQuery] string? maHinhThucNiemCat, [FromQuery] string? search)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        var tonKhoQuery = _db.TonKhoTbdbs
            .Where(t => t.MaLoTbdbNavigation.MaTbdb == maTbdb && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH");

        if (!string.IsNullOrEmpty(maKho) && maKho != "ALL")
        {
            tonKhoQuery = tonKhoQuery.Where(t => t.MaKho == maKho);
        }

        var tonKhoList = await tonKhoQuery.ToListAsync();
        var soLuongTheoLo = tonKhoList.GroupBy(t => t.MaLoTbdb).ToDictionary(g => g.Key, g => g.Sum(x => x.SoLuong));

        var loQuery = _db.LoTbdbs
            .Include(l => l.MaCclNavigation)
            .Include(l => l.MaNuocSxNavigation)
            .Include(l => l.MaTinhTrangBaoGoiNavigation)
            .Include(l => l.MaHinhThucNiemCatNavigation)
            .Include(l => l.MaCtdongBoLenhNavigation).ThenInclude(c => c.MaLenhNavigation)
            .Where(l => l.MaTbdb == maTbdb);

        if (!string.IsNullOrEmpty(maKho) && maKho != "ALL")
        {
            var maLoCoTonTaiKho = soLuongTheoLo.Keys;
            loQuery = loQuery.Where(l => maLoCoTonTaiKho.Contains(l.MaLoTbdb));
        }
        if (maCcl.HasValue) loQuery = loQuery.Where(l => l.MaCcl == maCcl);
        if (namSx.HasValue) loQuery = loQuery.Where(l => l.NamSx == namSx);
        if (!string.IsNullOrEmpty(maNuocSx)) loQuery = loQuery.Where(l => l.MaNuocSx == maNuocSx);
        if (!string.IsNullOrEmpty(maTinhTrangBaoGoi)) loQuery = loQuery.Where(l => l.MaTinhTrangBaoGoi == maTinhTrangBaoGoi);
        if (!string.IsNullOrEmpty(maHinhThucNiemCat)) loQuery = loQuery.Where(l => l.MaHinhThucNiemCat == maHinhThucNiemCat);

        var los = await loQuery.OrderBy(l => l.MaLoTbdb).ToListAsync();

        var rows = los.Select(l => new
        {
            MaLoTbdb = l.MaLoTbdb,
            Nguon = l.MaCtdongBoLenhNavigation?.MaLenhNavigation?.MaLenh ?? "",
            TenCcl = l.MaCclNavigation?.TenCap ?? l.MaCcl.ToString(),
            NamSx = l.NamSx,
            TenNuocSx = l.MaNuocSxNavigation?.TenNsx ?? l.MaNuocSx ?? "",
            TenTinhTrangBaoGoi = l.MaTinhTrangBaoGoiNavigation?.TenTtbg ?? l.MaTinhTrangBaoGoi ?? "",
            TenHinhThucNiemCat = l.MaHinhThucNiemCatNavigation?.TenHtnc ?? l.MaHinhThucNiemCat ?? "",
            DonGia = l.DonGia,
            SoLuongTon = soLuongTheoLo.TryGetValue(l.MaLoTbdb, out var sl) ? sl : 0,
        }).ToList();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim();
            rows = rows.Where(r =>
                r.MaLoTbdb.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                r.Nguon.Contains(q, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Lo hang");

        string[] headers = ["Mã lô", "Nguồn", "Cấp chất lượng", "Năm SX", "Nước SX", "Tình trạng bao gói", "Hình thức niêm cất", "Đơn giá", "SL tồn"];
        for (var i = 0; i < headers.Length; i++) ws.Cell(1, i + 1).Value = headers[i];
        ws.Row(1).Style.Font.Bold = true;
        ws.Row(1).Style.Fill.BackgroundColor = XLColor.FromArgb(234, 240, 251);

        var r2 = 2;
        foreach (var row in rows)
        {
            ws.Cell(r2, 1).Value = row.MaLoTbdb;
            ws.Cell(r2, 2).Value = row.Nguon;
            ws.Cell(r2, 3).Value = row.TenCcl;
            ws.Cell(r2, 4).Value = row.NamSx;
            ws.Cell(r2, 5).Value = row.TenNuocSx;
            ws.Cell(r2, 6).Value = row.TenTinhTrangBaoGoi;
            ws.Cell(r2, 7).Value = row.TenHinhThucNiemCat;
            ws.Cell(r2, 8).Value = row.DonGia;
            ws.Cell(r2, 9).Value = row.SoLuongTon;
            r2++;
        }
        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        var tenFile = $"lo-hang-{maTbdb}-{DateTime.Now:yyyyMMdd-HHmmss}.xlsx";
        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", tenFile);
    }

    // GET api/tb-dong-bo/ho-so/{maTbdb}/vi-tri/xuat-excel?maKho=ALL|<maKho>&tenNhaKho=&tenDinhKhu=&tenKhoi=&tenGia=&tenTang=&search=
    // Xuất Excel danh sách vị trí & tồn kho của 1 TBDB, khớp với bộ lọc/tìm kiếm đang áp dụng ở
    // tab "Vị trí & tồn kho" trên giao diện (lọc phía client nên nhận lại đủ tham số để export đúng).
    [HttpGet("{maTbdb}/vi-tri/xuat-excel")]
    public async Task<IActionResult> XuatExcelViTri(
        string maTbdb, [FromQuery] string? maKho, [FromQuery] string? tenNhaKho, [FromQuery] string? tenDinhKhu,
        [FromQuery] string? tenKhoi, [FromQuery] string? tenGia, [FromQuery] string? tenTang, [FromQuery] string? search)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        var tonKhoQuery = _db.TonKhoTbdbs
            .Include(t => t.MaKhoNavigation)
            .Include(t => t.MaTrangThaiTbNavigation)
            .Where(t => t.MaLoTbdbNavigation.MaTbdb == maTbdb && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH");

        if (!string.IsNullOrEmpty(maKho) && maKho != "ALL") tonKhoQuery = tonKhoQuery.Where(t => t.MaKho == maKho);
        if (!string.IsNullOrEmpty(tenNhaKho)) tonKhoQuery = tonKhoQuery.Where(t => t.TenNhaKho == tenNhaKho);
        if (!string.IsNullOrEmpty(tenDinhKhu)) tonKhoQuery = tonKhoQuery.Where(t => t.TenDinhKhu == tenDinhKhu);
        if (!string.IsNullOrEmpty(tenKhoi)) tonKhoQuery = tonKhoQuery.Where(t => t.TenKhoi == tenKhoi);
        if (!string.IsNullOrEmpty(tenGia)) tonKhoQuery = tonKhoQuery.Where(t => t.TenGia == tenGia);
        if (!string.IsNullOrEmpty(tenTang)) tonKhoQuery = tonKhoQuery.Where(t => t.TenTang == tenTang);

        var tonKhoList = await tonKhoQuery.OrderBy(t => t.MaLoTbdb).ThenBy(t => t.MaKho).ToListAsync();

        var rows = tonKhoList.Select(t => new
        {
            t.MaLoTbdb,
            TenKho = t.MaKhoNavigation?.TenKho ?? t.MaKho,
            TenNhaKho = t.TenNhaKho ?? "",
            TenDinhKhu = t.TenDinhKhu ?? "",
            TenKhoi = t.TenKhoi ?? "",
            TenGia = t.TenGia ?? "",
            TenTang = t.TenTang ?? "",
            TenHom = t.TenHom ?? "",
            MoTaViTri = t.MoTaViTri ?? "",
            TenTrangThaiTb = t.MaTrangThaiTbNavigation?.TenTttb ?? t.MaTrangThaiTb,
            t.SoLuong,
        }).ToList();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim();
            rows = rows.Where(r =>
                r.MaLoTbdb.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                r.TenHom.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                r.MoTaViTri.Contains(q, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Vi tri ton kho");

        string[] headers = ["Mã lô", "Kho", "Nhà kho", "Khu", "Khối", "Giá", "Tầng", "Hòm", "Mô tả vị trí", "Trạng thái", "Số lượng"];
        for (var i = 0; i < headers.Length; i++) ws.Cell(1, i + 1).Value = headers[i];
        ws.Row(1).Style.Font.Bold = true;
        ws.Row(1).Style.Fill.BackgroundColor = XLColor.FromArgb(234, 240, 251);

        var r2 = 2;
        foreach (var row in rows)
        {
            ws.Cell(r2, 1).Value = row.MaLoTbdb;
            ws.Cell(r2, 2).Value = row.TenKho;
            ws.Cell(r2, 3).Value = row.TenNhaKho;
            ws.Cell(r2, 4).Value = row.TenDinhKhu;
            ws.Cell(r2, 5).Value = row.TenKhoi;
            ws.Cell(r2, 6).Value = row.TenGia;
            ws.Cell(r2, 7).Value = row.TenTang;
            ws.Cell(r2, 8).Value = row.TenHom;
            ws.Cell(r2, 9).Value = row.MoTaViTri;
            ws.Cell(r2, 10).Value = row.TenTrangThaiTb;
            ws.Cell(r2, 11).Value = row.SoLuong;
            r2++;
        }
        ws.Columns().AdjustToContents();

        using var ms2 = new MemoryStream();
        wb.SaveAs(ms2);
        var tenFile2 = $"vi-tri-ton-kho-{maTbdb}-{DateTime.Now:yyyyMMdd-HHmmss}.xlsx";
        return File(ms2.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", tenFile2);
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

    // GET api/tb-dong-bo/ho-so/ton-kho-theo-cap?maKho=K01
    // Danh sách TBDB đang có tồn kho (chỉ tính lô đã HOAN_THANH — đã là thực lực) tại 1 kho cụ
    // thể, kèm số lượng tách theo từng Cấp chất lượng (1-5). Dùng khi thêm dòng chi tiết cho
    // Lệnh Xuất: chỉ được chọn TBDB mà kho xuất thực sự đang có hàng, và biết rõ còn bao nhiêu
    // theo từng cấp để không xuất vượt quá tồn.
    [HttpGet("ton-kho-theo-cap")]
    public async Task<IActionResult> GetTonKhoTheoCap([FromQuery] string maKho)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho()!;
        if (string.IsNullOrWhiteSpace(maKho)) return BadRequest(new { message = "Thiếu mã kho" });

        var raw = await (
            from t in _db.TonKhoTbdbs
            join lo in _db.LoTbdbs on t.MaLoTbdb equals lo.MaLoTbdb
            where t.MaKho == maKho && lo.TrangThaiLo == "HOAN_THANH"
            select new { lo.MaTbdb, lo.MaCcl, t.SoLuong }
        ).ToListAsync();

        // Trừ phần đang bị 1 lệnh chuyển cấp chất lượng, 1 lệnh Xuất hủy/thanh lý, HOẶC 1 dòng
        // "Xuất kho" (chưa kết thúc) "giữ chỗ" — cả 3 chỉ thực trừ Tồn kho khi Kết thúc nên nếu
        // không trừ ở đây, số hiện ra vẫn tính cả phần đã hứa chuyển/xuất đi cho lệnh khác.
        var giuChoChuyenCap = await ChuyenCapReservationHelper.LayGiuChoTheoTbCapAsync(_db, maKho);
        var giuChoHuy = await HuyThanhLyReservationHelper.LayGiuChoTheoTbCapAsync(_db, maKho);
        var giuChoXuatKho = await XuatKhoReservationHelper.LayGiuChoTheoTbCapAsync(_db, maKho);
        var giuChoThayDoiViTri = await ThayDoiViTriReservationHelper.LayGiuChoTheoTbCapAsync(_db, maKho);

        var grouped = raw.GroupBy(x => x.MaTbdb)
            .Select(g => new
            {
                MaTbdb = g.Key,
                TheoCap = g.GroupBy(x => x.MaCcl).ToDictionary(gc => gc.Key, gc => gc.Sum(x => x.SoLuong)),
            })
            .ToList();

        int ConLai(string maTbdb, int maCcl, Dictionary<int, int> theoCap) =>
            Math.Max(0, theoCap.GetValueOrDefault(maCcl) - giuChoChuyenCap.GetValueOrDefault((maTbdb, maCcl))
                - giuChoHuy.GetValueOrDefault((maTbdb, maCcl)) - giuChoXuatKho.GetValueOrDefault((maTbdb, maCcl))
                - giuChoThayDoiViTri.GetValueOrDefault((maTbdb, maCcl)));

        var maTbdbs = grouped.Select(g => g.MaTbdb).ToList();
        var tbdbInfo = await _db.Tbdbs
            .Include(t => t.MaDvtNavigation)
            .Where(t => maTbdbs.Contains(t.MaTbdb))
            .ToDictionaryAsync(t => t.MaTbdb);

        var result = grouped.Select(g =>
        {
            tbdbInfo.TryGetValue(g.MaTbdb, out var tb);
            var cap1 = ConLai(g.MaTbdb, 1, g.TheoCap);
            var cap2 = ConLai(g.MaTbdb, 2, g.TheoCap);
            var cap3 = ConLai(g.MaTbdb, 3, g.TheoCap);
            var cap4 = ConLai(g.MaTbdb, 4, g.TheoCap);
            var cap5 = ConLai(g.MaTbdb, 5, g.TheoCap);
            return new
            {
                maTbdb = g.MaTbdb,
                tenTbdb = tb?.TenTbdb,
                maDvt = tb?.MaDvt,
                tenDvt = tb?.MaDvtNavigation?.TenDvt,
                maLoaiTbdb = tb?.MaLoaiTbdb,
                tongSoLuong = cap1 + cap2 + cap3 + cap4 + cap5,
                soLuongCap1 = cap1,
                soLuongCap2 = cap2,
                soLuongCap3 = cap3,
                soLuongCap4 = cap4,
                soLuongCap5 = cap5,
            };
        }).Where(x => x.tongSoLuong > 0).OrderBy(x => x.maTbdb).ToList();

        return Ok(result);
    }
}

// CRUD cho từng lô hàng của TBDB (nguồn gốc nhập, năm SX, nước SX, tình trạng bao gói, đơn giá...).
[Microsoft.AspNetCore.Mvc.Route("api/tb-dong-bo/lo")]
public class TbDongBoLoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<LoTbdb>(db, log)
{ protected override string TableLabel => "Lô trang bị đồng bộ"; }

// CRUD cho tồn kho thực tế của từng lô theo kho/vị trí/trạng thái.
[Microsoft.AspNetCore.Mvc.Route("api/tb-dong-bo/ton-kho")]
public class TbDongBoTonKhoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : DanhMucControllerBase<TonKhoTbdb>(db, log)
{
    protected override string TableLabel => "Tồn kho trang bị đồng bộ";

    protected override IQueryable<TonKhoTbdb> ApplyScope(IQueryable<TonKhoTbdb> query)
        => this.IsGioiHanKho() ? query.Where(t => t.MaKho == this.CurrentMaKho()) : query;

    protected override bool DuocPhepSuaXoa(TonKhoTbdb entity)
        => !this.IsGioiHanKho() || entity.MaKho == this.CurrentMaKho();
}

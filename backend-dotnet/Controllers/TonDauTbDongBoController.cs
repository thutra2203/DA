using backend_dotnet.Models;
using backend_dotnet.Services;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

// "Tồn đầu" TBĐB: khởi tạo thực lực ban đầu cho 1 kho khi bắt đầu dùng hệ thống. Có 2 bước rõ
// ràng như quy trình Nhập/Xuất bình thường:
//   1) Tạo lệnh — tạo 1 bản ghi Lệnh thật (loại lệnh "TDK" = Nhập tồn đầu, mã lệnh do người
//      dùng đặt) — KHÔNG còn tự sinh mã GUID ẩn như trước. NhomTb khác "TBDB" nên lệnh này
//      không lẫn vào danh sách Tạo lệnh/Cập nhật lệnh nhập-xuất bình thường (có trang riêng).
//   2) Thêm lô + vị trí — mỗi lô ghi thẳng xuống CSDL NGAY khi thêm (CTDongBoTrongLenh + LoTBDB
//      với TrangThaiLo = "NHAP" + TonKhoTBDB), giống hệt cách lệnh Nhập bình thường "Tạo lô" ngay
//      lúc thao tác — KHÔNG còn staging ở localStorage của trình duyệt như trước (dễ mất khi đổi
//      máy/xóa dữ liệu duyệt web). "Kết thúc lệnh" chỉ còn việc chuyển toàn bộ lô NHAP của lệnh
//      này sang HOAN_THANH (chính thức thành thực lực) + ghi TonDauKy, trong 1 transaction.
// Khác với lệnh Nhập/Xuất bình thường (mỗi TBĐB+cấp chỉ 1 dòng chi tiết/lệnh, xem
// LenhTbDongBoController), tồn đầu KHÔNG giới hạn số lô theo (TBĐB, cấp) trong cùng 1 lệnh — 1
// TBĐB ở 1 cấp chất lượng có thể có nhiều lô khác nhau (khác năm SX, nguồn gốc...) miễn Mã lô
// (khóa chính LoTbdb) không trùng nhau. Vì vậy CTDongBoTrongLenh KHÔNG còn ràng buộc unique
// (MaLenh, MaTbdb, MaCcl) ở CSDL cho riêng nhu cầu này (ràng buộc đó vẫn được giữ lại BẰNG CODE
// cho lệnh Nhập/Xuất bình thường — xem AddChiTiet/XacNhanNhapChiTietTuFile).
public record ViTriTonDauDto(string? TenNhaKho, string? TenDinhKhu, string? TenKhoi, string? TenGia, string? TenTang, string? TenHom, string? MoTaViTri, string MaTrangThaiTb, int SoLuong);

public record LoTonDauDto(
    string MaTbdb, string MaLoTbdb, int MaCcl, int? NamSx, string? MaNuocSx, string? MaTinhTrangBaoGoi, string? MaHinhThucNiemCat,
    decimal DonGia, int SoLuongTonDau, string? GhiChu, List<ViTriTonDauDto> ViTri);

public record TaoLenhTonDauDto(string MaLenh, string MaKho, int Nam, DateOnly? Ngay, DateOnly? NgayChot, string? GhiChu);
public record SuaLenhTonDauDto(DateOnly? NgayChot, string? GhiChu);
public record XacNhanNhapTonDauDto(List<LoTonDauDto> DanhSachLo);

[ApiController]
[Authorize]
[Microsoft.AspNetCore.Mvc.Route("api/tb-dong-bo/ton-dau")]
public class TonDauTbDongBoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    private const string MaLoaiLenhTonDau = "TDK";
    private const string NhomTbNoiBo = "TBDB_NOIBO";
    private const string NguonTaoKhoiTao = "KHOI_TAO";

    private async Task DamBaoLoaiLenhAsync()
    {
        if (await db.TinhChatNhapXuats.FindAsync(MaLoaiLenhTonDau) == null)
        {
            db.TinhChatNhapXuats.Add(new TinhChatNhapXuat
            {
                MaNx = MaLoaiLenhTonDau,
                TenNx = "Nhập tồn đầu",
                NhomTb = NhomTbNoiBo,
                GhiChu = "Loại lệnh dùng để khởi tạo tồn đầu TBĐB — không hiển thị ở màn hình Tạo lệnh/Cập nhật lệnh nhập-xuất bình thường.",
            });
            await db.SaveChangesAsync();
        }
    }

    private async Task<Lenh?> TimLenhAsync(string maLenh)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh && l.MaLoaiLenh == MaLoaiLenhTonDau);
        if (lenh == null) return null;
        if (this.IsGioiHanKho() && lenh.MaKhoNhap != this.CurrentMaKho()) return null;
        return lenh;
    }

    // GET api/tb-dong-bo/ton-dau
    // Danh sách toàn bộ lệnh tồn đầu (mọi kho/năm) — cho màn hình danh sách kiểu Nhập/Xuất. Đếm
    // trực tiếp trên CTDongBoTrongLenh (không lọc trạng thái lô) nên lô đang "NHAP" (chưa Kết
    // thúc lệnh) vẫn hiện đúng số liệu ở đây, không còn im lặng hiện 0/0 như khi còn staging ở
    // localStorage.
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var query = db.Lenhs
            .Include(l => l.MaKhoNhapNavigation)
            .Where(l => l.MaLoaiLenh == MaLoaiLenhTonDau);
        if (this.IsGioiHanKho()) query = query.Where(l => l.MaKhoNhap == this.CurrentMaKho());

        var lenhs = await query
            .OrderByDescending(l => l.Ngay)
            .ToListAsync();

        var maLenhs = lenhs.Select(l => l.MaLenh).ToList();
        var tongHop = await db.CtdongBoTrongLenhs
            .Where(c => maLenhs.Contains(c.MaLenh))
            .GroupBy(c => c.MaLenh)
            .Select(g => new { MaLenh = g.Key, SoTbdb = g.Select(x => x.MaTbdb).Distinct().Count(), SoLo = g.Count(), TongSoLuong = g.Sum(x => x.SoLuongTheoLenh) })
            .ToDictionaryAsync(x => x.MaLenh);

        var result = lenhs.Select(l =>
        {
            tongHop.TryGetValue(l.MaLenh, out var t);
            return new
            {
                maLenh = l.MaLenh,
                maKho = l.MaKhoNhap,
                tenKho = l.MaKhoNhapNavigation?.TenKho,
                nam = l.Ngay.Year,
                ngay = l.Ngay,
                ngayHieuLuc = l.NgayHieuLuc,
                trangThai = l.TrangThai,
                ghiChu = l.GhiChu,
                soTbdb = t?.SoTbdb ?? 0,
                soLo = t?.SoLo ?? 0,
                tongSoLuong = t?.TongSoLuong ?? 0,
            };
        });

        return Ok(result);
    }

    // GET api/tb-dong-bo/ton-dau/{maLenh}
    // Chi tiết 1 lệnh tồn đầu — đã khóa chưa, và tổng hợp các TBĐB/lô (dùng cho màn hình sau khi
    // đã "Kết thúc lệnh"; trước đó dùng GET .../lo bên dưới để lấy danh sách chi tiết từng lô).
    [HttpGet("{maLenh}")]
    public async Task<IActionResult> GetOne(string maLenh)
    {
        var lenh = await db.Lenhs.Include(l => l.MaKhoNhapNavigation)
            .FirstOrDefaultAsync(l => l.MaLenh == maLenh && l.MaLoaiLenh == MaLoaiLenhTonDau);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh tồn đầu" });
        if (this.IsGioiHanKho() && lenh.MaKhoNhap != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh tồn đầu" });

        var raw = await db.CtdongBoTrongLenhs
            .Where(c => c.MaLenh == maLenh)
            .Select(c => new { c.MaTbdb, c.SoLuongTheoLenh })
            .ToListAsync();
        var tbdbMap = await db.Tbdbs.ToDictionaryAsync(t => t.MaTbdb, t => t.TenTbdb);
        var danhSach = raw.GroupBy(x => x.MaTbdb)
            .Select(g => new
            {
                maTbdb = g.Key,
                tenTbdb = tbdbMap.GetValueOrDefault(g.Key),
                soLo = g.Count(),
                tongSoLuong = g.Sum(x => x.SoLuongTheoLenh),
            })
            .OrderBy(x => x.maTbdb)
            .ToList();

        return Ok(new
        {
            maLenh = lenh.MaLenh,
            maKho = lenh.MaKhoNhap,
            tenKho = lenh.MaKhoNhapNavigation?.TenKho,
            nam = lenh.Ngay.Year,
            ngay = lenh.Ngay,
            ngayHieuLuc = lenh.NgayHieuLuc,
            ghiChu = lenh.GhiChu,
            trangThai = lenh.TrangThai,
            daKhoa = lenh.TrangThai == "HOAN_THANH",
            danhSach,
            tongCong = raw.Sum(x => x.SoLuongTheoLenh),
        });
    }

    // POST api/tb-dong-bo/ton-dau/tao-lenh
    // Bước 1: tạo lệnh tồn đầu thật cho 1 kho/năm — mã lệnh do người dùng đặt (có thể tự gợi ý
    // ở frontend), không phải mã ẩn tự sinh. Mỗi kho/năm chỉ có 1 lệnh tồn đầu tại 1 thời điểm.
    [HttpPost("tao-lenh")]
    public async Task<IActionResult> TaoLenh([FromBody] TaoLenhTonDauDto dto)
    {
        if (this.IsGioiHanKho()) dto = dto with { MaKho = this.CurrentMaKho()! };
        if (string.IsNullOrWhiteSpace(dto.MaLenh)) return BadRequest(new { message = "Thiếu mã lệnh" });
        if (string.IsNullOrWhiteSpace(dto.MaKho)) return BadRequest(new { message = "Thiếu kho" });

        if (await db.Khos.FindAsync(dto.MaKho) == null) return BadRequest(new { message = "Kho không tồn tại" });

        var ngayLap = dto.Ngay ?? new DateOnly(dto.Nam, 1, 1);
        if (ngayLap.Year != dto.Nam)
            return BadRequest(new { message = $"Ngày lập phải thuộc năm {dto.Nam} (đúng năm bắt đầu quản lý đã chọn)" });

        var daCoLenh = await db.Lenhs.AnyAsync(l => l.MaLoaiLenh == MaLoaiLenhTonDau && l.MaKhoNhap == dto.MaKho && l.Ngay.Year == dto.Nam);
        if (daCoLenh) return BadRequest(new { message = $"Kho \"{dto.MaKho}\" năm {dto.Nam} đã có lệnh tồn đầu — dùng lại lệnh đó thay vì tạo mới" });

        if (await db.Lenhs.AnyAsync(l => l.MaLenh == dto.MaLenh))
            return BadRequest(new { message = $"Mã lệnh \"{dto.MaLenh}\" đã tồn tại, chọn mã khác" });

        await DamBaoLoaiLenhAsync();

        var lenh = new Lenh
        {
            MaLenh = dto.MaLenh,
            MaLoaiLenh = MaLoaiLenhTonDau,
            Ngay = ngayLap,
            NgayHieuLuc = dto.NgayChot,
            TrangThai = null,
            VeViec = $"Khởi tạo tồn đầu năm {dto.Nam}  {dto.MaKho}",
            MaKhoNhap = dto.MaKho,
            GhiChu = dto.GhiChu,
            NguoiTao = this.CurrentUsername(),
        };
        db.Lenhs.Add(lenh);

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "Lenh", dto.MaLenh,
            $"Tạo lệnh tồn đầu \"{dto.MaLenh}\" cho kho \"{dto.MaKho}\" năm {dto.Nam}");

        return Ok(new { message = "Tạo lệnh tồn đầu thành công", maLenh = dto.MaLenh });
    }

    // PUT api/tb-dong-bo/ton-dau/{maLenh}
    // Sửa lệnh tồn đầu — chỉ cho sửa Ngày chốt và Ghi chú (không cho sửa Kho/Năm/Ngày lập vì
    // "Năm" được suy ra từ Ngày lập và đã gắn chặt vào TonDauKy.Nam sau khi hoàn tất khởi tạo —
    // đổi sẽ làm lệch dữ liệu tồn đầu kỳ đã ghi). Cho phép sửa dù lệnh đã hoàn tất hay chưa, vì
    // 2 trường này thuần là thông tin hành chính, không ảnh hưởng tồn kho đã ghi nhận.
    [HttpPut("{maLenh}")]
    public async Task<IActionResult> Sua(string maLenh, [FromBody] SuaLenhTonDauDto dto)
    {
        var lenh = await TimLenhAsync(maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh tồn đầu" });

        lenh.NgayHieuLuc = dto.NgayChot;
        lenh.GhiChu = dto.GhiChu;

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "Lenh", maLenh, $"Sửa lệnh tồn đầu \"{maLenh}\"");

        return Ok(new { message = "Cập nhật thành công" });
    }

    // DELETE api/tb-dong-bo/ton-dau/{maLenh}
    // Chỉ xóa được lệnh tồn đầu CHƯA hoàn tất khởi tạo. Xóa kèm toàn bộ lô đang NHAP (chưa tính
    // vào thực lực) của lệnh này. Lệnh đã hoàn tất thì dữ liệu tồn kho/tồn đầu kỳ đã ghi nhận và
    // có thể đã được dùng ở nghiệp vụ khác (kiểm kê, xuất kho...) — xóa sẽ để lại dữ liệu mồ côi
    // nên không cho phép.
    [HttpDelete("{maLenh}")]
    public async Task<IActionResult> Xoa(string maLenh)
    {
        var lenh = await TimLenhAsync(maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh tồn đầu" });
        if (lenh.TrangThai == "HOAN_THANH")
            return BadRequest(new { message = "Lệnh đã hoàn tất khởi tạo — dữ liệu tồn kho đã được ghi nhận, không thể xóa" });

        var loList = await db.CtdongBoTrongLenhs.Include(c => c.LoTbdb).ThenInclude(l => l!.TonKhoTbdbs)
            .Where(c => c.MaLenh == maLenh).ToListAsync();
        foreach (var c in loList)
        {
            if (c.LoTbdb != null) db.TonKhoTbdbs.RemoveRange(c.LoTbdb.TonKhoTbdbs);
        }
        db.LoTbdbs.RemoveRange(loList.Where(c => c.LoTbdb != null).Select(c => c.LoTbdb!));
        db.CtdongBoTrongLenhs.RemoveRange(loList);
        db.Lenhs.Remove(lenh);

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "Lenh", maLenh, $"Xóa lệnh tồn đầu \"{maLenh}\" (chưa hoàn tất)");

        return Ok(new { message = "Xóa thành công" });
    }

    // ===== Lô + vị trí — ghi thẳng CSDL ngay khi thêm/sửa/xóa (trạng thái NHAP cho tới khi "Kết
    // thúc lệnh"), KHÔNG còn staging ở localStorage của trình duyệt. =====

    private static string? ValidateLoTonDauTruong(LoTonDauDto lo)
    {
        if (string.IsNullOrWhiteSpace(lo.MaTbdb)) return "Thiếu trang bị đồng bộ";
        if (string.IsNullOrWhiteSpace(lo.MaLoTbdb)) return "Thiếu mã lô";
        if (lo.SoLuongTonDau <= 0) return "Số lượng tồn đầu phải lớn hơn 0";
        if (lo.ViTri == null || lo.ViTri.Count == 0) return "Chưa phân bổ vị trí";
        if (lo.ViTri.Any(v => v.SoLuong <= 0)) return "Số lượng tại mỗi vị trí phải lớn hơn 0";
        if (lo.ViTri.Any(v => string.IsNullOrWhiteSpace(v.MaTrangThaiTb))) return "Chưa chọn trạng thái trang bị cho vị trí";
        var tongViTri = lo.ViTri.Sum(v => v.SoLuong);
        if (tongViTri != lo.SoLuongTonDau)
            return $"Tổng số lượng theo vị trí ({tongViTri}) phải bằng tổng số lượng lô ({lo.SoLuongTonDau})";
        return null;
    }

    // Tạo 1 lô + các dòng vị trí trong 1 transaction — dùng chung cho "Thêm lô", "Nhập từ file"
    // và (gián tiếp) "Sửa lô" (xóa cũ rồi tạo lại — xem SuaLo). Giả định lo đã qua
    // ValidateLoTonDauTruong; hàm này còn kiểm tra thêm các ràng buộc cần truy vấn CSDL.
    private async Task<string?> TaoLoTonDauAsync(Lenh lenh, LoTonDauDto lo)
    {
        var loiTruong = ValidateLoTonDauTruong(lo);
        if (loiTruong != null) return loiTruong;

        if (await db.Tbdbs.FindAsync(lo.MaTbdb) == null) return $"Trang bị \"{lo.MaTbdb}\" không tồn tại";
        if (await db.LoTbdbs.AnyAsync(x => x.MaLoTbdb == lo.MaLoTbdb)) return $"Mã lô \"{lo.MaLoTbdb}\" đã tồn tại";

        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var ctdbtl = new CtdongBoTrongLenh
            {
                MaLenh = lenh.MaLenh,
                MaTbdb = lo.MaTbdb,
                MaCcl = lo.MaCcl,
                SoLuongTheoLenh = lo.SoLuongTonDau,
                DonGiaTheoLenh = lo.DonGia,
                SoLuongThuc = lo.SoLuongTonDau,
                GhiChu = lo.GhiChu,
            };
            db.CtdongBoTrongLenhs.Add(ctdbtl);
            await db.SaveChangesAsync(); // cần MaCtdongBoLenh sinh ra để gắn vào LoTbdb bên dưới

            db.LoTbdbs.Add(new LoTbdb
            {
                MaLoTbdb = lo.MaLoTbdb,
                MaTbdb = lo.MaTbdb,
                MaCtdongBoLenh = ctdbtl.MaCtdongBoLenh,
                MaCcl = lo.MaCcl,
                NamSx = lo.NamSx,
                MaNuocSx = lo.MaNuocSx,
                MaTinhTrangBaoGoi = lo.MaTinhTrangBaoGoi,
                MaHinhThucNiemCat = lo.MaHinhThucNiemCat,
                DonGia = lo.DonGia,
                SoLuongNhap = lo.SoLuongTonDau,
                TrangThaiLo = "NHAP",
                GhiChu = lo.GhiChu,
            });

            foreach (var v in lo.ViTri)
            {
                db.TonKhoTbdbs.Add(new TonKhoTbdb
                {
                    MaLoTbdb = lo.MaLoTbdb,
                    MaKho = lenh.MaKhoNhap!,
                    TenNhaKho = v.TenNhaKho,
                    TenDinhKhu = v.TenDinhKhu,
                    TenKhoi = v.TenKhoi,
                    TenGia = v.TenGia,
                    TenTang = v.TenTang,
                    TenHom = v.TenHom,
                    MoTaViTri = v.MoTaViTri,
                    MaTrangThaiTb = v.MaTrangThaiTb,
                    SoLuong = v.SoLuong,
                });
            }

            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            await tx.RollbackAsync();
            return DbErrorTranslator.Translate(ex);
        }

        return null;
    }

    // GET api/tb-dong-bo/ton-dau/{maLenh}/lo
    // Toàn bộ lô của lệnh này (cả đang "NHAP" lẫn đã "HOAN_THANH" sau khi Kết thúc lệnh) — nguồn
    // dữ liệu chính cho trang xử lý, thay cho localStorage trước đây. Không lọc theo trạng thái
    // lô vì trang xử lý cần hiển thị đầy đủ dù lệnh đã hoàn tất hay chưa (chỉ khác ở việc còn cho
    // sửa/xóa hay không — do frontend tự quyết định dựa trên lenh.daKhoa).
    [HttpGet("{maLenh}/lo")]
    public async Task<IActionResult> GetDanhSachLo(string maLenh)
    {
        var lenh = await TimLenhAsync(maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh tồn đầu" });

        var list = await db.CtdongBoTrongLenhs
            .Include(c => c.MaTbdbNavigation)
            .Include(c => c.MaCclNavigation)
            .Include(c => c.LoTbdb).ThenInclude(l => l!.MaNuocSxNavigation)
            .Include(c => c.LoTbdb).ThenInclude(l => l!.MaTinhTrangBaoGoiNavigation)
            .Include(c => c.LoTbdb).ThenInclude(l => l!.MaHinhThucNiemCatNavigation)
            .Include(c => c.LoTbdb).ThenInclude(l => l!.TonKhoTbdbs).ThenInclude(t => t.MaTrangThaiTbNavigation)
            .Where(c => c.MaLenh == maLenh && c.LoTbdb != null)
            .OrderBy(c => c.MaTbdb)
            .ToListAsync();

        var result = list.Select(c => new
        {
            maTbdb = c.MaTbdb,
            tenTbdb = c.MaTbdbNavigation.TenTbdb,
            maLoTbdb = c.LoTbdb!.MaLoTbdb,
            maCcl = c.MaCcl,
            tenCcl = c.MaCclNavigation != null ? c.MaCclNavigation.TenCap : null,
            namSx = c.LoTbdb.NamSx,
            maNuocSx = c.LoTbdb.MaNuocSx,
            tenNuocSx = c.LoTbdb.MaNuocSxNavigation?.TenNsx,
            maTinhTrangBaoGoi = c.LoTbdb.MaTinhTrangBaoGoi,
            tenTinhTrangBaoGoi = c.LoTbdb.MaTinhTrangBaoGoiNavigation?.TenTtbg,
            maHinhThucNiemCat = c.LoTbdb.MaHinhThucNiemCat,
            tenHinhThucNiemCat = c.LoTbdb.MaHinhThucNiemCatNavigation?.TenHtnc,
            donGia = c.LoTbdb.DonGia,
            soLuongTonDau = c.LoTbdb.SoLuongNhap,
            ghiChu = c.GhiChu,
            viTri = c.LoTbdb.TonKhoTbdbs.Select(v => new
            {
                tenNhaKho = v.TenNhaKho,
                tenDinhKhu = v.TenDinhKhu,
                tenKhoi = v.TenKhoi,
                tenGia = v.TenGia,
                tenTang = v.TenTang,
                tenHom = v.TenHom,
                moTaViTri = v.MoTaViTri,
                maTrangThaiTb = v.MaTrangThaiTb,
                tenTrangThaiTb = v.MaTrangThaiTbNavigation != null ? v.MaTrangThaiTbNavigation.TenTttb : null,
                soLuong = v.SoLuong,
            }),
        });

        return Ok(result);
    }

    // POST api/tb-dong-bo/ton-dau/{maLenh}/lo
    // Thêm 1 lô + vị trí — ghi ngay xuống CSDL ở trạng thái NHAP.
    [HttpPost("{maLenh}/lo")]
    public async Task<IActionResult> ThemLo(string maLenh, [FromBody] LoTonDauDto dto)
    {
        var lenh = await TimLenhAsync(maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh tồn đầu" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã hoàn tất khởi tạo, không thể thêm lô" });

        var loi = await TaoLoTonDauAsync(lenh, dto);
        if (loi != null) return BadRequest(new { message = loi });

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "LoTbdb", dto.MaLoTbdb,
            $"Thêm lô tồn đầu \"{dto.MaLoTbdb}\" vào lệnh \"{maLenh}\" (đang nháp)");
        return StatusCode(201, new { message = "Thêm lô thành công" });
    }

    // PUT api/tb-dong-bo/ton-dau/{maLenh}/lo/{maLoTbdb}
    // Sửa 1 lô đang NHAP — Mã lô (khóa chính) giữ nguyên, không cho đổi (tránh phải đổi trực tiếp
    // khóa chính đang bị các dòng Tồn kho tham chiếu). Các trường còn lại + toàn bộ vị trí được
    // ghi đè theo dữ liệu mới.
    [HttpPut("{maLenh}/lo/{maLoTbdb}")]
    public async Task<IActionResult> SuaLo(string maLenh, string maLoTbdb, [FromBody] LoTonDauDto dto)
    {
        var lenh = await TimLenhAsync(maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh tồn đầu" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã hoàn tất khởi tạo, không thể sửa lô" });

        var ctdbtl = await db.CtdongBoTrongLenhs.Include(c => c.LoTbdb).ThenInclude(l => l!.TonKhoTbdbs)
            .FirstOrDefaultAsync(c => c.MaLenh == maLenh && c.LoTbdb != null && c.LoTbdb.MaLoTbdb == maLoTbdb);
        if (ctdbtl?.LoTbdb == null) return NotFound(new { message = "Không tìm thấy lô" });
        if (ctdbtl.LoTbdb.TrangThaiLo == "HOAN_THANH") return BadRequest(new { message = "Lô đã hoàn tất, không thể sửa" });

        var loiTruong = ValidateLoTonDauTruong(dto);
        if (loiTruong != null) return BadRequest(new { message = loiTruong });
        if (await db.Tbdbs.FindAsync(dto.MaTbdb) == null) return BadRequest(new { message = $"Trang bị \"{dto.MaTbdb}\" không tồn tại" });

        ctdbtl.MaTbdb = dto.MaTbdb;
        ctdbtl.MaCcl = dto.MaCcl;
        ctdbtl.SoLuongTheoLenh = dto.SoLuongTonDau;
        ctdbtl.DonGiaTheoLenh = dto.DonGia;
        ctdbtl.SoLuongThuc = dto.SoLuongTonDau;
        ctdbtl.GhiChu = dto.GhiChu;

        ctdbtl.LoTbdb.MaTbdb = dto.MaTbdb;
        ctdbtl.LoTbdb.MaCcl = dto.MaCcl;
        ctdbtl.LoTbdb.NamSx = dto.NamSx;
        ctdbtl.LoTbdb.MaNuocSx = dto.MaNuocSx;
        ctdbtl.LoTbdb.MaTinhTrangBaoGoi = dto.MaTinhTrangBaoGoi;
        ctdbtl.LoTbdb.MaHinhThucNiemCat = dto.MaHinhThucNiemCat;
        ctdbtl.LoTbdb.DonGia = dto.DonGia;
        ctdbtl.LoTbdb.SoLuongNhap = dto.SoLuongTonDau;
        ctdbtl.LoTbdb.GhiChu = dto.GhiChu;

        db.TonKhoTbdbs.RemoveRange(ctdbtl.LoTbdb.TonKhoTbdbs);
        foreach (var v in dto.ViTri)
        {
            db.TonKhoTbdbs.Add(new TonKhoTbdb
            {
                MaLoTbdb = maLoTbdb,
                MaKho = lenh.MaKhoNhap!,
                TenNhaKho = v.TenNhaKho,
                TenDinhKhu = v.TenDinhKhu,
                TenKhoi = v.TenKhoi,
                TenGia = v.TenGia,
                TenTang = v.TenTang,
                TenHom = v.TenHom,
                MoTaViTri = v.MoTaViTri,
                MaTrangThaiTb = v.MaTrangThaiTb,
                SoLuong = v.SoLuong,
            });
        }

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "LoTbdb", maLoTbdb, $"Sửa lô tồn đầu \"{maLoTbdb}\" trong lệnh \"{maLenh}\"");
        return Ok(new { message = "Cập nhật lô thành công" });
    }

    // DELETE api/tb-dong-bo/ton-dau/{maLenh}/lo/{maLoTbdb}
    [HttpDelete("{maLenh}/lo/{maLoTbdb}")]
    public async Task<IActionResult> XoaLo(string maLenh, string maLoTbdb)
    {
        var lenh = await TimLenhAsync(maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh tồn đầu" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã hoàn tất khởi tạo, không thể xóa lô" });

        var ctdbtl = await db.CtdongBoTrongLenhs.Include(c => c.LoTbdb).ThenInclude(l => l!.TonKhoTbdbs)
            .FirstOrDefaultAsync(c => c.MaLenh == maLenh && c.LoTbdb != null && c.LoTbdb.MaLoTbdb == maLoTbdb);
        if (ctdbtl?.LoTbdb == null) return NotFound(new { message = "Không tìm thấy lô" });
        if (ctdbtl.LoTbdb.TrangThaiLo == "HOAN_THANH") return BadRequest(new { message = "Lô đã hoàn tất, không thể xóa" });

        db.TonKhoTbdbs.RemoveRange(ctdbtl.LoTbdb.TonKhoTbdbs);
        db.LoTbdbs.Remove(ctdbtl.LoTbdb);
        db.CtdongBoTrongLenhs.Remove(ctdbtl);

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "LoTbdb", maLoTbdb, $"Xóa lô tồn đầu \"{maLoTbdb}\" khỏi lệnh \"{maLenh}\" (đang nháp)");
        return Ok(new { message = "Xóa thành công" });
    }

    // POST api/tb-dong-bo/ton-dau/{maLenh}/hoan-tat
    // Bước 2: chuyển toàn bộ lô đang NHAP của lệnh này sang HOAN_THANH (chính thức thành thực
    // lực — xem TbDongBoController.GetByKho/GetChiTiet chỉ tính lô đã HOAN_THANH), ghi TonDauKy,
    // rồi khóa lệnh lại. Không còn nhận danh sách lô qua body — dữ liệu đã nằm sẵn trong CSDL từ
    // các lần "Thêm/Sửa lô" trước đó.
    [HttpPost("{maLenh}/hoan-tat")]
    public async Task<IActionResult> HoanTat(string maLenh)
    {
        var lenh = await TimLenhAsync(maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh tồn đầu" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh tồn đầu này đã hoàn tất khởi tạo và khóa lại trước đó" });

        var danhSachLo = await db.CtdongBoTrongLenhs
            .Include(c => c.LoTbdb).ThenInclude(l => l!.TonKhoTbdbs)
            .Where(c => c.MaLenh == maLenh && c.LoTbdb != null && c.LoTbdb.TrangThaiLo == "NHAP")
            .ToListAsync();

        if (danhSachLo.Count == 0)
            return BadRequest(new { message = "Chưa có lô tồn đầu nào để lưu" });

        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var nguoiTao = this.CurrentUsername();
            foreach (var c in danhSachLo) c.LoTbdb!.TrangThaiLo = "HOAN_THANH";

            // Gộp theo (TBĐB, cấp chất lượng) — khớp đúng granularity của phiếu kiểm kê (xem
            // KiemKeTbDongBoController), để "SL kỳ trước" tra được đúng theo từng cấp thay vì lấy
            // gộp cả TBĐB.
            foreach (var nhom in danhSachLo.GroupBy(c => new { c.MaTbdb, c.MaCcl }))
            {
                var tonDau = await db.TonDauKies.FirstOrDefaultAsync(t =>
                    t.Nam == lenh.Ngay.Year && t.MaKho == lenh.MaKhoNhap && t.NhomTb == "TBDB" && t.MaTbdb == nhom.Key.MaTbdb && t.MaCcl == nhom.Key.MaCcl);
                if (tonDau == null)
                {
                    tonDau = new TonDauKy { Nam = lenh.Ngay.Year, MaKho = lenh.MaKhoNhap!, NhomTb = "TBDB", MaTbdb = nhom.Key.MaTbdb, MaCcl = nhom.Key.MaCcl, NguonTao = NguonTaoKhoiTao };
                    db.TonDauKies.Add(tonDau);
                }
                tonDau.SoLuong = nhom.Sum(c => c.SoLuongTheoLenh);
                tonDau.NgayTao = DateTime.Now;
                tonDau.NguoiTao = nguoiTao;
            }

            lenh.TrangThai = "HOAN_THANH";

            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            await tx.RollbackAsync();
            return BadRequest(new { message = DbErrorTranslator.Translate(ex) });
        }

        var soTbdb = danhSachLo.Select(c => c.MaTbdb).Distinct().Count();
        var soViTri = danhSachLo.Sum(c => c.LoTbdb!.TonKhoTbdbs.Count);
        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "Lenh", maLenh,
            $"Hoàn tất khởi tạo tồn đầu \"{maLenh}\" — {soTbdb} TBĐB, {danhSachLo.Count} lô, {soViTri} vị trí");

        return Ok(new { message = "Hoàn tất khởi tạo tồn đầu thành công", soTbdb, soLo = danhSachLo.Count, soViTri });
    }

    // ===== Nhập lô + vị trí từ file Excel =====

    private static readonly string[] MauNhapHeaders =
    [
        "Mã TBĐB", "Mã lô", "Cấp CL (mã)", "Năm SX", "Nước SX (mã)", "Tình trạng bao gói (mã)", "Hình thức niêm cất (mã)",
        "Đơn giá", "Tổng số lượng lô", "Nhà kho", "Khu", "Khối", "Giá", "Tầng", "Hòm",
        "Mô tả vị trí", "Trạng thái TB (mã)", "Số lượng tại vị trí", "Ghi chú",
    ];

    // GET api/tb-dong-bo/ton-dau/mau-nhap
    // File mẫu trống + sheet "Danh mục" tra mã TBĐB/Cấp CL/Nước SX/Tình trạng bao gói/Trạng thái
    // TB. Mỗi dòng trong file = 1 vị trí của 1 lô — nhiều dòng cùng Mã lô sẽ gộp vào cùng 1 lô.
    [HttpGet("mau-nhap")]
    public async Task<IActionResult> TaiMauNhap()
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Nhap ton dau");
        int[] cotBatBuoc = [1, 2, 3, 8, 9, 17, 18];
        for (var i = 0; i < MauNhapHeaders.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = MauNhapHeaders[i] + (cotBatBuoc.Contains(i + 1) ? " *" : "");
            if (cotBatBuoc.Contains(i + 1))
            {
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(255, 235, 205);
                cell.Style.Font.FontColor = XLColor.FromArgb(140, 60, 0);
            }
        }
        ws.Row(1).Style.Font.Bold = true;
        ws.Cell(1, MauNhapHeaders.Length + 2).Value = "* = cột bắt buộc. Mỗi dòng = 1 vị trí của 1 lô — các dòng cùng Mã lô phải cùng TBĐB/Cấp CL/Tổng số lượng lô, và tổng Số lượng tại vị trí phải khớp đúng bằng Tổng số lượng lô.";
        ws.Cell(1, MauNhapHeaders.Length + 2).Style.Font.Italic = true;
        ws.Columns().AdjustToContents();

        var wsDm = wb.Worksheets.Add("Danh muc");
        var row = 1;
        void GhiDanhMuc(string tieuDe, IEnumerable<(string ma, string ten)> items)
        {
            wsDm.Cell(row, 1).Value = tieuDe;
            wsDm.Cell(row, 1).Style.Font.Bold = true;
            row++;
            foreach (var (ma, ten) in items) { wsDm.Cell(row, 1).Value = ma; wsDm.Cell(row, 2).Value = ten; row++; }
            row++;
        }
        GhiDanhMuc("Mã TBĐB", await db.Tbdbs.Select(x => new { x.MaTbdb, x.TenTbdb }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaTbdb, x.TenTbdb))));
        GhiDanhMuc("Cấp chất lượng", await db.CapChatLuongs.Select(x => new { Ma = x.MaCap.ToString(), x.TenCap }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.Ma, x.TenCap))));
        GhiDanhMuc("Nước SX", await db.Nsxes.Select(x => new { x.MaNsx, x.TenNsx }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaNsx, x.TenNsx))));
        GhiDanhMuc("Tình trạng bao gói", await db.TinhTrangBaoGois.Select(x => new { x.MaTtbg, x.TenTtbg }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaTtbg, x.TenTtbg))));
        GhiDanhMuc("Hình thức niêm cất", await db.HinhThucNiemCats.Select(x => new { x.MaHtnc, x.TenHtnc }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaHtnc, x.TenHtnc))));
        GhiDanhMuc("Trạng thái TB", await db.TrangThaiTbs.Select(x => new { x.MaTttb, x.TenTttb }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaTttb, x.TenTttb))));
        wsDm.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "mau-nhap-ton-dau.xlsx");
    }

    private class DongTonDauRow
    {
        public int Dong { get; set; }
        public string MaTbdb { get; set; } = "";
        public string MaLoTbdb { get; set; } = "";
        public int? MaCcl { get; set; }
        public int? NamSx { get; set; }
        public string? MaNuocSx { get; set; }
        public string? MaTinhTrangBaoGoi { get; set; }
        public string? MaHinhThucNiemCat { get; set; }
        public decimal? DonGia { get; set; }
        public int? SoLuongTonDau { get; set; }
        public string? TenNhaKho { get; set; }
        public string? TenDinhKhu { get; set; }
        public string? TenKhoi { get; set; }
        public string? TenGia { get; set; }
        public string? TenTang { get; set; }
        public string? TenHom { get; set; }
        public string? MoTaViTri { get; set; }
        public string MaTrangThaiTb { get; set; } = "";
        public int? SoLuong { get; set; }
        public string? GhiChu { get; set; }
    }

    private List<DongTonDauRow> DocDongTuFile(Stream stream)
    {
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheet(1);
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        var rows = new List<DongTonDauRow>();
        for (var r = 2; r <= lastRow; r++)
        {
            var maTbdb = ws.Cell(r, 1).GetString().Trim();
            if (string.IsNullOrWhiteSpace(maTbdb)) continue; // bỏ qua dòng trống

            rows.Add(new DongTonDauRow
            {
                Dong = r,
                MaTbdb = maTbdb,
                MaLoTbdb = ws.Cell(r, 2).GetString().Trim(),
                MaCcl = int.TryParse(ws.Cell(r, 3).GetString().Trim(), out var ccl) ? ccl : null,
                NamSx = int.TryParse(ws.Cell(r, 4).GetString().Trim(), out var ns) ? ns : null,
                MaNuocSx = ws.Cell(r, 5).GetString().Trim(),
                MaTinhTrangBaoGoi = ws.Cell(r, 6).GetString().Trim(),
                MaHinhThucNiemCat = ws.Cell(r, 7).GetString().Trim(),
                DonGia = decimal.TryParse(ws.Cell(r, 8).GetString().Trim(), out var dg) ? dg : null,
                SoLuongTonDau = int.TryParse(ws.Cell(r, 9).GetString().Trim(), out var sltd) ? sltd : null,
                TenNhaKho = ws.Cell(r, 10).GetString().Trim(),
                TenDinhKhu = ws.Cell(r, 11).GetString().Trim(),
                TenKhoi = ws.Cell(r, 12).GetString().Trim(),
                TenGia = ws.Cell(r, 13).GetString().Trim(),
                TenTang = ws.Cell(r, 14).GetString().Trim(),
                TenHom = ws.Cell(r, 15).GetString().Trim(),
                MoTaViTri = ws.Cell(r, 16).GetString().Trim(),
                MaTrangThaiTb = ws.Cell(r, 17).GetString().Trim(),
                SoLuong = int.TryParse(ws.Cell(r, 18).GetString().Trim(), out var sl) ? sl : null,
                GhiChu = ws.Cell(r, 19).GetString().Trim(),
            });
        }
        return rows;
    }

    private static List<string> KiemTraTruongTonDau(DongTonDauRow r)
    {
        var thieu = new List<string>();
        if (string.IsNullOrWhiteSpace(r.MaLoTbdb)) thieu.Add("Mã lô");
        if (r.MaCcl == null) thieu.Add("Cấp CL (phải là số)");
        if (r.DonGia == null) thieu.Add("Đơn giá (phải là số)");
        if (r.SoLuongTonDau == null) thieu.Add("Tổng số lượng lô (phải là số)");
        else if (r.SoLuongTonDau <= 0) thieu.Add("Tổng số lượng lô (phải > 0)");
        if (string.IsNullOrWhiteSpace(r.MaTrangThaiTb)) thieu.Add("Trạng thái TB (mã)");
        if (r.SoLuong == null) thieu.Add("Số lượng tại vị trí (phải là số)");
        else if (r.SoLuong <= 0) thieu.Add("Số lượng tại vị trí (phải > 0)");
        return thieu;
    }

    // Kiểm tra ở mức nhóm (cùng Mã lô) — mọi dòng cùng mã lô phải cùng TBĐB/Cấp CL/Tổng số
    // lượng lô, tổng Số lượng tại vị trí phải khớp đúng bằng Tổng số lượng lô đã khai, và Mã lô
    // chưa tồn tại trong hệ thống (khóa chính LoTbdb, kiểm tra toàn hệ thống chứ không riêng lệnh
    // này) — y hệt kiểm tra ở TaoLoTonDauAsync (bước lưu thật), để bước xem trước bắt lỗi được
    // sớm thay vì để tới lúc xác nhận mới báo lưu thất bại không rõ lý do. KHÔNG kiểm tra trùng
    // (TBĐB, Cấp CL) trong lệnh — tồn đầu cho phép nhiều lô cho cùng 1 TBĐB+cấp.
    private async Task<string?> KiemTraNhomTonDau(string maLo, List<DongTonDauRow> nhom)
    {
        var maTbdbList = nhom.Select(x => x.MaTbdb).Distinct().ToList();
        if (maTbdbList.Count > 1)
            return $"Các dòng cùng Mã lô \"{maLo}\" phải cùng 1 Mã TBĐB, đang có: {string.Join(", ", maTbdbList)}";

        var cclList = nhom.Select(x => x.MaCcl).Where(x => x != null).Distinct().ToList();
        if (cclList.Count > 1)
            return $"Các dòng cùng Mã lô \"{maLo}\" phải cùng 1 Cấp chất lượng, đang có: {string.Join(", ", cclList)}";

        var soLuongList = nhom.Select(x => x.SoLuongTonDau).Where(x => x != null).Distinct().ToList();
        if (soLuongList.Count > 1)
            return $"Các dòng cùng Mã lô \"{maLo}\" phải cùng 1 Tổng số lượng lô, đang có: {string.Join(", ", soLuongList)}";

        if (maTbdbList.Count == 1 && !await db.Tbdbs.AnyAsync(t => t.MaTbdb == maTbdbList[0]))
            return $"Không tìm thấy trang bị đồng bộ \"{maTbdbList[0]}\"";

        if (await db.LoTbdbs.AnyAsync(x => x.MaLoTbdb == maLo))
            return $"Mã lô \"{maLo}\" đã tồn tại trong hệ thống — đổi sang mã khác";

        if (soLuongList.Count == 1)
        {
            var tongTaiViTri = nhom.Where(x => x.SoLuong != null).Sum(x => x.SoLuong!.Value);
            if (tongTaiViTri != soLuongList[0])
                return $"Tổng Số lượng tại vị trí ({tongTaiViTri}) phải bằng Tổng số lượng lô \"{maLo}\" ({soLuongList[0]})";
        }

        return null;
    }

    // POST api/tb-dong-bo/ton-dau/{maLenh}/xem-truoc-file
    // Đọc + kiểm tra file Excel nhưng KHÔNG lưu DB — kiểm tra đầy đủ như lúc lưu thật (kể cả các
    // ràng buộc cần tra CSDL: Mã lô trùng, TBĐB/Cấp CL đã có lô khác trong lệnh) để không xảy ra
    // tình trạng dòng hiện "hợp lệ" ở bước xem trước nhưng vẫn lưu thất bại ở bước xác nhận.
    [HttpPost("{maLenh}/xem-truoc-file")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> XemTruocTuFile(string maLenh, IFormFile file)
    {
        var lenh = await TimLenhAsync(maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh tồn đầu" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã hoàn tất khởi tạo, không thể nhập thêm" });
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chưa chọn file" });

        using var stream = file.OpenReadStream();
        var rows = DocDongTuFile(stream);

        var maTbdbList = rows.Select(r => r.MaTbdb).Distinct().ToList();
        var tenTbdbMap = await db.Tbdbs.Where(t => maTbdbList.Contains(t.MaTbdb)).ToDictionaryAsync(t => t.MaTbdb, t => t.TenTbdb);
        var cclMap = await db.CapChatLuongs.ToDictionaryAsync(c => c.MaCap, c => c.TenCap);

        var loiNhomMap = new Dictionary<string, string?>();
        foreach (var nhom in rows.GroupBy(x => x.MaLoTbdb))
        {
            if (string.IsNullOrWhiteSpace(nhom.Key)) continue; // lỗi thiếu mã lô đã báo riêng ở từng dòng
            loiNhomMap[nhom.Key] = await KiemTraNhomTonDau(nhom.Key, nhom.ToList());
        }

        var danhSach = rows.Select(r =>
        {
            var loi = KiemTraTruongTonDau(r);
            var loiNhom = string.IsNullOrWhiteSpace(r.MaLoTbdb) ? null : loiNhomMap.GetValueOrDefault(r.MaLoTbdb);
            if (loiNhom != null) loi.Add(loiNhom);
            return new
            {
                dong = r.Dong, maTbdb = r.MaTbdb, tenTbdb = tenTbdbMap.GetValueOrDefault(r.MaTbdb),
                maLoTbdb = r.MaLoTbdb, maCcl = r.MaCcl, tenCcl = r.MaCcl.HasValue ? cclMap.GetValueOrDefault(r.MaCcl.Value) : null,
                namSx = r.NamSx, maNuocSx = r.MaNuocSx, maTinhTrangBaoGoi = r.MaTinhTrangBaoGoi, maHinhThucNiemCat = r.MaHinhThucNiemCat,
                donGia = r.DonGia, soLuongTonDau = r.SoLuongTonDau,
                tenNhaKho = r.TenNhaKho, tenDinhKhu = r.TenDinhKhu, tenKhoi = r.TenKhoi, tenGia = r.TenGia,
                tenTang = r.TenTang, tenHom = r.TenHom, moTaViTri = r.MoTaViTri, maTrangThaiTb = r.MaTrangThaiTb,
                soLuong = r.SoLuong, ghiChu = r.GhiChu, hopLe = loi.Count == 0, loi,
            };
        }).ToList();

        return Ok(new { tongSoDong = rows.Count, danhSach });
    }

    // POST api/tb-dong-bo/ton-dau/{maLenh}/nhap-lo-file/xac-nhan
    // Lưu các lô đã xem trước/duyệt (đã gộp theo Mã lô ở client) — validate + ghi từng lô xuống
    // CSDL qua TaoLoTonDauAsync, KHÔNG rollback toàn bộ nếu 1 lô lỗi (giữ lại các lô đã lưu
    // thành công, báo chi tiết lô lỗi để người dùng sửa lại và nhập lại riêng lô đó).
    [HttpPost("{maLenh}/nhap-lo-file/xac-nhan")]
    public async Task<IActionResult> XacNhanNhapTuFile(string maLenh, [FromBody] XacNhanNhapTonDauDto dto)
    {
        var lenh = await TimLenhAsync(maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh tồn đầu" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã hoàn tất khởi tạo, không thể thêm lô" });
        if (dto.DanhSachLo == null || dto.DanhSachLo.Count == 0)
            return BadRequest(new { message = "Chưa có lô nào để lưu" });

        int thanhCong = 0, thatBai = 0;
        var chiTietLoi = new List<object>();
        foreach (var lo in dto.DanhSachLo)
        {
            var loi = await TaoLoTonDauAsync(lenh, lo);
            if (loi != null) { thatBai++; chiTietLoi.Add(new { maLoTbdb = lo.MaLoTbdb, loi }); }
            else thanhCong++;
        }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "LoTbdb", maLenh,
            $"Nhập file lô tồn đầu cho lệnh \"{maLenh}\" — {thanhCong} thành công, {thatBai} lỗi");

        return Ok(new { tongSoDong = dto.DanhSachLo.Count, thanhCong, thatBai, chiTietLoi });
    }
}

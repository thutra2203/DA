using backend_dotnet.Models;
using backend_dotnet.Services;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace backend_dotnet.Controllers;

// Thay đổi vị trí TBĐB — lệnh riêng (LenhThayDoiViTri/ChiTietLenhThayDoiViTri), KHÔNG dùng chung hệ
// Lệnh/CtdongBoTrongLenh của Nhập/Xuất/Hủy-thanh lý, cũng KHÔNG dùng chung bảng với Chuyển cấp chất
// lượng — vì "vị trí mới" là dữ liệu riêng (6 trường + mô tả) không có ý nghĩa ở 2 hệ lệnh kia.
// Quy trình 2 bước, giống cấu trúc Chuyển cấp chất lượng:
//   1. Tạo lệnh: tạo LenhThayDoiViTri (chỉ 1 kho — không đổi kho, không đổi số lượng tổng) rồi thêm
//      các dòng ChiTietLenhThayDoiViTri — mỗi dòng chọn đúng 1 dòng tồn kho cụ thể (lô + vị trí cũ,
//      MaTonKho) + số lượng muốn chuyển (mặc định toàn bộ, có thể chọn ít hơn để chuyển 1 phần) +
//      vị trí ĐÍCH muốn chuyển tới.
//   2. Kết thúc lệnh — lúc này mới thật sự áp dụng: trừ đúng số lượng khỏi dòng tồn kho nguồn; nếu
//      đích đã có sẵn 1 dòng tồn kho của CÙNG lô tại ĐÚNG vị trí đó thì cộng dồn vào, chưa có thì tạo
//      dòng tồn kho mới tại đích (copy trạng thái TB từ dòng nguồn) — KHÔNG cần tách lô hay tạo lệnh
//      nội bộ ẩn như Chuyển cấp, vì vị trí nằm ngay trên TonKhoTbdb (không phải trên LoTbdb).
public record TaoLenhThayDoiViTriDto(string MaKho, DateOnly NgayLap, DateOnly? NgayKetThuc, string? CanCu, string? VeViec, string? GhiChu);
public record ThemChiTietThayDoiViTriDto(
    long MaTonKho, int SoLuong,
    string? TenNhaKhoMoi, string? TenDinhKhuMoi, string? TenKhoiMoi, string? TenGiaMoi, string? TenTangMoi, string? TenHomMoi, string? MoTaViTriMoi,
    string? GhiChu);

[ApiController]
[Authorize]
[Route("api/tb-dong-bo/thay-doi-vi-tri")]
public class ThayDoiViTriController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    // Trạng thái TB (TrangThaiTB) tạm gán cho dòng tồn kho trong lúc đang chờ xử lý lệnh thay đổi vị
    // trí (xem ThemChiTiet/SuaChiTiet/XoaChiTiet/XoaLenh/KetThuc) — trả về trạng thái gốc khi xong.
    private const string MaTrangThaiDangLamLenh = "TT03";

    // GET api/tb-dong-bo/thay-doi-vi-tri?maKho=
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? maKho)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        var query = db.LenhThayDoiViTris.Include(l => l.MaKhoNavigation).AsQueryable();
        if (!string.IsNullOrWhiteSpace(maKho)) query = query.Where(l => l.MaKho == maKho);

        var lenhs = await query.OrderByDescending(l => l.NgayLap).ThenByDescending(l => l.MaLenh).ToListAsync();
        var maLenhs = lenhs.Select(l => l.MaLenh).ToList();
        var tongHop = await db.ChiTietLenhThayDoiViTris
            .Where(c => maLenhs.Contains(c.MaLenh))
            .GroupBy(c => c.MaLenh)
            .Select(g => new { MaLenh = g.Key, SoDong = g.Count() })
            .ToDictionaryAsync(x => x.MaLenh);

        var result = lenhs.Select(l =>
        {
            tongHop.TryGetValue(l.MaLenh, out var t);
            return new
            {
                maLenh = l.MaLenh,
                maKho = l.MaKho,
                tenKho = l.MaKhoNavigation?.TenKho,
                ngayLap = l.NgayLap,
                trangThai = l.TrangThai,
                daKetThuc = l.TrangThai == "HOAN_THANH",
                canCu = l.CanCu,
                veViec = l.VeViec,
                nguoiTao = l.NguoiTao,
                ngayKetThuc = l.NgayKetThuc,
                ghiChu = l.GhiChu,
                soDong = t?.SoDong ?? 0,
            };
        });
        return Ok(result);
    }

    // GET api/tb-dong-bo/thay-doi-vi-tri/{maLenh}
    [HttpGet("{maLenh}")]
    public async Task<IActionResult> GetOne(string maLenh)
    {
        var lenh = await db.LenhThayDoiViTris.Include(l => l.MaKhoNavigation).FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });

        var chiTiet = await db.ChiTietLenhThayDoiViTris
            .Include(c => c.MaLoTbdbNavigation).ThenInclude(l => l.MaTbdbNavigation)
            .Include(c => c.MaLoTbdbNavigation).ThenInclude(l => l.MaCclNavigation)
            .Include(c => c.MaTonKhoNavigation)
            .Where(c => c.MaLenh == maLenh)
            .OrderBy(c => c.MaCtlenhThayDoiViTri)
            .Select(c => new
            {
                maCtLenhThayDoiViTri = c.MaCtlenhThayDoiViTri,
                maTonKho = c.MaTonKho,
                maLoTbdb = c.MaLoTbdb,
                maTbdb = c.MaLoTbdbNavigation.MaTbdb,
                tenTbdb = c.MaLoTbdbNavigation.MaTbdbNavigation.TenTbdb,
                capHienTai = c.MaLoTbdbNavigation.MaCclNavigation != null ? c.MaLoTbdbNavigation.MaCclNavigation.TenCap : null,
                viTriCu = new
                {
                    tenNhaKho = c.MaTonKhoNavigation.TenNhaKho,
                    tenDinhKhu = c.MaTonKhoNavigation.TenDinhKhu,
                    tenKhoi = c.MaTonKhoNavigation.TenKhoi,
                    tenGia = c.MaTonKhoNavigation.TenGia,
                    tenTang = c.MaTonKhoNavigation.TenTang,
                    tenHom = c.MaTonKhoNavigation.TenHom,
                    moTaViTri = c.MaTonKhoNavigation.MoTaViTri,
                },
                soLuong = c.SoLuong,
                viTriMoi = new
                {
                    tenNhaKho = c.TenNhaKhoMoi,
                    tenDinhKhu = c.TenDinhKhuMoi,
                    tenKhoi = c.TenKhoiMoi,
                    tenGia = c.TenGiaMoi,
                    tenTang = c.TenTangMoi,
                    tenHom = c.TenHomMoi,
                    moTaViTri = c.MoTaViTriMoi,
                },
                ghiChu = c.GhiChu,
            })
            .ToListAsync();

        return Ok(new
        {
            maLenh = lenh.MaLenh,
            maKho = lenh.MaKho,
            tenKho = lenh.MaKhoNavigation?.TenKho,
            ngayLap = lenh.NgayLap,
            trangThai = lenh.TrangThai,
            daKetThuc = lenh.TrangThai == "HOAN_THANH",
            canCu = lenh.CanCu,
            veViec = lenh.VeViec,
            nguoiTao = lenh.NguoiTao,
            ngayKetThuc = lenh.NgayKetThuc,
            ghiChu = lenh.GhiChu,
            chiTiet,
        });
    }

    // GET api/tb-dong-bo/thay-doi-vi-tri/{maLenh}/vi-tri-kha-dung
    // Danh sách dòng tồn kho (lô + vị trí cụ thể) tại đúng kho của lệnh: lô đã hoàn thành nhập, còn
    // KHẢ DỤNG > 0 — để chọn thêm vào lệnh. Trừ phần đã đưa vào CHÍNH lệnh này (ở các dòng khác) và
    // phần đang bị giữ chỗ NGOÀI lệnh bởi CẢ 4 nguồn (chuyển cấp, hủy/thanh lý, xuất kho, 1 lệnh thay
    // đổi vị trí KHÁC) — cùng nguyên tắc với các màn hình chọn tồn kho khác trong hệ thống.
    [HttpGet("{maLenh}/vi-tri-kha-dung")]
    public async Task<IActionResult> GetViTriKhaDung(string maLenh)
    {
        var lenh = await db.LenhThayDoiViTris.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });

        var daDungTheoTonKho = await db.ChiTietLenhThayDoiViTris.Where(c => c.MaLenh == maLenh)
            .GroupBy(c => c.MaTonKho).Select(g => new { MaTonKho = g.Key, SoLuong = g.Sum(c => c.SoLuong) })
            .ToDictionaryAsync(x => x.MaTonKho, x => x.SoLuong);

        var listRaw = await db.TonKhoTbdbs
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaTbdbNavigation)
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaCclNavigation)
            .Where(t => t.MaKho == lenh.MaKho && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH" && t.SoLuong > 0)
            .OrderBy(t => t.MaLoTbdbNavigation.MaTbdb).ThenBy(t => t.MaLoTbdb)
            .Select(t => new
            {
                maTonKho = t.MaTonKho,
                maLoTbdb = t.MaLoTbdb,
                maTbdb = t.MaLoTbdbNavigation.MaTbdb,
                tenTbdb = t.MaLoTbdbNavigation.MaTbdbNavigation.TenTbdb,
                maCcl = t.MaLoTbdbNavigation.MaCcl,
                capChatLuong = t.MaLoTbdbNavigation.MaCclNavigation.TenCap,
                namSx = t.MaLoTbdbNavigation.NamSx,
                soLuong = t.SoLuong,
                tenNhaKho = t.TenNhaKho,
                tenDinhKhu = t.TenDinhKhu,
                tenKhoi = t.TenKhoi,
                tenGia = t.TenGia,
                tenTang = t.TenTang,
                tenHom = t.TenHom,
                moTaViTri = t.MoTaViTri,
            })
            .ToListAsync();

        var maTonKhoIds = listRaw.Select(t => t.maTonKho).ToList();
        var giuChoLenhKhac = await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, maTonKhoIds, boQuaMaLenh: maLenh);
        var giuChoChuyenCap = await ChuyenCapReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoHuy = await HuyThanhLyReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoXuatKho = await XuatKhoReservationHelper.LayGiuChoAsync(db, maTonKhoIds);

        var list = listRaw
            .Select(t => new { t.maTonKho, t.maLoTbdb, t.maTbdb, t.tenTbdb, t.maCcl, t.capChatLuong, t.namSx,
                soLuong = t.soLuong - daDungTheoTonKho.GetValueOrDefault(t.maTonKho) - giuChoLenhKhac.GetValueOrDefault(t.maTonKho)
                    - giuChoChuyenCap.GetValueOrDefault(t.maTonKho) - giuChoHuy.GetValueOrDefault(t.maTonKho) - giuChoXuatKho.GetValueOrDefault(t.maTonKho),
                t.tenNhaKho, t.tenDinhKhu, t.tenKhoi, t.tenGia, t.tenTang, t.tenHom, t.moTaViTri })
            .Where(t => t.soLuong > 0)
            .ToList();

        return Ok(list);
    }

    // POST api/tb-dong-bo/thay-doi-vi-tri/tao-lenh
    [HttpPost("tao-lenh")]
    public async Task<IActionResult> TaoLenh([FromBody] TaoLenhThayDoiViTriDto dto)
    {
        if (this.IsGioiHanKho()) dto = dto with { MaKho = this.CurrentMaKho()! };
        if (string.IsNullOrWhiteSpace(dto.MaKho)) return BadRequest(new { message = "Thiếu kho" });
        if (await db.Khos.FindAsync(dto.MaKho) == null) return BadRequest(new { message = "Kho không tồn tại" });

        var maLenh = await TaoMaLenhAsync();
        db.LenhThayDoiViTris.Add(new LenhThayDoiViTri
        {
            MaLenh = maLenh,
            MaKho = dto.MaKho,
            NgayLap = dto.NgayLap,
            TrangThai = null,
            CanCu = dto.CanCu,
            VeViec = dto.VeViec,
            NguoiTao = this.CurrentUsername(),
            NgayKetThuc = dto.NgayKetThuc,
            GhiChu = dto.GhiChu,
        });

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "LenhThayDoiViTri", maLenh,
            $"Tạo lệnh thay đổi vị trí \"{maLenh}\" tại kho \"{dto.MaKho}\"");

        return Ok(new { message = "Tạo lệnh thành công", maLenh });
    }

    // PUT api/tb-dong-bo/thay-doi-vi-tri/{maLenh}
    [HttpPut("{maLenh}")]
    public async Task<IActionResult> SuaLenh(string maLenh, [FromBody] TaoLenhThayDoiViTriDto dto)
    {
        var lenh = await db.LenhThayDoiViTris.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể sửa" });

        if (this.IsGioiHanKho()) dto = dto with { MaKho = this.CurrentMaKho()! };
        if (string.IsNullOrWhiteSpace(dto.MaKho)) return BadRequest(new { message = "Thiếu kho" });
        if (await db.Khos.FindAsync(dto.MaKho) == null) return BadRequest(new { message = "Kho không tồn tại" });

        lenh.MaKho = dto.MaKho;
        lenh.NgayLap = dto.NgayLap;
        lenh.NgayKetThuc = dto.NgayKetThuc;
        lenh.CanCu = dto.CanCu;
        lenh.VeViec = dto.VeViec;
        lenh.GhiChu = dto.GhiChu;

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "LenhThayDoiViTri", maLenh,
            $"Cập nhật lệnh thay đổi vị trí \"{maLenh}\"");

        return Ok(new { message = "Cập nhật thành công" });
    }

    private static bool CoDienViTriMoi(ThemChiTietThayDoiViTriDto dto) =>
        !string.IsNullOrWhiteSpace(dto.TenNhaKhoMoi) || !string.IsNullOrWhiteSpace(dto.TenDinhKhuMoi) || !string.IsNullOrWhiteSpace(dto.TenKhoiMoi)
        || !string.IsNullOrWhiteSpace(dto.TenGiaMoi) || !string.IsNullOrWhiteSpace(dto.TenTangMoi) || !string.IsNullOrWhiteSpace(dto.TenHomMoi)
        || !string.IsNullOrWhiteSpace(dto.MoTaViTriMoi);

    // POST api/tb-dong-bo/thay-doi-vi-tri/{maLenh}/chi-tiet
    [HttpPost("{maLenh}/chi-tiet")]
    public async Task<IActionResult> ThemChiTiet(string maLenh, [FromBody] ThemChiTietThayDoiViTriDto dto)
    {
        var lenh = await db.LenhThayDoiViTris.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể thêm dòng mới" });

        if (dto.SoLuong <= 0) return BadRequest(new { message = "Số lượng cần chuyển phải lớn hơn 0" });
        if (!CoDienViTriMoi(dto)) return BadRequest(new { message = "Phải nhập ít nhất 1 trường vị trí mới" });

        var tonKho = await db.TonKhoTbdbs.Include(t => t.MaLoTbdbNavigation)
            .FirstOrDefaultAsync(t => t.MaTonKho == dto.MaTonKho && t.MaKho == lenh.MaKho);
        if (tonKho == null) return BadRequest(new { message = "Dòng tồn kho không tồn tại tại kho của lệnh" });
        if (tonKho.MaLoTbdbNavigation.TrangThaiLo != "HOAN_THANH") return BadRequest(new { message = "Lô chưa hoàn thành nhập kho, chưa thể thay đổi vị trí" });

        // Cùng 1 dòng tồn kho có thể đã được đưa 1 phần vào lệnh này rồi — chỉ còn phần CHƯA dùng
        // mới được chọn tiếp. Đồng thời trừ phần đang bị giữ chỗ bởi lệnh thay đổi vị trí KHÁC, hoặc
        // bởi chuyển cấp/hủy-thanh lý/xuất kho (cùng 1 dòng tồn kho, khác mục đích sử dụng).
        var daDung = await db.ChiTietLenhThayDoiViTris
            .Where(c => c.MaLenh == maLenh && c.MaTonKho == dto.MaTonKho).SumAsync(c => (int?)c.SoLuong) ?? 0;
        var giuChoLenhKhac = (await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho], boQuaMaLenh: maLenh)).GetValueOrDefault(dto.MaTonKho);
        var giuChoChuyenCap = (await ChuyenCapReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho])).GetValueOrDefault(dto.MaTonKho);
        var giuChoHuy = (await HuyThanhLyReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho])).GetValueOrDefault(dto.MaTonKho);
        var giuChoXuatKho = (await XuatKhoReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho])).GetValueOrDefault(dto.MaTonKho);
        var khaDung = tonKho.SoLuong - daDung - giuChoLenhKhac - giuChoChuyenCap - giuChoHuy - giuChoXuatKho;
        if (dto.SoLuong > khaDung) return BadRequest(new { message = $"Dòng tồn kho này chỉ còn {khaDung} khả dụng, không thể chọn {dto.SoLuong}" });

        // Chỉ đổi trạng thái TB khi dòng này giữ chỗ TOÀN BỘ số lượng hiện có của dòng tồn kho (nghĩa
        // là dto.SoLuong == tonKho.SoLuong đã tự động kéo theo không còn ai khác đang giữ chỗ phần
        // nào của dòng này) — giữ 1 phần thì phần còn lại vẫn đang tự do, không nên gắn cho cả dòng.
        string? trangThaiGoc = null;
        if (dto.SoLuong == tonKho.SoLuong)
        {
            trangThaiGoc = tonKho.MaTrangThaiTb;
            tonKho.MaTrangThaiTb = MaTrangThaiDangLamLenh;
        }

        db.ChiTietLenhThayDoiViTris.Add(new ChiTietLenhThayDoiViTri
        {
            MaLenh = maLenh,
            MaTonKho = dto.MaTonKho,
            MaLoTbdb = tonKho.MaLoTbdb,
            SoLuong = dto.SoLuong,
            TenNhaKhoMoi = dto.TenNhaKhoMoi,
            TenDinhKhuMoi = dto.TenDinhKhuMoi,
            TenKhoiMoi = dto.TenKhoiMoi,
            TenGiaMoi = dto.TenGiaMoi,
            TenTangMoi = dto.TenTangMoi,
            TenHomMoi = dto.TenHomMoi,
            MoTaViTriMoi = dto.MoTaViTriMoi,
            TrangThaiGoc = trangThaiGoc,
            GhiChu = dto.GhiChu,
        });

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        return Ok(new { message = "Thêm dòng thành công" });
    }

    // PUT api/tb-dong-bo/thay-doi-vi-tri/{maLenh}/chi-tiet/{id}
    [HttpPut("{maLenh}/chi-tiet/{id}")]
    public async Task<IActionResult> SuaChiTiet(string maLenh, int id, [FromBody] ThemChiTietThayDoiViTriDto dto)
    {
        var lenh = await db.LenhThayDoiViTris.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể sửa dòng" });

        var ct = await db.ChiTietLenhThayDoiViTris.FirstOrDefaultAsync(c => c.MaLenh == maLenh && c.MaCtlenhThayDoiViTri == id);
        if (ct == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

        if (dto.SoLuong <= 0) return BadRequest(new { message = "Số lượng cần chuyển phải lớn hơn 0" });
        if (!CoDienViTriMoi(dto)) return BadRequest(new { message = "Phải nhập ít nhất 1 trường vị trí mới" });

        var tonKho = await db.TonKhoTbdbs.FirstOrDefaultAsync(t => t.MaTonKho == ct.MaTonKho);
        if (tonKho == null) return BadRequest(new { message = "Dòng tồn kho không còn tồn tại" });

        var daDungODongKhac = await db.ChiTietLenhThayDoiViTris
            .Where(c => c.MaLenh == maLenh && c.MaTonKho == ct.MaTonKho && c.MaCtlenhThayDoiViTri != id)
            .SumAsync(c => (int?)c.SoLuong) ?? 0;
        var giuChoLenhKhac = (await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, [ct.MaTonKho], boQuaMaLenh: maLenh)).GetValueOrDefault(ct.MaTonKho);
        var giuChoChuyenCap = (await ChuyenCapReservationHelper.LayGiuChoAsync(db, [ct.MaTonKho])).GetValueOrDefault(ct.MaTonKho);
        var giuChoHuy = (await HuyThanhLyReservationHelper.LayGiuChoAsync(db, [ct.MaTonKho])).GetValueOrDefault(ct.MaTonKho);
        var giuChoXuatKho = (await XuatKhoReservationHelper.LayGiuChoAsync(db, [ct.MaTonKho])).GetValueOrDefault(ct.MaTonKho);
        var khaDung = tonKho.SoLuong - daDungODongKhac - giuChoLenhKhac - giuChoChuyenCap - giuChoHuy - giuChoXuatKho;
        if (dto.SoLuong > khaDung) return BadRequest(new { message = $"Dòng tồn kho này chỉ còn {khaDung} khả dụng, không thể chọn {dto.SoLuong}" });

        // Chuyển giữa "giữ 1 phần" <-> "giữ toàn bộ" dòng tồn kho — cập nhật trạng thái TB tương ứng
        // (xem chú thích ở ThemChiTiet).
        if (ct.TrangThaiGoc != null && dto.SoLuong != tonKho.SoLuong)
        {
            tonKho.MaTrangThaiTb = ct.TrangThaiGoc;
            ct.TrangThaiGoc = null;
        }
        else if (ct.TrangThaiGoc == null && dto.SoLuong == tonKho.SoLuong)
        {
            ct.TrangThaiGoc = tonKho.MaTrangThaiTb;
            tonKho.MaTrangThaiTb = MaTrangThaiDangLamLenh;
        }

        ct.SoLuong = dto.SoLuong;
        ct.TenNhaKhoMoi = dto.TenNhaKhoMoi;
        ct.TenDinhKhuMoi = dto.TenDinhKhuMoi;
        ct.TenKhoiMoi = dto.TenKhoiMoi;
        ct.TenGiaMoi = dto.TenGiaMoi;
        ct.TenTangMoi = dto.TenTangMoi;
        ct.TenHomMoi = dto.TenHomMoi;
        ct.MoTaViTriMoi = dto.MoTaViTriMoi;
        ct.GhiChu = dto.GhiChu;

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        return Ok(new { message = "Cập nhật dòng thành công" });
    }

    // DELETE api/tb-dong-bo/thay-doi-vi-tri/{maLenh}/chi-tiet/{id}
    [HttpDelete("{maLenh}/chi-tiet/{id}")]
    public async Task<IActionResult> XoaChiTiet(string maLenh, int id)
    {
        var lenh = await db.LenhThayDoiViTris.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể xóa dòng" });

        var ct = await db.ChiTietLenhThayDoiViTris.FirstOrDefaultAsync(c => c.MaLenh == maLenh && c.MaCtlenhThayDoiViTri == id);
        if (ct == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

        if (ct.TrangThaiGoc != null)
        {
            var tonKho = await db.TonKhoTbdbs.FindAsync(ct.MaTonKho);
            if (tonKho != null) tonKho.MaTrangThaiTb = ct.TrangThaiGoc;
        }

        db.ChiTietLenhThayDoiViTris.Remove(ct);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        return Ok(new { message = "Xóa dòng thành công" });
    }

    // DELETE api/tb-dong-bo/thay-doi-vi-tri/{maLenh}
    [HttpDelete("{maLenh}")]
    public async Task<IActionResult> XoaLenh(string maLenh)
    {
        var lenh = await db.LenhThayDoiViTris.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể xóa" });

        // Trả lại trạng thái TB gốc cho mọi dòng tồn kho đang bị lệnh này giữ chỗ toàn bộ, trước khi
        // xóa lệnh (cascade sẽ tự xóa các dòng chi tiết).
        var chiTietCanTra = await db.ChiTietLenhThayDoiViTris
            .Where(c => c.MaLenh == maLenh && c.TrangThaiGoc != null).ToListAsync();
        if (chiTietCanTra.Count > 0)
        {
            var maTonKhoCanTra = chiTietCanTra.Select(c => c.MaTonKho).ToList();
            var tonKhoCanTra = await db.TonKhoTbdbs.Where(t => maTonKhoCanTra.Contains(t.MaTonKho)).ToDictionaryAsync(t => t.MaTonKho);
            foreach (var ct in chiTietCanTra)
                if (tonKhoCanTra.TryGetValue(ct.MaTonKho, out var tk)) tk.MaTrangThaiTb = ct.TrangThaiGoc!;
        }

        db.LenhThayDoiViTris.Remove(lenh);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "LenhThayDoiViTri", maLenh,
            $"Xóa lệnh thay đổi vị trí \"{maLenh}\"");

        return Ok(new { message = "Xóa lệnh thành công" });
    }

    // POST api/tb-dong-bo/thay-doi-vi-tri/{maLenh}/ket-thuc
    // Áp dụng thật — xem chi tiết thuật toán ở đầu file. Khóa lệnh sau khi xong.
    [HttpPost("{maLenh}/ket-thuc")]
    public async Task<IActionResult> KetThuc(string maLenh)
    {
        var lenh = await db.LenhThayDoiViTris.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc trước đó" });

        var chiTiet = await db.ChiTietLenhThayDoiViTris.Where(c => c.MaLenh == maLenh)
            .OrderBy(c => c.MaCtlenhThayDoiViTri).ToListAsync();
        if (chiTiet.Count == 0) return BadRequest(new { message = "Lệnh chưa có dòng chi tiết nào" });

        var maTonKhoList = chiTiet.Select(c => c.MaTonKho).Distinct().ToList();
        var tonKhoRows = await db.TonKhoTbdbs.Where(t => maTonKhoList.Contains(t.MaTonKho)).ToListAsync();
        var tonKhoMap = tonKhoRows.ToDictionary(t => t.MaTonKho);

        // Tra "dòng tồn kho đã có tại đúng vị trí đích của cùng 1 lô" — nạp SẴN toàn bộ tồn kho hiện
        // có của kho này, rồi cập nhật dần trong vòng lặp (kể cả dòng vừa tạo/cộng dồn trong CHÍNH
        // lượt Kết thúc này, chưa SaveChanges) — để nhiều dòng chi tiết cùng đích không tạo ra nhiều
        // dòng tồn kho trùng vị trí.
        static string ViTriKey(string maLo, string? nhaKho, string? dinhKhu, string? khoi, string? gia, string? tang, string? hom) =>
            string.Join("|", maLo, nhaKho ?? "", dinhKhu ?? "", khoi ?? "", gia ?? "", tang ?? "", hom ?? "");

        var tonKhoTheoViTri = new Dictionary<string, TonKhoTbdb>();
        foreach (var t in await db.TonKhoTbdbs.Where(t => t.MaKho == lenh.MaKho).ToListAsync())
            tonKhoTheoViTri[ViTriKey(t.MaLoTbdb, t.TenNhaKho, t.TenDinhKhu, t.TenKhoi, t.TenGia, t.TenTang, t.TenHom)] = t;

        foreach (var ct in chiTiet)
        {
            if (!tonKhoMap.TryGetValue(ct.MaTonKho, out var tonKhoNguon))
                return BadRequest(new { message = $"Dòng tồn kho #{ct.MaTonKho} không còn tồn tại" });
            if (ct.SoLuong > tonKhoNguon.SoLuong)
                return BadRequest(new { message = $"Dòng tồn kho của lô \"{ct.MaLoTbdb}\" chỉ còn {tonKhoNguon.SoLuong}, không đủ để chuyển {ct.SoLuong}" });

            // Trả lại trạng thái TB gốc TRƯỚC khi tính vị trí đích — để dòng đích (nếu tạo mới) copy
            // đúng trạng thái gốc thay vì "Đang làm lệnh", và để xử lý đúng cả trường hợp vị trí mới
            // trùng vị trí cũ ngay dưới đây (không có gì để chuyển nhưng vẫn phải trả trạng thái).
            if (ct.TrangThaiGoc != null) tonKhoNguon.MaTrangThaiTb = ct.TrangThaiGoc;

            var dichKey = ViTriKey(ct.MaLoTbdb, ct.TenNhaKhoMoi, ct.TenDinhKhuMoi, ct.TenKhoiMoi, ct.TenGiaMoi, ct.TenTangMoi, ct.TenHomMoi);
            var nguonKey = ViTriKey(tonKhoNguon.MaLoTbdb, tonKhoNguon.TenNhaKho, tonKhoNguon.TenDinhKhu, tonKhoNguon.TenKhoi, tonKhoNguon.TenGia, tonKhoNguon.TenTang, tonKhoNguon.TenHom);
            if (dichKey == nguonKey) continue; // vị trí mới trùng vị trí cũ — không có gì để làm

            tonKhoNguon.SoLuong -= ct.SoLuong;

            if (tonKhoTheoViTri.TryGetValue(dichKey, out var tonKhoDich) && tonKhoDich != tonKhoNguon)
            {
                tonKhoDich.SoLuong += ct.SoLuong;
            }
            else
            {
                var moi = new TonKhoTbdb
                {
                    MaLoTbdb = tonKhoNguon.MaLoTbdb,
                    MaKho = tonKhoNguon.MaKho,
                    TenNhaKho = ct.TenNhaKhoMoi,
                    TenDinhKhu = ct.TenDinhKhuMoi,
                    TenKhoi = ct.TenKhoiMoi,
                    TenGia = ct.TenGiaMoi,
                    TenTang = ct.TenTangMoi,
                    TenHom = ct.TenHomMoi,
                    MoTaViTri = ct.MoTaViTriMoi,
                    MaTrangThaiTb = tonKhoNguon.MaTrangThaiTb,
                    SoLuong = ct.SoLuong,
                };
                db.TonKhoTbdbs.Add(moi);
                tonKhoTheoViTri[dichKey] = moi;
            }
        }

        lenh.TrangThai = "HOAN_THANH";
        lenh.NguoiKetThuc = this.CurrentUsername();
        lenh.NgayKetThuc = DateOnly.FromDateTime(DateTime.Now);

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "LenhThayDoiViTri", maLenh,
            $"Kết thúc lệnh thay đổi vị trí \"{maLenh}\" — {chiTiet.Count} dòng");

        return Ok(new { message = "Kết thúc lệnh thành công" });
    }

    // ===== Nhập file Excel cho Thay đổi vị trí — 1 sheet duy nhất liệt kê SẴN toàn bộ tồn kho tại
    // kho của lệnh (mỗi dòng = đúng 1 dòng tồn kho cụ thể, nhận diện bằng cột ẩn "Mã tồn kho"), người
    // dùng chỉ cần điền "SL cần chuyển" (> 0) VÀ ít nhất 1 trường vị trí mới vào dòng cần chuyển —
    // dòng nào để trống hoặc SL = 0 thì bỏ qua. Giống hệt cơ chế đã làm cho Chuyển cấp/Hủy-thanh lý. =====

    private static readonly string[] MauNhapThayDoiViTriHeaders =
        ["Mã lô", "Mã TB", "Tên TB", "Cấp CL", "Nhà kho", "Định khu", "Khối", "Giá", "Tầng", "Hòm",
            "Mô tả vị trí", "Tồn kho", "Khả dụng", "SL cần chuyển",
            "Nhà kho mới", "Định khu mới", "Khối mới", "Giá mới", "Tầng mới", "Hòm mới", "Mô tả vị trí mới", "Ghi chú"];
    private const int MauVtSoLuong = 14, MauVtNhaKhoMoi = 15, MauVtDinhKhuMoi = 16, MauVtKhoiMoi = 17,
        MauVtGiaMoi = 18, MauVtTangMoi = 19, MauVtHomMoi = 20, MauVtMoTaMoi = 21, MauVtGhiChu = 22, MauVtMaTonKho = 23;

    // GET api/tb-dong-bo/thay-doi-vi-tri/{maLenh}/mau-nhap
    [HttpGet("{maLenh}/mau-nhap")]
    public async Task<IActionResult> TaiMauNhap(string maLenh)
    {
        var lenh = await db.LenhThayDoiViTris.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Nhap thay doi vi tri");
        for (var i = 0; i < MauNhapThayDoiViTriHeaders.Length; i++) ws.Cell(1, i + 1).Value = MauNhapThayDoiViTriHeaders[i];
        ws.Row(1).Style.Font.Bold = true;
        foreach (var col in new[] { MauVtSoLuong, MauVtNhaKhoMoi, MauVtDinhKhuMoi, MauVtKhoiMoi, MauVtGiaMoi, MauVtTangMoi, MauVtHomMoi, MauVtMoTaMoi, MauVtGhiChu })
        {
            ws.Cell(1, col).Style.Fill.BackgroundColor = XLColor.FromArgb(255, 235, 205);
            ws.Cell(1, col).Style.Font.FontColor = XLColor.FromArgb(140, 60, 0);
        }

        // Khả dụng = tồn kho trừ phần đã đưa vào CHÍNH lệnh này (dòng chi tiết khác) và phần đang bị
        // giữ chỗ NGOÀI lệnh (lệnh thay đổi vị trí khác, chuyển cấp, hủy/thanh lý, xuất kho) — cùng
        // công thức với "Thêm dòng" và bước xem trước/xác nhận nhập file.
        var (_, giuChoNgoaiLenh) = await LayTonKhoThayDoiViTriAsync(lenh.MaKho, maLenh);
        var daDungTrongLenh = await db.ChiTietLenhThayDoiViTris.Where(c => c.MaLenh == maLenh)
            .GroupBy(c => c.MaTonKho).Select(g => new { MaTonKho = g.Key, SoLuong = g.Sum(c => c.SoLuong) })
            .ToDictionaryAsync(x => x.MaTonKho, x => x.SoLuong);

        var row = 2;
        var dsTonKho = await db.TonKhoTbdbs
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaTbdbNavigation)
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaCclNavigation)
            .Where(t => t.MaKho == lenh.MaKho && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH" && t.SoLuong > 0)
            .OrderBy(t => t.MaLoTbdbNavigation.MaTbdb).ThenBy(t => t.MaLoTbdb)
            .ToListAsync();

        foreach (var t in dsTonKho)
        {
            ws.Cell(row, 1).Value = t.MaLoTbdb;
            ws.Cell(row, 2).Value = t.MaLoTbdbNavigation.MaTbdb;
            ws.Cell(row, 3).Value = t.MaLoTbdbNavigation.MaTbdbNavigation.TenTbdb;
            ws.Cell(row, 4).Value = t.MaLoTbdbNavigation.MaCclNavigation?.TenCap;
            ws.Cell(row, 5).Value = t.TenNhaKho;
            ws.Cell(row, 6).Value = t.TenDinhKhu;
            ws.Cell(row, 7).Value = t.TenKhoi;
            ws.Cell(row, 8).Value = t.TenGia;
            ws.Cell(row, 9).Value = t.TenTang;
            ws.Cell(row, 10).Value = t.TenHom;
            ws.Cell(row, 11).Value = t.MoTaViTri;
            ws.Cell(row, 12).Value = t.SoLuong;
            ws.Cell(row, 13).Value = t.SoLuong - daDungTrongLenh.GetValueOrDefault(t.MaTonKho) - giuChoNgoaiLenh.GetValueOrDefault(t.MaTonKho);
            ws.Cell(row, MauVtMaTonKho).Value = t.MaTonKho;
            row++;
        }

        ws.Cell(row + 1, 1).Value =
            "Chỉ điền \"SL cần chuyển\" (> 0) VÀ ít nhất 1 trường vị trí mới vào các dòng cần thay đổi vị trí — để trống các dòng còn lại. Không sửa các cột khác.";
        ws.Cell(row + 1, 1).Style.Font.Italic = true;

        ws.Column(MauVtMaTonKho).Hide();
        ws.Columns().AdjustToContents();
        ws.SheetView.FreezeRows(1);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"mau-thay-doi-vi-tri-{maLenh}.xlsx");
    }

    public record ThayDoiViTriFileRowDto(
        int Dong, long MaTonKho, string MaLoTbdb, int SoLuong,
        string? TenNhaKhoMoi, string? TenDinhKhuMoi, string? TenKhoiMoi, string? TenGiaMoi, string? TenTangMoi, string? TenHomMoi, string? MoTaViTriMoi,
        string? GhiChu);
    public record XacNhanNhapThayDoiViTriDto(List<ThayDoiViTriFileRowDto> DanhSach);

    private static bool CoDienViTriMoiFile(string? nhaKho, string? dinhKhu, string? khoi, string? gia, string? tang, string? hom, string? moTa) =>
        !string.IsNullOrWhiteSpace(nhaKho) || !string.IsNullOrWhiteSpace(dinhKhu) || !string.IsNullOrWhiteSpace(khoi)
        || !string.IsNullOrWhiteSpace(gia) || !string.IsNullOrWhiteSpace(tang) || !string.IsNullOrWhiteSpace(hom) || !string.IsNullOrWhiteSpace(moTa);

    // Nạp toàn bộ tồn kho tại kho của lệnh (lô đã HOAN_THANH, còn tồn) tra theo MaTonKho, + tổng
    // đang bị giữ chỗ NGOÀI lệnh này (lệnh thay đổi vị trí khác, chuyển cấp, hủy/thanh lý, xuất kho)
    // — dùng chung cho xem trước & xác nhận nhập file để 2 bước tính nhất quán với nhau và với
    // ThemChiTiet/SuaChiTiet.
    private async Task<(Dictionary<long, TonKhoTbdb> ByMaTonKho, Dictionary<long, int> GiuChoNgoaiLenh)> LayTonKhoThayDoiViTriAsync(string maKho, string maLenh)
    {
        var tonKhoList = await db.TonKhoTbdbs
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaTbdbNavigation)
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaCclNavigation)
            .Where(t => t.MaKho == maKho && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH" && t.SoLuong > 0)
            .ToListAsync();
        var byMaTonKho = tonKhoList.ToDictionary(t => t.MaTonKho, t => t);

        var ids = tonKhoList.Select(t => t.MaTonKho).ToList();
        var giuChoLenhKhac = await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, ids, boQuaMaLenh: maLenh);
        var giuChoChuyenCap = await ChuyenCapReservationHelper.LayGiuChoAsync(db, ids);
        var giuChoHuy = await HuyThanhLyReservationHelper.LayGiuChoAsync(db, ids);
        var giuChoXuatKho = await XuatKhoReservationHelper.LayGiuChoAsync(db, ids);
        var giuChoNgoaiLenh = ids.ToDictionary(id => id, id =>
            giuChoLenhKhac.GetValueOrDefault(id) + giuChoChuyenCap.GetValueOrDefault(id) + giuChoHuy.GetValueOrDefault(id)
                + giuChoXuatKho.GetValueOrDefault(id));

        return (byMaTonKho, giuChoNgoaiLenh);
    }

    // POST api/tb-dong-bo/thay-doi-vi-tri/{maLenh}/nhap-file/xem-truoc
    [HttpPost("{maLenh}/nhap-file/xem-truoc")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> XemTruocNhapTuFile(string maLenh, IFormFile file)
    {
        var lenh = await db.LenhThayDoiViTris.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể thêm dòng mới" });
        if (file == null || file.Length == 0) return BadRequest(new { message = "Chưa chọn file" });

        var (byMaTonKho, giuChoNgoaiLenh) = await LayTonKhoThayDoiViTriAsync(lenh.MaKho, maLenh);
        var daDungTrongLenh = await db.ChiTietLenhThayDoiViTris.Where(c => c.MaLenh == maLenh)
            .GroupBy(c => c.MaTonKho).Select(g => new { MaTonKho = g.Key, SoLuong = g.Sum(c => c.SoLuong) })
            .ToDictionaryAsync(x => x.MaTonKho, x => x.SoLuong);

        var daDungTrongFile = new Dictionary<long, int>();
        int KhaDung(TonKhoTbdb t) => t.SoLuong - daDungTrongLenh.GetValueOrDefault(t.MaTonKho)
            - giuChoNgoaiLenh.GetValueOrDefault(t.MaTonKho) - daDungTrongFile.GetValueOrDefault(t.MaTonKho);

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheet(1);
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        var danhSach = new List<object>();
        for (var r = 2; r <= lastRow; r++)
        {
            var maLo = ws.Cell(r, 1).GetString().Trim();
            var soLuongStr = ws.Cell(r, MauVtSoLuong).GetString().Trim();
            if (string.IsNullOrWhiteSpace(maLo) || string.IsNullOrWhiteSpace(soLuongStr)) continue; // dòng trống hoặc chưa điền SL — bỏ qua

            int? soLuong = int.TryParse(soLuongStr, out var sl) ? sl : null;
            if (soLuong is null or <= 0) continue; // chỉ hiển thị dòng có SL cần chuyển > 0

            string? Opt(int col) { var v = ws.Cell(r, col).GetString().Trim(); return string.IsNullOrWhiteSpace(v) ? null : v; }
            var nhaKhoMoi = Opt(MauVtNhaKhoMoi); var dinhKhuMoi = Opt(MauVtDinhKhuMoi); var khoiMoi = Opt(MauVtKhoiMoi);
            var giaMoi = Opt(MauVtGiaMoi); var tangMoi = Opt(MauVtTangMoi); var homMoi = Opt(MauVtHomMoi); var moTaMoi = Opt(MauVtMoTaMoi);
            var ghiChuRaw = Opt(MauVtGhiChu);
            var maTonKhoStr = ws.Cell(r, MauVtMaTonKho).GetString().Trim();

            var loiHang = new List<string>();
            TonKhoTbdb? tonKho = null;
            if (!long.TryParse(maTonKhoStr, out var maTonKho) || !byMaTonKho.TryGetValue(maTonKho, out tonKho))
                loiHang.Add($"Không tìm thấy dòng tồn kho của lô \"{maLo}\" — có thể lô đã hết hàng hoặc đổi vị trí, hãy tải lại mẫu mới nhất");

            if (!CoDienViTriMoiFile(nhaKhoMoi, dinhKhuMoi, khoiMoi, giaMoi, tangMoi, homMoi, moTaMoi))
                loiHang.Add("Phải điền ít nhất 1 trường vị trí mới");

            if (tonKho != null)
            {
                var khaDung = KhaDung(tonKho);
                if (soLuong.Value > khaDung)
                    loiHang.Add($"Lô \"{maLo}\" chỉ còn {khaDung} khả dụng, không thể chuyển {soLuong}");
                else
                    daDungTrongFile[tonKho.MaTonKho] = daDungTrongFile.GetValueOrDefault(tonKho.MaTonKho) + soLuong.Value;
            }

            danhSach.Add(new
            {
                dong = r,
                maLoTbdb = maLo,
                maTonKho = tonKho?.MaTonKho,
                // Khả dụng GỐC — trước khi trừ các dòng KHÁC trong CÙNG file — dùng để kiểm tra lại
                // ngay trên trình duyệt khi người dùng sửa tay (xem revalidateDanhSach ở frontend).
                khaDungGoc = tonKho == null ? (int?)null
                    : tonKho.SoLuong - daDungTrongLenh.GetValueOrDefault(tonKho.MaTonKho) - giuChoNgoaiLenh.GetValueOrDefault(tonKho.MaTonKho),
                maTbdb = tonKho?.MaLoTbdbNavigation.MaTbdb,
                tenTbdb = tonKho?.MaLoTbdbNavigation.MaTbdbNavigation.TenTbdb,
                capHienTai = tonKho?.MaLoTbdbNavigation.MaCclNavigation?.TenCap,
                viTriCu = tonKho == null ? null : new
                {
                    tenNhaKho = tonKho.TenNhaKho, tenDinhKhu = tonKho.TenDinhKhu, tenKhoi = tonKho.TenKhoi,
                    tenGia = tonKho.TenGia, tenTang = tonKho.TenTang, tenHom = tonKho.TenHom, moTaViTri = tonKho.MoTaViTri,
                },
                soLuong,
                tenNhaKhoMoi = nhaKhoMoi, tenDinhKhuMoi = dinhKhuMoi, tenKhoiMoi = khoiMoi,
                tenGiaMoi = giaMoi, tenTangMoi = tangMoi, tenHomMoi = homMoi, moTaViTriMoi = moTaMoi,
                ghiChu = ghiChuRaw,
                hopLe = loiHang.Count == 0,
                loi = loiHang,
            });
        }

        return Ok(new { tongSoDong = danhSach.Count, danhSach });
    }

    // POST api/tb-dong-bo/thay-doi-vi-tri/{maLenh}/nhap-file/xac-nhan
    // Kiểm tra lại từ đầu (không tin kết quả xem trước) — dòng nào lỗi thì báo lỗi và bỏ qua, không
    // ảnh hưởng các dòng khác.
    [HttpPost("{maLenh}/nhap-file/xac-nhan")]
    public async Task<IActionResult> XacNhanNhapTuFile(string maLenh, [FromBody] XacNhanNhapThayDoiViTriDto dto)
    {
        var lenh = await db.LenhThayDoiViTris.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi vị trí" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể thêm dòng mới" });
        if (dto.DanhSach == null || dto.DanhSach.Count == 0) return BadRequest(new { message = "Chưa có dòng nào để lưu" });

        var (byMaTonKho, giuChoNgoaiLenh) = await LayTonKhoThayDoiViTriAsync(lenh.MaKho, maLenh);

        var existingRows = await db.ChiTietLenhThayDoiViTris.Where(c => c.MaLenh == maLenh).ToListAsync();
        var daDungTrongLenh = existingRows.GroupBy(c => c.MaTonKho).ToDictionary(g => g.Key, g => g.Sum(c => c.SoLuong));
        // Cùng 1 dòng tồn kho được chọn nhiều lần với CÙNG vị trí đích — cộng dồn vào 1 dòng chi
        // tiết; khác đích thì vẫn phải tách dòng riêng (mỗi dòng chỉ mang đúng 1 vị trí đích).
        static string DichKey(string? nhaKho, string? dinhKhu, string? khoi, string? gia, string? tang, string? hom) =>
            string.Join("|", nhaKho ?? "", dinhKhu ?? "", khoi ?? "", gia ?? "", tang ?? "", hom ?? "");
        var dongTheoTonKhoDich = existingRows.ToDictionary(
            c => (c.MaTonKho, Dich: DichKey(c.TenNhaKhoMoi, c.TenDinhKhuMoi, c.TenKhoiMoi, c.TenGiaMoi, c.TenTangMoi, c.TenHomMoi)), c => c);

        int KhaDung(TonKhoTbdb t) => t.SoLuong - daDungTrongLenh.GetValueOrDefault(t.MaTonKho) - giuChoNgoaiLenh.GetValueOrDefault(t.MaTonKho);

        var ketQua = new List<object>();
        var thanhCong = 0;

        foreach (var row in dto.DanhSach)
        {
            if (!byMaTonKho.TryGetValue(row.MaTonKho, out var tonKho))
            {
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = $"Không tìm thấy dòng tồn kho của lô \"{row.MaLoTbdb}\" tại kho của lệnh" });
                continue;
            }
            if (row.SoLuong <= 0)
            {
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = "SL cần chuyển phải lớn hơn 0" });
                continue;
            }
            if (!CoDienViTriMoiFile(row.TenNhaKhoMoi, row.TenDinhKhuMoi, row.TenKhoiMoi, row.TenGiaMoi, row.TenTangMoi, row.TenHomMoi, row.MoTaViTriMoi))
            {
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = "Phải điền ít nhất 1 trường vị trí mới" });
                continue;
            }

            var khaDung = KhaDung(tonKho);
            if (row.SoLuong > khaDung)
            {
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = $"Lô \"{row.MaLoTbdb}\" chỉ còn {khaDung} khả dụng, không thể chuyển {row.SoLuong}" });
                continue;
            }

            var key = (tonKho.MaTonKho, Dich: DichKey(row.TenNhaKhoMoi, row.TenDinhKhuMoi, row.TenKhoiMoi, row.TenGiaMoi, row.TenTangMoi, row.TenHomMoi));
            var trung = dongTheoTonKhoDich.GetValueOrDefault(key);
            if (trung != null)
            {
                trung.SoLuong += row.SoLuong;
                if (!string.IsNullOrWhiteSpace(row.MoTaViTriMoi)) trung.MoTaViTriMoi = row.MoTaViTriMoi;
                if (!string.IsNullOrWhiteSpace(row.GhiChu)) trung.GhiChu = row.GhiChu;
            }
            else
            {
                trung = new ChiTietLenhThayDoiViTri
                {
                    MaLenh = maLenh,
                    MaTonKho = tonKho.MaTonKho,
                    MaLoTbdb = tonKho.MaLoTbdb,
                    SoLuong = row.SoLuong,
                    TenNhaKhoMoi = row.TenNhaKhoMoi,
                    TenDinhKhuMoi = row.TenDinhKhuMoi,
                    TenKhoiMoi = row.TenKhoiMoi,
                    TenGiaMoi = row.TenGiaMoi,
                    TenTangMoi = row.TenTangMoi,
                    TenHomMoi = row.TenHomMoi,
                    MoTaViTriMoi = row.MoTaViTriMoi,
                    GhiChu = row.GhiChu,
                };
                db.ChiTietLenhThayDoiViTris.Add(trung);
                dongTheoTonKhoDich[key] = trung;
            }

            try
            {
                await db.SaveChangesAsync();
                thanhCong++;
                daDungTrongLenh[tonKho.MaTonKho] = daDungTrongLenh.GetValueOrDefault(tonKho.MaTonKho) + row.SoLuong;
            }
            catch (DbUpdateException ex)
            {
                db.Entry(trung).State = EntityState.Detached;
                dongTheoTonKhoDich.Remove(key);
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = DbErrorTranslator.Translate(ex) });
            }
        }

        if (thanhCong > 0)
        {
            await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "ChiTietLenhThayDoiViTri", maLenh,
                $"Nhập file: thêm {thanhCong} dòng thay đổi vị trí cho lệnh \"{maLenh}\"");
        }

        return Ok(new { thanhCong, thatBai = ketQua.Count, chiTietLoi = ketQua });
    }

    // Mã lệnh dạng VT + năm hiện tại + số thứ tự 3 chữ số, ví dụ VT2026001.
    private async Task<string> TaoMaLenhAsync()
    {
        var tienTo = $"VT{DateTime.Now.Year}";
        var maHienCo = await db.LenhThayDoiViTris.Select(l => l.MaLenh).Where(m => m.StartsWith(tienTo)).ToListAsync();

        var soLonNhat = maHienCo
            .Select(m => Regex.Match(m, $@"^{tienTo}(\d{{3}})$"))
            .Where(m => m.Success)
            .Select(m => int.Parse(m.Groups[1].Value))
            .DefaultIfEmpty(0)
            .Max();

        var maLenh = $"{tienTo}{soLonNhat + 1:D3}";
        while (await db.LenhThayDoiViTris.AnyAsync(l => l.MaLenh == maLenh))
        {
            soLonNhat++;
            maLenh = $"{tienTo}{soLonNhat + 1:D3}";
        }
        return maLenh;
    }
}

using backend_dotnet.Models;
using backend_dotnet.Services;
using backend_dotnet.Services.Rbac;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace backend_dotnet.Controllers;

// Thay đổi hình thức niêm cất TBĐB — nguyên tắc GIỐNG HỆT Chuyển cấp chất lượng: MỖI LÔ CHỈ MANG
// ĐÚNG 1 HÌNH THỨC NIÊM CẤT (LoTbdb.MaHinhThucNiemCat, có thể NULL = chưa niêm cất), không đi qua
// Xuất/Nhập trung gian. Quy trình 2 bước:
//   1. Tạo lệnh: tạo LenhThayDoiHtnc rồi thêm các dòng ChiTietLenhThayDoiHtnc — mỗi dòng chọn đúng 1
//      dòng tồn kho cụ thể (lô + vị trí, MaTonKho) và số lượng muốn đổi (mặc định toàn bộ số lượng
//      đang có ở dòng đó, có thể chọn ít hơn để chỉ đổi 1 phần).
//   2. Kết thúc lệnh — lúc này mới thật sự áp dụng, TỰ ĐỘNG chọn 1 trong 2 cách tùy tình huống của
//      từng dòng:
//        - Nếu số lượng đổi = TOÀN BỘ tồn kho còn lại của lô đó (ở mọi vị trí, sau khi trừ mọi dòng
//          khác trong cùng lệnh cũng thuộc lô này) → cập nhật MaHinhThucNiemCat của lô NGAY TẠI CHỖ,
//          giữ nguyên mã lô.
//        - Nếu chỉ là MỘT PHẦN → tách: trừ đúng số lượng khỏi dòng tồn kho nguồn, tạo 1 lô MỚI (mã
//          lô tự sinh, copy năm SX/nước SX/tình trạng bao gói/cấp chất lượng/đơn giá từ lô gốc) ở
//          HTNC đích, cộng số lượng đó vào tồn kho lô mới tại đúng vị trí cũ — qua 1 "Lệnh" +
//          "CtdongBoTrongLenh" nội bộ ẩn (loại "TDHTNC"), giống hệt cách "CCL" đã làm cho chuyển cấp.
public record TaoLenhThayDoiHtncDto(string MaKho, DateOnly NgayLap, DateOnly? NgayKetThuc, string? CanCu, string? VeViec, string? GhiChu);
public record ThemChiTietThayDoiHtncDto(long MaTonKho, int SoLuong, string MaHtncMoi, string? GhiChu);

[ApiController]
[Authorize]
[Route("api/tb-dong-bo/thay-doi-htnc")]
[YeuCauQuyen(Cn.TbdbHtncXl)]
public class ThayDoiHinhThucNiemCatController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    private const string MaLoaiLenhThayDoiHtnc = "TDHTNC";
    private const string NhomTbNoiBo = "TBDB_NOIBO";
    // Trạng thái TB (TrangThaiTB) tạm gán cho dòng tồn kho trong lúc đang chờ xử lý lệnh thay đổi
    // HTNC (xem ThemChiTiet/SuaChiTiet/XoaChiTiet/XoaLenh/KetThuc) — trả về trạng thái gốc khi xong.
    // Dùng chung mã "TT03 - Đang làm lệnh" với Thay đổi vị trí (không có mã riêng cho HTNC).
    private const string MaTrangThaiDangLamLenh = "TT03";

    // GET api/tb-dong-bo/thay-doi-htnc?maKho=
    [HttpGet]
    [YeuCauQuyen(Cn.TbdbHtncLap, Cn.TbdbHtncXl)]
    public async Task<IActionResult> GetAll([FromQuery] string? maKho)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        var query = db.LenhThayDoiHtncs.Include(l => l.MaKhoNavigation).AsQueryable();
        if (!string.IsNullOrWhiteSpace(maKho)) query = query.Where(l => l.MaKho == maKho);

        var lenhs = await query.OrderByDescending(l => l.NgayLap).ThenByDescending(l => l.MaLenh).ToListAsync();
        var maLenhs = lenhs.Select(l => l.MaLenh).ToList();
        var tongHop = await db.ChiTietLenhThayDoiHtncs
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

    // GET api/tb-dong-bo/thay-doi-htnc/{maLenh}
    [HttpGet("{maLenh}")]
    [YeuCauQuyen(Cn.TbdbHtncLap, Cn.TbdbHtncXl)]
    public async Task<IActionResult> GetOne(string maLenh)
    {
        var lenh = await db.LenhThayDoiHtncs.Include(l => l.MaKhoNavigation).FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });

        var chiTiet = await db.ChiTietLenhThayDoiHtncs
            .Include(c => c.MaLoTbdbNavigation).ThenInclude(l => l.MaTbdbNavigation)
            .Include(c => c.MaHtncCuNavigation)
            .Include(c => c.MaHtncMoiNavigation)
            .Include(c => c.MaTonKhoNavigation)
            .Where(c => c.MaLenh == maLenh)
            .OrderBy(c => c.MaCtlenhThayDoiHtnc)
            .Select(c => new
            {
                maCtLenhThayDoiHtnc = c.MaCtlenhThayDoiHtnc,
                maTonKho = c.MaTonKho,
                maLoTbdb = c.MaLoTbdb,
                maTbdb = c.MaLoTbdbNavigation.MaTbdb,
                tenTbdb = c.MaLoTbdbNavigation.MaTbdbNavigation.TenTbdb,
                viTri = new
                {
                    tenNhaKho = c.MaTonKhoNavigation.TenNhaKho,
                    tenDinhKhu = c.MaTonKhoNavigation.TenDinhKhu,
                    tenKhoi = c.MaTonKhoNavigation.TenKhoi,
                    tenGia = c.MaTonKhoNavigation.TenGia,
                    tenTang = c.MaTonKhoNavigation.TenTang,
                    tenHom = c.MaTonKhoNavigation.TenHom,
                    moTaViTri = c.MaTonKhoNavigation.MoTaViTri,
                },
                maHtncCu = c.MaHtncCu,
                htncCu = c.MaHtncCuNavigation != null ? c.MaHtncCuNavigation.TenHtnc : null,
                maHtncMoi = c.MaHtncMoi,
                htncMoi = c.MaHtncMoiNavigation.TenHtnc,
                soLuong = c.SoLuong,
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

    // GET api/tb-dong-bo/thay-doi-htnc/{maLenh}/lo-kha-dung
    // Danh sách dòng tồn kho (lô + vị trí cụ thể) tại đúng kho của lệnh: lô đã hoàn thành nhập, còn
    // KHẢ DỤNG > 0 — để chọn thêm vào lệnh. Trả theo TỪNG dòng vị trí (không gộp theo lô).
    [HttpGet("{maLenh}/lo-kha-dung")]
    [YeuCauQuyen(Cn.TbdbHtncLap, Cn.TbdbHtncXl)]
    public async Task<IActionResult> GetLoKhaDung(string maLenh)
    {
        var lenh = await db.LenhThayDoiHtncs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });

        var daDungTheoTonKho = await db.ChiTietLenhThayDoiHtncs.Where(c => c.MaLenh == maLenh)
            .GroupBy(c => c.MaTonKho).Select(g => new { MaTonKho = g.Key, SoLuong = g.Sum(c => c.SoLuong) })
            .ToDictionaryAsync(x => x.MaTonKho, x => x.SoLuong);

        var listRaw = await db.TonKhoTbdbs
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaTbdbNavigation)
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaHinhThucNiemCatNavigation)
            .Where(t => t.MaKho == lenh.MaKho && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH" && t.SoLuong > 0)
            .OrderBy(t => t.MaLoTbdbNavigation.MaTbdb).ThenBy(t => t.MaLoTbdb)
            .Select(t => new
            {
                maTonKho = t.MaTonKho,
                maLoTbdb = t.MaLoTbdb,
                maTbdb = t.MaLoTbdbNavigation.MaTbdb,
                tenTbdb = t.MaLoTbdbNavigation.MaTbdbNavigation.TenTbdb,
                maHtnc = t.MaLoTbdbNavigation.MaHinhThucNiemCat,
                hinhThucNiemCat = t.MaLoTbdbNavigation.MaHinhThucNiemCatNavigation != null ? t.MaLoTbdbNavigation.MaHinhThucNiemCatNavigation.TenHtnc : null,
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

        // Trừ thêm phần đang bị "giữ chỗ" bởi các lệnh thay đổi HTNC KHÁC còn đang mở, chuyển cấp,
        // hủy/thanh lý, xuất kho, hoặc thay đổi vị trí — tránh các nơi khác nhau cùng nhận là còn đủ
        // số lượng của cùng 1 dòng tồn kho.
        var maTonKhoIds = listRaw.Select(t => t.maTonKho).ToList();
        var giuChoLenhKhac = await ThayDoiHtncReservationHelper.LayGiuChoAsync(db, maTonKhoIds, boQuaMaLenh: maLenh);
        var giuChoChuyenCap = await ChuyenCapReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoHuy = await HuyThanhLyReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoXuatKho = await XuatKhoReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoThayDoiViTri = await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, maTonKhoIds);

        var list = listRaw
            .Select(t => new { t.maTonKho, t.maLoTbdb, t.maTbdb, t.tenTbdb, t.maHtnc, t.hinhThucNiemCat, t.namSx,
                soLuong = t.soLuong - daDungTheoTonKho.GetValueOrDefault(t.maTonKho) - giuChoLenhKhac.GetValueOrDefault(t.maTonKho)
                    - giuChoChuyenCap.GetValueOrDefault(t.maTonKho) - giuChoHuy.GetValueOrDefault(t.maTonKho) - giuChoXuatKho.GetValueOrDefault(t.maTonKho)
                    - giuChoThayDoiViTri.GetValueOrDefault(t.maTonKho),
                t.tenNhaKho, t.tenDinhKhu, t.tenKhoi, t.tenGia, t.tenTang, t.tenHom, t.moTaViTri })
            .Where(t => t.soLuong > 0)
            .ToList();

        return Ok(list);
    }

    // POST api/tb-dong-bo/thay-doi-htnc/tao-lenh
    [HttpPost("tao-lenh")]
    [YeuCauQuyen(Cn.TbdbHtncLap, QuyenHanhDong.Them)]
    public async Task<IActionResult> TaoLenh([FromBody] TaoLenhThayDoiHtncDto dto)
    {
        if (this.IsGioiHanKho()) dto = dto with { MaKho = this.CurrentMaKho()! };
        if (string.IsNullOrWhiteSpace(dto.MaKho)) return BadRequest(new { message = "Thiếu kho" });
        if (await db.Khos.FindAsync(dto.MaKho) == null) return BadRequest(new { message = "Kho không tồn tại" });

        var maLenh = await TaoMaLenhAsync();
        db.LenhThayDoiHtncs.Add(new LenhThayDoiHtnc
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

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "LenhThayDoiHtnc", maLenh,
            $"Tạo lệnh thay đổi hình thức niêm cất \"{maLenh}\" tại kho \"{dto.MaKho}\"");

        return Ok(new { message = "Tạo lệnh thành công", maLenh });
    }

    // PUT api/tb-dong-bo/thay-doi-htnc/{maLenh}
    [HttpPut("{maLenh}")]
    [YeuCauQuyen(Cn.TbdbHtncLap, QuyenHanhDong.Sua)]
    public async Task<IActionResult> SuaLenh(string maLenh, [FromBody] TaoLenhThayDoiHtncDto dto)
    {
        var lenh = await db.LenhThayDoiHtncs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
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

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "LenhThayDoiHtnc", maLenh,
            $"Cập nhật lệnh thay đổi hình thức niêm cất \"{maLenh}\"");

        return Ok(new { message = "Cập nhật thành công" });
    }

    // POST api/tb-dong-bo/thay-doi-htnc/{maLenh}/chi-tiet
    [HttpPost("{maLenh}/chi-tiet")]
    public async Task<IActionResult> ThemChiTiet(string maLenh, [FromBody] ThemChiTietThayDoiHtncDto dto)
    {
        var lenh = await db.LenhThayDoiHtncs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể thêm dòng mới" });

        if (dto.SoLuong <= 0) return BadRequest(new { message = "Số lượng cần đổi phải lớn hơn 0" });
        if (string.IsNullOrWhiteSpace(dto.MaHtncMoi)) return BadRequest(new { message = "Chưa chọn hình thức niêm cất mới" });

        var tonKho = await db.TonKhoTbdbs.Include(t => t.MaLoTbdbNavigation)
            .FirstOrDefaultAsync(t => t.MaTonKho == dto.MaTonKho && t.MaKho == lenh.MaKho);
        if (tonKho == null) return BadRequest(new { message = "Dòng tồn kho không tồn tại tại kho của lệnh" });
        if (tonKho.MaLoTbdbNavigation.TrangThaiLo != "HOAN_THANH") return BadRequest(new { message = "Lô chưa hoàn thành nhập kho, chưa thể thay đổi hình thức niêm cất" });

        // Cùng 1 dòng tồn kho có thể đã được đưa 1 phần vào lệnh này rồi — chỉ còn phần CHƯA dùng
        // mới được đổi tiếp. Đồng thời trừ phần đang bị giữ chỗ bởi lệnh thay đổi HTNC KHÁC, chuyển
        // cấp, hủy/thanh lý, xuất kho, hoặc thay đổi vị trí.
        var daDung = await db.ChiTietLenhThayDoiHtncs
            .Where(c => c.MaLenh == maLenh && c.MaTonKho == dto.MaTonKho).SumAsync(c => (int?)c.SoLuong) ?? 0;
        var giuChoLenhKhac = (await ThayDoiHtncReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho], boQuaMaLenh: maLenh)).GetValueOrDefault(dto.MaTonKho);
        var giuChoChuyenCap = (await ChuyenCapReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho])).GetValueOrDefault(dto.MaTonKho);
        var giuChoHuy = (await HuyThanhLyReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho])).GetValueOrDefault(dto.MaTonKho);
        var giuChoXuatKho = (await XuatKhoReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho])).GetValueOrDefault(dto.MaTonKho);
        var giuChoThayDoiViTri = (await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho])).GetValueOrDefault(dto.MaTonKho);
        var khaDung = tonKho.SoLuong - daDung - giuChoLenhKhac - giuChoChuyenCap - giuChoHuy - giuChoXuatKho - giuChoThayDoiViTri;
        if (dto.SoLuong > khaDung) return BadRequest(new { message = $"Dòng tồn kho này chỉ còn {khaDung} khả dụng, không thể đổi {dto.SoLuong}" });

        if (await db.HinhThucNiemCats.FindAsync(dto.MaHtncMoi) == null) return BadRequest(new { message = "Hình thức niêm cất mới không tồn tại" });
        if (dto.MaHtncMoi == tonKho.MaLoTbdbNavigation.MaHinhThucNiemCat) return BadRequest(new { message = "Hình thức niêm cất mới phải khác hình thức hiện tại của lô" });

        // Chỉ đổi trạng thái TB khi dòng này giữ chỗ TOÀN BỘ số lượng hiện có của dòng tồn kho (nghĩa
        // là dto.SoLuong == tonKho.SoLuong đã tự động kéo theo không còn ai khác đang giữ chỗ phần
        // nào của dòng này) — giữ 1 phần thì phần còn lại vẫn đang tự do, không nên gắn cho cả dòng.
        string? trangThaiGoc = null;
        if (dto.SoLuong == tonKho.SoLuong)
        {
            trangThaiGoc = tonKho.MaTrangThaiTb;
            tonKho.MaTrangThaiTb = MaTrangThaiDangLamLenh;
        }

        db.ChiTietLenhThayDoiHtncs.Add(new ChiTietLenhThayDoiHtnc
        {
            MaLenh = maLenh,
            MaTonKho = dto.MaTonKho,
            MaLoTbdb = tonKho.MaLoTbdb,
            MaHtncCu = tonKho.MaLoTbdbNavigation.MaHinhThucNiemCat,
            MaHtncMoi = dto.MaHtncMoi,
            SoLuong = dto.SoLuong,
            TrangThaiGoc = trangThaiGoc,
            GhiChu = dto.GhiChu,
        });

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        return Ok(new { message = "Thêm dòng thành công" });
    }

    // PUT api/tb-dong-bo/thay-doi-htnc/{maLenh}/chi-tiet/{id}
    // Sửa số lượng/HTNC mới/ghi chú của 1 dòng đã có trong lệnh (không đổi được dòng tồn kho nguồn —
    // muốn đổi lô/vị trí thì xóa dòng rồi thêm lại).
    [HttpPut("{maLenh}/chi-tiet/{id}")]
    public async Task<IActionResult> SuaChiTiet(string maLenh, int id, [FromBody] ThemChiTietThayDoiHtncDto dto)
    {
        var lenh = await db.LenhThayDoiHtncs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể sửa dòng" });

        var ct = await db.ChiTietLenhThayDoiHtncs.FirstOrDefaultAsync(c => c.MaLenh == maLenh && c.MaCtlenhThayDoiHtnc == id);
        if (ct == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

        if (dto.SoLuong <= 0) return BadRequest(new { message = "Số lượng cần đổi phải lớn hơn 0" });
        if (string.IsNullOrWhiteSpace(dto.MaHtncMoi)) return BadRequest(new { message = "Chưa chọn hình thức niêm cất mới" });

        var tonKho = await db.TonKhoTbdbs.Include(t => t.MaLoTbdbNavigation).FirstOrDefaultAsync(t => t.MaTonKho == ct.MaTonKho);
        if (tonKho == null) return BadRequest(new { message = "Dòng tồn kho không còn tồn tại" });

        var daDungODongKhac = await db.ChiTietLenhThayDoiHtncs
            .Where(c => c.MaLenh == maLenh && c.MaTonKho == ct.MaTonKho && c.MaCtlenhThayDoiHtnc != id)
            .SumAsync(c => (int?)c.SoLuong) ?? 0;
        var giuChoLenhKhac = (await ThayDoiHtncReservationHelper.LayGiuChoAsync(db, [ct.MaTonKho], boQuaMaLenh: maLenh)).GetValueOrDefault(ct.MaTonKho);
        var giuChoChuyenCap = (await ChuyenCapReservationHelper.LayGiuChoAsync(db, [ct.MaTonKho])).GetValueOrDefault(ct.MaTonKho);
        var giuChoHuy = (await HuyThanhLyReservationHelper.LayGiuChoAsync(db, [ct.MaTonKho])).GetValueOrDefault(ct.MaTonKho);
        var giuChoXuatKho = (await XuatKhoReservationHelper.LayGiuChoAsync(db, [ct.MaTonKho])).GetValueOrDefault(ct.MaTonKho);
        var giuChoThayDoiViTri = (await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, [ct.MaTonKho])).GetValueOrDefault(ct.MaTonKho);
        var khaDung = tonKho.SoLuong - daDungODongKhac - giuChoLenhKhac - giuChoChuyenCap - giuChoHuy - giuChoXuatKho - giuChoThayDoiViTri;
        if (dto.SoLuong > khaDung) return BadRequest(new { message = $"Dòng tồn kho này chỉ còn {khaDung} khả dụng, không thể đổi {dto.SoLuong}" });

        if (await db.HinhThucNiemCats.FindAsync(dto.MaHtncMoi) == null) return BadRequest(new { message = "Hình thức niêm cất mới không tồn tại" });
        if (dto.MaHtncMoi == tonKho.MaLoTbdbNavigation.MaHinhThucNiemCat) return BadRequest(new { message = "Hình thức niêm cất mới phải khác hình thức hiện tại của lô" });

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
        ct.MaHtncCu = tonKho.MaLoTbdbNavigation.MaHinhThucNiemCat;
        ct.MaHtncMoi = dto.MaHtncMoi;
        ct.GhiChu = dto.GhiChu;

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        return Ok(new { message = "Cập nhật dòng thành công" });
    }

    // DELETE api/tb-dong-bo/thay-doi-htnc/{maLenh}/chi-tiet/{id}
    [HttpDelete("{maLenh}/chi-tiet/{id}")]
    public async Task<IActionResult> XoaChiTiet(string maLenh, int id)
    {
        var lenh = await db.LenhThayDoiHtncs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể xóa dòng" });

        var ct = await db.ChiTietLenhThayDoiHtncs.FirstOrDefaultAsync(c => c.MaLenh == maLenh && c.MaCtlenhThayDoiHtnc == id);
        if (ct == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

        if (ct.TrangThaiGoc != null)
        {
            var tonKho = await db.TonKhoTbdbs.FindAsync(ct.MaTonKho);
            if (tonKho != null) tonKho.MaTrangThaiTb = ct.TrangThaiGoc;
        }

        db.ChiTietLenhThayDoiHtncs.Remove(ct);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        return Ok(new { message = "Xóa dòng thành công" });
    }

    // DELETE api/tb-dong-bo/thay-doi-htnc/{maLenh}
    [HttpDelete("{maLenh}")]
    [YeuCauQuyen(Cn.TbdbHtncLap, QuyenHanhDong.Xoa)]
    public async Task<IActionResult> XoaLenh(string maLenh)
    {
        var lenh = await db.LenhThayDoiHtncs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể xóa" });

        // Trả lại trạng thái TB gốc cho mọi dòng tồn kho đang bị lệnh này giữ chỗ toàn bộ, trước khi
        // xóa lệnh (cascade sẽ tự xóa các dòng chi tiết).
        var chiTietCanTra = await db.ChiTietLenhThayDoiHtncs
            .Where(c => c.MaLenh == maLenh && c.TrangThaiGoc != null).ToListAsync();
        if (chiTietCanTra.Count > 0)
        {
            var maTonKhoCanTra = chiTietCanTra.Select(c => c.MaTonKho).ToList();
            var tonKhoCanTra = await db.TonKhoTbdbs.Where(t => maTonKhoCanTra.Contains(t.MaTonKho)).ToDictionaryAsync(t => t.MaTonKho);
            foreach (var ct in chiTietCanTra)
                if (tonKhoCanTra.TryGetValue(ct.MaTonKho, out var tk)) tk.MaTrangThaiTb = ct.TrangThaiGoc!;
        }

        db.LenhThayDoiHtncs.Remove(lenh);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "LenhThayDoiHtnc", maLenh,
            $"Xóa lệnh thay đổi hình thức niêm cất \"{maLenh}\"");

        return Ok(new { message = "Xóa lệnh thành công" });
    }

    // POST api/tb-dong-bo/thay-doi-htnc/{maLenh}/ket-thuc
    // Áp dụng thật — xem chi tiết thuật toán ở đầu file. Khóa lệnh sau khi xong.
    [HttpPost("{maLenh}/ket-thuc")]
    [YeuCauQuyen(Cn.TbdbHtncXl, QuyenHanhDong.Sua)]
    public async Task<IActionResult> KetThuc(string maLenh)
    {
        var lenh = await db.LenhThayDoiHtncs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc trước đó" });

        var chiTiet = await db.ChiTietLenhThayDoiHtncs.Where(c => c.MaLenh == maLenh).ToListAsync();
        if (chiTiet.Count == 0) return BadRequest(new { message = "Lệnh chưa có dòng chi tiết nào" });

        // 1) Nạp trước toàn bộ dòng tồn kho liên quan (tracked) + trừ số lượng cần đổi của từng dòng
        //    chi tiết ngay trong bộ nhớ — chưa SaveChanges, chỉ để tính đúng "tổng còn lại của lô" ở
        //    bước 2 (EF Core identity map sẽ trả về đúng entity đã sửa khi query lại).
        var maTonKhoList = chiTiet.Select(c => c.MaTonKho).ToList();
        var tonKhoRows = await db.TonKhoTbdbs.Include(t => t.MaLoTbdbNavigation)
            .Where(t => maTonKhoList.Contains(t.MaTonKho)).ToListAsync();
        var tonKhoMap = tonKhoRows.ToDictionary(t => t.MaTonKho);

        foreach (var ct in chiTiet)
        {
            if (!tonKhoMap.TryGetValue(ct.MaTonKho, out var tonKho))
                return BadRequest(new { message = $"Dòng tồn kho #{ct.MaTonKho} không còn tồn tại" });
            if (ct.SoLuong > tonKho.SoLuong)
                return BadRequest(new { message = $"Dòng tồn kho của lô \"{ct.MaLoTbdb}\" chỉ còn {tonKho.SoLuong}, không đủ để đổi {ct.SoLuong}" });
            tonKho.SoLuong -= ct.SoLuong;
        }

        // 2) Với mỗi lô liên quan, nạp TOÀN BỘ dòng tồn kho của lô đó trên toàn hệ thống (không chỉ
        //    trong lệnh này) để biết chính xác lô còn tồn ở nơi khác hay không sau khi trừ ở bước 1.
        var maLoList = tonKhoRows.Select(t => t.MaLoTbdb).Distinct().ToList();
        var tatCaTonKhoCuaCacLo = await db.TonKhoTbdbs.Where(t => maLoList.Contains(t.MaLoTbdb)).ToListAsync();
        var tongConLaiTheoLo = tatCaTonKhoCuaCacLo.GroupBy(t => t.MaLoTbdb).ToDictionary(g => g.Key, g => g.Sum(t => t.SoLuong));
        var soDongTheoLo = chiTiet.GroupBy(c => c.MaLoTbdb).ToDictionary(g => g.Key, g => g.Count());

        var soDongTachLo = 0;
        var soDongGiuMaLo = 0;
        foreach (var ct in chiTiet)
        {
            var tonKho = tonKhoMap[ct.MaTonKho];
            // Trả lại trạng thái TB gốc TRƯỚC khi tách/đổi HTNC — TachLoChoThayDoiHtncAsync copy
            // nguyên trạng thái hiện tại của tonKho sang lô mới nên phải trả về gốc trước để lô mới
            // (nếu có) cũng nhận đúng trạng thái gốc thay vì "Đang làm lệnh".
            if (ct.TrangThaiGoc != null) tonKho.MaTrangThaiTb = ct.TrangThaiGoc;
            var lo = tonKho.MaLoTbdbNavigation;
            var laDongDuyNhatCuaLo = soDongTheoLo[ct.MaLoTbdb] == 1;
            var loHetSachTonKho = tongConLaiTheoLo[ct.MaLoTbdb] <= 0;

            if (laDongDuyNhatCuaLo && loHetSachTonKho)
            {
                // Đổi cả lô — cập nhật HTNC tại chỗ, giữ nguyên mã lô. Không có gì di chuyển vật lý
                // nên phải hoàn lại số lượng đã trừ tạm ở bước 1 (chỉ dùng để tính tongConLaiTheoLo),
                // nếu không dòng tồn kho này sẽ bị trừ về 0 một cách sai lệch.
                tonKho.SoLuong += ct.SoLuong;
                lo.MaHinhThucNiemCat = ct.MaHtncMoi;
                lo.CapNhatMoiNhat = DateTime.Now;
                soDongGiuMaLo++;
            }
            else
            {
                // Đổi một phần — tách thành lô mới ở HTNC đích (mã lô tự sinh), giữ nguyên phần còn
                // lại ở lô gốc.
                await TachLoChoThayDoiHtncAsync(maLenh, lo, tonKho, ct.MaHtncMoi, ct.SoLuong);
                soDongTachLo++;
            }
        }

        lenh.TrangThai = "HOAN_THANH";
        lenh.NguoiKetThuc = this.CurrentUsername();
        lenh.NgayKetThuc = DateOnly.FromDateTime(DateTime.Now);

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "LenhThayDoiHtnc", maLenh,
            $"Kết thúc lệnh thay đổi hình thức niêm cất \"{maLenh}\" — {soDongGiuMaLo} lô đổi tại chỗ, {soDongTachLo} lô tách một phần");

        return Ok(new { message = "Kết thúc thay đổi hình thức niêm cất thành công" });
    }

    // ===== Nhập file Excel cho Thay đổi hình thức niêm cất — 1 sheet duy nhất liệt kê SẴN toàn bộ
    // tồn kho tại kho của lệnh (mỗi dòng = đúng 1 dòng tồn kho cụ thể, nhận diện bằng cột ẩn "Mã tồn
    // kho"), người dùng chỉ cần điền "SL cần đổi" (> 0) VÀ "HTNC mới" vào dòng cần đổi — dòng nào để
    // trống hoặc SL = 0 thì bỏ qua. Giống hệt cơ chế đã làm cho Chuyển cấp chất lượng. =====

    private static readonly string[] MauNhapThayDoiHtncHeaders =
        ["Mã lô", "Mã TB", "Tên TB", "HTNC hiện tại", "Nhà kho", "Định khu", "Khối", "Giá", "Tầng", "Hòm",
            "Mô tả vị trí", "Tồn kho", "Khả dụng", "SL cần đổi", "Mã HTNC mới", "Ghi chú"];
    private const int MauHtSoLuong = 14, MauHtHtncMoi = 15, MauHtGhiChu = 16, MauHtMaTonKho = 17;

    // GET api/tb-dong-bo/thay-doi-htnc/{maLenh}/mau-nhap
    [HttpGet("{maLenh}/mau-nhap")]
    public async Task<IActionResult> TaiMauNhap(string maLenh)
    {
        var lenh = await db.LenhThayDoiHtncs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Nhap thay doi HTNC");
        for (var i = 0; i < MauNhapThayDoiHtncHeaders.Length; i++) ws.Cell(1, i + 1).Value = MauNhapThayDoiHtncHeaders[i];
        ws.Row(1).Style.Font.Bold = true;
        foreach (var col in new[] { MauHtSoLuong, MauHtHtncMoi, MauHtGhiChu })
        {
            ws.Cell(1, col).Style.Fill.BackgroundColor = XLColor.FromArgb(255, 235, 205);
            ws.Cell(1, col).Style.Font.FontColor = XLColor.FromArgb(140, 60, 0);
        }

        // Khả dụng = tồn kho trừ phần đã đưa vào CHÍNH lệnh này (dòng chi tiết khác) và phần đang bị
        // giữ chỗ NGOÀI lệnh (lệnh thay đổi HTNC khác, chuyển cấp, hủy/thanh lý, xuất kho, thay đổi
        // vị trí) — cùng công thức với "Thêm dòng" và bước xem trước/xác nhận nhập file.
        var (_, giuChoNgoaiLenh) = await LayTonKhoThayDoiHtncAsync(lenh.MaKho, maLenh);
        var daDungTrongLenh = await db.ChiTietLenhThayDoiHtncs.Where(c => c.MaLenh == maLenh)
            .GroupBy(c => c.MaTonKho).Select(g => new { MaTonKho = g.Key, SoLuong = g.Sum(c => c.SoLuong) })
            .ToDictionaryAsync(x => x.MaTonKho, x => x.SoLuong);

        var row = 2;
        var dsTonKho = await db.TonKhoTbdbs
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaTbdbNavigation)
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaHinhThucNiemCatNavigation)
            .Where(t => t.MaKho == lenh.MaKho && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH" && t.SoLuong > 0)
            .OrderBy(t => t.MaLoTbdbNavigation.MaTbdb).ThenBy(t => t.MaLoTbdb)
            .ToListAsync();

        foreach (var t in dsTonKho)
        {
            ws.Cell(row, 1).Value = t.MaLoTbdb;
            ws.Cell(row, 2).Value = t.MaLoTbdbNavigation.MaTbdb;
            ws.Cell(row, 3).Value = t.MaLoTbdbNavigation.MaTbdbNavigation.TenTbdb;
            ws.Cell(row, 4).Value = t.MaLoTbdbNavigation.MaHinhThucNiemCatNavigation?.TenHtnc;
            ws.Cell(row, 5).Value = t.TenNhaKho;
            ws.Cell(row, 6).Value = t.TenDinhKhu;
            ws.Cell(row, 7).Value = t.TenKhoi;
            ws.Cell(row, 8).Value = t.TenGia;
            ws.Cell(row, 9).Value = t.TenTang;
            ws.Cell(row, 10).Value = t.TenHom;
            ws.Cell(row, 11).Value = t.MoTaViTri;
            ws.Cell(row, 12).Value = t.SoLuong;
            ws.Cell(row, 13).Value = t.SoLuong - daDungTrongLenh.GetValueOrDefault(t.MaTonKho) - giuChoNgoaiLenh.GetValueOrDefault(t.MaTonKho);
            ws.Cell(row, MauHtMaTonKho).Value = t.MaTonKho;
            row++;
        }

        ws.Cell(row + 1, 1).Value =
            "Chỉ điền \"SL cần đổi\" (> 0) VÀ \"Mã HTNC mới\" (khác HTNC hiện tại) vào các dòng cần đổi — để trống các dòng còn lại. Không sửa các cột khác.";
        ws.Cell(row + 1, 1).Style.Font.Italic = true;

        ws.Column(MauHtMaTonKho).Hide();
        ws.Columns().AdjustToContents();
        ws.SheetView.FreezeRows(1);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"mau-thay-doi-htnc-{maLenh}.xlsx");
    }

    public record ThayDoiHtncFileRowDto(int Dong, long MaTonKho, string MaLoTbdb, int SoLuong, string MaHtncMoi, string? GhiChu);
    public record XacNhanNhapThayDoiHtncDto(List<ThayDoiHtncFileRowDto> DanhSach);

    // Nạp toàn bộ tồn kho tại kho của lệnh (lô đã HOAN_THANH, còn tồn) tra theo MaTonKho, + tổng
    // đang bị giữ chỗ NGOÀI lệnh này (lệnh thay đổi HTNC khác, chuyển cấp, hủy/thanh lý, xuất kho,
    // thay đổi vị trí) — dùng chung cho xem trước & xác nhận nhập file để 2 bước tính nhất quán với
    // nhau và với ThemChiTiet/SuaChiTiet.
    private async Task<(Dictionary<long, TonKhoTbdb> ByMaTonKho, Dictionary<long, int> GiuChoNgoaiLenh)> LayTonKhoThayDoiHtncAsync(string maKho, string maLenh)
    {
        var tonKhoList = await db.TonKhoTbdbs
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaTbdbNavigation)
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaHinhThucNiemCatNavigation)
            .Where(t => t.MaKho == maKho && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH" && t.SoLuong > 0)
            .ToListAsync();
        var byMaTonKho = tonKhoList.ToDictionary(t => t.MaTonKho, t => t);

        var ids = tonKhoList.Select(t => t.MaTonKho).ToList();
        var giuChoHtncKhac = await ThayDoiHtncReservationHelper.LayGiuChoAsync(db, ids, boQuaMaLenh: maLenh);
        var giuChoChuyenCap = await ChuyenCapReservationHelper.LayGiuChoAsync(db, ids);
        var giuChoHuy = await HuyThanhLyReservationHelper.LayGiuChoAsync(db, ids);
        var giuChoXuatKho = await XuatKhoReservationHelper.LayGiuChoAsync(db, ids);
        var giuChoThayDoiViTri = await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, ids);
        var giuChoNgoaiLenh = ids.ToDictionary(id => id, id =>
            giuChoHtncKhac.GetValueOrDefault(id) + giuChoChuyenCap.GetValueOrDefault(id) + giuChoHuy.GetValueOrDefault(id)
                + giuChoXuatKho.GetValueOrDefault(id) + giuChoThayDoiViTri.GetValueOrDefault(id));

        return (byMaTonKho, giuChoNgoaiLenh);
    }

    // POST api/tb-dong-bo/thay-doi-htnc/{maLenh}/nhap-file/xem-truoc
    [HttpPost("{maLenh}/nhap-file/xem-truoc")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> XemTruocNhapTuFile(string maLenh, IFormFile file)
    {
        var lenh = await db.LenhThayDoiHtncs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể thêm dòng mới" });
        if (file == null || file.Length == 0) return BadRequest(new { message = "Chưa chọn file" });

        var (byMaTonKho, giuChoNgoaiLenh) = await LayTonKhoThayDoiHtncAsync(lenh.MaKho, maLenh);
        var daDungTrongLenh = await db.ChiTietLenhThayDoiHtncs.Where(c => c.MaLenh == maLenh)
            .GroupBy(c => c.MaTonKho).Select(g => new { MaTonKho = g.Key, SoLuong = g.Sum(c => c.SoLuong) })
            .ToDictionaryAsync(x => x.MaTonKho, x => x.SoLuong);
        var htncMap = await db.HinhThucNiemCats.ToDictionaryAsync(h => h.MaHtnc, h => h.TenHtnc);

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
            var soLuongStr = ws.Cell(r, MauHtSoLuong).GetString().Trim();
            if (string.IsNullOrWhiteSpace(maLo) || string.IsNullOrWhiteSpace(soLuongStr)) continue; // dòng trống hoặc chưa điền SL — bỏ qua

            int? soLuong = int.TryParse(soLuongStr, out var sl) ? sl : null;
            if (soLuong is null or <= 0) continue; // chỉ hiển thị dòng có SL cần đổi > 0

            var htncMoiStr = ws.Cell(r, MauHtHtncMoi).GetString().Trim();
            var ghiChuRaw = ws.Cell(r, MauHtGhiChu).GetString().Trim();
            var maTonKhoStr = ws.Cell(r, MauHtMaTonKho).GetString().Trim();

            var loiHang = new List<string>();
            TonKhoTbdb? tonKho = null;
            if (!long.TryParse(maTonKhoStr, out var maTonKho) || !byMaTonKho.TryGetValue(maTonKho, out tonKho))
                loiHang.Add($"Không tìm thấy dòng tồn kho của lô \"{maLo}\" — có thể lô đã hết hàng hoặc đổi vị trí, hãy tải lại mẫu mới nhất");

            var maHtncMoi = string.IsNullOrWhiteSpace(htncMoiStr) ? null : htncMoiStr;
            if (maHtncMoi == null || !htncMap.ContainsKey(maHtncMoi))
                loiHang.Add("Mã HTNC mới không hợp lệ");
            else if (tonKho != null && maHtncMoi == tonKho.MaLoTbdbNavigation.MaHinhThucNiemCat)
                loiHang.Add("HTNC mới phải khác HTNC hiện tại của lô");

            if (tonKho != null)
            {
                var khaDung = KhaDung(tonKho);
                if (soLuong.Value > khaDung)
                    loiHang.Add($"Lô \"{maLo}\" chỉ còn {khaDung} khả dụng, không thể đổi {soLuong}");
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
                maHtncHienTai = tonKho?.MaLoTbdbNavigation.MaHinhThucNiemCat,
                htncHienTai = tonKho?.MaLoTbdbNavigation.MaHinhThucNiemCat != null ? htncMap.GetValueOrDefault(tonKho.MaLoTbdbNavigation.MaHinhThucNiemCat) : null,
                viTri = tonKho == null ? null : new
                {
                    tenNhaKho = tonKho.TenNhaKho, tenDinhKhu = tonKho.TenDinhKhu, tenKhoi = tonKho.TenKhoi,
                    tenGia = tonKho.TenGia, tenTang = tonKho.TenTang, tenHom = tonKho.TenHom, moTaViTri = tonKho.MoTaViTri,
                },
                soLuong,
                maHtncMoi,
                tenHtncMoi = maHtncMoi != null ? htncMap.GetValueOrDefault(maHtncMoi) : null,
                ghiChu = string.IsNullOrWhiteSpace(ghiChuRaw) ? null : ghiChuRaw,
                hopLe = loiHang.Count == 0,
                loi = loiHang,
            });
        }

        return Ok(new { tongSoDong = danhSach.Count, danhSach });
    }

    // POST api/tb-dong-bo/thay-doi-htnc/{maLenh}/nhap-file/xac-nhan
    // Kiểm tra lại từ đầu (không tin kết quả xem trước) — dòng nào lỗi thì báo lỗi và bỏ qua, không
    // ảnh hưởng các dòng khác.
    [HttpPost("{maLenh}/nhap-file/xac-nhan")]
    public async Task<IActionResult> XacNhanNhapTuFile(string maLenh, [FromBody] XacNhanNhapThayDoiHtncDto dto)
    {
        var lenh = await db.LenhThayDoiHtncs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (this.IsGioiHanKho() && lenh.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy lệnh thay đổi hình thức niêm cất" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc, không thể thêm dòng mới" });
        if (dto.DanhSach == null || dto.DanhSach.Count == 0) return BadRequest(new { message = "Chưa có dòng nào để lưu" });

        var (byMaTonKho, giuChoNgoaiLenh) = await LayTonKhoThayDoiHtncAsync(lenh.MaKho, maLenh);
        var htncMap = await db.HinhThucNiemCats.ToDictionaryAsync(h => h.MaHtnc, h => h.TenHtnc);

        var existingRows = await db.ChiTietLenhThayDoiHtncs.Where(c => c.MaLenh == maLenh).ToListAsync();
        var daDungTrongLenh = existingRows.GroupBy(c => c.MaTonKho).ToDictionary(g => g.Key, g => g.Sum(c => c.SoLuong));
        // Cùng 1 dòng tồn kho được chọn nhiều lần với CÙNG HTNC đích — cộng dồn vào 1 dòng chi tiết;
        // khác HTNC đích thì vẫn phải tách dòng riêng (mỗi dòng chỉ mang đúng 1 HTNC đích).
        var dongTheoTonKhoHtnc = existingRows.ToDictionary(c => (c.MaTonKho, c.MaHtncMoi), c => c);

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
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = "SL cần đổi phải lớn hơn 0" });
                continue;
            }
            if (string.IsNullOrWhiteSpace(row.MaHtncMoi) || !htncMap.ContainsKey(row.MaHtncMoi))
            {
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = "Mã HTNC mới không hợp lệ" });
                continue;
            }
            if (row.MaHtncMoi == tonKho.MaLoTbdbNavigation.MaHinhThucNiemCat)
            {
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = "HTNC mới phải khác HTNC hiện tại của lô" });
                continue;
            }

            var khaDung = KhaDung(tonKho);
            if (row.SoLuong > khaDung)
            {
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = $"Lô \"{row.MaLoTbdb}\" chỉ còn {khaDung} khả dụng, không thể đổi {row.SoLuong}" });
                continue;
            }

            var key = (tonKho.MaTonKho, row.MaHtncMoi);
            var trung = dongTheoTonKhoHtnc.GetValueOrDefault(key);
            if (trung != null)
            {
                trung.SoLuong += row.SoLuong;
                if (!string.IsNullOrWhiteSpace(row.GhiChu)) trung.GhiChu = row.GhiChu;
            }
            else
            {
                trung = new ChiTietLenhThayDoiHtnc
                {
                    MaLenh = maLenh,
                    MaTonKho = tonKho.MaTonKho,
                    MaLoTbdb = tonKho.MaLoTbdb,
                    MaHtncCu = tonKho.MaLoTbdbNavigation.MaHinhThucNiemCat,
                    MaHtncMoi = row.MaHtncMoi,
                    SoLuong = row.SoLuong,
                    GhiChu = row.GhiChu,
                };
                db.ChiTietLenhThayDoiHtncs.Add(trung);
                dongTheoTonKhoHtnc[key] = trung;
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
                dongTheoTonKhoHtnc.Remove(key);
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = DbErrorTranslator.Translate(ex) });
            }
        }

        if (thanhCong > 0)
        {
            await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "ChiTietLenhThayDoiHtnc", maLenh,
                $"Nhập file: thêm {thanhCong} dòng thay đổi hình thức niêm cất cho lệnh \"{maLenh}\"");
        }

        return Ok(new { thanhCong, thatBai = ketQua.Count, chiTietLoi = ketQua });
    }

    // Tách 1 phần số lượng của lô gốc thành 1 lô mới ở HTNC đích — tạo qua 1 "Lệnh" + 1 dòng
    // "CtdongBoTrongLenh" nội bộ (loại "TDHTNC", ẩn khỏi Tạo lệnh/Cập nhật lệnh nhập-xuất bình
    // thường) vì LoTbdb.MaCtdongBoLenh là khóa ngoại bắt buộc — không thể tạo lô "trôi nổi" ngoài
    // khung Nhập. Copy nguyên vẹn năm SX/nước SX/tình trạng bao gói/cấp chất lượng/đơn giá từ lô
    // gốc; vị trí lấy đúng theo dòng tồn kho nguồn.
    private async Task TachLoChoThayDoiHtncAsync(string maLenhThayDoiHtnc, LoTbdb loGoc, TonKhoTbdb tonKhoNguon, string htncMoi, int soLuong)
    {
        await DamBaoLoaiLenhThayDoiHtncAsync();

        var maLenhNoiBo = $"TDHTNC-{maLenhThayDoiHtnc}";
        // Tìm trong bộ nhớ (Local) trước — vì nếu lệnh này đã có dòng khác cũng cần tách lô ngay
        // trong cùng lượt Kết thúc, lệnh nội bộ đó mới chỉ được Add() chứ chưa SaveChanges nên
        // FirstOrDefaultAsync (truy vấn DB) sẽ không thấy, dẫn đến tạo trùng và bị EF từ chối.
        var lenhNoiBo = db.Lenhs.Local.FirstOrDefault(l => l.MaLenh == maLenhNoiBo)
            ?? await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenhNoiBo);
        if (lenhNoiBo == null)
        {
            lenhNoiBo = new Lenh
            {
                MaLenh = maLenhNoiBo,
                MaLoaiLenh = MaLoaiLenhThayDoiHtnc,
                Ngay = DateOnly.FromDateTime(DateTime.Now),
                TrangThai = "HOAN_THANH",
                VeViec = $"Tách lô do thay đổi hình thức niêm cất — lệnh \"{maLenhThayDoiHtnc}\"",
                MaKhoNhap = tonKhoNguon.MaKho,
                NguoiTao = this.CurrentUsername(),
            };
            db.Lenhs.Add(lenhNoiBo);
        }

        var ctdbtl = new CtdongBoTrongLenh
        {
            MaLenhNavigation = lenhNoiBo,
            MaTbdb = loGoc.MaTbdb,
            MaCcl = loGoc.MaCcl,
            SoLuongTheoLenh = soLuong,
            SoLuongThuc = soLuong,
            GhiChu = $"Tách từ lô \"{loGoc.MaLoTbdb}\" do thay đổi hình thức niêm cất (lệnh \"{maLenhThayDoiHtnc}\")",
        };
        db.CtdongBoTrongLenhs.Add(ctdbtl);

        var maLoMoi = await TaoMaLoThayDoiHtncAsync(loGoc.MaLoTbdb);
        var loMoi = new LoTbdb
        {
            MaLoTbdb = maLoMoi,
            MaTbdb = loGoc.MaTbdb,
            MaCtdongBoLenhNavigation = ctdbtl,
            MaCcl = loGoc.MaCcl,
            NamSx = loGoc.NamSx,
            MaNuocSx = loGoc.MaNuocSx,
            MaTinhTrangBaoGoi = loGoc.MaTinhTrangBaoGoi,
            MaHinhThucNiemCat = htncMoi,
            DonGia = loGoc.DonGia,
            SoLuongNhap = soLuong,
            TrangThaiLo = "HOAN_THANH",
            GhiChu = $"Tách từ lô \"{loGoc.MaLoTbdb}\" do thay đổi hình thức niêm cất",
        };
        db.LoTbdbs.Add(loMoi);

        db.TonKhoTbdbs.Add(new TonKhoTbdb
        {
            MaLoTbdbNavigation = loMoi,
            MaKho = tonKhoNguon.MaKho,
            TenNhaKho = tonKhoNguon.TenNhaKho,
            TenDinhKhu = tonKhoNguon.TenDinhKhu,
            TenKhoi = tonKhoNguon.TenKhoi,
            TenGia = tonKhoNguon.TenGia,
            TenTang = tonKhoNguon.TenTang,
            TenHom = tonKhoNguon.TenHom,
            MoTaViTri = tonKhoNguon.MoTaViTri,
            MaTrangThaiTb = tonKhoNguon.MaTrangThaiTb,
            SoLuong = soLuong,
        });
    }

    private async Task DamBaoLoaiLenhThayDoiHtncAsync()
    {
        if (await db.TinhChatNhapXuats.FindAsync(MaLoaiLenhThayDoiHtnc) == null)
        {
            db.TinhChatNhapXuats.Add(new TinhChatNhapXuat
            {
                MaNx = MaLoaiLenhThayDoiHtnc,
                TenNx = "Thay đổi hình thức niêm cất (nội bộ)",
                NhomTb = NhomTbNoiBo,
                GhiChu = "Loại lệnh hệ thống dùng để tách lô khi thay đổi hình thức niêm cất một phần — không hiển thị ở màn hình Tạo lệnh/Cập nhật lệnh nhập-xuất bình thường.",
            });
            await db.SaveChangesAsync();
        }
    }

    // Mã lô mới khi tách = mã lô gốc + hậu tố "HTn" (n tăng dần nếu trùng), ví dụ "L1HT1". Phải
    // kiểm tra cả trong bộ nhớ (Local) chứ không chỉ DB — nếu 1 lệnh Kết thúc có NHIỀU dòng cùng
    // tách từ 1 lô, các lô mới trước đó trong cùng lượt gọi mới chỉ Add() chứ chưa SaveChanges nên
    // AnyAsync (truy vấn DB) sẽ không thấy, dẫn đến sinh trùng mã và EF Core ném lỗi tracking khi
    // Add() lô thứ 2.
    private async Task<string> TaoMaLoThayDoiHtncAsync(string maLoGoc)
    {
        var stt = 1;
        var maLoMoi = $"{maLoGoc}HT{stt}";
        while (db.LoTbdbs.Local.Any(l => l.MaLoTbdb == maLoMoi) || await db.LoTbdbs.AnyAsync(l => l.MaLoTbdb == maLoMoi))
        {
            stt++;
            maLoMoi = $"{maLoGoc}HT{stt}";
        }
        return maLoMoi;
    }

    // Mã lệnh dạng HT + năm hiện tại + số thứ tự 3 chữ số, ví dụ HT2026001.
    private async Task<string> TaoMaLenhAsync()
    {
        var tienTo = $"HT{DateTime.Now.Year}";
        var maHienCo = await db.LenhThayDoiHtncs.Select(l => l.MaLenh).Where(m => m.StartsWith(tienTo)).ToListAsync();

        var soLonNhat = maHienCo
            .Select(m => Regex.Match(m, $@"^{tienTo}(\d{{3}})$"))
            .Where(m => m.Success)
            .Select(m => int.Parse(m.Groups[1].Value))
            .DefaultIfEmpty(0)
            .Max();

        var maLenh = $"{tienTo}{soLonNhat + 1:D3}";
        while (await db.LenhThayDoiHtncs.AnyAsync(l => l.MaLenh == maLenh))
        {
            soLonNhat++;
            maLenh = $"{tienTo}{soLonNhat + 1:D3}";
        }
        return maLenh;
    }
}

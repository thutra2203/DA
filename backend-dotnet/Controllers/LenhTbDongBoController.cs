using backend_dotnet.Models;
using backend_dotnet.Services;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

// Lệnh nhập/xuất cho Trang bị đồng bộ — chỉ dùng bảng Lenh (lọc theo TinhChatNhapXuat.NhomTb
// = "TBDB") và CTDongBoTrongLenh (dòng chi tiết: 1 TBDB x 1 Cấp chất lượng x số lượng/đơn giá
// theo lệnh). Không đụng tới ChiTietLenh/SPKT. Sau khi lệnh Nhập được ghi, kho xử lý từng dòng
// CTDBTL thành Lô hàng thực tế (LoTbdb, xem TbDongBoController) — nằm ngoài phạm vi controller này.
public record LenhTbDongBoDto(
    string MaLenh, string MaLoaiLenh, string? MaLenhChiTiet, DateOnly Ngay, DateOnly? NgayHieuLuc,
    DateOnly? GiaTriDenNgay, string? TrangThai, string? CanCu, string? VeViec, string? MaHttt,
    string? MaKhoNhap, string? MaKhoXuat, string? MaNcc, string? PtVanChuyen, string? DonViChuyen, string? GhiChu);

// MaTonKho: chỉ dùng cho lệnh Xuất hủy/thanh lý — chọn thẳng 1 dòng tồn kho (lô + vị trí) cụ thể,
// ghi nhận ngay nhưng chưa trừ tồn kho (trừ khi Kết thúc, xem KetThucHuyThanhLy). Khi null (Nhập/
// Xuất bình thường) giữ nguyên hành vi cũ: chỉ ghi kế hoạch theo TBĐB + cấp, chưa gắn dòng tồn kho.
public record CtdbtlDto(string MaTbdb, int MaCcl, int SoLuongTheoLenh, decimal? DonGiaTheoLenh, string? GhiChu, long? MaTonKho = null);

// Xử lý "thực nhập" cho 1 dòng chi tiết lệnh Nhập — mỗi dòng chỉ tạo đúng 1 Lô hàng (LoTbdb)
// mang số lượng/đơn giá thực nhập. Việc phân bổ lô đó vào (các) vị trí cụ thể trong kho —
// mỗi vị trí 1 dòng Tồn kho (TonKhoTbdb), 1 lô có thể có nhiều tồn kho — làm ở bước sau,
// dùng CRUD sẵn có của TonKhoTbdb (xem TbDongBoController).
public record TaoLoDto(string MaLoTbdb, int? NamSx, string? MaNuocSx, string? MaTinhTrangBaoGoi, string? MaHinhThucNiemCat, decimal DonGia, int SoLuongThucNhap, string? GhiChu);

[ApiController]
[Authorize]
[Microsoft.AspNetCore.Mvc.Route("api/tb-dong-bo/lenh")]
public class LenhTbDongBoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    private const string TableLabel = "Lệnh nhập/xuất trang bị đồng bộ";

    // Người dùng bị giới hạn theo kho chỉ được thao tác trên lệnh có kho nhập HOẶC kho xuất
    // đúng bằng kho của mình (một lệnh chuyển kho có thể liên quan tới 2 kho khác nhau).
    private bool ThuocKhoNguoiDung(string? maKhoNhap, string? maKhoXuat)
        => !this.IsGioiHanKho() || maKhoNhap == this.CurrentMaKho() || maKhoXuat == this.CurrentMaKho();

    // GET api/tb-dong-bo/lenh?maLoaiLenh=NX03&maKho=K01
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? maLoaiLenh, [FromQuery] string? maKho)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        var query = db.Lenhs
            .Include(l => l.MaLoaiLenhNavigation)
            .Include(l => l.MaLenhChiTietNavigation)
            .Include(l => l.MaHtttNavigation)
            .Include(l => l.MaKhoNhapNavigation)
            .Include(l => l.MaKhoXuatNavigation)
            .Include(l => l.MaNccNavigation)
            .Where(l => l.MaLoaiLenhNavigation.NhomTb == "TBDB");

        if (!string.IsNullOrEmpty(maLoaiLenh))
            query = query.Where(l => l.MaLoaiLenh == maLoaiLenh);

        if (!string.IsNullOrEmpty(maKho))
        {
            // Lệnh Nhập: kho đang thao tác luôn là bên NHẬN (MaKhoNhap) — không tính kho đối tác
            // bên MaKhoXuat (dù kho đó cũng là kho nội bộ trong trường hợp chuyển kho).
            // Lệnh Xuất: ngược lại, kho đang thao tác là bên GIAO (MaKhoXuat).
            string? tenLoaiLenh = null;
            if (!string.IsNullOrEmpty(maLoaiLenh))
                tenLoaiLenh = (await db.TinhChatNhapXuats.FindAsync(maLoaiLenh))?.TenNx;

            if (tenLoaiLenh != null)
            {
                var laXuat = tenLoaiLenh.Contains("Xuất", StringComparison.OrdinalIgnoreCase);
                query = laXuat ? query.Where(l => l.MaKhoXuat == maKho) : query.Where(l => l.MaKhoNhap == maKho);
            }
            else
            {
                query = query.Where(l => l.MaKhoNhap == maKho || l.MaKhoXuat == maKho);
            }
        }

        var list = await query.OrderByDescending(l => l.Ngay).ThenByDescending(l => l.MaLenh).ToListAsync();
        var soDongTheoLenh = await db.CtdongBoTrongLenhs
            .Where(c => list.Select(l => l.MaLenh).Contains(c.MaLenh))
            .GroupBy(c => c.MaLenh)
            .Select(g => new { MaLenh = g.Key, SoDong = g.Count() })
            .ToDictionaryAsync(g => g.MaLenh, g => g.SoDong);

        return Ok(list.Select(l => Shape(l, soDongTheoLenh.TryGetValue(l.MaLenh, out var sd) ? sd : 0)));
    }

    // GET api/tb-dong-bo/lenh/{maLenh}
    [HttpGet("{maLenh}")]
    public async Task<IActionResult> GetOne(string maLenh)
    {
        var l = await db.Lenhs
            .Include(x => x.MaLoaiLenhNavigation)
            .Include(x => x.MaLenhChiTietNavigation)
            .Include(x => x.MaHtttNavigation)
            .Include(x => x.MaKhoNhapNavigation)
            .Include(x => x.MaKhoXuatNavigation)
            .Include(x => x.MaNccNavigation)
            .FirstOrDefaultAsync(x => x.MaLenh == maLenh);
        if (l == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(l.MaKhoNhap, l.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });

        var soDong = await db.CtdongBoTrongLenhs.CountAsync(c => c.MaLenh == maLenh);
        return Ok(Shape(l, soDong));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] LenhTbDongBoDto dto)
    {
        var loaiLenh = await db.TinhChatNhapXuats.FindAsync(dto.MaLoaiLenh);
        if (loaiLenh == null || loaiLenh.NhomTb != "TBDB")
            return BadRequest(new { message = "Loại lệnh không hợp lệ hoặc không thuộc nhóm trang bị đồng bộ" });

        var loiKhoDoiTac = await ValidateKhoDoiTac(loaiLenh.TenNx, dto.MaKhoNhap, dto.MaKhoXuat, dto.MaNcc);
        if (loiKhoDoiTac != null) return BadRequest(new { message = loiKhoDoiTac });
        if (!ThuocKhoNguoiDung(dto.MaKhoNhap, dto.MaKhoXuat))
            return BadRequest(new { message = "Bạn chỉ có thể tạo lệnh liên quan tới kho của mình" });

        var entity = new Lenh
        {
            MaLenh = dto.MaLenh,
            MaLoaiLenh = dto.MaLoaiLenh,
            MaLenhChiTiet = dto.MaLenhChiTiet,
            Ngay = dto.Ngay,
            NgayHieuLuc = dto.NgayHieuLuc,
            GiaTriDenNgay = dto.GiaTriDenNgay,
            // Lệnh mới tạo luôn ở trạng thái đang thực hiện — chỉ chuyển sang HOAN_THANH qua
            // hành động "Kết thúc lệnh" (xem HoanThanh), không cho đặt trạng thái tùy ý lúc tạo.
            TrangThai = "DANG_XU_LY",
            CanCu = dto.CanCu,
            VeViec = dto.VeViec,
            MaHttt = dto.MaHttt,
            MaKhoNhap = dto.MaKhoNhap,
            MaKhoXuat = dto.MaKhoXuat,
            MaNcc = dto.MaNcc,
            PtVanChuyen = dto.PtVanChuyen,
            DonViChuyen = dto.DonViChuyen,
            NguoiTao = this.CurrentUsername(),
            GhiChu = dto.GhiChu,
        };
        db.Lenhs.Add(entity);

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "Lenh", dto.MaLenh, $"Thêm mới \"{dto.MaLenh}\" vào {TableLabel}");
        return StatusCode(201, new { message = "Thêm mới thành công" });
    }

    [HttpPut("{maLenh}")]
    public async Task<IActionResult> Update(string maLenh, [FromBody] LenhTbDongBoDto dto)
    {
        var entity = await db.Lenhs.Include(x => x.MaLoaiLenhNavigation).FirstOrDefaultAsync(x => x.MaLenh == maLenh);
        if (entity == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(entity.MaKhoNhap, entity.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });

        var loiKhoDoiTac = await ValidateKhoDoiTac(entity.MaLoaiLenhNavigation.TenNx, dto.MaKhoNhap, dto.MaKhoXuat, dto.MaNcc);
        if (loiKhoDoiTac != null) return BadRequest(new { message = loiKhoDoiTac });
        if (!ThuocKhoNguoiDung(dto.MaKhoNhap, dto.MaKhoXuat))
            return BadRequest(new { message = "Bạn chỉ có thể sửa lệnh liên quan tới kho của mình" });

        entity.MaLenhChiTiet = dto.MaLenhChiTiet;
        entity.Ngay = dto.Ngay;
        entity.NgayHieuLuc = dto.NgayHieuLuc;
        entity.GiaTriDenNgay = dto.GiaTriDenNgay;
        entity.TrangThai = dto.TrangThai;
        entity.CanCu = dto.CanCu;
        entity.VeViec = dto.VeViec;
        entity.MaHttt = dto.MaHttt;
        entity.MaKhoNhap = dto.MaKhoNhap;
        entity.MaKhoXuat = dto.MaKhoXuat;
        entity.MaNcc = dto.MaNcc;
        entity.PtVanChuyen = dto.PtVanChuyen;
        entity.DonViChuyen = dto.DonViChuyen;
        entity.GhiChu = dto.GhiChu;
        // Không cho đổi MaLoaiLenh sau khi tạo (đổi Nhập <-> Xuất giữa chừng dễ gây sai lệch dữ liệu chi tiết).

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "Lenh", maLenh, $"Cập nhật \"{maLenh}\" trong {TableLabel}");
        return Ok(new { message = "Cập nhật thành công" });
    }

    [HttpDelete("{maLenh}")]
    public async Task<IActionResult> Remove(string maLenh)
    {
        var entity = await db.Lenhs.FindAsync(maLenh);
        if (entity == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(entity.MaKhoNhap, entity.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });

        db.Lenhs.Remove(entity);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "Lenh", maLenh, $"Xóa bản ghi \"{maLenh}\" trong {TableLabel}");
        return Ok(new { message = "Xóa thành công" });
    }

    // POST api/tb-dong-bo/lenh/{maLenh}/hoan-thanh
    // Kết thúc lệnh:
    //   - Lệnh Nhập: chỉ cho phép khi TẤT CẢ dòng chi tiết đã tạo lô và mỗi lô đã được phân bổ
    //     đủ vào tồn kho (không thiếu, không thừa). Các Lô liên quan chuyển trangThaiLo sang
    //     HOAN_THANH — đây là lúc dữ liệu chính thức trở thành thực lực (xem
    //     TbDongBoController.GetByKho/GetChiTiet chỉ tính lô đã HOAN_THANH).
    //   - Lệnh Xuất: chỉ cho phép khi TẤT CẢ dòng chi tiết đã CHỌN đủ dòng tồn kho để xuất
    //     (soLuongThuc == soLuongTheoLenh) — nhưng Tồn kho CHƯA bị trừ (XuatKho chỉ ghi nhận
    //     "giữ chỗ" qua CTXuatKho), nên bước này mới là lúc thực sự trừ, kiểm tra lại còn đủ
    //     tại đúng thời điểm này (phòng trường hợp bị nơi khác lấy mất trong lúc chờ xử lý).
    [HttpPost("{maLenh}/hoan-thanh")]
    public async Task<IActionResult> HoanThanh(string maLenh)
    {
        var lenh = await db.Lenhs.Include(l => l.MaLoaiLenhNavigation).FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (lenh.TrangThai == "HOAN_THANH")
            return BadRequest(new { message = "Lệnh đã được kết thúc trước đó" });

        var laXuat = (lenh.MaLoaiLenhNavigation.TenNx ?? "").Contains("Xuất", StringComparison.OrdinalIgnoreCase);

        if (laXuat)
        {
            var chiTietXuat = await db.CtdongBoTrongLenhs.Where(c => c.MaLenh == maLenh).ToListAsync();
            if (chiTietXuat.Count == 0)
                return BadRequest(new { message = "Lệnh chưa có dòng chi tiết nào" });

            var chuaXuatDu = chiTietXuat.Where(c => (c.SoLuongThuc ?? 0) != c.SoLuongTheoLenh).ToList();
            if (chuaXuatDu.Count > 0)
            {
                var chiTietLoi = chuaXuatDu.Select(c => $"{c.MaTbdb} ({c.SoLuongThuc ?? 0}/{c.SoLuongTheoLenh})");
                return BadRequest(new { message = $"Còn dòng chưa xuất đủ: {string.Join(", ", chiTietLoi)}" });
            }

            // Áp dụng thật — trừ Tồn kho cho từng dòng đã "giữ chỗ" qua CTXuatKho (XuatKho ở trên
            // chỉ ghi nhận, chưa trừ). Dòng tạo trước khi có cơ chế này (nếu còn) sẽ không có
            // CTXuatKho nào — bỏ qua, vì tồn kho của chúng đã được trừ ngay từ trước theo cơ chế cũ.
            var maCtIds = chiTietXuat.Select(c => c.MaCtdongBoLenh).ToList();
            var xuatKhoRows = await db.CtXuatKhos.Where(x => maCtIds.Contains(x.MaCtdongBoLenh)).ToListAsync();
            var maTonKhoIds = xuatKhoRows.Select(x => x.MaTonKho).Distinct().ToList();
            var tonKhoRows = await db.TonKhoTbdbs.Where(t => maTonKhoIds.Contains(t.MaTonKho)).ToListAsync();
            var tonKhoMap = tonKhoRows.ToDictionary(t => t.MaTonKho);

            foreach (var x in xuatKhoRows)
            {
                if (!tonKhoMap.TryGetValue(x.MaTonKho, out var tonKho))
                    return BadRequest(new { message = $"Dòng tồn kho #{x.MaTonKho} không còn tồn tại" });
                if (x.SoLuong > tonKho.SoLuong)
                    return BadRequest(new { message = $"Dòng tồn kho #{x.MaTonKho} chỉ còn {tonKho.SoLuong}, không đủ để xuất {x.SoLuong}" });
                tonKho.SoLuong -= x.SoLuong;
            }

            lenh.TrangThai = "HOAN_THANH";
            try { await db.SaveChangesAsync(); }
            catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

            await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "Lenh", maLenh,
                $"Kết thúc lệnh xuất \"{maLenh}\" — {chiTietXuat.Count} dòng đã xuất đủ, đã trừ tồn kho");
            return Ok(new { message = "Kết thúc lệnh thành công" });
        }

        var chiTiet = await db.CtdongBoTrongLenhs
            .Include(c => c.LoTbdb).ThenInclude(l => l!.TonKhoTbdbs)
            .Where(c => c.MaLenh == maLenh)
            .ToListAsync();

        if (chiTiet.Count == 0)
            return BadRequest(new { message = "Lệnh chưa có dòng chi tiết nào" });

        var chuaTaoLo = chiTiet.Where(c => c.LoTbdb == null).ToList();
        if (chuaTaoLo.Count > 0)
            return BadRequest(new { message = $"Còn {chuaTaoLo.Count} dòng chưa tạo lô: {string.Join(", ", chuaTaoLo.Select(c => c.MaTbdb))}" });

        var phanBoChuaDu = chiTiet
            .Where(c => c.LoTbdb!.TonKhoTbdbs.Sum(t => t.SoLuong) != c.LoTbdb!.SoLuongNhap)
            .ToList();
        if (phanBoChuaDu.Count > 0)
        {
            var chiTietLoi = phanBoChuaDu.Select(c => $"{c.LoTbdb!.MaLoTbdb} ({c.LoTbdb!.TonKhoTbdbs.Sum(t => t.SoLuong)}/{c.LoTbdb!.SoLuongNhap})");
            return BadRequest(new { message = $"Còn lô chưa phân bổ đủ vào vị trí: {string.Join(", ", chiTietLoi)}" });
        }

        lenh.TrangThai = "HOAN_THANH";
        foreach (var c in chiTiet) c.LoTbdb!.TrangThaiLo = "HOAN_THANH";

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "Lenh", maLenh,
            $"Kết thúc lệnh \"{maLenh}\" — {chiTiet.Count} lô chính thức trở thành thực lực");
        return Ok(new { message = "Kết thúc lệnh thành công — dữ liệu đã chính thức trở thành thực lực" });
    }

    // POST api/tb-dong-bo/lenh/{maLenh}/huy-thanh-ly/ket-thuc
    // Kết thúc RIÊNG cho lệnh Xuất hủy/thanh lý — khác Xuất bình thường (HoanThanh ở trên) vì tồn
    // kho CHƯA bị trừ lúc thêm dòng, nên bước này mới là lúc thực sự trừ. Trừ thẳng từng dòng chi
    // tiết đã "giữ chỗ" (MaTonKho), kiểm tra lại tồn kho tại đúng thời điểm này (phòng trường hợp
    // bị nơi khác lấy mất trong lúc chờ xử lý) — toàn bộ nằm trong 1 transaction, không có tình
    // trạng làm dở nửa chừng.
    [HttpPost("{maLenh}/huy-thanh-ly/ket-thuc")]
    public async Task<IActionResult> KetThucHuyThanhLy(string maLenh)
    {
        var lenh = await db.Lenhs.Include(l => l.MaLoaiLenhNavigation).FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (lenh.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Lệnh đã kết thúc trước đó" });
        if (string.IsNullOrWhiteSpace(lenh.MaKhoNhap)) return BadRequest(new { message = "Lệnh chưa có kho nhập (kho hủy/thanh lý)" });

        var chiTiet = await db.CtdongBoTrongLenhs.Where(c => c.MaLenh == maLenh).ToListAsync();
        if (chiTiet.Count == 0) return BadRequest(new { message = "Lệnh chưa có dòng chi tiết nào" });
        var thieuTonKho = chiTiet.Where(c => c.MaTonKho == null).ToList();
        if (thieuTonKho.Count > 0)
            return BadRequest(new { message = $"Còn {thieuTonKho.Count} dòng chưa gắn dòng tồn kho cụ thể" });

        var maTonKhoList = chiTiet.Select(c => c.MaTonKho!.Value).ToList();
        var tonKhoRows = await db.TonKhoTbdbs.Where(t => maTonKhoList.Contains(t.MaTonKho)).ToListAsync();
        var tonKhoMap = tonKhoRows.ToDictionary(t => t.MaTonKho);

        // Trang bị hủy/thanh lý KHÔNG biến mất khỏi hệ thống — trừ khỏi kho nguồn nhưng đồng thời
        // CỘNG vào kho hủy/thanh lý (lenh.MaKhoNhap) để vẫn giữ dấu vết, gộp theo lô — không chia
        // theo vị trí cụ thể (kho hủy không tổ chức theo nhà kho/khối/hòm), trạng thái "HUY - Đã
        // thanh lý/hủy". Không dùng chung Includes/OnDelete phức tạp — chỉ 1 dòng tồn kho / lô tại kho này.
        const string MaTrangThaiDaHuy = "HUY";
        var maLoList = maTonKhoList.Select(id => tonKhoMap[id].MaLoTbdb).Distinct().ToList();
        var tonKhoDichRows = await db.TonKhoTbdbs
            .Where(t => t.MaKho == lenh.MaKhoNhap && maLoList.Contains(t.MaLoTbdb) && t.MaTrangThaiTb == MaTrangThaiDaHuy
                && t.TenNhaKho == null && t.TenDinhKhu == null && t.TenKhoi == null && t.TenGia == null && t.TenTang == null && t.TenHom == null)
            .ToListAsync();
        var tonKhoDichTheoLo = tonKhoDichRows.ToDictionary(t => t.MaLoTbdb, t => t);

        foreach (var ct in chiTiet)
        {
            if (!tonKhoMap.TryGetValue(ct.MaTonKho!.Value, out var tonKho))
                return BadRequest(new { message = $"Dòng tồn kho #{ct.MaTonKho} không còn tồn tại" });
            if (ct.SoLuongTheoLenh > tonKho.SoLuong)
                return BadRequest(new { message = $"Dòng tồn kho của \"{ct.MaTbdb}\" chỉ còn {tonKho.SoLuong}, không đủ để hủy {ct.SoLuongTheoLenh}" });
            tonKho.SoLuong -= ct.SoLuongTheoLenh;
            ct.SoLuongThuc = ct.SoLuongTheoLenh;

            if (tonKhoDichTheoLo.TryGetValue(tonKho.MaLoTbdb, out var tonKhoDich))
            {
                tonKhoDich.SoLuong += ct.SoLuongTheoLenh;
            }
            else
            {
                tonKhoDich = new TonKhoTbdb
                {
                    MaLoTbdb = tonKho.MaLoTbdb,
                    MaKho = lenh.MaKhoNhap,
                    MaTrangThaiTb = MaTrangThaiDaHuy,
                    SoLuong = ct.SoLuongTheoLenh,
                };
                db.TonKhoTbdbs.Add(tonKhoDich);
                tonKhoDichTheoLo[tonKho.MaLoTbdb] = tonKhoDich;
            }
        }

        lenh.TrangThai = "HOAN_THANH";

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "Lenh", maLenh,
            $"Kết thúc lệnh hủy/thanh lý \"{maLenh}\" — {chiTiet.Count} dòng đã trừ khỏi kho nguồn và chuyển sang kho \"{lenh.MaKhoNhap}\"");
        return Ok(new { message = "Kết thúc lệnh thành công" });
    }

    // ===== Chi tiết đồng bộ trong lệnh =====

    // GET api/tb-dong-bo/lenh/{maLenh}/chi-tiet
    [HttpGet("{maLenh}/chi-tiet")]
    public async Task<IActionResult> GetChiTiet(string maLenh)
    {
        if (this.IsGioiHanKho())
        {
            var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
            if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
            if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        }

        var list = await db.CtdongBoTrongLenhs
            .Include(c => c.MaTbdbNavigation).ThenInclude(t => t.MaDvtNavigation)
            .Include(c => c.MaCclNavigation)
            .Include(c => c.LoTbdb).ThenInclude(l => l!.MaNuocSxNavigation)
            .Include(c => c.LoTbdb).ThenInclude(l => l!.MaTinhTrangBaoGoiNavigation)
            .Include(c => c.LoTbdb).ThenInclude(l => l!.MaHinhThucNiemCatNavigation)
            .Include(c => c.LoTbdb).ThenInclude(l => l!.TonKhoTbdbs).ThenInclude(t => t.MaKhoNavigation)
            .Include(c => c.LoTbdb).ThenInclude(l => l!.TonKhoTbdbs).ThenInclude(t => t.MaTrangThaiTbNavigation)
            .Include(c => c.MaTonKhoNavigation).ThenInclude(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaNuocSxNavigation)
            .Where(c => c.MaLenh == maLenh)
            .OrderBy(c => c.MaTbdb).ThenBy(c => c.MaCcl)
            .ToListAsync();

        var result = list.Select(c => new
        {
            maCtdongBoLenh = c.MaCtdongBoLenh,
            maLenh = c.MaLenh,
            maTbdb = c.MaTbdb,
            tenTbdb = c.MaTbdbNavigation.TenTbdb,
            maDvt = c.MaTbdbNavigation.MaDvt,
            tenDvt = c.MaTbdbNavigation.MaDvtNavigation?.TenDvt,
            maCcl = c.MaCcl,
            tenCcl = c.MaCclNavigation != null ? c.MaCclNavigation.TenCap : null,
            soLuongTheoLenh = c.SoLuongTheoLenh,
            donGiaTheoLenh = c.DonGiaTheoLenh,
            ghiChu = c.GhiChu,
            soLuongThuc = c.SoLuongThuc ?? 0,
            daTaoLo = c.LoTbdb != null,
            maLoTbdb = c.LoTbdb != null ? c.LoTbdb.MaLoTbdb : (c.MaTonKhoNavigation != null ? c.MaTonKhoNavigation.MaLoTbdb : null),
            // Chỉ có ở dòng hủy/thanh lý (MaTonKho) — vị trí của đúng dòng tồn kho đã "giữ chỗ".
            viTri = c.MaTonKhoNavigation == null ? null : new
            {
                tenNhaKho = c.MaTonKhoNavigation.TenNhaKho,
                tenDinhKhu = c.MaTonKhoNavigation.TenDinhKhu,
                tenKhoi = c.MaTonKhoNavigation.TenKhoi,
                tenGia = c.MaTonKhoNavigation.TenGia,
                tenTang = c.MaTonKhoNavigation.TenTang,
                tenHom = c.MaTonKhoNavigation.TenHom,
                moTaViTri = c.MaTonKhoNavigation.MoTaViTri,
            },
            soLuongThucNhap = c.LoTbdb != null ? c.LoTbdb.SoLuongNhap : (int?)null,
            donGiaThucNhap = c.LoTbdb != null ? c.LoTbdb.DonGia : (decimal?)null,
            namSxThucNhap = c.LoTbdb != null ? c.LoTbdb.NamSx : (c.MaTonKhoNavigation != null ? c.MaTonKhoNavigation.MaLoTbdbNavigation.NamSx : null),
            maNuocSxThucNhap = c.LoTbdb != null ? c.LoTbdb.MaNuocSx : (c.MaTonKhoNavigation != null ? c.MaTonKhoNavigation.MaLoTbdbNavigation.MaNuocSx : null),
            tenNuocSxThucNhap = c.LoTbdb != null ? c.LoTbdb.MaNuocSxNavigation?.TenNsx : (c.MaTonKhoNavigation != null ? c.MaTonKhoNavigation.MaLoTbdbNavigation.MaNuocSxNavigation?.TenNsx : null),
            maTinhTrangBaoGoiThucNhap = c.LoTbdb != null ? c.LoTbdb.MaTinhTrangBaoGoi : null,
            tenTinhTrangBaoGoiThucNhap = c.LoTbdb != null ? c.LoTbdb.MaTinhTrangBaoGoiNavigation?.TenTtbg : null,
            maHinhThucNiemCatThucNhap = c.LoTbdb != null ? c.LoTbdb.MaHinhThucNiemCat : null,
            tenHinhThucNiemCatThucNhap = c.LoTbdb != null ? c.LoTbdb.MaHinhThucNiemCatNavigation?.TenHtnc : null,
            soLuongDaPhanBo = c.LoTbdb != null ? c.LoTbdb.TonKhoTbdbs.Sum(t => t.SoLuong) : 0,
            tonKhoList = c.LoTbdb == null ? null : c.LoTbdb.TonKhoTbdbs.Select(t => new
            {
                maTonKho = t.MaTonKho,
                maKho = t.MaKho,
                tenKho = t.MaKhoNavigation != null ? t.MaKhoNavigation.TenKho : null,
                tenNhaKho = t.TenNhaKho,
                tenDinhKhu = t.TenDinhKhu,
                tenKhoi = t.TenKhoi,
                tenGia = t.TenGia,
                tenTang = t.TenTang,
                tenHom = t.TenHom,
                moTaViTri = t.MoTaViTri,
                maTrangThaiTb = t.MaTrangThaiTb,
                tenTrangThaiTb = t.MaTrangThaiTbNavigation != null ? t.MaTrangThaiTbNavigation.TenTttb : null,
                soLuong = t.SoLuong,
                ghiChu = t.GhiChu,
            }),
        });

        return Ok(result);
    }

    // GET api/tb-dong-bo/lenh/{maLenh}/chi-tiet/{maCtdongBoLenh}/ton-kho-kha-dung
    // Danh sách các dòng Tồn kho (đúng TBDB + Cấp chất lượng của dòng chi tiết này) đang có
    // tại kho xuất của lệnh — chỉ tính lô đã HOAN_THANH (thực lực) — để kho chọn xuất từ đâu.
    [HttpGet("{maLenh}/chi-tiet/{maCtdongBoLenh:long}/ton-kho-kha-dung")]
    public async Task<IActionResult> GetTonKhoKhaDung(string maLenh, long maCtdongBoLenh)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (string.IsNullOrWhiteSpace(lenh.MaKhoXuat))
            return BadRequest(new { message = "Lệnh chưa có Kho xuất" });

        var ctdbtl = await db.CtdongBoTrongLenhs.FirstOrDefaultAsync(c => c.MaCtdongBoLenh == maCtdongBoLenh && c.MaLenh == maLenh);
        if (ctdbtl == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

        var listRaw = await db.TonKhoTbdbs
            .Include(t => t.MaTrangThaiTbNavigation)
            .Include(t => t.MaLoTbdbNavigation)
            .Where(t => t.MaKho == lenh.MaKhoXuat
                && t.MaLoTbdbNavigation.MaTbdb == ctdbtl.MaTbdb
                && t.MaLoTbdbNavigation.MaCcl == ctdbtl.MaCcl
                && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH"
                && t.SoLuong > 0)
            .OrderBy(t => t.MaLoTbdb)
            .Select(t => new
            {
                maTonKho = t.MaTonKho,
                maLoTbdb = t.MaLoTbdb,
                tenNhaKho = t.TenNhaKho,
                tenDinhKhu = t.TenDinhKhu,
                tenKhoi = t.TenKhoi,
                tenGia = t.TenGia,
                tenTang = t.TenTang,
                tenHom = t.TenHom,
                moTaViTri = t.MoTaViTri,
                maTrangThaiTb = t.MaTrangThaiTb,
                tenTrangThaiTb = t.MaTrangThaiTbNavigation != null ? t.MaTrangThaiTbNavigation.TenTttb : null,
                soLuong = t.SoLuong,
            })
            .ToListAsync();

        // Trừ phần đang bị "giữ chỗ" bởi 1 lệnh chuyển cấp chất lượng, 1 lệnh Xuất hủy/thanh lý,
        // HOẶC chính 1 dòng "Xuất kho" khác (cả 3 đều chưa kết thúc) — cả 3 chỉ thực trừ Tồn kho
        // khi Kết thúc nên trong lúc chờ xử lý, số này vẫn hiện đủ nếu không trừ.
        var maTonKhoIds = listRaw.Select(t => t.maTonKho).ToList();
        var giuChoChuyenCap = await ChuyenCapReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoHuy = await HuyThanhLyReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoXuatKho = await XuatKhoReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoThayDoiViTri = await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var list = listRaw
            .Select(t => new { t.maTonKho, t.maLoTbdb, t.tenNhaKho, t.tenDinhKhu, t.tenKhoi, t.tenGia, t.tenTang, t.tenHom,
                t.moTaViTri, t.maTrangThaiTb, t.tenTrangThaiTb,
                soLuong = t.soLuong - giuChoChuyenCap.GetValueOrDefault(t.maTonKho) - giuChoHuy.GetValueOrDefault(t.maTonKho)
                    - giuChoXuatKho.GetValueOrDefault(t.maTonKho) - giuChoThayDoiViTri.GetValueOrDefault(t.maTonKho) })
            .Where(t => t.soLuong > 0)
            .ToList();

        return Ok(list);
    }

    // GET api/tb-dong-bo/lenh/{maLenh}/ton-kho-lo-kha-dung
    // Danh sách TỪNG dòng tồn kho (lô + vị trí cụ thể) tại kho xuất của lệnh — không cần biết
    // trước TBĐB/cấp chất lượng (khác GetTonKhoKhaDung, vốn cần 1 dòng chi tiết có sẵn để tra đúng
    // TBĐB+cấp của dòng đó). Dùng cho màn "Cập nhật lệnh xuất hủy/thanh lý": chọn thẳng 1 dòng tồn
    // kho cụ thể + số lượng cần hủy, giống hệt cách chọn ở "Chuyển cấp chất lượng".
    [HttpGet("{maLenh}/ton-kho-lo-kha-dung")]
    public async Task<IActionResult> GetTonKhoLoKhaDung(string maLenh)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (string.IsNullOrWhiteSpace(lenh.MaKhoXuat))
            return BadRequest(new { message = "Lệnh chưa có Kho xuất" });

        var listRaw = await db.TonKhoTbdbs
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaTbdbNavigation)
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaCclNavigation)
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaNuocSxNavigation)
            .Where(t => t.MaKho == lenh.MaKhoXuat && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH" && t.SoLuong > 0)
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
                tenNuocSx = t.MaLoTbdbNavigation.MaNuocSxNavigation != null ? t.MaLoTbdbNavigation.MaNuocSxNavigation.TenNsx : null,
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

        // Trừ phần đang bị 1 lệnh chuyển cấp chất lượng, 1 lệnh Xuất hủy/thanh lý khác, HOẶC 1
        // dòng "Xuất kho" khác (chưa kết thúc) giữ chỗ — cùng lý do như GetTonKhoKhaDung ở trên.
        // Không loại trừ lệnh hiện tại ra khỏi phần giữ chỗ hủy — số hiển thị luôn là phần THỰC SỰ
        // còn trống, kể cả những dòng lệnh này đã tự chọn trước đó (Thêm trang bị nhiều lần cho
        // cùng 1 dòng tồn kho).
        var maTonKhoIds = listRaw.Select(t => t.maTonKho).ToList();
        var giuChoChuyenCap = await ChuyenCapReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoHuy = await HuyThanhLyReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoXuatKho = await XuatKhoReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoThayDoiViTri = await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var list = listRaw
            .Select(t => new { t.maTonKho, t.maLoTbdb, t.maTbdb, t.tenTbdb, t.maCcl, t.capChatLuong, t.namSx, t.tenNuocSx,
                soLuong = t.soLuong - giuChoChuyenCap.GetValueOrDefault(t.maTonKho) - giuChoHuy.GetValueOrDefault(t.maTonKho)
                    - giuChoXuatKho.GetValueOrDefault(t.maTonKho) - giuChoThayDoiViTri.GetValueOrDefault(t.maTonKho),
                t.tenNhaKho, t.tenDinhKhu, t.tenKhoi, t.tenGia, t.tenTang, t.tenHom, t.moTaViTri })
            .Where(t => t.soLuong > 0)
            .ToList();

        return Ok(list);
    }

    public record XuatKhoDongDto(long MaTonKho, int SoLuong);
    public record XuatKhoDto(List<XuatKhoDongDto> Dong);

    // POST api/tb-dong-bo/lenh/{maLenh}/chi-tiet/{maCtdongBoLenh}/xuat-kho
    // Chọn 1 hoặc nhiều dòng tồn kho (lô + vị trí) cụ thể để "hứa" xuất cho dòng chi tiết này —
    // ghi nhận ngay (CTXuatKho, cộng dồn vào soLuongThuc để biết đã CHỌN được bao nhiêu so với
    // soLuongTheoLenh) nhưng KHÔNG trừ Tồn kho ở đây — chỉ thực trừ khi lệnh Kết thúc (xem
    // HoanThanh), để tránh trừ tồn kho khi lệnh còn dở dang chưa chắc hoàn thành.
    [HttpPost("{maLenh}/chi-tiet/{maCtdongBoLenh:long}/xuat-kho")]
    public async Task<IActionResult> XuatKho(string maLenh, long maCtdongBoLenh, [FromBody] XuatKhoDto dto)
    {
        var lenh = await db.Lenhs.Include(l => l.MaLoaiLenhNavigation).FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!(lenh.MaLoaiLenhNavigation.TenNx ?? "").Contains("Xuất", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Chỉ xử lý thực xuất cho lệnh Xuất" });
        if (lenh.TrangThai == "HOAN_THANH")
            return BadRequest(new { message = "Lệnh đã kết thúc, không thể xuất thêm" });

        var ctdbtl = await db.CtdongBoTrongLenhs.FirstOrDefaultAsync(c => c.MaCtdongBoLenh == maCtdongBoLenh && c.MaLenh == maLenh);
        if (ctdbtl == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

        if (dto.Dong == null || dto.Dong.Count == 0)
            return BadRequest(new { message = "Chưa chọn dòng tồn kho để xuất" });

        var conCanXuat = ctdbtl.SoLuongTheoLenh - (ctdbtl.SoLuongThuc ?? 0);
        var tongXuatLanNay = dto.Dong.Sum(d => d.SoLuong);
        if (tongXuatLanNay <= 0) return BadRequest(new { message = "Số lượng xuất phải lớn hơn 0" });
        if (tongXuatLanNay > conCanXuat)
            return BadRequest(new { message = $"Chỉ còn cần xuất {conCanXuat}, không thể xuất {tongXuatLanNay}" });

        var maTonKhoIds = dto.Dong.Select(d => d.MaTonKho).ToList();
        var giuChoChuyenCap = await ChuyenCapReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoHuy = await HuyThanhLyReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoXuatKho = await XuatKhoReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoThayDoiViTri = await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        foreach (var d in dto.Dong)
        {
            var tonKho = await db.TonKhoTbdbs.FirstOrDefaultAsync(t => t.MaTonKho == d.MaTonKho && t.MaKho == lenh.MaKhoXuat);
            if (tonKho == null) return BadRequest(new { message = $"Không tìm thấy dòng tồn kho #{d.MaTonKho} tại kho xuất" });
            if (d.SoLuong <= 0) return BadRequest(new { message = "Số lượng xuất từng dòng phải lớn hơn 0" });

            var khaDung = tonKho.SoLuong - giuChoChuyenCap.GetValueOrDefault(d.MaTonKho)
                - giuChoHuy.GetValueOrDefault(d.MaTonKho) - giuChoXuatKho.GetValueOrDefault(d.MaTonKho) - giuChoThayDoiViTri.GetValueOrDefault(d.MaTonKho);
            if (d.SoLuong > khaDung)
                return BadRequest(new { message = $"Dòng tồn kho #{d.MaTonKho} chỉ còn {khaDung} khả dụng (có phần đang giữ chỗ cho lệnh khác), không thể xuất {d.SoLuong}" });

            db.CtXuatKhos.Add(new CtXuatKho { MaCtdongBoLenh = maCtdongBoLenh, MaTonKho = d.MaTonKho, SoLuong = d.SoLuong });
        }

        ctdbtl.SoLuongThuc = (ctdbtl.SoLuongThuc ?? 0) + tongXuatLanNay;

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "TonKhoTbdb", ctdbtl.MaTbdb,
            $"Chọn xuất kho {tongXuatLanNay} \"{ctdbtl.MaTbdb}\" từ lệnh \"{maLenh}\" (chưa trừ tồn kho — trừ khi Kết thúc lệnh)");
        return Ok(new { message = "Đã ghi nhận — tồn kho sẽ được trừ khi Kết thúc lệnh", soLuongThuc = ctdbtl.SoLuongThuc });
    }

    // POST api/tb-dong-bo/lenh/{maLenh}/chi-tiet/{maCtdongBoLenh}/tao-lo
    // Tạo Lô hàng thực nhập cho 1 dòng chi tiết của lệnh Nhập (số lượng/đơn giá thực nhập).
    // Chỉ thực hiện được 1 lần cho mỗi dòng (LoTbdb.MaCtdongBoLenh là unique). Việc phân bổ
    // lô vào từng vị trí cụ thể (Tồn kho) làm riêng, sau khi đã có lô — 1 lô có thể nằm ở
    // nhiều vị trí khác nhau.
    [HttpPost("{maLenh}/chi-tiet/{maCtdongBoLenh:long}/tao-lo")]
    public async Task<IActionResult> TaoLo(string maLenh, long maCtdongBoLenh, [FromBody] TaoLoDto dto)
    {
        var lenh = await db.Lenhs.Include(l => l.MaLoaiLenhNavigation).FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if ((lenh.MaLoaiLenhNavigation.TenNx ?? "").Contains("Xuất", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Chỉ xử lý thực nhập cho lệnh Nhập" });
        if (string.IsNullOrWhiteSpace(lenh.MaKhoNhap))
            return BadRequest(new { message = "Lệnh chưa có Kho nhập" });

        var ctdbtl = await db.CtdongBoTrongLenhs
            .Include(c => c.LoTbdb)
            .FirstOrDefaultAsync(c => c.MaCtdongBoLenh == maCtdongBoLenh && c.MaLenh == maLenh);
        if (ctdbtl == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });
        if (ctdbtl.LoTbdb != null) return BadRequest(new { message = "Dòng này đã được tạo lô rồi" });
        if (ctdbtl.MaCcl == null) return BadRequest(new { message = "Dòng chi tiết chưa có cấp chất lượng" });

        var lo = new LoTbdb
        {
            MaLoTbdb = dto.MaLoTbdb,
            MaTbdb = ctdbtl.MaTbdb,
            MaCtdongBoLenh = maCtdongBoLenh,
            MaCcl = ctdbtl.MaCcl.Value,
            NamSx = dto.NamSx,
            MaNuocSx = dto.MaNuocSx,
            MaTinhTrangBaoGoi = dto.MaTinhTrangBaoGoi,
            MaHinhThucNiemCat = dto.MaHinhThucNiemCat,
            DonGia = dto.DonGia,
            SoLuongNhap = dto.SoLuongThucNhap,
            TrangThaiLo = "NHAP",
            GhiChu = dto.GhiChu,
        };
        db.LoTbdbs.Add(lo);

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "LoTbdb", dto.MaLoTbdb,
            $"Tạo lô \"{dto.MaLoTbdb}\" từ dòng \"{ctdbtl.MaTbdb}\" của lệnh \"{maLenh}\", SL thực nhập {dto.SoLuongThucNhap}");
        return StatusCode(201, new { message = "Tạo lô thành công", maLoTbdb = lo.MaLoTbdb });
    }

    // PUT api/tb-dong-bo/lenh/{maLenh}/chi-tiet/{maCtdongBoLenh}/lo
    // Sửa lại thông tin lô đã tạo (năm SX, nước SX, tình trạng bao gói, đơn giá, SL thực nhập) —
    // chỉ cho phép khi lệnh CHƯA kết thúc. Mã lô giữ nguyên (là khóa chính, không đổi được).
    // Không cho giảm SL thực nhập xuống dưới số đã phân bổ vào tồn kho, tránh làm âm phân bổ.
    [HttpPut("{maLenh}/chi-tiet/{maCtdongBoLenh:long}/lo")]
    public async Task<IActionResult> SuaLo(string maLenh, long maCtdongBoLenh, [FromBody] TaoLoDto dto)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (lenh.TrangThai == "HOAN_THANH")
            return BadRequest(new { message = "Lệnh đã kết thúc, không thể sửa lô" });

        var ctdbtl = await db.CtdongBoTrongLenhs
            .Include(c => c.LoTbdb).ThenInclude(l => l!.TonKhoTbdbs)
            .FirstOrDefaultAsync(c => c.MaCtdongBoLenh == maCtdongBoLenh && c.MaLenh == maLenh);
        if (ctdbtl?.LoTbdb == null) return NotFound(new { message = "Dòng này chưa có lô để sửa" });

        var daPhanBo = ctdbtl.LoTbdb.TonKhoTbdbs.Sum(t => t.SoLuong);
        if (dto.SoLuongThucNhap < daPhanBo)
            return BadRequest(new { message = $"Không thể giảm SL thực nhập xuống dưới {daPhanBo} (đã phân bổ vào tồn kho)" });

        ctdbtl.LoTbdb.NamSx = dto.NamSx;
        ctdbtl.LoTbdb.MaNuocSx = dto.MaNuocSx;
        ctdbtl.LoTbdb.MaTinhTrangBaoGoi = dto.MaTinhTrangBaoGoi;
        ctdbtl.LoTbdb.MaHinhThucNiemCat = dto.MaHinhThucNiemCat;
        ctdbtl.LoTbdb.DonGia = dto.DonGia;
        ctdbtl.LoTbdb.SoLuongNhap = dto.SoLuongThucNhap;
        ctdbtl.LoTbdb.GhiChu = dto.GhiChu;

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "LoTbdb", ctdbtl.LoTbdb.MaLoTbdb,
            $"Sửa lô \"{ctdbtl.LoTbdb.MaLoTbdb}\" của lệnh \"{maLenh}\"");
        return Ok(new { message = "Cập nhật lô thành công" });
    }

    private static readonly string[] MauNhapLoHeaders =
    [
        "Mã TB", "Cấp CL (1-5)", "Mã lô", "Số lượng theo lệnh", "Đơn giá theo lệnh", "Năm SX", "Nước SX (mã)",
        "Tình trạng bao gói (mã)", "Hình thức niêm cất (mã)", "Đơn giá thực tế", "Số lượng thực tế", "Kho (mã)", "Nhà kho", "Khu", "Khối",
        "Giá", "Tầng", "Hòm", "Mô tả vị trí", "Trạng thái TB (mã)", "Số lượng tại vị trí", "Ghi chú",
    ];

    // GET api/tb-dong-bo/lenh/{maLenh}/mau-nhap-lo
    // Xuất file Excel mẫu, điền sẵn các dòng chi tiết CHƯA tạo lô của lệnh (mã TB, cấp CL, đơn
    // giá/SL theo lệnh) — kho chỉ cần bổ sung mã lô, vị trí, số lượng thực tế rồi nhập lại qua
    // endpoint nhap-lo-file. Kèm sheet "Danh mục" để tra mã Kho/Nước SX/Tình trạng bao gói/
    // Trạng thái TB dùng trong các cột (mã).
    [HttpGet("{maLenh}/mau-nhap-lo")]
    public async Task<IActionResult> TaiMauNhapLo(string maLenh)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });

        var chuaXuLy = await db.CtdongBoTrongLenhs
            .Include(c => c.MaTbdbNavigation)
            .Include(c => c.MaCclNavigation)
            .Where(c => c.MaLenh == maLenh && c.LoTbdb == null)
            .OrderBy(c => c.MaTbdb)
            .ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Nhap lo");
        // Cột bắt buộc: Mã TB(1), Cấp CL(2), Mã lô(3), Đơn giá(10), SL thực tế(11), Kho(12), Trạng thái TB(20), SL tại vị trí(21).
        int[] cotBatBuoc = [1, 2, 3, 10, 11, 12, 20, 21];
        for (var i = 0; i < MauNhapLoHeaders.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = MauNhapLoHeaders[i] + (cotBatBuoc.Contains(i + 1) ? " *" : "");
            if (cotBatBuoc.Contains(i + 1))
            {
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(255, 235, 205);
                cell.Style.Font.FontColor = XLColor.FromArgb(140, 60, 0);
            }
        }
        ws.Row(1).Style.Font.Bold = true;
        ws.Cell(1, MauNhapLoHeaders.Length + 2).Value = "* = cột bắt buộc phải điền";
        ws.Cell(1, MauNhapLoHeaders.Length + 2).Style.Font.Italic = true;

        var r = 2;
        foreach (var c in chuaXuLy)
        {
            ws.Cell(r, 1).Value = c.MaTbdb;
            ws.Cell(r, 2).Value = c.MaCcl;
            ws.Cell(r, 3).Value = $"{c.MaTbdb}{c.MaCtdongBoLenh}";
            ws.Cell(r, 4).Value = c.SoLuongTheoLenh;
            ws.Cell(r, 5).Value = c.DonGiaTheoLenh;
            ws.Cell(r, 10).Value = c.DonGiaTheoLenh;
            ws.Cell(r, 11).Value = c.SoLuongTheoLenh;
            ws.Cell(r, 12).Value = lenh.MaKhoNhap;
            ws.Cell(r, 21).Value = c.SoLuongTheoLenh;
            r++;
        }
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
        GhiDanhMuc("Kho", await db.Khos.Select(x => new { x.MaKho, x.TenKho }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaKho, x.TenKho))));
        GhiDanhMuc("Nước SX", await db.Nsxes.Select(x => new { x.MaNsx, x.TenNsx }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaNsx, x.TenNsx))));
        GhiDanhMuc("Tình trạng bao gói", await db.TinhTrangBaoGois.Select(x => new { x.MaTtbg, x.TenTtbg }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaTtbg, x.TenTtbg))));
        GhiDanhMuc("Hình thức niêm cất", await db.HinhThucNiemCats.Select(x => new { x.MaHtnc, x.TenHtnc }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaHtnc, x.TenHtnc))));
        GhiDanhMuc("Trạng thái TB", await db.TrangThaiTbs.Select(x => new { x.MaTttb, x.TenTttb }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaTttb, x.TenTttb))));
        wsDm.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"mau-nhap-lo-{maLenh}.xlsx");
    }

    // Dữ liệu 1 dòng "nhập lô" đã parse (từ Excel ở bước xem-trước, hoặc từ JSON đã người dùng
    // duyệt/sửa ở bước xác-nhận) — dùng chung cho cả 2 endpoint bên dưới để tránh lặp logic.
    private class DongNhapLoRow
    {
        public int Dong { get; set; }
        public string MaTbdb { get; set; } = "";
        public int? MaCcl { get; set; }
        public string MaLoTbdb { get; set; } = "";
        public int? NamSx { get; set; }
        public string? MaNuocSx { get; set; }
        public string? MaTinhTrangBaoGoi { get; set; }
        public string? MaHinhThucNiemCat { get; set; }
        public decimal? DonGia { get; set; }
        public int? SoLuongThucTe { get; set; }
        public string MaKho { get; set; } = "";
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

    public record DongNhapLoInputDto(int Dong, string MaTbdb, int? MaCcl, string? MaLoTbdb, int? NamSx, string? MaNuocSx,
        string? MaTinhTrangBaoGoi, string? MaHinhThucNiemCat, decimal? DonGia, int? SoLuongThucTe, string? MaKho, string? TenNhaKho, string? TenDinhKhu,
        string? TenKhoi, string? TenGia, string? TenTang, string? TenHom, string? MoTaViTri, string? MaTrangThaiTb,
        int? SoLuong, string? GhiChu);

    public record XacNhanNhapLoDto(List<DongNhapLoInputDto> DanhSach);

    private List<DongNhapLoRow> DocDongNhapLoTuFile(Stream stream)
    {
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheet(1);
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        var rows = new List<DongNhapLoRow>();
        for (var r = 2; r <= lastRow; r++)
        {
            var maTbdb = ws.Cell(r, 1).GetString().Trim();
            if (string.IsNullOrWhiteSpace(maTbdb)) continue; // bỏ qua dòng trống

            rows.Add(new DongNhapLoRow
            {
                Dong = r,
                MaTbdb = maTbdb,
                MaCcl = int.TryParse(ws.Cell(r, 2).GetString().Trim(), out var ccl) ? ccl : null,
                MaLoTbdb = ws.Cell(r, 3).GetString().Trim(),
                // Cột 4-5 (Số lượng theo lệnh, Đơn giá theo lệnh) chỉ để đối chiếu tham khảo, không đọc.
                NamSx = int.TryParse(ws.Cell(r, 6).GetString().Trim(), out var ns) ? ns : null,
                MaNuocSx = ws.Cell(r, 7).GetString().Trim(),
                MaTinhTrangBaoGoi = ws.Cell(r, 8).GetString().Trim(),
                MaHinhThucNiemCat = ws.Cell(r, 9).GetString().Trim(),
                DonGia = decimal.TryParse(ws.Cell(r, 10).GetString().Trim(), out var dg) ? dg : null,
                SoLuongThucTe = int.TryParse(ws.Cell(r, 11).GetString().Trim(), out var slt) ? slt : null,
                MaKho = ws.Cell(r, 12).GetString().Trim(),
                TenNhaKho = ws.Cell(r, 13).GetString().Trim(),
                TenDinhKhu = ws.Cell(r, 14).GetString().Trim(),
                TenKhoi = ws.Cell(r, 15).GetString().Trim(),
                TenGia = ws.Cell(r, 16).GetString().Trim(),
                TenTang = ws.Cell(r, 17).GetString().Trim(),
                TenHom = ws.Cell(r, 18).GetString().Trim(),
                MoTaViTri = ws.Cell(r, 19).GetString().Trim(),
                MaTrangThaiTb = ws.Cell(r, 20).GetString().Trim(),
                SoLuong = int.TryParse(ws.Cell(r, 21).GetString().Trim(), out var sl) ? sl : null,
                GhiChu = ws.Cell(r, 22).GetString().Trim(),
            });
        }
        return rows;
    }

    // Kiểm tra các trường bắt buộc của 1 dòng, không phụ thuộc CSDL — dùng được cho cả dòng đọc
    // từ Excel lẫn dòng nhận từ JSON (bước xác nhận).
    private static List<string> KiemTraTruongNhapLo(DongNhapLoRow r)
    {
        var thieu = new List<string>();
        if (r.MaCcl == null) thieu.Add("Cấp CL (phải là số 1-5)");
        if (string.IsNullOrWhiteSpace(r.MaLoTbdb)) thieu.Add("Mã lô");
        if (r.DonGia == null) thieu.Add("Đơn giá thực tế (phải là số)");
        if (r.SoLuongThucTe == null) thieu.Add("Số lượng thực tế (phải là số)");
        else if (r.SoLuongThucTe <= 0) thieu.Add("Số lượng thực tế (phải > 0)");
        if (string.IsNullOrWhiteSpace(r.MaKho)) thieu.Add("Kho (mã)");
        if (string.IsNullOrWhiteSpace(r.MaTrangThaiTb)) thieu.Add("Trạng thái TB (mã)");
        if (r.SoLuong == null) thieu.Add("Số lượng tại vị trí (phải là số)");
        else if (r.SoLuong <= 0) thieu.Add("Số lượng tại vị trí (phải > 0)");
        return thieu;
    }

    // Kiểm tra ở mức nhóm (Mã TB, Cấp CL) — mã lô/số lượng thực tế phải đồng nhất trên mọi dòng
    // cùng nhóm, tổng SL tại vị trí không vượt SL thực tế, dòng chi tiết lệnh tương ứng phải tồn
    // tại và chưa có lô. maCcl null nghĩa là dòng đã lỗi ở mức trường, bỏ qua kiểm tra nhóm.
    private async Task<(string? LoiNhom, CtdongBoTrongLenh? Ctdbtl, int? SoLuongThucTe)> KiemTraNhomNhapLo(
        string maLenh, string maTbdb, int? maCcl, List<DongNhapLoRow> nhom)
    {
        if (maCcl == null) return (null, null, null);

        var maLoList = nhom.Select(x => x.MaLoTbdb).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList();
        if (maLoList.Count > 1)
            return ($"Các dòng cùng TB/Cấp phải cùng 1 Mã lô, đang có: {string.Join(", ", maLoList)}", null, null);

        var soLuongThucTeList = nhom.Select(x => x.SoLuongThucTe).Where(x => x != null).Distinct().ToList();
        if (soLuongThucTeList.Count > 1)
            return ($"Các dòng cùng Mã lô phải có cùng 1 Số lượng thực tế, đang có: {string.Join(", ", soLuongThucTeList)}", null, null);

        int? soLuongThucTe = soLuongThucTeList.Count == 1 ? soLuongThucTeList[0] : null;
        if (soLuongThucTe != null)
        {
            var tongTaiViTri = nhom.Where(x => x.SoLuong != null).Sum(x => x.SoLuong!.Value);
            if (tongTaiViTri > soLuongThucTe)
                return ($"Tổng Số lượng tại vị trí ({tongTaiViTri}) vượt quá Số lượng thực tế của lô ({soLuongThucTe})", null, soLuongThucTe);
        }

        var ctdbtl = await db.CtdongBoTrongLenhs
            .Include(c => c.LoTbdb)
            .FirstOrDefaultAsync(c => c.MaLenh == maLenh && c.MaTbdb == maTbdb && c.MaCcl == maCcl);
        if (ctdbtl == null)
            return ($"Không tìm thấy dòng chi tiết TB={maTbdb}, Cấp={maCcl} trong lệnh này", null, soLuongThucTe);
        if (ctdbtl.LoTbdb != null)
            return ($"Dòng này đã có lô \"{ctdbtl.LoTbdb.MaLoTbdb}\" từ trước, bỏ qua", ctdbtl, soLuongThucTe);

        return (null, ctdbtl, soLuongThucTe);
    }

    // POST api/tb-dong-bo/lenh/{maLenh}/nhap-lo-file/xem-truoc
    // Đọc + kiểm tra file Excel (mẫu ở trên) nhưng KHÔNG lưu — trả về từng dòng kèm trạng thái
    // hợp lệ/lỗi để người dùng xem trước, sửa trực tiếp rồi mới xác nhận lưu qua endpoint xac-nhan.
    [HttpPost("{maLenh}/nhap-lo-file/xem-truoc")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> XemTruocNhapLoTuFile(string maLenh, IFormFile file)
    {
        var lenh = await db.Lenhs.Include(l => l.MaLoaiLenhNavigation).FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if ((lenh.MaLoaiLenhNavigation.TenNx ?? "").Contains("Xuất", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Chỉ nhập file cho lệnh Nhập" });
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chưa chọn file" });

        using var stream = file.OpenReadStream();
        var rows = DocDongNhapLoTuFile(stream);

        var maTbdbList = rows.Select(r => r.MaTbdb).Distinct().ToList();
        var tenTbdbMap = await db.Tbdbs.Where(t => maTbdbList.Contains(t.MaTbdb)).ToDictionaryAsync(t => t.MaTbdb, t => t.TenTbdb);
        var cclMap = await db.CapChatLuongs.ToDictionaryAsync(c => c.MaCap, c => c.TenCap);

        var loiNhomMap = new Dictionary<(string, int?), string?>();
        foreach (var nhom in rows.GroupBy(x => (x.MaTbdb, x.MaCcl)))
        {
            var (loiNhom, _, _) = await KiemTraNhomNhapLo(maLenh, nhom.Key.MaTbdb, nhom.Key.MaCcl, nhom.ToList());
            loiNhomMap[nhom.Key] = loiNhom;
        }

        var danhSach = rows.Select(r =>
        {
            var loi = KiemTraTruongNhapLo(r);
            var loiNhom = loiNhomMap.GetValueOrDefault((r.MaTbdb, r.MaCcl));
            if (loiNhom != null) loi.Add(loiNhom);
            return new
            {
                dong = r.Dong, maTbdb = r.MaTbdb, tenTbdb = tenTbdbMap.GetValueOrDefault(r.MaTbdb),
                maCcl = r.MaCcl, tenCcl = r.MaCcl.HasValue ? cclMap.GetValueOrDefault(r.MaCcl.Value) : null,
                maLoTbdb = r.MaLoTbdb, namSx = r.NamSx, maNuocSx = r.MaNuocSx, maTinhTrangBaoGoi = r.MaTinhTrangBaoGoi,
                maHinhThucNiemCat = r.MaHinhThucNiemCat,
                donGia = r.DonGia, soLuongThucTe = r.SoLuongThucTe, maKho = r.MaKho, tenNhaKho = r.TenNhaKho,
                tenDinhKhu = r.TenDinhKhu, tenKhoi = r.TenKhoi, tenGia = r.TenGia, tenTang = r.TenTang,
                tenHom = r.TenHom, moTaViTri = r.MoTaViTri, maTrangThaiTb = r.MaTrangThaiTb, soLuong = r.SoLuong,
                ghiChu = r.GhiChu, hopLe = loi.Count == 0, loi,
            };
        }).ToList();

        return Ok(new { tongSoDong = rows.Count, danhSach });
    }

    // POST api/tb-dong-bo/lenh/{maLenh}/nhap-lo-file/xac-nhan
    // Lưu danh sách dòng đã được người dùng xem trước/sửa (bước xem-truoc ở trên). Kiểm tra lại
    // toàn bộ (không tin dữ liệu client gửi lên) rồi mới ghi CSDL — cùng logic nhóm/gộp lô như cũ:
    // các dòng cùng (Mã TB, Cấp CL) gộp thành 1 Lô, "Số lượng thực tế" là tổng SL thực nhập của cả
    // lô, tách riêng khỏi "Số lượng tại vị trí" từng dòng — tổng SL tại vị trí được phép NHỎ HƠN
    // số lượng thực tế (phần còn lại coi như chưa phân bổ) nhưng không được vượt quá. Xử lý theo
    // từng nhóm độc lập: nhóm nào lỗi thì báo lỗi và bỏ qua, không ảnh hưởng các nhóm khác.
    [HttpPost("{maLenh}/nhap-lo-file/xac-nhan")]
    public async Task<IActionResult> XacNhanNhapLoTuFile(string maLenh, [FromBody] XacNhanNhapLoDto dto)
    {
        var lenh = await db.Lenhs.Include(l => l.MaLoaiLenhNavigation).FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if ((lenh.MaLoaiLenhNavigation.TenNx ?? "").Contains("Xuất", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Chỉ nhập file cho lệnh Nhập" });
        if (dto.DanhSach == null || dto.DanhSach.Count == 0)
            return BadRequest(new { message = "Không có dòng nào để lưu" });

        var rows = dto.DanhSach.Select(x => new DongNhapLoRow
        {
            Dong = x.Dong, MaTbdb = (x.MaTbdb ?? "").Trim(), MaCcl = x.MaCcl, MaLoTbdb = (x.MaLoTbdb ?? "").Trim(),
            NamSx = x.NamSx, MaNuocSx = x.MaNuocSx, MaTinhTrangBaoGoi = x.MaTinhTrangBaoGoi, MaHinhThucNiemCat = x.MaHinhThucNiemCat, DonGia = x.DonGia,
            SoLuongThucTe = x.SoLuongThucTe, MaKho = (x.MaKho ?? "").Trim(), TenNhaKho = x.TenNhaKho, TenDinhKhu = x.TenDinhKhu,
            TenKhoi = x.TenKhoi, TenGia = x.TenGia, TenTang = x.TenTang, TenHom = x.TenHom, MoTaViTri = x.MoTaViTri,
            MaTrangThaiTb = (x.MaTrangThaiTb ?? "").Trim(), SoLuong = x.SoLuong, GhiChu = x.GhiChu,
        }).ToList();

        var ketQua = new List<object>();
        var thanhCong = 0;

        foreach (var nhom in rows.GroupBy(x => (x.MaTbdb, x.MaCcl)))
        {
            var dongDauTien = nhom.First().Dong;

            var loiTruongNhom = nhom.SelectMany(KiemTraTruongNhapLo).Distinct().ToList();
            if (loiTruongNhom.Count > 0)
            {
                ketQua.Add(new { dong = dongDauTien, maTbdb = nhom.Key.MaTbdb, loi = $"Thiếu/sai: {string.Join(", ", loiTruongNhom)}" });
                continue;
            }

            var (loiNhom, ctdbtl, soLuongThucTe) = await KiemTraNhomNhapLo(maLenh, nhom.Key.MaTbdb, nhom.Key.MaCcl, nhom.ToList());
            if (loiNhom != null)
            {
                ketQua.Add(new { dong = dongDauTien, maTbdb = nhom.Key.MaTbdb, loi = loiNhom });
                continue;
            }

            var dauTien = nhom.First();
            var lo = new LoTbdb
            {
                MaLoTbdb = dauTien.MaLoTbdb,
                MaTbdb = ctdbtl!.MaTbdb,
                MaCtdongBoLenh = ctdbtl.MaCtdongBoLenh,
                MaCcl = nhom.Key.MaCcl!.Value,
                NamSx = dauTien.NamSx,
                MaNuocSx = string.IsNullOrWhiteSpace(dauTien.MaNuocSx) ? null : dauTien.MaNuocSx,
                MaTinhTrangBaoGoi = string.IsNullOrWhiteSpace(dauTien.MaTinhTrangBaoGoi) ? null : dauTien.MaTinhTrangBaoGoi,
                MaHinhThucNiemCat = string.IsNullOrWhiteSpace(dauTien.MaHinhThucNiemCat) ? null : dauTien.MaHinhThucNiemCat,
                DonGia = dauTien.DonGia!.Value,
                SoLuongNhap = soLuongThucTe!.Value,
                TrangThaiLo = "NHAP",
                GhiChu = string.IsNullOrWhiteSpace(dauTien.GhiChu) ? null : dauTien.GhiChu,
            };
            db.LoTbdbs.Add(lo);

            var tonKhoList = nhom.Select(x => new TonKhoTbdb
            {
                MaLoTbdbNavigation = lo,
                MaKho = x.MaKho,
                TenNhaKho = string.IsNullOrWhiteSpace(x.TenNhaKho) ? null : x.TenNhaKho,
                TenDinhKhu = string.IsNullOrWhiteSpace(x.TenDinhKhu) ? null : x.TenDinhKhu,
                TenKhoi = string.IsNullOrWhiteSpace(x.TenKhoi) ? null : x.TenKhoi,
                TenGia = string.IsNullOrWhiteSpace(x.TenGia) ? null : x.TenGia,
                TenTang = string.IsNullOrWhiteSpace(x.TenTang) ? null : x.TenTang,
                TenHom = string.IsNullOrWhiteSpace(x.TenHom) ? null : x.TenHom,
                MoTaViTri = string.IsNullOrWhiteSpace(x.MoTaViTri) ? null : x.MoTaViTri,
                MaTrangThaiTb = x.MaTrangThaiTb,
                SoLuong = x.SoLuong!.Value,
                GhiChu = string.IsNullOrWhiteSpace(x.GhiChu) ? null : x.GhiChu,
            }).ToList();
            db.TonKhoTbdbs.AddRange(tonKhoList);

            try
            {
                await db.SaveChangesAsync();
                thanhCong++;
            }
            catch (DbUpdateException ex)
            {
                db.Entry(lo).State = EntityState.Detached;
                foreach (var tk in tonKhoList) db.Entry(tk).State = EntityState.Detached;
                ketQua.Add(new { dong = dongDauTien, maTbdb = nhom.Key.MaTbdb, loi = DbErrorTranslator.Translate(ex) });
            }
        }

        if (thanhCong > 0)
        {
            await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "LoTbdb", maLenh,
                $"Nhập file: tạo {thanhCong} lô từ file cho lệnh \"{maLenh}\"");
        }

        return Ok(new { tongSoDong = rows.Count, thanhCong, thatBai = ketQua.Count, chiTietLoi = ketQua });
    }

    private static readonly string[] MauNhapViTriHeaders =
    [
        "Kho (mã)", "Nhà kho", "Khu", "Khối", "Giá", "Tầng", "Hòm", "Mô tả vị trí", "Trạng thái TB (mã)", "Số lượng", "Ghi chú",
    ];

    // GET api/tb-dong-bo/lenh/{maLenh}/lo/{maLoTbdb}/mau-nhap-vi-tri
    // Xuất file Excel mẫu để nhập hàng loạt các vị trí (Tồn kho) cho 1 lô cụ thể — mỗi dòng
    // file = 1 vị trí cất giữ. Gợi ý sẵn 1 dòng với Kho = kho nhập của lệnh và Số lượng = phần
    // còn thiếu so với số lượng thực nhập của lô.
    [HttpGet("{maLenh}/lo/{maLoTbdb}/mau-nhap-vi-tri")]
    public async Task<IActionResult> TaiMauNhapViTri(string maLenh, string maLoTbdb)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });

        var lo = await db.LoTbdbs
            .Include(l => l.TonKhoTbdbs)
            .Include(l => l.MaCtdongBoLenhNavigation)
            .FirstOrDefaultAsync(l => l.MaLoTbdb == maLoTbdb && l.MaCtdongBoLenhNavigation.MaLenh == maLenh);
        if (lo == null) return NotFound(new { message = "Không tìm thấy lô trong lệnh này" });

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Nhap vi tri");
        int[] cotBatBuoc = [1, 9, 10];
        for (var i = 0; i < MauNhapViTriHeaders.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = MauNhapViTriHeaders[i] + (cotBatBuoc.Contains(i + 1) ? " *" : "");
            if (cotBatBuoc.Contains(i + 1))
            {
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(255, 235, 205);
                cell.Style.Font.FontColor = XLColor.FromArgb(140, 60, 0);
            }
        }
        ws.Row(1).Style.Font.Bold = true;

        var conLai = lo.SoLuongNhap - lo.TonKhoTbdbs.Sum(t => t.SoLuong);
        ws.Cell(2, 1).Value = lenh.MaKhoNhap;
        if (conLai > 0) ws.Cell(2, 10).Value = conLai;
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
        GhiDanhMuc("Kho", await db.Khos.Select(x => new { x.MaKho, x.TenKho }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaKho, x.TenKho))));
        GhiDanhMuc("Trạng thái TB", await db.TrangThaiTbs.Select(x => new { x.MaTttb, x.TenTttb }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaTttb, x.TenTttb))));
        wsDm.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"mau-nhap-vi-tri-{maLoTbdb}.xlsx");
    }

    // POST api/tb-dong-bo/lenh/{maLenh}/lo/{maLoTbdb}/nhap-vi-tri-file
    // Nhập hàng loạt vị trí (Tồn kho) cho 1 lô từ file Excel — mỗi dòng file tạo 1 dòng Tồn kho.
    // Xử lý theo từng dòng độc lập: dòng nào lỗi thì báo lỗi và bỏ qua, không ảnh hưởng các dòng khác.
    [HttpPost("{maLenh}/lo/{maLoTbdb}/nhap-vi-tri-file")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> NhapViTriTuFile(string maLenh, string maLoTbdb, IFormFile file)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (lenh.TrangThai == "HOAN_THANH")
            return BadRequest(new { message = "Lệnh đã kết thúc, không thể thêm vị trí" });

        var lo = await db.LoTbdbs.Include(l => l.MaCtdongBoLenhNavigation)
            .FirstOrDefaultAsync(l => l.MaLoTbdb == maLoTbdb && l.MaCtdongBoLenhNavigation.MaLenh == maLenh);
        if (lo == null) return NotFound(new { message = "Không tìm thấy lô trong lệnh này" });
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chưa chọn file" });

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheet(1);
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        var ketQua = new List<object>();
        var thanhCong = 0;
        var tongSoDong = 0;

        for (var r = 2; r <= lastRow; r++)
        {
            var maKho = ws.Cell(r, 1).GetString().Trim();
            var tenNhaKho = ws.Cell(r, 2).GetString().Trim();
            var tenDinhKhu = ws.Cell(r, 3).GetString().Trim();
            var tenKhoi = ws.Cell(r, 4).GetString().Trim();
            var tenGia = ws.Cell(r, 5).GetString().Trim();
            var tenTang = ws.Cell(r, 6).GetString().Trim();
            var tenHom = ws.Cell(r, 7).GetString().Trim();
            var moTaViTri = ws.Cell(r, 8).GetString().Trim();
            var maTrangThaiTb = ws.Cell(r, 9).GetString().Trim();
            int? soLuong = int.TryParse(ws.Cell(r, 10).GetString().Trim(), out var sl) ? sl : null;
            var ghiChu = ws.Cell(r, 11).GetString().Trim();

            if (string.IsNullOrWhiteSpace(maKho) && string.IsNullOrWhiteSpace(maTrangThaiTb) && soLuong == null) continue; // bỏ qua dòng trống

            tongSoDong++;
            var thieuTruong = new List<string>();
            if (string.IsNullOrWhiteSpace(maKho)) thieuTruong.Add("Kho (mã)");
            if (string.IsNullOrWhiteSpace(maTrangThaiTb)) thieuTruong.Add("Trạng thái TB (mã)");
            if (soLuong == null) thieuTruong.Add("Số lượng (phải là số)");
            else if (soLuong <= 0) thieuTruong.Add("Số lượng (phải > 0)");

            if (thieuTruong.Count > 0)
            {
                ketQua.Add(new { dong = r, loi = $"Thiếu/sai: {string.Join(", ", thieuTruong)}" });
                continue;
            }

            var tonKho = new TonKhoTbdb
            {
                MaLoTbdb = maLoTbdb,
                MaKho = maKho,
                TenNhaKho = string.IsNullOrWhiteSpace(tenNhaKho) ? null : tenNhaKho,
                TenDinhKhu = string.IsNullOrWhiteSpace(tenDinhKhu) ? null : tenDinhKhu,
                TenKhoi = string.IsNullOrWhiteSpace(tenKhoi) ? null : tenKhoi,
                TenGia = string.IsNullOrWhiteSpace(tenGia) ? null : tenGia,
                TenTang = string.IsNullOrWhiteSpace(tenTang) ? null : tenTang,
                TenHom = string.IsNullOrWhiteSpace(tenHom) ? null : tenHom,
                MoTaViTri = string.IsNullOrWhiteSpace(moTaViTri) ? null : moTaViTri,
                MaTrangThaiTb = maTrangThaiTb,
                SoLuong = soLuong!.Value,
                GhiChu = string.IsNullOrWhiteSpace(ghiChu) ? null : ghiChu,
            };
            db.TonKhoTbdbs.Add(tonKho);

            try
            {
                await db.SaveChangesAsync();
                thanhCong++;
            }
            catch (DbUpdateException ex)
            {
                db.Entry(tonKho).State = EntityState.Detached;
                ketQua.Add(new { dong = r, loi = DbErrorTranslator.Translate(ex) });
            }
        }

        if (thanhCong > 0)
        {
            await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "TonKhoTbdb", maLoTbdb,
                $"Nhập file: thêm {thanhCong} vị trí cho lô \"{maLoTbdb}\" của lệnh \"{maLenh}\"");
        }

        return Ok(new { tongSoDong, thanhCong, thatBai = ketQua.Count, chiTietLoi = ketQua });
    }

    // Nếu lệnh có kho xuất (kho nguồn thực — lệnh Xuất, hoặc lệnh Nhập chuyển kho nội bộ), dòng
    // chi tiết chỉ được thêm/tăng nếu kho đó thực sự có đủ tồn (chỉ tính lô đã HOAN_THANH) theo
    // cấp chất lượng — cộng cả các dòng cùng (TBĐB, cấp) đã có sẵn trong lệnh để không cho tổng
    // nhiều dòng vượt quá tồn kho thực tế. Trả về null nếu hợp lệ.
    private async Task<string?> KiemTraVuotTonKhoXuat(string? maKhoXuat, string maLenh, string maTbdb, int maCcl, int soLuongMoi, long? boQuaMaCtdongBoLenh = null)
    {
        if (string.IsNullOrEmpty(maKhoXuat)) return null;

        var tonKho = await (
            from t in db.TonKhoTbdbs
            join lo in db.LoTbdbs on t.MaLoTbdb equals lo.MaLoTbdb
            where t.MaKho == maKhoXuat && lo.TrangThaiLo == "HOAN_THANH" && lo.MaTbdb == maTbdb && lo.MaCcl == maCcl
            select t.SoLuong
        ).SumAsync();

        var daCoTrongLenh = await db.CtdongBoTrongLenhs
            .Where(c => c.MaLenh == maLenh && c.MaTbdb == maTbdb && c.MaCcl == maCcl && c.MaCtdongBoLenh != boQuaMaCtdongBoLenh)
            .SumAsync(c => (int?)c.SoLuongTheoLenh) ?? 0;

        // Trừ luôn phần đang bị 1 lệnh chuyển cấp chất lượng, 1 lệnh Xuất hủy/thanh lý, HOẶC 1
        // dòng "Xuất kho" của lệnh KHÁC (chưa kết thúc) giữ chỗ ở đúng cấp này — loại trừ chính
        // lệnh đang xét (boQuaMaLenh) khỏi phần "Xuất kho" vì daCoTrongLenh ở trên đã tính riêng
        // phần lệnh này tự giữ chỗ cho chính nó rồi, tránh đếm trùng.
        var giuChoChuyenCap = (await ChuyenCapReservationHelper.LayGiuChoTheoTbCapAsync(db, maKhoXuat)).GetValueOrDefault((maTbdb, maCcl));
        var giuChoHuy = (await HuyThanhLyReservationHelper.LayGiuChoTheoTbCapAsync(db, maKhoXuat)).GetValueOrDefault((maTbdb, maCcl));
        var giuChoXuatKho = (await XuatKhoReservationHelper.LayGiuChoTheoTbCapAsync(db, maKhoXuat, boQuaMaLenh: maLenh)).GetValueOrDefault((maTbdb, maCcl));
        var giuChoThayDoiViTri = (await ThayDoiViTriReservationHelper.LayGiuChoTheoTbCapAsync(db, maKhoXuat)).GetValueOrDefault((maTbdb, maCcl));

        var conLai = tonKho - daCoTrongLenh - giuChoChuyenCap - giuChoHuy - giuChoXuatKho - giuChoThayDoiViTri;
        if (tonKho == 0 || soLuongMoi > conLai)
            return SoanLoiTonKhoXuat(maKhoXuat, tonKho, conLai, maCcl);
        return null;
    }

    [HttpPost("{maLenh}/chi-tiet")]
    public async Task<IActionResult> AddChiTiet(string maLenh, [FromBody] CtdbtlDto dto)
    {
        var lenhChu = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenhChu == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenhChu.MaKhoNhap, lenhChu.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });

        if (dto.MaTonKho.HasValue)
        {
            // Lệnh Xuất hủy/thanh lý — chọn thẳng 1 dòng tồn kho cụ thể (lô + vị trí). Ghi nhận
            // ngay ("giữ chỗ") nhưng KHÔNG trừ Tồn kho ở đây — chỉ trừ thật khi lệnh Kết thúc (xem
            // KetThucHuyThanhLy), để tránh trừ tồn kho khi lệnh còn dở dang chưa chắc hoàn thành.
            if (dto.SoLuongTheoLenh <= 0) return BadRequest(new { message = "Số lượng phải lớn hơn 0" });

            var tonKhoChon = await db.TonKhoTbdbs.Include(t => t.MaLoTbdbNavigation)
                .FirstOrDefaultAsync(t => t.MaTonKho == dto.MaTonKho.Value && t.MaKho == lenhChu.MaKhoXuat);
            if (tonKhoChon == null) return BadRequest(new { message = "Dòng tồn kho không tồn tại tại kho xuất của lệnh" });
            if (tonKhoChon.MaLoTbdbNavigation.TrangThaiLo != "HOAN_THANH") return BadRequest(new { message = "Lô chưa hoàn thành nhập kho" });

            var giuChoChuyenCap = (await ChuyenCapReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho.Value])).GetValueOrDefault(dto.MaTonKho.Value);
            var giuChoHuy = (await HuyThanhLyReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho.Value])).GetValueOrDefault(dto.MaTonKho.Value);
            var giuChoXuatKho = (await XuatKhoReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho.Value])).GetValueOrDefault(dto.MaTonKho.Value);
            var giuChoThayDoiViTri = (await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, [dto.MaTonKho.Value])).GetValueOrDefault(dto.MaTonKho.Value);
            var khaDung = tonKhoChon.SoLuong - giuChoChuyenCap - giuChoHuy - giuChoXuatKho - giuChoThayDoiViTri;
            if (dto.SoLuongTheoLenh > khaDung)
                return BadRequest(new { message = $"Dòng tồn kho này chỉ còn {khaDung} khả dụng, không thể chọn {dto.SoLuongTheoLenh}" });

            // Cùng 1 lệnh chọn lại đúng dòng tồn kho đã chọn trước đó (cùng lô + vị trí) — cộng
            // dồn số lượng vào dòng chi tiết đã có thay vì tách thành 2 dòng trùng nhau.
            var entityTrung = await db.CtdongBoTrongLenhs
                .FirstOrDefaultAsync(c => c.MaLenh == maLenh && c.MaTonKho == dto.MaTonKho.Value);
            if (entityTrung != null)
            {
                entityTrung.SoLuongTheoLenh += dto.SoLuongTheoLenh;
                if (!string.IsNullOrWhiteSpace(dto.GhiChu)) entityTrung.GhiChu = dto.GhiChu;

                try { await db.SaveChangesAsync(); }
                catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

                await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "CtdongBoTrongLenh", entityTrung.MaTbdb,
                    $"Cộng dồn {dto.SoLuongTheoLenh} vào dòng chi tiết \"{entityTrung.MaTbdb}\" (lô \"{tonKhoChon.MaLoTbdb}\") của lệnh \"{maLenh}\"");
                return StatusCode(201, new { message = "Đã cộng dồn vào dòng chi tiết có sẵn", maCtdongBoLenh = entityTrung.MaCtdongBoLenh });
            }

            var entityHuy = new CtdongBoTrongLenh
            {
                MaLenh = maLenh,
                MaTbdb = tonKhoChon.MaLoTbdbNavigation.MaTbdb,
                MaCcl = tonKhoChon.MaLoTbdbNavigation.MaCcl,
                SoLuongTheoLenh = dto.SoLuongTheoLenh,
                DonGiaTheoLenh = dto.DonGiaTheoLenh,
                GhiChu = dto.GhiChu,
                MaTonKho = dto.MaTonKho.Value,
            };
            db.CtdongBoTrongLenhs.Add(entityHuy);

            try { await db.SaveChangesAsync(); }
            catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

            await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "CtdongBoTrongLenh", entityHuy.MaTbdb,
                $"Thêm dòng chi tiết \"{entityHuy.MaTbdb}\" (lô \"{tonKhoChon.MaLoTbdb}\") vào lệnh \"{maLenh}\"");
            return StatusCode(201, new { message = "Thêm dòng chi tiết thành công", maCtdongBoLenh = entityHuy.MaCtdongBoLenh });
        }

        var loiTonKho = await KiemTraVuotTonKhoXuat(lenhChu.MaKhoXuat, maLenh, dto.MaTbdb, dto.MaCcl, dto.SoLuongTheoLenh);
        if (loiTonKho != null) return BadRequest(new { message = loiTonKho });

        // Trước đây ràng buộc này do unique constraint UQ_CTDBTL_Lenh_TBDB_CCL ở CSDL tự chặn —
        // constraint đã bỏ (chỉ Tồn đầu cần cho phép nhiều lô/1 TBĐB+cấp/lệnh), nên Nhập/Xuất bình
        // thường phải tự kiểm tra ở đây để giữ nguyên hành vi cũ (mỗi TBĐB+cấp chỉ 1 dòng/lệnh).
        if (await db.CtdongBoTrongLenhs.AnyAsync(c => c.MaLenh == maLenh && c.MaTbdb == dto.MaTbdb && c.MaCcl == dto.MaCcl))
            return BadRequest(new { message = $"Trang bị \"{dto.MaTbdb}\" cấp chất lượng {dto.MaCcl} đã có dòng chi tiết trong lệnh này" });

        var entity = new CtdongBoTrongLenh
        {
            MaLenh = maLenh,
            MaTbdb = dto.MaTbdb,
            MaCcl = dto.MaCcl,
            SoLuongTheoLenh = dto.SoLuongTheoLenh,
            DonGiaTheoLenh = dto.DonGiaTheoLenh,
            GhiChu = dto.GhiChu,
        };
        db.CtdongBoTrongLenhs.Add(entity);

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "CtdongBoTrongLenh", dto.MaTbdb,
            $"Thêm dòng chi tiết \"{dto.MaTbdb}\" (cấp {dto.MaCcl}) vào lệnh \"{maLenh}\"");
        return StatusCode(201, new { message = "Thêm dòng chi tiết thành công", maCtdongBoLenh = entity.MaCtdongBoLenh });
    }

    private static readonly string[] MauNhapChiTietHeaders = ["Mã TB", "Cấp CL (1-5)", "Số lượng theo lệnh", "Đơn giá theo lệnh", "Ghi chú"];

    // GET api/tb-dong-bo/lenh/{maLenh}/mau-nhap-chi-tiet
    // Xuất file Excel mẫu để nhập hàng loạt dòng chi tiết (TBĐB + cấp chất lượng + số lượng/đơn
    // giá theo lệnh) cho 1 lệnh — mỗi dòng file = 1 dòng chi tiết. Kèm sheet "Danh mục" liệt kê
    // toàn bộ TBĐB và cấp chất lượng để tra mã.
    [HttpGet("{maLenh}/mau-nhap-chi-tiet")]
    public async Task<IActionResult> TaiMauNhapChiTiet(string maLenh)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Nhap chi tiet");
        int[] cotBatBuoc = [1, 2, 3];
        for (var i = 0; i < MauNhapChiTietHeaders.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = MauNhapChiTietHeaders[i] + (cotBatBuoc.Contains(i + 1) ? " *" : "");
            if (cotBatBuoc.Contains(i + 1))
            {
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(255, 235, 205);
                cell.Style.Font.FontColor = XLColor.FromArgb(140, 60, 0);
            }
        }
        ws.Row(1).Style.Font.Bold = true;
        ws.Cell(1, MauNhapChiTietHeaders.Length + 2).Value = "* = cột bắt buộc phải điền";
        ws.Cell(1, MauNhapChiTietHeaders.Length + 2).Style.Font.Italic = true;
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
        GhiDanhMuc("Trang bị đồng bộ", await db.Tbdbs.OrderBy(x => x.MaTbdb).Select(x => new { x.MaTbdb, x.TenTbdb })
            .ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaTbdb, x.TenTbdb ?? ""))));
        GhiDanhMuc("Cấp chất lượng", await db.CapChatLuongs.OrderBy(x => x.MaCap).Select(x => new { Ma = x.MaCap.ToString(), x.TenCap })
            .ToListAsync().ContinueWith(t => t.Result.Select(x => (x.Ma, x.TenCap))));
        wsDm.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"mau-nhap-chi-tiet-{maLenh}.xlsx");
    }

    // Tồn kho còn lại theo (TBĐB, cấp) tại kho xuất của lệnh — chỉ tính lô đã HOAN_THANH, và đã
    // trừ đi các dòng chi tiết SẴN CÓ trong lệnh (nếu maLenhTruTon != null) để phần "còn lại" phản
    // ánh đúng những gì chưa bị dòng nào trong lệnh này chiếm dụng. Dùng chung cho xem trước và
    // xác nhận nhập file, để 2 bước tính nhất quán với nhau và với KiemTraVuotTonKhoXuat (thêm/sửa
    // dòng thủ công).
    private async Task<(Dictionary<(string MaTbdb, int MaCcl), int> Goc, Dictionary<(string MaTbdb, int MaCcl), int> ConLai)> LayTonKhoXuatConLaiAsync(string? maKhoXuat, string? maLenhTruTon)
    {
        var goc = new Dictionary<(string MaTbdb, int MaCcl), int>();
        if (string.IsNullOrEmpty(maKhoXuat)) return (goc, new Dictionary<(string MaTbdb, int MaCcl), int>());

        var tonRaw = await (
            from t in db.TonKhoTbdbs
            join lo in db.LoTbdbs on t.MaLoTbdb equals lo.MaLoTbdb
            where t.MaKho == maKhoXuat && lo.TrangThaiLo == "HOAN_THANH"
            select new { lo.MaTbdb, lo.MaCcl, t.SoLuong }
        ).ToListAsync();
        goc = tonRaw.GroupBy(x => (x.MaTbdb, x.MaCcl))
            .ToDictionary(g => g.Key, g => g.Sum(x => x.SoLuong));

        var conLai = new Dictionary<(string MaTbdb, int MaCcl), int>(goc);

        // Trừ phần đang bị 1 lệnh chuyển cấp chất lượng, 1 lệnh Xuất hủy/thanh lý, HOẶC 1 dòng
        // "Xuất kho" của lệnh KHÁC (chưa kết thúc) giữ chỗ, cùng ý nghĩa như ở KiemTraVuotTonKhoXuat
        // — giữ nhất quán giữa nhập tay và nhập file Excel. Loại trừ chính maLenhTruTon khỏi phần
        // "Xuất kho" vì phần lệnh đó tự giữ chỗ cho chính nó đã được trừ riêng ở daCoTrongLenh dưới.
        var giuChoChuyenCap = await ChuyenCapReservationHelper.LayGiuChoTheoTbCapAsync(db, maKhoXuat);
        foreach (var (key, soLuong) in giuChoChuyenCap)
            conLai[key] = conLai.GetValueOrDefault(key, 0) - soLuong;
        var giuChoHuy = await HuyThanhLyReservationHelper.LayGiuChoTheoTbCapAsync(db, maKhoXuat);
        foreach (var (key, soLuong) in giuChoHuy)
            conLai[key] = conLai.GetValueOrDefault(key, 0) - soLuong;
        var giuChoXuatKho = await XuatKhoReservationHelper.LayGiuChoTheoTbCapAsync(db, maKhoXuat, boQuaMaLenh: maLenhTruTon);
        foreach (var (key, soLuong) in giuChoXuatKho)
            conLai[key] = conLai.GetValueOrDefault(key, 0) - soLuong;
        var giuChoThayDoiViTri = await ThayDoiViTriReservationHelper.LayGiuChoTheoTbCapAsync(db, maKhoXuat);
        foreach (var (key, soLuong) in giuChoThayDoiViTri)
            conLai[key] = conLai.GetValueOrDefault(key, 0) - soLuong;

        if (!string.IsNullOrEmpty(maLenhTruTon))
        {
            var daCoTrongLenh = await db.CtdongBoTrongLenhs
                .Where(c => c.MaLenh == maLenhTruTon && c.MaCcl != null)
                .GroupBy(c => new { c.MaTbdb, MaCcl = c.MaCcl!.Value })
                .Select(g => new { g.Key.MaTbdb, g.Key.MaCcl, Tong = g.Sum(x => x.SoLuongTheoLenh) })
                .ToListAsync();
            foreach (var d in daCoTrongLenh)
            {
                var key = (d.MaTbdb, d.MaCcl);
                conLai[key] = conLai.GetValueOrDefault(key, 0) - d.Tong;
            }
        }

        return (goc, conLai);
    }

    // Ghép thông báo lỗi tồn kho — phân biệt rõ 2 trường hợp: kho xuất CHƯA TỪNG có trang bị này
    // (conCapGoc = 0, khác hẳn với "đã bị dùng hết") và có nhưng không đủ (do dòng khác trong
    // lệnh/file đã chiếm dụng bớt).
    private static string SoanLoiTonKhoXuat(string maKhoXuat, int conCapGoc, int conLai, int maCcl)
        => conCapGoc == 0
            ? $"Kho xuất \"{maKhoXuat}\" không có tồn kho trang bị này ở cấp {maCcl}"
            : $"Vượt tồn kho tại kho xuất \"{maKhoXuat}\" (còn {conLai}, cấp {maCcl})";

    public record ChiTietFileRowDto(int Dong, string MaTbdb, int MaCcl, int SoLuongTheoLenh, decimal? DonGiaTheoLenh, string? GhiChu);
    public record XacNhanNhapChiTietDto(List<ChiTietFileRowDto> DanhSach);

    // POST api/tb-dong-bo/lenh/{maLenh}/nhap-chi-tiet-file/xem-truoc
    // Đọc & kiểm tra file Excel (mẫu ở trên) nhưng KHÔNG lưu gì — trả về toàn bộ các dòng đọc được
    // kèm trạng thái hợp lệ/lỗi để hiển thị bảng xem trước, cho người dùng bỏ chọn dòng không muốn
    // trước khi thực sự lưu (xem endpoint xac-nhan bên dưới).
    [HttpPost("{maLenh}/nhap-chi-tiet-file/xem-truoc")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> XemTruocNhapChiTietTuFile(string maLenh, IFormFile file)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chưa chọn file" });

        var tbdbMap = await db.Tbdbs.ToDictionaryAsync(x => x.MaTbdb, x => x.TenTbdb);
        var cclMap = await db.CapChatLuongs.ToDictionaryAsync(x => x.MaCap, x => x.TenCap);
        var khoNguon = lenh.MaKhoXuat;
        var (tonGocTheoCap, conLaiTheoCap) = await LayTonKhoXuatConLaiAsync(khoNguon, maLenh);

        // Xem ghi chú tương ứng ở XacNhanNhapChiTietTuFile — kiểm tra ngay ở bước xem trước để
        // tránh dòng hiện "hợp lệ" nhưng lưu vẫn thất bại.
        var capDaCo = (await db.CtdongBoTrongLenhs.Where(c => c.MaLenh == maLenh)
            .Select(c => new { c.MaTbdb, c.MaCcl }).ToListAsync())
            .Select(c => (c.MaTbdb, c.MaCcl)).ToHashSet();

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheet(1);
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        var danhSach = new List<object>();

        for (var r = 2; r <= lastRow; r++)
        {
            var maTbdb = ws.Cell(r, 1).GetString().Trim();
            if (string.IsNullOrWhiteSpace(maTbdb)) continue; // bỏ qua dòng trống

            int? maCcl = int.TryParse(ws.Cell(r, 2).GetString().Trim(), out var ccl) ? ccl : null;
            int? soLuong = int.TryParse(ws.Cell(r, 3).GetString().Trim(), out var sl) ? sl : null;
            decimal? donGia = decimal.TryParse(ws.Cell(r, 4).GetString().Trim(), out var dg) ? dg : null;
            var ghiChuRaw = ws.Cell(r, 5).GetString().Trim();
            var ghiChu = string.IsNullOrWhiteSpace(ghiChuRaw) ? null : ghiChuRaw;

            var maTbdbHopLe = tbdbMap.ContainsKey(maTbdb);
            var maCclHopLe = maCcl is >= 1 and <= 5;

            var loiHang = new List<string>();
            if (!maTbdbHopLe) loiHang.Add("Mã TB không tồn tại");
            if (!maCclHopLe) loiHang.Add("Cấp CL (phải là số 1-5)");
            if (soLuong == null) loiHang.Add("Số lượng theo lệnh (phải là số)");
            else if (soLuong <= 0) loiHang.Add("Số lượng theo lệnh (phải > 0)");

            // Kiểm tra tồn kho xuất độc lập với số lượng — chỉ cần mã TB + cấp hợp lệ là tra được
            // kho có/không có trang bị này, để không bị che mất lỗi này khi số lượng cũng đang sai.
            if (!string.IsNullOrEmpty(khoNguon) && maTbdbHopLe && maCclHopLe)
            {
                var key = (maTbdb, maCcl!.Value);
                var conCapGoc = tonGocTheoCap.GetValueOrDefault(key, 0);
                var conLai = conLaiTheoCap.GetValueOrDefault(key, 0);
                if (conCapGoc == 0)
                {
                    loiHang.Add(SoanLoiTonKhoXuat(khoNguon, conCapGoc, conLai, maCcl.Value));
                }
                else if (soLuong is > 0)
                {
                    if (soLuong.Value > conLai)
                        loiHang.Add(SoanLoiTonKhoXuat(khoNguon, conCapGoc, conLai, maCcl.Value));
                    else
                        conLaiTheoCap[key] = conLai - soLuong.Value;
                }
            }

            if (maTbdbHopLe && maCclHopLe && !capDaCo.Add((maTbdb, maCcl!.Value)))
                loiHang.Add($"Trang bị \"{maTbdb}\" cấp chất lượng {maCcl} đã có dòng chi tiết trong lệnh này");

            danhSach.Add(new
            {
                dong = r, maTbdb, tenTbdb = tbdbMap.GetValueOrDefault(maTbdb), maCcl,
                tenCcl = maCclHopLe ? cclMap.GetValueOrDefault(maCcl!.Value) : null,
                soLuongTheoLenh = soLuong, donGiaTheoLenh = donGia, ghiChu,
                hopLe = loiHang.Count == 0, loi = loiHang,
            });
        }

        return Ok(new { tongSoDong = danhSach.Count, danhSach });
    }

    // POST api/tb-dong-bo/lenh/{maLenh}/nhap-chi-tiet-file/xac-nhan
    // Lưu thật các dòng người dùng đã xem trước và xác nhận giữ lại (bỏ file — chỉ gửi lại danh
    // sách dòng dạng JSON). Kiểm tra lại tồn kho xuất tại đây (không tin kết quả xem trước vì dữ
    // liệu có thể đã thay đổi giữa 2 bước) — dòng nào lỗi thì báo lỗi và bỏ qua, không ảnh hưởng
    // các dòng khác.
    [HttpPost("{maLenh}/nhap-chi-tiet-file/xac-nhan")]
    public async Task<IActionResult> XacNhanNhapChiTietTuFile(string maLenh, [FromBody] XacNhanNhapChiTietDto dto)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (dto.DanhSach == null || dto.DanhSach.Count == 0)
            return BadRequest(new { message = "Chưa có dòng nào để lưu" });

        var khoNguon = lenh.MaKhoXuat;
        var (tonGocTheoCap, conLaiTheoCap) = await LayTonKhoXuatConLaiAsync(khoNguon, maLenh);

        // Trước đây ràng buộc "mỗi TBĐB+cấp chỉ 1 dòng/lệnh" do unique constraint ở CSDL tự chặn —
        // đã bỏ (chỉ Tồn đầu cần cho phép nhiều lô/1 TBĐB+cấp/lệnh), nên phải tự theo dõi ở đây để
        // Nhập/Xuất bình thường giữ nguyên hành vi cũ, kể cả khi 2 dòng trùng nhau trong CÙNG file.
        var capDaCo = (await db.CtdongBoTrongLenhs.Where(c => c.MaLenh == maLenh)
            .Select(c => new { c.MaTbdb, c.MaCcl }).ToListAsync())
            .Select(c => (c.MaTbdb, c.MaCcl)).ToHashSet();

        var ketQua = new List<object>();
        var thanhCong = 0;

        foreach (var row in dto.DanhSach)
        {
            if (!capDaCo.Add((row.MaTbdb, row.MaCcl)))
            {
                ketQua.Add(new { dong = row.Dong, maTbdb = row.MaTbdb, loi = $"Trang bị \"{row.MaTbdb}\" cấp chất lượng {row.MaCcl} đã có dòng chi tiết trong lệnh này" });
                continue;
            }

            if (!string.IsNullOrEmpty(khoNguon))
            {
                var key = (row.MaTbdb, row.MaCcl);
                var conCapGoc = tonGocTheoCap.GetValueOrDefault(key, 0);
                var conLai = conLaiTheoCap.GetValueOrDefault(key, 0);
                if (conCapGoc == 0 || row.SoLuongTheoLenh > conLai)
                {
                    ketQua.Add(new { dong = row.Dong, maTbdb = row.MaTbdb, loi = SoanLoiTonKhoXuat(khoNguon, conCapGoc, conLai, row.MaCcl) });
                    continue;
                }
                conLaiTheoCap[key] = conLai - row.SoLuongTheoLenh;
            }

            var entity = new CtdongBoTrongLenh
            {
                MaLenh = maLenh,
                MaTbdb = row.MaTbdb,
                MaCcl = row.MaCcl,
                SoLuongTheoLenh = row.SoLuongTheoLenh,
                DonGiaTheoLenh = row.DonGiaTheoLenh,
                GhiChu = row.GhiChu,
            };
            db.CtdongBoTrongLenhs.Add(entity);

            try
            {
                await db.SaveChangesAsync();
                thanhCong++;
            }
            catch (DbUpdateException ex)
            {
                db.Entry(entity).State = EntityState.Detached;
                ketQua.Add(new { dong = row.Dong, maTbdb = row.MaTbdb, loi = DbErrorTranslator.Translate(ex) });
            }
        }

        if (thanhCong > 0)
        {
            await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "CtdongBoTrongLenh", maLenh,
                $"Nhập file: thêm {thanhCong} dòng chi tiết cho lệnh \"{maLenh}\"");
        }

        return Ok(new { thanhCong, thatBai = ketQua.Count, chiTietLoi = ketQua });
    }

    // ===== Nhập file Excel riêng cho lệnh Xuất hủy/thanh lý — 1 sheet duy nhất liệt kê SẴN toàn bộ
    // tồn kho tại kho xuất của lệnh (mỗi dòng = đúng 1 dòng tồn kho cụ thể, nhận diện bằng cột ẩn
    // "Mã tồn kho"), người dùng chỉ cần điền "Số lượng hủy" > 0 vào dòng cần hủy/thanh lý — dòng nào
    // để trống hoặc 0 thì bỏ qua, không cần tra cứu/khớp lô-vị trí như trước. =====

    private static readonly string[] MauNhapHuyThanhLyHeaders =
        ["Mã lô", "Mã TB", "Tên TB", "Cấp CL", "Nhà kho", "Định khu", "Khối", "Giá", "Tầng", "Hòm", "Mô tả vị trí", "Tồn kho", "Khả dụng", "Số lượng hủy", "Ghi chú"];
    private const int MauCotSoLuongHuy = 14, MauCotGhiChu = 15, MauCotMaTonKho = 16;

    // GET api/tb-dong-bo/lenh/{maLenh}/huy-thanh-ly/mau-nhap
    [HttpGet("{maLenh}/huy-thanh-ly/mau-nhap")]
    public async Task<IActionResult> TaiMauNhapHuyThanhLy(string maLenh)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Nhap huy thanh ly");
        for (var i = 0; i < MauNhapHuyThanhLyHeaders.Length; i++) ws.Cell(1, i + 1).Value = MauNhapHuyThanhLyHeaders[i];
        ws.Row(1).Style.Font.Bold = true;
        foreach (var col in new[] { MauCotSoLuongHuy, MauCotGhiChu })
        {
            ws.Cell(1, col).Style.Fill.BackgroundColor = XLColor.FromArgb(255, 235, 205);
            ws.Cell(1, col).Style.Font.FontColor = XLColor.FromArgb(140, 60, 0);
        }

        var row = 2;
        if (!string.IsNullOrWhiteSpace(lenh.MaKhoXuat))
        {
            // Khả dụng = tồn kho trừ phần đang bị giữ chỗ bởi CẢ 3 nguồn (chuyển cấp, hủy/thanh lý —
            // kể cả chính lệnh này, xuất kho) — cùng công thức với bước xem trước/xác nhận nhập file,
            // để không gây hiểu lầm là còn nguyên Tồn kho.
            var (_, giuCho) = await LayTonKhoHuyThanhLyAsync(lenh.MaKhoXuat);

            var dsTonKho = await db.TonKhoTbdbs
                .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaTbdbNavigation)
                .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaCclNavigation)
                .Where(t => t.MaKho == lenh.MaKhoXuat && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH" && t.SoLuong > 0)
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
                ws.Cell(row, 13).Value = t.SoLuong - giuCho.GetValueOrDefault(t.MaTonKho);
                ws.Cell(row, MauCotMaTonKho).Value = t.MaTonKho;
                row++;
            }
        }

        ws.Cell(row + 1, 1).Value =
            "Chỉ điền \"Số lượng hủy\" (> 0) vào các dòng cần hủy/thanh lý — để trống các dòng còn lại. Không sửa các cột khác.";
        ws.Cell(row + 1, 1).Style.Font.Italic = true;

        ws.Column(MauCotMaTonKho).Hide();
        ws.Columns().AdjustToContents();
        ws.SheetView.FreezeRows(1);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"mau-huy-thanh-ly-{maLenh}.xlsx");
    }

    public record HuyThanhLyFileRowDto(int Dong, long MaTonKho, string MaLoTbdb, int SoLuong, string? GhiChu);
    public record XacNhanNhapHuyThanhLyDto(List<HuyThanhLyFileRowDto> DanhSach);

    // Nạp toàn bộ tồn kho tại kho xuất của lệnh (chỉ lô HOAN_THANH, còn tồn), tra theo MaTonKho +
    // tổng đang giữ chỗ bởi 3 nguồn (chuyển cấp, hủy khác, xuất kho khác) — dùng chung cho xem
    // trước & xác nhận để 2 bước tính nhất quán với nhau và với AddChiTiet (thêm dòng thủ công).
    private async Task<(Dictionary<long, TonKhoTbdb> ByMaTonKho, Dictionary<long, int> GiuCho)> LayTonKhoHuyThanhLyAsync(string maKhoXuat)
    {
        var tonKhoList = await db.TonKhoTbdbs
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaTbdbNavigation)
            .Include(t => t.MaLoTbdbNavigation).ThenInclude(l => l.MaCclNavigation)
            .Where(t => t.MaKho == maKhoXuat && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH" && t.SoLuong > 0)
            .ToListAsync();
        var byMaTonKho = tonKhoList.ToDictionary(t => t.MaTonKho, t => t);

        var maTonKhoIds = tonKhoList.Select(t => t.MaTonKho).ToList();
        var giuChoChuyenCap = await ChuyenCapReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoHuy = await HuyThanhLyReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoXuatKho = await XuatKhoReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuChoThayDoiViTri = await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, maTonKhoIds);
        var giuCho = maTonKhoIds.ToDictionary(id => id, id =>
            giuChoChuyenCap.GetValueOrDefault(id) + giuChoHuy.GetValueOrDefault(id) + giuChoXuatKho.GetValueOrDefault(id)
                + giuChoThayDoiViTri.GetValueOrDefault(id));

        return (byMaTonKho, giuCho);
    }

    // POST api/tb-dong-bo/lenh/{maLenh}/huy-thanh-ly/nhap-file/xem-truoc
    [HttpPost("{maLenh}/huy-thanh-ly/nhap-file/xem-truoc")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> XemTruocNhapHuyThanhLyTuFile(string maLenh, IFormFile file)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (string.IsNullOrWhiteSpace(lenh.MaKhoXuat)) return BadRequest(new { message = "Lệnh chưa có Kho xuất" });
        if (file == null || file.Length == 0) return BadRequest(new { message = "Chưa chọn file" });

        var (byMaTonKho, giuCho) = await LayTonKhoHuyThanhLyAsync(lenh.MaKhoXuat);
        var daDungTrongFile = new Dictionary<long, int>();
        int KhaDung(TonKhoTbdb t) => t.SoLuong - giuCho.GetValueOrDefault(t.MaTonKho) - daDungTrongFile.GetValueOrDefault(t.MaTonKho);

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheet(1);
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        var danhSach = new List<object>();
        for (var r = 2; r <= lastRow; r++)
        {
            var maLo = ws.Cell(r, 1).GetString().Trim();
            var soLuongStr = ws.Cell(r, MauCotSoLuongHuy).GetString().Trim();
            if (string.IsNullOrWhiteSpace(maLo) || string.IsNullOrWhiteSpace(soLuongStr)) continue; // chưa điền SL hủy — bỏ qua dòng

            int? soLuong = int.TryParse(soLuongStr, out var sl) ? sl : null;
            if (soLuong is null || soLuong <= 0) continue; // chỉ hiển thị dòng có Số lượng hủy > 0

            var ghiChuRaw = ws.Cell(r, MauCotGhiChu).GetString().Trim();
            var ghiChu = string.IsNullOrWhiteSpace(ghiChuRaw) ? null : ghiChuRaw;
            var maTonKhoOk = long.TryParse(ws.Cell(r, MauCotMaTonKho).GetString().Trim(), out var maTonKho);

            var loiHang = new List<string>();
            TonKhoTbdb? tonKho = maTonKhoOk && byMaTonKho.TryGetValue(maTonKho, out var t) ? t : null;
            if (tonKho == null)
                loiHang.Add($"Không tìm thấy dòng tồn kho của lô \"{maLo}\" tại kho xuất của lệnh — có thể đã hết hàng hoặc đổi vị trí, hãy tải lại mẫu mới nhất");

            if (tonKho != null)
            {
                var khaDung = KhaDung(tonKho);
                if (soLuong.Value > khaDung)
                    loiHang.Add($"Lô \"{maLo}\" chỉ còn {khaDung} khả dụng, không thể chọn {soLuong}");
                else
                    daDungTrongFile[tonKho.MaTonKho] = daDungTrongFile.GetValueOrDefault(tonKho.MaTonKho) + soLuong.Value;
            }

            danhSach.Add(new
            {
                dong = r,
                maLoTbdb = maLo,
                maTonKho = tonKho?.MaTonKho,
                // Khả dụng GỐC — TRƯỚC khi trừ các dòng KHÁC trong CÙNG file (giữ chỗ từ lệnh chuyển
                // cấp/hủy khác/xuất kho khác đã trừ rồi). Dùng để kiểm tra lại ngay trên trình duyệt
                // khi người dùng sửa tay Số lượng, không cần gọi lại server (xem revalidateDanhSach).
                khaDungGoc = tonKho == null ? (int?)null : tonKho.SoLuong - giuCho.GetValueOrDefault(tonKho.MaTonKho),
                maTbdb = tonKho?.MaLoTbdbNavigation.MaTbdb,
                tenTbdb = tonKho?.MaLoTbdbNavigation.MaTbdbNavigation.TenTbdb,
                tenCcl = tonKho?.MaLoTbdbNavigation.MaCclNavigation?.TenCap,
                viTri = tonKho == null ? null : new
                {
                    tenNhaKho = tonKho.TenNhaKho, tenDinhKhu = tonKho.TenDinhKhu, tenKhoi = tonKho.TenKhoi,
                    tenGia = tonKho.TenGia, tenTang = tonKho.TenTang, tenHom = tonKho.TenHom, moTaViTri = tonKho.MoTaViTri,
                },
                soLuong, ghiChu, hopLe = loiHang.Count == 0, loi = loiHang,
            });
        }

        return Ok(new { tongSoDong = danhSach.Count, danhSach });
    }

    // POST api/tb-dong-bo/lenh/{maLenh}/huy-thanh-ly/nhap-file/xac-nhan
    // Kiểm tra lại từ đầu (không tin kết quả xem trước) — dòng nào lỗi thì báo lỗi và bỏ qua,
    // không ảnh hưởng các dòng khác. Mỗi dòng lưu thành công vẫn chỉ "giữ chỗ" (MaTonKho), CHƯA
    // trừ tồn kho — giống hệt AddChiTiet, chỉ thực trừ khi lệnh Kết thúc.
    [HttpPost("{maLenh}/huy-thanh-ly/nhap-file/xac-nhan")]
    public async Task<IActionResult> XacNhanNhapHuyThanhLyTuFile(string maLenh, [FromBody] XacNhanNhapHuyThanhLyDto dto)
    {
        var lenh = await db.Lenhs.FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (!ThuocKhoNguoiDung(lenh.MaKhoNhap, lenh.MaKhoXuat)) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (string.IsNullOrWhiteSpace(lenh.MaKhoXuat)) return BadRequest(new { message = "Lệnh chưa có Kho xuất" });
        if (dto.DanhSach == null || dto.DanhSach.Count == 0)
            return BadRequest(new { message = "Chưa có dòng nào để lưu" });

        var (byMaTonKho, giuCho) = await LayTonKhoHuyThanhLyAsync(lenh.MaKhoXuat);
        var daDungTrongFile = new Dictionary<long, int>();
        int KhaDung(TonKhoTbdb t) => t.SoLuong - giuCho.GetValueOrDefault(t.MaTonKho) - daDungTrongFile.GetValueOrDefault(t.MaTonKho);

        // Cùng 1 dòng tồn kho được chọn nhiều lần (đã có sẵn trong lệnh, hoặc trùng giữa các dòng
        // trong file) — cộng dồn vào 1 dòng chi tiết thay vì tách thành nhiều dòng trùng nhau.
        var dongTheoTonKho = await db.CtdongBoTrongLenhs
            .Where(c => c.MaLenh == maLenh && c.MaTonKho != null)
            .ToDictionaryAsync(c => c.MaTonKho!.Value, c => c);

        var ketQua = new List<object>();
        var thanhCong = 0;

        foreach (var row in dto.DanhSach)
        {
            if (!byMaTonKho.TryGetValue(row.MaTonKho, out var tonKho))
            {
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = $"Không tìm thấy dòng tồn kho của lô \"{row.MaLoTbdb}\" tại kho xuất của lệnh" });
                continue;
            }
            if (row.SoLuong <= 0)
            {
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = "Số lượng cần hủy phải lớn hơn 0" });
                continue;
            }

            var khaDung = KhaDung(tonKho);
            if (row.SoLuong > khaDung)
            {
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = $"Lô \"{row.MaLoTbdb}\" chỉ còn {khaDung} khả dụng, không thể chọn {row.SoLuong}" });
                continue;
            }

            var trung = dongTheoTonKho.GetValueOrDefault(tonKho.MaTonKho);
            if (trung != null)
            {
                trung.SoLuongTheoLenh += row.SoLuong;
                if (!string.IsNullOrWhiteSpace(row.GhiChu)) trung.GhiChu = row.GhiChu;
            }
            else
            {
                trung = new CtdongBoTrongLenh
                {
                    MaLenh = maLenh,
                    MaTbdb = tonKho.MaLoTbdbNavigation.MaTbdb,
                    MaCcl = tonKho.MaLoTbdbNavigation.MaCcl,
                    SoLuongTheoLenh = row.SoLuong,
                    GhiChu = row.GhiChu,
                    MaTonKho = tonKho.MaTonKho,
                };
                db.CtdongBoTrongLenhs.Add(trung);
                dongTheoTonKho[tonKho.MaTonKho] = trung;
            }

            try
            {
                await db.SaveChangesAsync();
                thanhCong++;
                daDungTrongFile[tonKho.MaTonKho] = daDungTrongFile.GetValueOrDefault(tonKho.MaTonKho) + row.SoLuong;
            }
            catch (DbUpdateException ex)
            {
                db.Entry(trung).State = EntityState.Detached;
                dongTheoTonKho.Remove(tonKho.MaTonKho);
                ketQua.Add(new { dong = row.Dong, maLoTbdb = row.MaLoTbdb, loi = DbErrorTranslator.Translate(ex) });
            }
        }

        if (thanhCong > 0)
        {
            await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "CtdongBoTrongLenh", maLenh,
                $"Nhập file: thêm {thanhCong} dòng hủy/thanh lý cho lệnh \"{maLenh}\"");
        }

        return Ok(new { thanhCong, thatBai = ketQua.Count, chiTietLoi = ketQua });
    }

    [HttpPut("{maLenh}/chi-tiet/{maCtdongBoLenh:long}")]
    public async Task<IActionResult> UpdateChiTiet(string maLenh, long maCtdongBoLenh, [FromBody] CtdbtlDto dto)
    {
        var entity = await db.CtdongBoTrongLenhs.Include(c => c.MaLenhNavigation)
            .FirstOrDefaultAsync(c => c.MaCtdongBoLenh == maCtdongBoLenh && c.MaLenh == maLenh);
        if (entity == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });
        if (!ThuocKhoNguoiDung(entity.MaLenhNavigation.MaKhoNhap, entity.MaLenhNavigation.MaKhoXuat))
            return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

        if (entity.MaTonKho.HasValue)
        {
            // Dòng hủy/thanh lý — gắn với đúng 1 dòng tồn kho cụ thể, nên phải kiểm tra khả dụng
            // của CHÍNH dòng tồn kho đó (không phải tổng theo TBĐB+cấp như KiemTraVuotTonKhoXuat,
            // vì tổng đó có thể gồm cả tồn kho ở lô/vị trí KHÁC ngoài dòng này).
            if (dto.SoLuongTheoLenh <= 0) return BadRequest(new { message = "Số lượng phải lớn hơn 0" });

            var tonKho = await db.TonKhoTbdbs.FirstOrDefaultAsync(t => t.MaTonKho == entity.MaTonKho.Value);
            if (tonKho == null) return BadRequest(new { message = "Dòng tồn kho không còn tồn tại" });

            var giuChoChuyenCap = (await ChuyenCapReservationHelper.LayGiuChoAsync(db, [entity.MaTonKho.Value])).GetValueOrDefault(entity.MaTonKho.Value);
            // Trừ luôn phần chính dòng đang sửa đã giữ chỗ (SoLuongTheoLenh hiện tại), để không tự
            // chặn chính mình khi giữ nguyên hoặc giảm số lượng.
            var giuChoHuy = (await HuyThanhLyReservationHelper.LayGiuChoAsync(db, [entity.MaTonKho.Value])).GetValueOrDefault(entity.MaTonKho.Value) - entity.SoLuongTheoLenh;
            var giuChoXuatKho = (await XuatKhoReservationHelper.LayGiuChoAsync(db, [entity.MaTonKho.Value])).GetValueOrDefault(entity.MaTonKho.Value);
            var giuChoThayDoiViTri = (await ThayDoiViTriReservationHelper.LayGiuChoAsync(db, [entity.MaTonKho.Value])).GetValueOrDefault(entity.MaTonKho.Value);
            var khaDung = tonKho.SoLuong - giuChoChuyenCap - giuChoHuy - giuChoXuatKho - giuChoThayDoiViTri;
            if (dto.SoLuongTheoLenh > khaDung)
                return BadRequest(new { message = $"Dòng tồn kho này chỉ còn {khaDung} khả dụng, không thể chọn {dto.SoLuongTheoLenh}" });
        }
        else if (entity.MaCcl.HasValue)
        {
            var loiTonKho = await KiemTraVuotTonKhoXuat(entity.MaLenhNavigation.MaKhoXuat, maLenh, entity.MaTbdb, entity.MaCcl.Value,
                dto.SoLuongTheoLenh, boQuaMaCtdongBoLenh: maCtdongBoLenh);
            if (loiTonKho != null) return BadRequest(new { message = loiTonKho });
        }

        entity.SoLuongTheoLenh = dto.SoLuongTheoLenh;
        entity.DonGiaTheoLenh = dto.DonGiaTheoLenh;
        entity.GhiChu = dto.GhiChu;
        // Không cho đổi TBDB/Cấp chất lượng sau khi tạo — muốn đổi thì xóa dòng cũ, thêm dòng mới.

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "CtdongBoTrongLenh", entity.MaTbdb,
            $"Cập nhật dòng chi tiết \"{entity.MaTbdb}\" trong lệnh \"{maLenh}\"");
        return Ok(new { message = "Cập nhật thành công" });
    }

    [HttpDelete("{maLenh}/chi-tiet/{maCtdongBoLenh:long}")]
    public async Task<IActionResult> RemoveChiTiet(string maLenh, long maCtdongBoLenh)
    {
        var entity = await db.CtdongBoTrongLenhs.Include(c => c.MaLenhNavigation)
            .FirstOrDefaultAsync(c => c.MaCtdongBoLenh == maCtdongBoLenh && c.MaLenh == maLenh);
        if (entity == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });
        if (!ThuocKhoNguoiDung(entity.MaLenhNavigation.MaKhoNhap, entity.MaLenhNavigation.MaKhoXuat))
            return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

        db.CtdongBoTrongLenhs.Remove(entity);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "CtdongBoTrongLenh", entity.MaTbdb,
            $"Xóa dòng chi tiết \"{entity.MaTbdb}\" khỏi lệnh \"{maLenh}\"");
        return Ok(new { message = "Xóa thành công" });
    }

    // 1 bên của lệnh luôn là kho nội bộ (kho nhập với lệnh Nhập, kho xuất với lệnh Xuất).
    // Bên còn lại có thể là kho nội bộ khác (chuyển kho) HOẶC nhà cung cấp/đối tác ngoài hệ
    // thống (MaNcc) — không được bỏ trống cả hai, cũng không được điền cả hai cùng lúc. Riêng lệnh
    // Xuất hủy/thanh lý: bên nhận luôn là 1 KHO NGHIỆP VỤ (KNV, VD "Kho hủy/thanh lý") — không
    // phải kho vật lý bình thường, không phải nhà cung cấp/đối tác — trang bị coi như đã ra khỏi
    // lưu thông thật nhưng vẫn giữ dấu vết trong hệ thống (không tự động xóa hẳn).
    private async Task<string?> ValidateKhoDoiTac(string? tenLoaiLenh, string? maKhoNhap, string? maKhoXuat, string? maNcc)
    {
        var laXuat = (tenLoaiLenh ?? "").Contains("Xuất", StringComparison.OrdinalIgnoreCase);
        var khoNoiBo = laXuat ? maKhoXuat : maKhoNhap;
        var khoDoiDien = laXuat ? maKhoNhap : maKhoXuat;

        if (string.IsNullOrWhiteSpace(khoNoiBo))
            return laXuat ? "Phải chọn Kho xuất" : "Phải chọn Kho nhập";

        var laHuyThanhLy = (tenLoaiLenh ?? "").Contains("hủy", StringComparison.OrdinalIgnoreCase)
            || (tenLoaiLenh ?? "").Contains("thanh lý", StringComparison.OrdinalIgnoreCase);
        if (laHuyThanhLy)
        {
            if (string.IsNullOrWhiteSpace(maKhoNhap)) return "Phải chọn Kho nhập (kho nghiệp vụ hủy/thanh lý)";
            if (!string.IsNullOrWhiteSpace(maNcc)) return "Lệnh hủy/thanh lý không có nhà cung cấp/đối tác";
            var khoNhap = await db.Khos.FindAsync(maKhoNhap);
            if (khoNhap == null || khoNhap.MaLoaiKho != "KNV")
                return "Kho nhập của lệnh hủy/thanh lý phải là kho nghiệp vụ";
            return null;
        }

        var coKhoDoiDien = !string.IsNullOrWhiteSpace(khoDoiDien);
        var coNcc = !string.IsNullOrWhiteSpace(maNcc);
        if (!coKhoDoiDien && !coNcc)
            return laXuat ? "Phải chọn Kho nhập (chuyển kho nội bộ) hoặc Nhà cung cấp/đối tác (giao ra ngoài)" : "Phải chọn Kho xuất (chuyển kho nội bộ) hoặc Nhà cung cấp/đối tác (nhập từ ngoài)";
        if (coKhoDoiDien && coNcc)
            return "Chỉ chọn 1 trong 2: kho nội bộ hoặc nhà cung cấp/đối tác, không chọn cả hai";

        return null;
    }

    private static object Shape(Lenh l, int soDongChiTiet) => new
    {
        maLenh = l.MaLenh,
        maLoaiLenh = l.MaLoaiLenh,
        tenLoaiLenh = l.MaLoaiLenhNavigation?.TenNx,
        maLenhChiTiet = l.MaLenhChiTiet,
        tenLyDo = l.MaLenhChiTietNavigation?.TenCtnx,
        ngay = l.Ngay,
        ngayHieuLuc = l.NgayHieuLuc,
        giaTriDenNgay = l.GiaTriDenNgay,
        trangThai = l.TrangThai,
        canCu = l.CanCu,
        veViec = l.VeViec,
        maHttt = l.MaHttt,
        tenHttt = l.MaHtttNavigation?.TenHttt,
        maKhoNhap = l.MaKhoNhap,
        tenKhoNhap = l.MaKhoNhapNavigation?.TenKho,
        maKhoXuat = l.MaKhoXuat,
        tenKhoXuat = l.MaKhoXuatNavigation?.TenKho,
        maNcc = l.MaNcc,
        tenNcc = l.MaNccNavigation?.TenNcc,
        ptVanChuyen = l.PtVanChuyen,
        donViChuyen = l.DonViChuyen,
        nguoiTao = l.NguoiTao,
        ghiChu = l.GhiChu,
        soDongChiTiet,
    };
}

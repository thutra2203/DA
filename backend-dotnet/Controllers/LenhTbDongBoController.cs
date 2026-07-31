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
    string? MaKhoNhap, string? MaKhoXuat, string? MaNcc, string? PtVanChuyen, string? GhiChu);

public record CtdbtlDto(string MaTbdb, int MaCcl, int SoLuongTheoLenh, decimal? DonGiaTheoLenh, string? GhiChu);

// Xử lý "thực nhập" cho 1 dòng chi tiết lệnh Nhập — mỗi dòng chỉ tạo đúng 1 Lô hàng (LoTbdb)
// mang số lượng/đơn giá thực nhập. Việc phân bổ lô đó vào (các) vị trí cụ thể trong kho —
// mỗi vị trí 1 dòng Tồn kho (TonKhoTbdb), 1 lô có thể có nhiều tồn kho — làm ở bước sau,
// dùng CRUD sẵn có của TonKhoTbdb (xem TbDongBoController).
public record TaoLoDto(string MaLoTbdb, int? NamSx, string? MaNuocSx, string? MaTinhTrangBaoGoi, decimal DonGia, int SoLuongThucNhap, string? GhiChu);

[ApiController]
[Authorize]
[Microsoft.AspNetCore.Mvc.Route("api/tb-dong-bo/lenh")]
public class LenhTbDongBoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    private const string TableLabel = "Lệnh nhập/xuất trang bị đồng bộ";

    // GET api/tb-dong-bo/lenh?maLoaiLenh=NX03&maKho=K01
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? maLoaiLenh, [FromQuery] string? maKho)
    {
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

        var soDong = await db.CtdongBoTrongLenhs.CountAsync(c => c.MaLenh == maLenh);
        return Ok(Shape(l, soDong));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] LenhTbDongBoDto dto)
    {
        var loaiLenh = await db.TinhChatNhapXuats.FindAsync(dto.MaLoaiLenh);
        if (loaiLenh == null || loaiLenh.NhomTb != "TBDB")
            return BadRequest(new { message = "Loại lệnh không hợp lệ hoặc không thuộc nhóm trang bị đồng bộ" });

        var loiKhoDoiTac = ValidateKhoDoiTac(loaiLenh.TenNx, dto.MaKhoNhap, dto.MaKhoXuat, dto.MaNcc);
        if (loiKhoDoiTac != null) return BadRequest(new { message = loiKhoDoiTac });

        var entity = new Lenh
        {
            MaLenh = dto.MaLenh,
            MaLoaiLenh = dto.MaLoaiLenh,
            MaLenhChiTiet = dto.MaLenhChiTiet,
            Ngay = dto.Ngay,
            NgayHieuLuc = dto.NgayHieuLuc,
            GiaTriDenNgay = dto.GiaTriDenNgay,
            TrangThai = dto.TrangThai,
            CanCu = dto.CanCu,
            VeViec = dto.VeViec,
            MaHttt = dto.MaHttt,
            MaKhoNhap = dto.MaKhoNhap,
            MaKhoXuat = dto.MaKhoXuat,
            MaNcc = dto.MaNcc,
            PtVanChuyen = dto.PtVanChuyen,
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

        var loiKhoDoiTac = ValidateKhoDoiTac(entity.MaLoaiLenhNavigation.TenNx, dto.MaKhoNhap, dto.MaKhoXuat, dto.MaNcc);
        if (loiKhoDoiTac != null) return BadRequest(new { message = loiKhoDoiTac });

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

        db.Lenhs.Remove(entity);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "Lenh", maLenh, $"Xóa bản ghi \"{maLenh}\" trong {TableLabel}");
        return Ok(new { message = "Xóa thành công" });
    }

    // POST api/tb-dong-bo/lenh/{maLenh}/hoan-thanh
    // Kết thúc lệnh Nhập: chỉ cho phép khi TẤT CẢ dòng chi tiết đã tạo lô và mỗi lô đã được
    // phân bổ đủ vào tồn kho (không thiếu, không thừa). Sau khi kết thúc, các Lô liên quan
    // chuyển trangThaiLo sang HOAN_THANH — đây là lúc dữ liệu chính thức trở thành thực lực
    // của đơn vị (xem TbDongBoController.GetByKho/GetChiTiet chỉ tính lô đã HOAN_THANH).
    [HttpPost("{maLenh}/hoan-thanh")]
    public async Task<IActionResult> HoanThanh(string maLenh)
    {
        var lenh = await db.Lenhs.Include(l => l.MaLoaiLenhNavigation).FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if (lenh.TrangThai == "HOAN_THANH")
            return BadRequest(new { message = "Lệnh đã được kết thúc trước đó" });

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

    // ===== Chi tiết đồng bộ trong lệnh =====

    // GET api/tb-dong-bo/lenh/{maLenh}/chi-tiet
    [HttpGet("{maLenh}/chi-tiet")]
    public async Task<IActionResult> GetChiTiet(string maLenh)
    {
        var list = await db.CtdongBoTrongLenhs
            .Include(c => c.MaTbdbNavigation)
            .Include(c => c.MaCclNavigation)
            .Include(c => c.LoTbdb).ThenInclude(l => l!.TonKhoTbdbs).ThenInclude(t => t.MaKhoNavigation)
            .Include(c => c.LoTbdb).ThenInclude(l => l!.TonKhoTbdbs).ThenInclude(t => t.MaTrangThaiTbNavigation)
            .Where(c => c.MaLenh == maLenh)
            .OrderBy(c => c.MaTbdb).ThenBy(c => c.MaCcl)
            .ToListAsync();

        var result = list.Select(c => new
        {
            maCtdongBoLenh = c.MaCtdongBoLenh,
            maLenh = c.MaLenh,
            maTbdb = c.MaTbdb,
            tenTbdb = c.MaTbdbNavigation.TenTbdb,
            maCcl = c.MaCcl,
            tenCcl = c.MaCclNavigation != null ? c.MaCclNavigation.TenCap : null,
            soLuongTheoLenh = c.SoLuongTheoLenh,
            donGiaTheoLenh = c.DonGiaTheoLenh,
            ghiChu = c.GhiChu,
            daTaoLo = c.LoTbdb != null,
            maLoTbdb = c.LoTbdb != null ? c.LoTbdb.MaLoTbdb : null,
            soLuongThucNhap = c.LoTbdb != null ? c.LoTbdb.SoLuongNhap : (int?)null,
            donGiaThucNhap = c.LoTbdb != null ? c.LoTbdb.DonGia : (decimal?)null,
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

    private static readonly string[] MauNhapLoHeaders =
    [
        "Mã TB", "Cấp CL (1-5)", "Mã lô", "Năm SX", "Nước SX (mã)", "Tình trạng bao gói (mã)", "Đơn giá thực tế",
        "Kho (mã)", "Nhà kho", "Khu", "Khối", "Giá", "Tầng", "Hòm", "Mô tả vị trí", "Trạng thái TB (mã)",
        "Số lượng tại vị trí", "Ghi chú",
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

        var chuaXuLy = await db.CtdongBoTrongLenhs
            .Include(c => c.MaTbdbNavigation)
            .Include(c => c.MaCclNavigation)
            .Where(c => c.MaLenh == maLenh && c.LoTbdb == null)
            .OrderBy(c => c.MaTbdb)
            .ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Nhap lo");
        // Cột bắt buộc: Mã TB(1), Cấp CL(2), Mã lô(3), Đơn giá(7), Kho(8), Trạng thái TB(16), Số lượng(17).
        int[] cotBatBuoc = [1, 2, 3, 7, 8, 16, 17];
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
            ws.Cell(r, 3).Value = $"{c.MaTbdb}-{c.MaCtdongBoLenh}";
            ws.Cell(r, 7).Value = c.DonGiaTheoLenh;
            ws.Cell(r, 8).Value = lenh.MaKhoNhap;
            ws.Cell(r, 17).Value = c.SoLuongTheoLenh;
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
        GhiDanhMuc("Trạng thái TB", await db.TrangThaiTbs.Select(x => new { x.MaTttb, x.TenTttb }).ToListAsync().ContinueWith(t => t.Result.Select(x => (x.MaTttb, x.TenTttb))));
        wsDm.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"mau-nhap-lo-{maLenh}.xlsx");
    }

    // POST api/tb-dong-bo/lenh/{maLenh}/nhap-lo-file
    // Nhập hàng loạt Lô + Tồn kho từ file Excel (mẫu ở trên). Mỗi dòng file = 1 vị trí; các
    // dòng cùng (Mã TB, Cấp CL) được gộp thành 1 Lô, số lượng thực nhập của lô = tổng SL các
    // dòng đó — nên không thể xảy ra tình trạng phân bổ thiếu/thừa. Xử lý theo từng nhóm độc
    // lập: nhóm nào lỗi thì báo lỗi và bỏ qua, không ảnh hưởng các nhóm khác trong cùng file.
    [HttpPost("{maLenh}/nhap-lo-file")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> NhapLoTuFile(string maLenh, IFormFile file)
    {
        var lenh = await db.Lenhs.Include(l => l.MaLoaiLenhNavigation).FirstOrDefaultAsync(l => l.MaLenh == maLenh);
        if (lenh == null) return NotFound(new { message = "Không tìm thấy lệnh" });
        if ((lenh.MaLoaiLenhNavigation.TenNx ?? "").Contains("Xuất", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Chỉ nhập file cho lệnh Nhập" });
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chưa chọn file" });

        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheet(1);
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        var rawRows = new List<(int dong, string maTbdb, int? maCcl, string maLoTbdb, int? namSx, string? maNuocSx,
            string? maTinhTrangBaoGoi, decimal? donGia, string maKho, string? tenNhaKho, string? tenDinhKhu,
            string? tenKhoi, string? tenGia, string? tenTang, string? tenHom, string? moTaViTri, string maTrangThaiTb,
            int? soLuong, string? ghiChu)>();

        var loiDoc = new List<object>();
        for (var r = 2; r <= lastRow; r++)
        {
            var maTbdb = ws.Cell(r, 1).GetString().Trim();
            if (string.IsNullOrWhiteSpace(maTbdb)) continue; // bỏ qua dòng trống

            int? maCcl = int.TryParse(ws.Cell(r, 2).GetString().Trim(), out var ccl) ? ccl : null;
            var maLoTbdb = ws.Cell(r, 3).GetString().Trim();
            int? namSx = int.TryParse(ws.Cell(r, 4).GetString().Trim(), out var ns) ? ns : null;
            var maNuocSx = ws.Cell(r, 5).GetString().Trim();
            var maTtbg = ws.Cell(r, 6).GetString().Trim();
            decimal? donGia = decimal.TryParse(ws.Cell(r, 7).GetString().Trim(), out var dg) ? dg : null;
            var maKho = ws.Cell(r, 8).GetString().Trim();
            var tenNhaKho = ws.Cell(r, 9).GetString().Trim();
            var tenDinhKhu = ws.Cell(r, 10).GetString().Trim();
            var tenKhoi = ws.Cell(r, 11).GetString().Trim();
            var tenGia = ws.Cell(r, 12).GetString().Trim();
            var tenTang = ws.Cell(r, 13).GetString().Trim();
            var tenHom = ws.Cell(r, 14).GetString().Trim();
            var moTaViTri = ws.Cell(r, 15).GetString().Trim();
            var maTrangThaiTb = ws.Cell(r, 16).GetString().Trim();
            int? soLuong = int.TryParse(ws.Cell(r, 17).GetString().Trim(), out var sl) ? sl : null;
            var ghiChu = ws.Cell(r, 18).GetString().Trim();

            var thieuTruong = new List<string>();
            if (maCcl == null) thieuTruong.Add("Cấp CL (phải là số 1-5)");
            if (string.IsNullOrWhiteSpace(maLoTbdb)) thieuTruong.Add("Mã lô");
            if (donGia == null) thieuTruong.Add("Đơn giá thực tế (phải là số)");
            if (string.IsNullOrWhiteSpace(maKho)) thieuTruong.Add("Kho (mã)");
            if (string.IsNullOrWhiteSpace(maTrangThaiTb)) thieuTruong.Add("Trạng thái TB (mã)");
            if (soLuong == null) thieuTruong.Add("Số lượng tại vị trí (phải là số)");
            else if (soLuong <= 0) thieuTruong.Add("Số lượng tại vị trí (phải > 0)");

            if (thieuTruong.Count > 0)
            {
                loiDoc.Add(new { dong = r, maTbdb, loi = $"Thiếu/sai: {string.Join(", ", thieuTruong)}" });
                continue;
            }

            rawRows.Add((r, maTbdb, maCcl, maLoTbdb, namSx, maNuocSx, maTtbg, donGia, maKho, tenNhaKho, tenDinhKhu, tenKhoi, tenGia, tenTang, tenHom, moTaViTri, maTrangThaiTb, soLuong, ghiChu));
        }

        var ketQua = new List<object>(loiDoc);
        var thanhCong = 0;

        foreach (var nhom in rawRows.GroupBy(x => (x.maTbdb, x.maCcl)))
        {
            var dongDauTien = nhom.First().dong;
            var maLoList = nhom.Select(x => x.maLoTbdb).Distinct().ToList();
            if (maLoList.Count > 1)
            {
                ketQua.Add(new { dong = dongDauTien, maTbdb = nhom.Key.maTbdb, loi = $"Các dòng cùng TB/Cấp phải cùng 1 Mã lô, đang có: {string.Join(", ", maLoList)}" });
                continue;
            }

            var ctdbtl = await db.CtdongBoTrongLenhs
                .Include(c => c.LoTbdb)
                .FirstOrDefaultAsync(c => c.MaLenh == maLenh && c.MaTbdb == nhom.Key.maTbdb && c.MaCcl == nhom.Key.maCcl);
            if (ctdbtl == null)
            {
                ketQua.Add(new { dong = dongDauTien, maTbdb = nhom.Key.maTbdb, loi = $"Không tìm thấy dòng chi tiết TB={nhom.Key.maTbdb}, Cấp={nhom.Key.maCcl} trong lệnh này" });
                continue;
            }
            if (ctdbtl.LoTbdb != null)
            {
                ketQua.Add(new { dong = dongDauTien, maTbdb = nhom.Key.maTbdb, loi = $"Dòng này đã có lô \"{ctdbtl.LoTbdb.MaLoTbdb}\" từ trước, bỏ qua" });
                continue;
            }

            var dauTien = nhom.First();
            var lo = new LoTbdb
            {
                MaLoTbdb = dauTien.maLoTbdb,
                MaTbdb = ctdbtl.MaTbdb,
                MaCtdongBoLenh = ctdbtl.MaCtdongBoLenh,
                MaCcl = nhom.Key.maCcl!.Value,
                NamSx = dauTien.namSx,
                MaNuocSx = string.IsNullOrWhiteSpace(dauTien.maNuocSx) ? null : dauTien.maNuocSx,
                MaTinhTrangBaoGoi = string.IsNullOrWhiteSpace(dauTien.maTinhTrangBaoGoi) ? null : dauTien.maTinhTrangBaoGoi,
                DonGia = dauTien.donGia!.Value,
                SoLuongNhap = nhom.Sum(x => x.soLuong!.Value),
                TrangThaiLo = "NHAP",
                GhiChu = string.IsNullOrWhiteSpace(dauTien.ghiChu) ? null : dauTien.ghiChu,
            };
            db.LoTbdbs.Add(lo);

            var tonKhoList = nhom.Select(x => new TonKhoTbdb
            {
                MaLoTbdbNavigation = lo,
                MaKho = x.maKho,
                TenNhaKho = string.IsNullOrWhiteSpace(x.tenNhaKho) ? null : x.tenNhaKho,
                TenDinhKhu = string.IsNullOrWhiteSpace(x.tenDinhKhu) ? null : x.tenDinhKhu,
                TenKhoi = string.IsNullOrWhiteSpace(x.tenKhoi) ? null : x.tenKhoi,
                TenGia = string.IsNullOrWhiteSpace(x.tenGia) ? null : x.tenGia,
                TenTang = string.IsNullOrWhiteSpace(x.tenTang) ? null : x.tenTang,
                TenHom = string.IsNullOrWhiteSpace(x.tenHom) ? null : x.tenHom,
                MoTaViTri = string.IsNullOrWhiteSpace(x.moTaViTri) ? null : x.moTaViTri,
                MaTrangThaiTb = x.maTrangThaiTb,
                SoLuong = x.soLuong!.Value,
                GhiChu = string.IsNullOrWhiteSpace(x.ghiChu) ? null : x.ghiChu,
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
                ketQua.Add(new { dong = dongDauTien, maTbdb = nhom.Key.maTbdb, loi = DbErrorTranslator.Translate(ex) });
            }
        }

        if (thanhCong > 0)
        {
            await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "LoTbdb", maLenh,
                $"Nhập file: tạo {thanhCong} lô từ file cho lệnh \"{maLenh}\"");
        }

        return Ok(new { tongSoDong = rawRows.Count + loiDoc.Count, thanhCong, thatBai = ketQua.Count, chiTietLoi = ketQua });
    }

    [HttpPost("{maLenh}/chi-tiet")]
    public async Task<IActionResult> AddChiTiet(string maLenh, [FromBody] CtdbtlDto dto)
    {
        if (!await db.Lenhs.AnyAsync(l => l.MaLenh == maLenh))
            return NotFound(new { message = "Không tìm thấy lệnh" });

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
        return StatusCode(201, new { message = "Thêm dòng chi tiết thành công" });
    }

    [HttpPut("{maLenh}/chi-tiet/{maCtdongBoLenh:long}")]
    public async Task<IActionResult> UpdateChiTiet(string maLenh, long maCtdongBoLenh, [FromBody] CtdbtlDto dto)
    {
        var entity = await db.CtdongBoTrongLenhs.FirstOrDefaultAsync(c => c.MaCtdongBoLenh == maCtdongBoLenh && c.MaLenh == maLenh);
        if (entity == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

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
        var entity = await db.CtdongBoTrongLenhs.FirstOrDefaultAsync(c => c.MaCtdongBoLenh == maCtdongBoLenh && c.MaLenh == maLenh);
        if (entity == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

        db.CtdongBoTrongLenhs.Remove(entity);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "CtdongBoTrongLenh", entity.MaTbdb,
            $"Xóa dòng chi tiết \"{entity.MaTbdb}\" khỏi lệnh \"{maLenh}\"");
        return Ok(new { message = "Xóa thành công" });
    }

    // 1 bên của lệnh luôn là kho nội bộ (kho nhập với lệnh Nhập, kho xuất với lệnh Xuất).
    // Bên còn lại có thể là kho nội bộ khác (chuyển kho) HOẶC nhà cung cấp/đối tác ngoài hệ
    // thống (MaNcc) — không được bỏ trống cả hai, cũng không được điền cả hai cùng lúc.
    private static string? ValidateKhoDoiTac(string? tenLoaiLenh, string? maKhoNhap, string? maKhoXuat, string? maNcc)
    {
        var laXuat = (tenLoaiLenh ?? "").Contains("Xuất", StringComparison.OrdinalIgnoreCase);
        var khoNoiBo = laXuat ? maKhoXuat : maKhoNhap;
        var khoDoiDien = laXuat ? maKhoNhap : maKhoXuat;

        if (string.IsNullOrWhiteSpace(khoNoiBo))
            return laXuat ? "Phải chọn Kho xuất" : "Phải chọn Kho nhập";

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
        nguoiTao = l.NguoiTao,
        ghiChu = l.GhiChu,
        soDongChiTiet,
    };
}

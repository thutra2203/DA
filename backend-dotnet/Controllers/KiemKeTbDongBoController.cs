using System.Text.RegularExpressions;
using backend_dotnet.Models;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

// Kiểm kê TBĐB: đối chiếu số lượng sổ sách (tồn kho hệ thống đang ghi nhận) với số lượng đếm
// thực tế tại 1 kho, trong 1 đợt kiểm kê (DotKiemKe). PhieuKiemKe (NhomTb = "TBDB") là phiếu
// kiểm kê của 1 kho trong 1 đợt. ChiTietKiemKe là dòng TỔNG HỢP theo (TBĐB, cấp chất lượng) —
// ví dụ "Bao xe cấp 1", "Bao xe cấp 2" là 2 dòng riêng — chỉ để xem nhanh, KHÔNG nhập trực tiếp.
// Mỗi dòng có các dòng con ChiTietKiemKeViTri (1 dòng / lô + vị trí cụ thể trong kho), snapshot
// từ TonKhoTBDB (chỉ lô đã HOAN_THANH, tức thực lực) ngay khi tạo phiếu — người kiểm kê nhập
// soLuongThucTe ở TỪNG dòng vị trí/lô đó; sau mỗi lần lưu, soLuongThucTe của dòng cha ChiTietKiemKe
// được cộng dồn lại từ tổng các dòng con để hiển thị trên trang tổng hợp theo cấp. Thừa/Thiếu ở
// cả 2 cấp đều do CSDL tự tính (computed column), không set từ code. Kiểm kê chỉ GHI NHẬN chênh
// lệch, không tự động điều chỉnh lại tồn kho.
public record TaoPhieuKiemKeDto(string MaDotKiemKe, string MaKho, DateOnly NgayLap, DateOnly? NgayKiemKe);
public record SuaPhieuKiemKeDto(DateOnly NgayLap, DateOnly? NgayKiemKe, string? NoiDung);
public record CapNhatChiTietViTriDto(int SoLuongThucTe, string? GhiChu);

[ApiController]
[Authorize]
[Microsoft.AspNetCore.Mvc.Route("api/tb-dong-bo/kiem-ke")]
public class KiemKeTbDongBoController(QuanLyKhoQuanKhiContext db, IActivityLogger log) : ControllerBase
{
    private const string NhomTbTbdb = "TBDB";

    // GET api/tb-dong-bo/kiem-ke?maDotKiemKe=&maKho=
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? maDotKiemKe, [FromQuery] string? maKho)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        var query = db.PhieuKiemKes
            .Include(p => p.MaDotKiemKeNavigation)
            .Include(p => p.MaKhoNavigation)
            .Where(p => p.NhomTb == NhomTbTbdb);
        if (!string.IsNullOrWhiteSpace(maDotKiemKe)) query = query.Where(p => p.MaDotKiemKe == maDotKiemKe);
        if (!string.IsNullOrWhiteSpace(maKho)) query = query.Where(p => p.MaKho == maKho);

        var phieus = await query.OrderByDescending(p => p.NgayLap).ToListAsync();
        var maPhieus = phieus.Select(p => p.MaPhieuKiemKe).ToList();
        var tongHop = await db.ChiTietKiemKes
            .Where(c => maPhieus.Contains(c.MaPhieuKiemKe))
            .GroupBy(c => c.MaPhieuKiemKe)
            .Select(g => new { MaPhieu = g.Key, SoDong = g.Count(), SoThua = g.Sum(x => x.Thua ?? 0), SoThieu = g.Sum(x => x.Thieu ?? 0) })
            .ToDictionaryAsync(x => x.MaPhieu);

        var result = phieus.Select(p =>
        {
            tongHop.TryGetValue(p.MaPhieuKiemKe, out var t);
            return new
            {
                maPhieuKiemKe = p.MaPhieuKiemKe,
                maDotKiemKe = p.MaDotKiemKe,
                tenDotKiemKe = p.MaDotKiemKeNavigation?.TenDotKiemKe,
                maKho = p.MaKho,
                tenKho = p.MaKhoNavigation?.TenKho,
                ngayLap = p.NgayLap,
                ngayKiemKe = p.NgayKiemKe,
                ngayKetThuc = p.NgayKetThuc,
                trangThai = p.TrangThai,
                nguoiTao = p.NguoiTao,
                nguoiKiemKe = p.NguoiKiemKe,
                soDong = t?.SoDong ?? 0,
                soThua = t?.SoThua ?? 0,
                soThieu = t?.SoThieu ?? 0,
            };
        });
        return Ok(result);
    }

    // GET api/tb-dong-bo/kiem-ke/{maPhieu}
    [HttpGet("{maPhieu}")]
    public async Task<IActionResult> GetOne(string maPhieu)
    {
        var phieu = await db.PhieuKiemKes
            .Include(p => p.MaDotKiemKeNavigation)
            .Include(p => p.MaKhoNavigation)
            .FirstOrDefaultAsync(p => p.MaPhieuKiemKe == maPhieu && p.NhomTb == NhomTbTbdb);
        if (phieu == null) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });
        if (this.IsGioiHanKho() && phieu.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });

        var chiTietRaw = await db.ChiTietKiemKes
            .Include(c => c.MaTbdbNavigation).ThenInclude(t => t.MaDvtNavigation)
            .Include(c => c.MaCclNavigation)
            .Where(c => c.MaPhieuKiemKe == maPhieu)
            .OrderBy(c => c.MaTbdb).ThenBy(c => c.MaCcl)
            .ToListAsync();

        // Thuyết minh thừa/thiếu, Năm SX, Nước SX trên bản in lấy từ các dòng vị trí (qua lô) —
        // dòng tổng hợp (ChiTietKiemKe) không lưu trực tiếp các thông tin này, và 1 dòng tổng hợp
        // có thể gồm nhiều lô khác năm/nước SX nên gộp lại thành danh sách giá trị khác nhau.
        var viTriInfo = await db.ChiTietKiemKeViTris
            .Include(v => v.MaLoTbdbNavigation).ThenInclude(l => l!.MaNuocSxNavigation)
            .Where(v => v.MaCtkiemKeNavigation!.MaPhieuKiemKe == maPhieu)
            .Select(v => new
            {
                v.MaCtkiemKe,
                v.GhiChu,
                NamSx = v.MaLoTbdbNavigation != null ? v.MaLoTbdbNavigation.NamSx : null,
                NuocSx = v.MaLoTbdbNavigation != null && v.MaLoTbdbNavigation.MaNuocSxNavigation != null ? v.MaLoTbdbNavigation.MaNuocSxNavigation.TenNsx : null,
            })
            .ToListAsync();

        var ghiChuMap = viTriInfo.Where(v => !string.IsNullOrWhiteSpace(v.GhiChu))
            .GroupBy(v => v.MaCtkiemKe).ToDictionary(g => g.Key, g => string.Join("; ", g.Select(x => x.GhiChu).Distinct()));
        var namSxMap = viTriInfo.Where(v => v.NamSx != null)
            .GroupBy(v => v.MaCtkiemKe).ToDictionary(g => g.Key, g => string.Join(", ", g.Select(x => x.NamSx).Distinct().OrderBy(x => x)));
        var nuocSxMap = viTriInfo.Where(v => !string.IsNullOrWhiteSpace(v.NuocSx))
            .GroupBy(v => v.MaCtkiemKe).ToDictionary(g => g.Key, g => string.Join(", ", g.Select(x => x.NuocSx).Distinct()));

        var chiTiet = chiTietRaw.Select(c => new
        {
            maCtKiemKe = c.MaCtkiemKe,
            maTbdb = c.MaTbdb,
            tenTbdb = c.MaTbdbNavigation?.TenTbdb,
            tenDvt = c.MaTbdbNavigation?.MaDvtNavigation?.TenDvt,
            maCcl = c.MaCcl,
            capChatLuong = c.MaCclNavigation?.TenCap,
            soLuongKyTruoc = c.SoLuongKyTruoc,
            soLuongSoSach = c.SoLuongSoSach,
            soLuongThucTe = c.SoLuongThucTe,
            // Tăng/Giảm: biến động của SL sổ sách so với SL kỳ trước (Nhập/Xuất phát sinh trong kỳ).
            tang = c.SoLuongSoSach > c.SoLuongKyTruoc ? c.SoLuongSoSach - c.SoLuongKyTruoc : 0,
            giam = c.SoLuongKyTruoc > c.SoLuongSoSach ? c.SoLuongKyTruoc - c.SoLuongSoSach : 0,
            thua = c.Thua,
            thieu = c.Thieu,
            ghiChu = ghiChuMap.GetValueOrDefault(c.MaCtkiemKe),
            namSx = namSxMap.GetValueOrDefault(c.MaCtkiemKe),
            nuocSx = nuocSxMap.GetValueOrDefault(c.MaCtkiemKe),
        }).ToList();

        return Ok(new
        {
            maPhieuKiemKe = phieu.MaPhieuKiemKe,
            maDotKiemKe = phieu.MaDotKiemKe,
            tenDotKiemKe = phieu.MaDotKiemKeNavigation?.TenDotKiemKe,
            maKho = phieu.MaKho,
            tenKho = phieu.MaKhoNavigation?.TenKho,
            ngayLap = phieu.NgayLap,
            ngayKiemKe = phieu.NgayKiemKe,
            ngayKetThuc = phieu.NgayKetThuc,
            trangThai = phieu.TrangThai,
            daKetThuc = phieu.TrangThai == "HOAN_THANH",
            nguoiTao = phieu.NguoiTao,
            nguoiKiemKe = phieu.NguoiKiemKe,
            noiDung = phieu.NoiDung,
            chiTiet,
        });
    }

    // GET api/tb-dong-bo/kiem-ke/{maPhieu}/chi-tiet/{maCtKiemKe}
    // Chi tiết 1 dòng (TBĐB, cấp chất lượng) — kèm danh sách các dòng lô + vị trí tồn kho cụ thể
    // để nhập số lượng thực tế.
    [HttpGet("{maPhieu}/chi-tiet/{maCtKiemKe:int}")]
    public async Task<IActionResult> GetChiTietViTri(string maPhieu, int maCtKiemKe)
    {
        var ct = await db.ChiTietKiemKes
            .Include(c => c.MaPhieuKiemKeNavigation)
            .Include(c => c.MaTbdbNavigation)
            .Include(c => c.MaCclNavigation)
            .FirstOrDefaultAsync(c => c.MaCtkiemKe == maCtKiemKe && c.MaPhieuKiemKe == maPhieu);
        if (ct == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết kiểm kê" });
        if (this.IsGioiHanKho() && ct.MaPhieuKiemKeNavigation.MaKho != this.CurrentMaKho())
            return NotFound(new { message = "Không tìm thấy dòng chi tiết kiểm kê" });

        var viTri = await db.ChiTietKiemKeViTris
            .Include(v => v.MaLoTbdbNavigation).ThenInclude(l => l!.MaNuocSxNavigation)
            .Where(v => v.MaCtkiemKe == maCtKiemKe)
            .OrderBy(v => v.MaLoTbdb)
            .Select(v => new
            {
                maCtKiemKeViTri = v.MaCtkiemKeViTri,
                maLoTbdb = v.MaLoTbdb,
                namSx = v.MaLoTbdbNavigation != null ? v.MaLoTbdbNavigation.NamSx : null,
                nuocSx = v.MaLoTbdbNavigation != null && v.MaLoTbdbNavigation.MaNuocSxNavigation != null ? v.MaLoTbdbNavigation.MaNuocSxNavigation.TenNsx : null,
                tenNhaKho = v.TenNhaKho,
                tenDinhKhu = v.TenDinhKhu,
                tenKhoi = v.TenKhoi,
                tenGia = v.TenGia,
                tenTang = v.TenTang,
                tenHom = v.TenHom,
                moTaViTri = v.MoTaViTri,
                soLuongSoSach = v.SoLuongSoSach,
                soLuongThucTe = v.SoLuongThucTe,
                thua = v.Thua,
                thieu = v.Thieu,
                ghiChu = v.GhiChu,
            })
            .ToListAsync();

        return Ok(new
        {
            maPhieuKiemKe = ct.MaPhieuKiemKe,
            maKho = ct.MaPhieuKiemKeNavigation.MaKho,
            daKetThuc = ct.MaPhieuKiemKeNavigation.TrangThai == "HOAN_THANH",
            maCtKiemKe = ct.MaCtkiemKe,
            maTbdb = ct.MaTbdb,
            tenTbdb = ct.MaTbdbNavigation?.TenTbdb,
            maCcl = ct.MaCcl,
            capChatLuong = ct.MaCclNavigation?.TenCap,
            soLuongKyTruoc = ct.SoLuongKyTruoc,
            soLuongSoSach = ct.SoLuongSoSach,
            soLuongThucTe = ct.SoLuongThucTe,
            thua = ct.Thua,
            thieu = ct.Thieu,
            viTri,
        });
    }

    // PUT api/tb-dong-bo/kiem-ke/{maPhieu}
    // Sửa thông tin đầu phiếu (ngày lập, ngày kiểm kê, nội dung) — không cho sửa đợt kiểm kê /
    // kho vì mã phiếu và toàn bộ chi tiết đã được sinh gắn với 2 giá trị đó lúc tạo phiếu.
    [HttpPut("{maPhieu}")]
    public async Task<IActionResult> SuaPhieu(string maPhieu, [FromBody] SuaPhieuKiemKeDto dto)
    {
        var phieu = await db.PhieuKiemKes.FirstOrDefaultAsync(p => p.MaPhieuKiemKe == maPhieu && p.NhomTb == NhomTbTbdb);
        if (phieu == null) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });
        if (this.IsGioiHanKho() && phieu.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });
        if (phieu.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Phiếu đã kết thúc, không thể sửa" });

        phieu.NgayLap = dto.NgayLap;
        phieu.NgayKiemKe = dto.NgayKiemKe;
        phieu.NoiDung = dto.NoiDung;

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "PhieuKiemKe", maPhieu,
            $"Sửa thông tin phiếu kiểm kê TBĐB \"{maPhieu}\"");

        return Ok(new { message = "Cập nhật phiếu kiểm kê thành công" });
    }

    // DELETE api/tb-dong-bo/kiem-ke/{maPhieu}
    // Chỉ xóa được khi phiếu chưa kết thúc và chưa từng dùng làm căn cứ chuyển kỳ; xóa các dòng
    // vị trí/lô, rồi các dòng chi tiết theo cấp, rồi mới xóa phiếu (các FK không cho null) trong
    // cùng 1 transaction.
    [HttpDelete("{maPhieu}")]
    public async Task<IActionResult> XoaPhieu(string maPhieu)
    {
        var phieu = await db.PhieuKiemKes.FirstOrDefaultAsync(p => p.MaPhieuKiemKe == maPhieu && p.NhomTb == NhomTbTbdb);
        if (phieu == null) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });
        if (this.IsGioiHanKho() && phieu.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });
        if (phieu.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Phiếu đã kết thúc, không thể xóa" });

        if (await db.ChuyenKies.AnyAsync(c => c.MaPhieuKiemKe == maPhieu))
            return BadRequest(new { message = "Phiếu này đã được dùng để chuyển kỳ, không thể xóa" });

        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var chiTiet = await db.ChiTietKiemKes.Where(c => c.MaPhieuKiemKe == maPhieu).ToListAsync();
            var maCtKiemKes = chiTiet.Select(c => c.MaCtkiemKe).ToList();
            var viTri = await db.ChiTietKiemKeViTris.Where(v => maCtKiemKes.Contains(v.MaCtkiemKe)).ToListAsync();
            db.ChiTietKiemKeViTris.RemoveRange(viTri);
            db.ChiTietKiemKes.RemoveRange(chiTiet);
            db.PhieuKiemKes.Remove(phieu);
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            await tx.RollbackAsync();
            return BadRequest(new { message = DbErrorTranslator.Translate(ex) });
        }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "XOA", "PhieuKiemKe", maPhieu,
            $"Xóa phiếu kiểm kê TBĐB \"{maPhieu}\"");

        return Ok(new { message = "Xóa phiếu kiểm kê thành công" });
    }

    // POST api/tb-dong-bo/kiem-ke/tao-phieu
    // Tạo phiếu và tự sinh chi tiết cho mọi cặp (TBĐB, cấp chất lượng) đang có tồn thực tại kho
    // (1 dòng / cấp, gộp mọi lô cùng cấp) — soLuongSoSach chốt ngay tại thời điểm tạo phiếu
    // (không tự cập nhật lại nếu tồn kho thay đổi sau đó).
    [HttpPost("tao-phieu")]
    public async Task<IActionResult> TaoPhieu([FromBody] TaoPhieuKiemKeDto dto)
    {
        if (this.IsGioiHanKho()) dto = dto with { MaKho = this.CurrentMaKho()! };
        if (string.IsNullOrWhiteSpace(dto.MaDotKiemKe)) return BadRequest(new { message = "Thiếu đợt kiểm kê" });
        if (string.IsNullOrWhiteSpace(dto.MaKho)) return BadRequest(new { message = "Thiếu kho" });
        var dot = await db.DotKiemKes.FindAsync(dto.MaDotKiemKe);
        if (dot == null) return BadRequest(new { message = "Đợt kiểm kê không tồn tại" });
        if (await db.Khos.FindAsync(dto.MaKho) == null) return BadRequest(new { message = "Kho không tồn tại" });

        var trung = await db.PhieuKiemKes.AnyAsync(p => p.MaDotKiemKe == dto.MaDotKiemKe && p.MaKho == dto.MaKho && p.NhomTb == NhomTbTbdb);
        if (trung) return BadRequest(new { message = "Kho này đã có phiếu kiểm kê TBĐB trong đợt này" });

        var tonKhoRaw = await db.TonKhoTbdbs
            .Include(t => t.MaLoTbdbNavigation)
            .Where(t => t.MaKho == dto.MaKho && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH" && t.SoLuong > 0)
            .ToListAsync();

        if (tonKhoRaw.Count == 0)
            return BadRequest(new { message = "Kho này hiện chưa có tồn kho trang bị đồng bộ nào để kiểm kê" });

        var nhomTheoCap = tonKhoRaw.GroupBy(t => new { t.MaLoTbdbNavigation.MaTbdb, t.MaLoTbdbNavigation.MaCcl }).ToList();

        // soLuongKyTruoc tra theo đúng (TBĐB, cấp chất lượng) — khớp granularity của dòng
        // ChiTietKiemKe — TonDauKy được ghi theo cấp từ lúc khởi tạo (TonDauTbDongBoController)
        // hoặc chuyển kỳ (ChuyenKyController), không còn gộp chung cả TBĐB. Tra theo năm CỦA ĐỢT
        // KIỂM KÊ (dot.Nam), không phải năm dương lịch của ngày lập phiếu — 2 giá trị này có thể
        // khác nhau (vd đợt kiểm kê "năm 2027" được lập ngày thực tế còn trong năm 2026).
        var namTonDau = dot.Nam ?? dto.NgayLap.Year;
        var tonDauNam = await db.TonDauKies
            .Where(t => t.MaKho == dto.MaKho && t.Nam == namTonDau && t.NhomTb == NhomTbTbdb && t.MaTbdb != null)
            .ToDictionaryAsync(t => (t.MaTbdb!, t.MaCcl), t => t.SoLuong);

        var maPhieu = await TaoMaPhieuKiemKeAsync(dto.MaDotKiemKe, dto.MaKho);
        db.PhieuKiemKes.Add(new PhieuKiemKe
        {
            MaPhieuKiemKe = maPhieu,
            MaDotKiemKe = dto.MaDotKiemKe,
            NgayLap = dto.NgayLap,
            NgayKiemKe = dto.NgayKiemKe,
            MaKho = dto.MaKho,
            NhomTb = NhomTbTbdb,
            TrangThai = null,
            NguoiTao = this.CurrentUsername(),
        });

        foreach (var nhom in nhomTheoCap)
        {
            var soLuongCap = nhom.Sum(x => x.SoLuong);
            var ctKiemKe = new ChiTietKiemKe
            {
                MaPhieuKiemKe = maPhieu,
                MaTbdb = nhom.Key.MaTbdb,
                MaCcl = nhom.Key.MaCcl,
                SoLuongKyTruoc = tonDauNam.GetValueOrDefault((nhom.Key.MaTbdb, (int?)nhom.Key.MaCcl), 0),
                SoTang = 0,
                SoGiam = 0,
                SoLuongSoSach = soLuongCap,
                SoLuongThucTe = soLuongCap,
            };
            db.ChiTietKiemKes.Add(ctKiemKe);

            foreach (var t in nhom)
            {
                db.ChiTietKiemKeViTris.Add(new ChiTietKiemKeViTri
                {
                    MaCtkiemKeNavigation = ctKiemKe,
                    MaLoTbdb = t.MaLoTbdb,
                    MaTonKho = t.MaTonKho,
                    TenNhaKho = t.TenNhaKho,
                    TenDinhKhu = t.TenDinhKhu,
                    TenKhoi = t.TenKhoi,
                    TenGia = t.TenGia,
                    TenTang = t.TenTang,
                    TenHom = t.TenHom,
                    MoTaViTri = t.MoTaViTri,
                    SoLuongSoSach = t.SoLuong,
                    SoLuongThucTe = t.SoLuong,
                });
            }
        }

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "THEM", "PhieuKiemKe", maPhieu,
            $"Tạo phiếu kiểm kê TBĐB \"{maPhieu}\" cho kho \"{dto.MaKho}\" — {nhomTheoCap.Count} dòng TBĐB, {tonKhoRaw.Count} dòng lô/vị trí");

        return Ok(new { message = "Tạo phiếu kiểm kê thành công", maPhieuKiemKe = maPhieu, soDong = nhomTheoCap.Count });
    }

    // PUT api/tb-dong-bo/kiem-ke/{maPhieu}/chi-tiet/{maCtKiemKe}/vi-tri/{maCtKiemKeViTri}
    // Nhập số lượng thực tế cho 1 dòng lô + vị trí cụ thể; sau khi lưu, cộng dồn lại soLuongThucTe
    // của dòng cha (TBĐB, cấp chất lượng) từ tổng các dòng con để trang tổng hợp theo cấp phản
    // ánh đúng dữ liệu vừa nhập ở đây.
    [HttpPut("{maPhieu}/chi-tiet/{maCtKiemKe:int}/vi-tri/{maCtKiemKeViTri:int}")]
    public async Task<IActionResult> CapNhatChiTietViTri(string maPhieu, int maCtKiemKe, int maCtKiemKeViTri, [FromBody] CapNhatChiTietViTriDto dto)
    {
        var phieu = await db.PhieuKiemKes.FirstOrDefaultAsync(p => p.MaPhieuKiemKe == maPhieu);
        if (phieu == null) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });
        if (this.IsGioiHanKho() && phieu.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });
        if (phieu.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Phiếu đã kết thúc, không thể sửa" });

        var ct = await db.ChiTietKiemKes.FirstOrDefaultAsync(c => c.MaCtkiemKe == maCtKiemKe && c.MaPhieuKiemKe == maPhieu);
        if (ct == null) return NotFound(new { message = "Không tìm thấy dòng chi tiết" });

        var viTri = await db.ChiTietKiemKeViTris.FirstOrDefaultAsync(v => v.MaCtkiemKeViTri == maCtKiemKeViTri && v.MaCtkiemKe == maCtKiemKe);
        if (viTri == null) return NotFound(new { message = "Không tìm thấy dòng vị trí tồn kho" });

        if (dto.SoLuongThucTe < 0) return BadRequest(new { message = "Số lượng thực tế không được âm" });

        viTri.SoLuongThucTe = dto.SoLuongThucTe;
        viTri.GhiChu = dto.GhiChu;

        var tongCacDongKhac = await db.ChiTietKiemKeViTris
            .Where(v => v.MaCtkiemKe == maCtKiemKe && v.MaCtkiemKeViTri != maCtKiemKeViTri)
            .SumAsync(v => v.SoLuongThucTe);
        ct.SoLuongThucTe = tongCacDongKhac + dto.SoLuongThucTe;

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        return Ok(new
        {
            message = "Cập nhật thành công",
            thua = viTri.Thua,
            thieu = viTri.Thieu,
            parentSoLuongThucTe = ct.SoLuongThucTe,
            parentThua = ct.Thua,
            parentThieu = ct.Thieu,
        });
    }

    // POST api/tb-dong-bo/kiem-ke/{maPhieu}/ket-thuc
    // Khi kết thúc, áp chênh lệch (SL thực tế − SL sổ sách lúc tạo phiếu) vào tồn kho hiện tại của
    // từng dòng vị trí (TonKhoTBDB) — CỘNG DỒN chênh lệch thay vì ghi đè bằng SL thực tế, để không
    // xóa mất các giao dịch Nhập/Xuất đã phát sinh hợp lệ trong lúc phiếu kiểm kê còn đang mở.
    [HttpPost("{maPhieu}/ket-thuc")]
    public async Task<IActionResult> KetThuc(string maPhieu)
    {
        var phieu = await db.PhieuKiemKes.FirstOrDefaultAsync(p => p.MaPhieuKiemKe == maPhieu);
        if (phieu == null) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });
        if (this.IsGioiHanKho() && phieu.MaKho != this.CurrentMaKho()) return NotFound(new { message = "Không tìm thấy phiếu kiểm kê" });
        if (phieu.TrangThai == "HOAN_THANH") return BadRequest(new { message = "Phiếu đã kết thúc trước đó" });

        var dongChenhLech = await db.ChiTietKiemKeViTris
            .Where(v => v.MaCtkiemKeNavigation.MaPhieuKiemKe == maPhieu && v.MaTonKho != null && v.SoLuongThucTe != v.SoLuongSoSach)
            .Select(v => new { MaTonKho = v.MaTonKho!.Value, Delta = v.SoLuongThucTe - v.SoLuongSoSach })
            .ToListAsync();

        var soDongDaSua = 0;
        foreach (var d in dongChenhLech)
        {
            var tonKho = await db.TonKhoTbdbs.FirstOrDefaultAsync(t => t.MaTonKho == d.MaTonKho);
            if (tonKho == null) continue; // dòng tồn kho gốc đã bị xóa từ trước (vd lô tồn đầu bị sửa/xóa) — bỏ qua
            if (tonKho.SoLuong + d.Delta < 0)
                return BadRequest(new { message = $"Không thể kết thúc: tồn kho hiện tại của một dòng vị trí chỉ còn {tonKho.SoLuong}, không đủ để trừ chênh lệch {-d.Delta}" });
            tonKho.SoLuong += d.Delta;
            soDongDaSua++;
        }

        phieu.TrangThai = "HOAN_THANH";
        phieu.NguoiKiemKe = this.CurrentUsername();
        phieu.NgayKetThuc = DateOnly.FromDateTime(DateTime.Now);

        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException ex) { return BadRequest(new { message = DbErrorTranslator.Translate(ex) }); }

        await log.LogAsync(this.CurrentUserId(), this.CurrentUsername(), "SUA", "PhieuKiemKe", maPhieu,
            $"Kết thúc kiểm kê TBĐB \"{maPhieu}\"" + (soDongDaSua > 0 ? $" — đã áp chênh lệch vào {soDongDaSua} dòng tồn kho" : ""));

        return Ok(new { message = "Kết thúc kiểm kê thành công" });
    }

    // Sinh mã phiếu kiểm kê từ mã đợt kiểm kê nối mã kho, ví dụ: "KK2025" + "K01" -> "KK2025K01".
    // Cột maPhieuKiemKe giới hạn 30 ký tự không dấu (xem QuanLyKhoQuanKhiContext), nên phần mã
    // đợt bị cắt bớt nếu cần; nếu trùng mã (do bị cắt trùng nhau) thì thêm hậu tố số thứ tự để
    // đảm bảo duy nhất.
    private async Task<string> TaoMaPhieuKiemKeAsync(string maDotKiemKe, string maKho)
    {
        const int doDaiToiDa = 30;
        var maKhoSach = Regex.Replace(maKho.Trim().ToUpperInvariant(), "[^A-Z0-9]", "");
        var maDotSach = Regex.Replace(maDotKiemKe.Trim().ToUpperInvariant(), "[^A-Z0-9]", "");

        var soKyTuChoMaDot = Math.Max(1, doDaiToiDa - maKhoSach.Length);
        if (maDotSach.Length > soKyTuChoMaDot) maDotSach = maDotSach[..soKyTuChoMaDot];

        var maGoc = $"{maDotSach}{maKhoSach}";
        if (maGoc.Length > doDaiToiDa) maGoc = maGoc[..doDaiToiDa];

        var maPhieu = maGoc;
        var stt = 1;
        while (await db.PhieuKiemKes.AnyAsync(p => p.MaPhieuKiemKe == maPhieu))
        {
            var hauTo = $"_{++stt}";
            var phanGoc = maGoc.Length + hauTo.Length > doDaiToiDa ? maGoc[..(doDaiToiDa - hauTo.Length)] : maGoc;
            maPhieu = phanGoc + hauTo;
        }
        return maPhieu;
    }
}

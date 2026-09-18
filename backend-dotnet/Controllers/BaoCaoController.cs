using backend_dotnet.Models;
using backend_dotnet.Services;
using backend_dotnet.Services.Rbac;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

// Các API tổng hợp riêng cho trang "Tổng hợp, báo cáo" — khác DanhMucControllers/TbDongBoController
// (vốn phục vụ nghiệp vụ nhập/xuất/kiểm kê hằng ngày), mỗi endpoint ở đây gộp dữ liệu từ nhiều module
// lại đúng theo bố cục 1 mẫu báo cáo giấy cụ thể, không phục vụ mục đích nào khác.
[ApiController]
[Authorize]
[Route("api/bao-cao")]
[YeuCauQuyen(Cn.BaoCao)]
public class BaoCaoController(QuanLyKhoQuanKhiContext db) : ControllerBase
{
    // 13 loại phụ kiện cố định theo đúng mẫu giấy "Báo cáo tình hình đồng bộ súng bộ binh" — khớp bằng
    // tên Loại TBĐB (LoaiTbdb.TenLoai, không phân biệt hoa/thường, bỏ khoảng trắng thừa 2 đầu). Loại
    // TBĐB nào trong danh mục Đồng bộ chưa đặt đúng 1 trong 13 tên này thì cột tương ứng luôn = 0 — cần
    // rà lại danh mục Đồng bộ (Danh mục -> Đồng bộ) để đặt tên khớp mẫu.
    private static readonly string[] TinhHinhDongBo =
        ["Bộ phụ tùng", "Bộ thông nòng", "Hộp tiếp đạn", "Kính ngắm", "Bộ chiếu sáng", "Nòng phụ", "Lê"];
    private static readonly string[] TrangCu =
        ["Dây súng", "Áo súng", "Áo nòng", "Mũ nòng", "Túi hộp tiếp đạn", "Túi phụ tùng"];
    private static readonly string[] CotPhuKien = [.. TinhHinhDongBo, .. TrangCu];

    // GET api/bao-cao/dong-bo-sung-bo-binh?maKho=
    // Với mỗi Loại SPKT thuộc Nhóm SPKT "Súng bộ binh": số súng hiện có tại kho (gộp Hồ sơ SPKT, không
    // tách theo Cấp chất lượng) + số lượng từng loại phụ kiện đồng bộ đang có tại kho.
    //
    // Định mức đồng bộ (ChiTietDongBo) và tồn kho phụ kiện (TonKhoTbdb) đều chỉ gắn ở cấp Kiểu SPKT,
    // trong khi số súng thực tế lại đếm theo Loại SPKT (nhiều Loại có thể cùng 1 Kiểu) — nên khi 1 Kiểu
    // có nhiều Loại, tồn kho phụ kiện (dùng chung cho cả Kiểu) được phân bổ TUẦN TỰ theo đúng thứ tự Loại
    // SPKT đang liệt kê: Loại đứng trước lấy đủ theo định mức trước, Loại đứng sau chỉ còn lại phần dư —
    // không có cách nào tách chính xác vì bản thân tồn kho phụ kiện không gắn với 1 Loại SPKT cụ thể.
    [HttpGet("dong-bo-sung-bo-binh")]
    public async Task<IActionResult> GetDongBoSungBoBinh([FromQuery] string? maKho)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        if (string.IsNullOrWhiteSpace(maKho)) return BadRequest(new { message = "Vui lòng chọn kho" });

        var nhom = await db.NhomSpkts.FirstOrDefaultAsync(n => n.TenNhom == "Súng bộ binh");
        if (nhom == null) return Ok(new { tinhHinhDongBo = TinhHinhDongBo, trangCu = TrangCu, rows = Array.Empty<object>() });

        var loaiList = await db.LoaiSpkts.Where(l => l.MaNhom == nhom.MaNhom).OrderBy(l => l.MaLoai).ToListAsync();
        if (loaiList.Count == 0) return Ok(new { tinhHinhDongBo = TinhHinhDongBo, trangCu = TrangCu, rows = Array.Empty<object>() });

        var dvtMap = await db.Dvts.ToDictionaryAsync(d => d.MaDvt, d => d.TenDvt);

        // Số súng hiện có tại kho theo Loại SPKT.
        var soLuongTheoLoai = await db.HoSoSpkts
            .Where(h => h.MaKho == maKho)
            .GroupBy(h => h.MaLoaiSpkt)
            .Select(g => new { MaLoai = g.Key, Tong = g.Sum(x => x.SoLuong) })
            .ToDictionaryAsync(x => x.MaLoai, x => x.Tong);

        // Định mức: với mỗi Kiểu SPKT, gộp các dòng ChiTietDongBo có Loại TBĐB khớp 1 trong 13 cột lại
        // thành số lượng phụ kiện cần cho MỖI 1 khẩu súng thuộc kiểu đó.
        var cacKieu = loaiList.Where(l => l.MaKieu != null).Select(l => l.MaKieu!).Distinct().ToList();
        var dinhMucRaw = cacKieu.Count == 0 ? [] : await db.ChiTietDongBos
            .Where(c => cacKieu.Contains(c.MaKieuSpkt))
            .Select(c => new { c.MaKieuSpkt, TenLoaiTbdb = c.MaTbdbNavigation.MaLoaiTbdbNavigation.TenLoai, c.SoLuongSpktcoSo, c.SldinhMuc })
            .ToListAsync();

        var dinhMuc = new Dictionary<string, Dictionary<string, double>>();
        foreach (var d in dinhMucRaw)
        {
            var cot = CotPhuKien.FirstOrDefault(c => string.Equals(c, d.TenLoaiTbdb?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (cot == null || d.SoLuongSpktcoSo <= 0) continue;
            if (!dinhMuc.TryGetValue(d.MaKieuSpkt, out var theoCot)) dinhMuc[d.MaKieuSpkt] = theoCot = [];
            theoCot[cot] = theoCot.GetValueOrDefault(cot) + (double)d.SldinhMuc / d.SoLuongSpktcoSo;
        }

        // Tồn kho phụ kiện tại kho, gộp theo đúng 13 cột — dùng chung cho mọi Kiểu SPKT (chỉ tính lô đã
        // HOÀN THÀNH, giống quy ước tính "thực lực" ở TbDongBoController.GetByKho).
        var tonKhoRaw = await db.TonKhoTbdbs
            .Where(t => t.MaKho == maKho && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH")
            .Select(t => new { TenLoaiTbdb = t.MaLoTbdbNavigation.MaTbdbNavigation.MaLoaiTbdbNavigation.TenLoai, t.SoLuong })
            .ToListAsync();
        var tonKhoTheoCot = new Dictionary<string, int>();
        foreach (var t in tonKhoRaw)
        {
            var cot = CotPhuKien.FirstOrDefault(c => string.Equals(c, t.TenLoaiTbdb?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (cot == null) continue;
            tonKhoTheoCot[cot] = tonKhoTheoCot.GetValueOrDefault(cot) + t.SoLuong;
        }

        // Phân bổ tuần tự theo đúng thứ tự loaiList (mã Loại SPKT tăng dần).
        var rows = new List<object>();
        foreach (var loai in loaiList)
        {
            var soLuongSung = soLuongTheoLoai.GetValueOrDefault(loai.MaLoai);
            var dinhMucKieu = loai.MaKieu != null ? dinhMuc.GetValueOrDefault(loai.MaKieu) : null;
            var phuKien = new Dictionary<string, int>();
            foreach (var cot in CotPhuKien)
            {
                var canThiet = dinhMucKieu != null && dinhMucKieu.TryGetValue(cot, out var dm)
                    ? (int)Math.Round(dm * soLuongSung, MidpointRounding.AwayFromZero)
                    : 0;
                var conLai = tonKhoTheoCot.GetValueOrDefault(cot);
                var cap = Math.Min(canThiet, conLai);
                phuKien[cot] = cap;
                tonKhoTheoCot[cot] = conLai - cap;
            }

            rows.Add(new
            {
                maLoai = loai.MaLoai,
                tenLoai = loai.TenLoai,
                tenDvt = loai.MaDvt != null ? dvtMap.GetValueOrDefault(loai.MaDvt) : null,
                soLuong = soLuongSung,
                phuKien,
                ghiChu = loai.GhiChu,
            });
        }

        return Ok(new { tinhHinhDongBo = TinhHinhDongBo, trangCu = TrangCu, rows });
    }

    // 19 cột phụ kiện cố định theo đúng mẫu giấy "Báo cáo tình hình đồng bộ các loại pháo" — khớp
    // bằng tên Loại TBĐB (LoaiTbdb.TenLoai, không phân biệt hoa/thường, bỏ khoảng trắng thừa 2 đầu),
    // Ten = tên dùng để khớp danh mục (cũng là khóa trong "phuKien" của mỗi dòng), Nhom = tên nhóm cột
    // cha để hiển thị header 2 cấp (null = không có nhóm cha, đứng riêng), Nhan = nhãn hiển thị ở ô
    // cột con. Loại TBĐB nào trong danh mục Đồng bộ chưa đặt đúng 1 trong 19 tên này thì cột tương
    // ứng luôn = 0 — cần rà lại danh mục Đồng bộ (Danh mục -> Đồng bộ) để đặt tên khớp mẫu.
    private static readonly (string Ten, string? Nhom, string Nhan)[] CotPhuKienPhao =
    [
        ("Bộ A", null, "Bộ A"),
        ("Bộ C", null, "Bộ C"),
        ("Bộ E", null, "Bộ E"),
        ("Kính ngắm trực tiếp", "Kính ngắm", "Trực tiếp"),
        ("Kính ngắm gián tiếp", "Kính ngắm", "Gián tiếp"),
        ("Kính ngắm cao xạ", "Kính ngắm", "Cao xạ"),
        ("Chiếu sáng", null, "Chiếu sáng"),
        ("Thông nòng", null, "Thông nòng"),
        ("Lốp pháo tốt", "Lốp pháo", "Tốt"),
        ("Lốp pháo xấu", "Lốp pháo", "Xấu"),
        ("Áo pháo", "Trang cụ", "Áo pháo"),
        ("Áo hộp kính ngắm", "Trang cụ", "Áo hộp KN"),
        ("Mũ nòng", "Trang cụ", "Mũ nòng"),
        ("Áo giá máy ngắm", "Trang cụ", "Áo giá MN"),
        ("Xẻ beng", "Dụng cụ theo pháo", "Xẻ beng"),
        ("Búa tạ", "Dụng cụ theo pháo", "Búa tạ"),
        ("Cuốc pháo", "Dụng cụ theo pháo", "Cuốc pháo"),
        ("Rìu pháo", "Dụng cụ theo pháo", "Rìu pháo"),
        ("Xẻng pháo", "Dụng cụ theo pháo", "Xẻng pháo"),
    ];

    // 4 Nhóm SPKT hợp thành "các loại pháo" theo đúng mẫu giấy (không gồm Súng cối/Súng chống tăng
    // DKZ — 2 nhóm đó tuy cũng là hỏa lực nhưng mẫu giấy đặt tên "Súng", có mẫu báo cáo riêng).
    private static readonly string[] NhomPhao = ["Pháo chống tăng", "Pháo mặt đất", "Pháo phòng không", "Pháo phản lực"];

    // GET api/bao-cao/dong-bo-phao?maKho=
    // Với mỗi Loại SPKT thuộc 4 Nhóm SPKT "pháo": số pháo hiện có tại kho (gộp Hồ sơ SPKT, không tách
    // theo Cấp chất lượng) + số lượng từng loại phụ kiện đồng bộ đang có tại kho. Thuật toán định
    // mức/phân bổ tồn kho giống hệt "dong-bo-sung-bo-binh" — xem chú thích ở đó.
    [HttpGet("dong-bo-phao")]
    public async Task<IActionResult> GetDongBoPhao([FromQuery] string? maKho)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        if (string.IsNullOrWhiteSpace(maKho)) return BadRequest(new { message = "Vui lòng chọn kho" });

        var cotPhuKien = CotPhuKienPhao.Select(c => new { ten = c.Ten, nhom = c.Nhom, nhan = c.Nhan }).ToList();

        var loaiList = await db.LoaiSpkts
            .Where(l => db.NhomSpkts.Where(n => NhomPhao.Contains(n.TenNhom)).Select(n => n.MaNhom).Contains(l.MaNhom))
            .OrderBy(l => l.MaNhom).ThenBy(l => l.MaLoai)
            .ToListAsync();
        if (loaiList.Count == 0) return Ok(new { cotPhuKien, rows = Array.Empty<object>() });

        var dvtMap = await db.Dvts.ToDictionaryAsync(d => d.MaDvt, d => d.TenDvt);

        var soLuongTheoLoai = await db.HoSoSpkts
            .Where(h => h.MaKho == maKho)
            .GroupBy(h => h.MaLoaiSpkt)
            .Select(g => new { MaLoai = g.Key, Tong = g.Sum(x => x.SoLuong) })
            .ToDictionaryAsync(x => x.MaLoai, x => x.Tong);

        var cacKieu = loaiList.Where(l => l.MaKieu != null).Select(l => l.MaKieu!).Distinct().ToList();
        var dinhMucRaw = cacKieu.Count == 0 ? [] : await db.ChiTietDongBos
            .Where(c => cacKieu.Contains(c.MaKieuSpkt))
            .Select(c => new { c.MaKieuSpkt, TenLoaiTbdb = c.MaTbdbNavigation.MaLoaiTbdbNavigation.TenLoai, c.SoLuongSpktcoSo, c.SldinhMuc })
            .ToListAsync();

        var dinhMuc = new Dictionary<string, Dictionary<string, double>>();
        foreach (var d in dinhMucRaw)
        {
            var cot = CotPhuKienPhao.Select(c => c.Ten).FirstOrDefault(c => string.Equals(c, d.TenLoaiTbdb?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (cot == null || d.SoLuongSpktcoSo <= 0) continue;
            if (!dinhMuc.TryGetValue(d.MaKieuSpkt, out var theoCot)) dinhMuc[d.MaKieuSpkt] = theoCot = [];
            theoCot[cot] = theoCot.GetValueOrDefault(cot) + (double)d.SldinhMuc / d.SoLuongSpktcoSo;
        }

        var tonKhoRaw = await db.TonKhoTbdbs
            .Where(t => t.MaKho == maKho && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH")
            .Select(t => new { TenLoaiTbdb = t.MaLoTbdbNavigation.MaTbdbNavigation.MaLoaiTbdbNavigation.TenLoai, t.SoLuong })
            .ToListAsync();
        var tonKhoTheoCot = new Dictionary<string, int>();
        foreach (var t in tonKhoRaw)
        {
            var cot = CotPhuKienPhao.Select(c => c.Ten).FirstOrDefault(c => string.Equals(c, t.TenLoaiTbdb?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (cot == null) continue;
            tonKhoTheoCot[cot] = tonKhoTheoCot.GetValueOrDefault(cot) + t.SoLuong;
        }

        var rows = new List<object>();
        foreach (var loai in loaiList)
        {
            var soLuongPhao = soLuongTheoLoai.GetValueOrDefault(loai.MaLoai);
            var dinhMucKieu = loai.MaKieu != null ? dinhMuc.GetValueOrDefault(loai.MaKieu) : null;
            var phuKien = new Dictionary<string, int>();
            foreach (var cot in CotPhuKienPhao)
            {
                var canThiet = dinhMucKieu != null && dinhMucKieu.TryGetValue(cot.Ten, out var dm)
                    ? (int)Math.Round(dm * soLuongPhao, MidpointRounding.AwayFromZero)
                    : 0;
                var conLai = tonKhoTheoCot.GetValueOrDefault(cot.Ten);
                var cap = Math.Min(canThiet, conLai);
                phuKien[cot.Ten] = cap;
                tonKhoTheoCot[cot.Ten] = conLai - cap;
            }

            rows.Add(new
            {
                maLoai = loai.MaLoai,
                tenLoai = loai.TenLoai,
                tenDvt = loai.MaDvt != null ? dvtMap.GetValueOrDefault(loai.MaDvt) : null,
                soLuong = soLuongPhao,
                phuKien,
                ghiChu = loai.GhiChu,
            });
        }

        return Ok(new { cotPhuKien, rows });
    }

    // GET api/bao-cao/nhu-cau-dong-bo?maKho=
    // Mẫu số 34/18/QK-VK — "Báo cáo nhu cầu đồng bộ súng pháo khí tài": khác 2 báo cáo trên ở chỗ
    // liệt kê HẾT mọi Nhóm SPKT (không giới hạn 1 nhóm) và HẾT mọi phụ tùng đồng bộ đến cấp chi tiết
    // (từng ChiTietDongBo, không gộp theo 1 danh sách cột cố định) — nên không bị giới hạn bởi tên
    // Loại TBĐB có khớp mẫu hay không như 2 báo cáo kia. Cấu trúc bảng in ở đây chỉ làm phần "Tổng
    // cộng" của mẫu giấy (số liệu của đúng 1 kho/đơn vị được chọn) — mẫu giấy gốc còn có thêm các cột
    // so sánh song song NHIỀU đơn vị trực thuộc, nhưng hệ thống hiện chưa có khái niệm phân cấp đơn vị
    // theo loại hình quân sự (sư đoàn đủ quân/rút gọn, e/lữ PK...) nên không tái tạo được phần đó.
    //
    // "Nhu cầu" = định mức (ChiTietDongBo) × số SPKT hiện có tại kho, giống hệt công thức ở 2 báo cáo
    // trên. "Hiện có" lấy tồn kho TBĐB thực tế (chỉ lô HOÀN_THÀNH) tại đúng maTbdb đó — KHÔNG phân bổ
    // tuần tự như 2 báo cáo trên (ở đây mỗi dòng là 1 SPKT × 1 phụ tùng riêng biệt nên hiển thị thẳng
    // tồn kho thật, không cần "chia" giữa các SPKT dùng chung 1 Kiểu). "Ngân sách" ước tính bằng đơn
    // giá bình quân các lô nhập gần nhất của đúng phụ tùng đó (chỉ tính lô có DonGia > 0) — hệ thống
    // không có "đơn giá chuẩn" theo danh mục nên đây chỉ là số tham khảo, để trống nếu chưa từng nhập.
    public record NhuCauDongBoRowDto(string Loai, string Ma, string Ten, string? TenDvt, int? SoLuongCo, int? NhuCau, int? HienCo, int? CanBoSung, decimal? NganSach);

    [HttpGet("nhu-cau-dong-bo")]
    public async Task<IActionResult> GetNhuCauDongBo([FromQuery] string? maKho)
    {
        if (this.IsGioiHanKho()) maKho = this.CurrentMaKho();
        if (string.IsNullOrWhiteSpace(maKho)) return BadRequest(new { message = "Vui lòng chọn kho" });

        var nhomList = await db.NhomSpkts.OrderBy(n => n.MaNhom).ToListAsync();
        var loaiList = await db.LoaiSpkts.OrderBy(l => l.MaNhom).ThenBy(l => l.MaLoai).ToListAsync();
        var dvtMap = await db.Dvts.ToDictionaryAsync(d => d.MaDvt, d => d.TenDvt);

        var soLuongTheoLoai = await db.HoSoSpkts
            .Where(h => h.MaKho == maKho)
            .GroupBy(h => h.MaLoaiSpkt)
            .Select(g => new { MaLoai = g.Key, Tong = g.Sum(x => x.SoLuong) })
            .ToDictionaryAsync(x => x.MaLoai, x => x.Tong);

        var cacKieu = loaiList.Where(l => l.MaKieu != null).Select(l => l.MaKieu!).Distinct().ToList();
        var dinhMucTheoKieu = cacKieu.Count == 0 ? [] : await db.ChiTietDongBos
            .Include(c => c.MaTbdbNavigation).ThenInclude(t => t.MaDvtNavigation)
            .Where(c => cacKieu.Contains(c.MaKieuSpkt) && c.SoLuongSpktcoSo > 0)
            .OrderBy(c => c.MaTbdb)
            .ToListAsync();
        var dinhMucGroup = dinhMucTheoKieu.GroupBy(d => d.MaKieuSpkt).ToDictionary(g => g.Key, g => g.ToList());

        var maTbdbCanTra = dinhMucTheoKieu.Select(d => d.MaTbdb).Distinct().ToList();
        var tonKhoTheoTbdb = maTbdbCanTra.Count == 0 ? new Dictionary<string, int>() : await db.TonKhoTbdbs
            .Where(t => t.MaKho == maKho && t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH" && maTbdbCanTra.Contains(t.MaLoTbdbNavigation.MaTbdb))
            .GroupBy(t => t.MaLoTbdbNavigation.MaTbdb)
            .Select(g => new { MaTbdb = g.Key, Tong = g.Sum(x => x.SoLuong) })
            .ToDictionaryAsync(x => x.MaTbdb, x => x.Tong);

        var donGiaBqTheoTbdb = maTbdbCanTra.Count == 0 ? new Dictionary<string, decimal>() : await db.LoTbdbs
            .Where(l => maTbdbCanTra.Contains(l.MaTbdb) && l.DonGia > 0)
            .GroupBy(l => l.MaTbdb)
            .Select(g => new { MaTbdb = g.Key, BinhQuan = g.Average(x => x.DonGia) })
            .ToDictionaryAsync(x => x.MaTbdb, x => x.BinhQuan);

        var rows = new List<NhuCauDongBoRowDto>();
        foreach (var nhom in nhomList)
        {
            var loaiTrongNhom = loaiList.Where(l => l.MaNhom == nhom.MaNhom).ToList();
            var loaiCoHang = loaiTrongNhom.Where(l => soLuongTheoLoai.GetValueOrDefault(l.MaLoai) > 0).ToList();
            if (loaiCoHang.Count == 0) continue;

            rows.Add(new NhuCauDongBoRowDto("NHOM", nhom.MaNhom, nhom.TenNhom, null, null, null, null, null, null));

            foreach (var loai in loaiCoHang)
            {
                var soLuong = soLuongTheoLoai.GetValueOrDefault(loai.MaLoai);
                rows.Add(new NhuCauDongBoRowDto("SPKT", loai.MaLoai, loai.TenLoai,
                    loai.MaDvt != null ? dvtMap.GetValueOrDefault(loai.MaDvt) : null, soLuong, null, null, null, null));

                var dinhMucList = loai.MaKieu != null ? dinhMucGroup.GetValueOrDefault(loai.MaKieu) : null;
                if (dinhMucList == null) continue;
                foreach (var dm in dinhMucList)
                {
                    var nhuCau = (int)Math.Round((double)dm.SldinhMuc / dm.SoLuongSpktcoSo * soLuong, MidpointRounding.AwayFromZero);
                    var hienCo = tonKhoTheoTbdb.GetValueOrDefault(dm.MaTbdb);
                    var canBoSung = Math.Max(0, nhuCau - hienCo);
                    var donGiaBq = donGiaBqTheoTbdb.GetValueOrDefault(dm.MaTbdb);
                    rows.Add(new NhuCauDongBoRowDto("PHUTUNG", dm.MaTbdb, dm.MaTbdbNavigation.TenTbdb ?? dm.MaTbdb,
                        dm.MaTbdbNavigation.MaDvtNavigation?.TenDvt, null, nhuCau, hienCo, canBoSung,
                        canBoSung > 0 && donGiaBq > 0 ? canBoSung * donGiaBq : null));
                }
            }
        }

        return Ok(new { rows });
    }
}

using backend_dotnet.Models;
using backend_dotnet.Services.Rbac;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

// Số liệu thống kê/biểu đồ cho trang Tổng quan — bổ sung cho phần đồ thị Neo4j (GraphController).
// Dùng thẳng SQL Server (không qua Neo4j) vì SPKT chưa có mặt trong đồ thị, và các số liệu ở đây chỉ
// cần snapshot/gộp đơn giản chứ không cần biểu diễn quan hệ dạng đồ thị.
[ApiController]
[Authorize]
[Route("api/thong-ke-tong-quan")]
[YeuCauQuyen(Cn.TongQuan)]
public class ThongKeTongQuanController(QuanLyKhoQuanKhiContext db) : ControllerBase
{
    // GET api/thong-ke-tong-quan/xu-huong?soThang=12
    // Xu hướng theo thời gian: SL nhập/xuất TBĐB theo tháng, số lệnh theo từng loại nghiệp vụ theo
    // tháng, số hoạt động (nhật ký) theo ngày trong 30 ngày gần nhất.
    [HttpGet("xu-huong")]
    public async Task<IActionResult> XuHuong([FromQuery] int soThang = 12)
    {
        soThang = Math.Clamp(soThang, 1, 36);
        var thangHienTai = new DateOnly(DateTime.Today.Year, DateTime.Today.Month, 1);
        var tuThangDau = thangHienTai.AddMonths(-(soThang - 1));

        static string Key(DateOnly d) => $"{d.Year:0000}-{d.Month:00}";
        var cacThang = Enumerable.Range(0, soThang).Select(i => Key(tuThangDau.AddMonths(i))).ToList();

        // SL nhập/xuất TBĐB theo tháng (Lệnh Nhập/Xuất TBĐB — dùng SoLuongTheoLenh của CtdongBoTrongLenh).
        var lenhNhapXuat = await db.Lenhs
            .Include(l => l.CtdongBoTrongLenhs)
            .Where(l => (l.MaLoaiLenh == "NHAPTBDB" || l.MaLoaiLenh == "XUATTBDB") && l.Ngay >= tuThangDau)
            .ToListAsync();
        var nhapXuatTheoThang = cacThang.Select(k =>
        {
            var nhap = lenhNhapXuat.Where(l => l.MaLoaiLenh == "NHAPTBDB" && Key(l.Ngay) == k).ToList();
            var xuat = lenhNhapXuat.Where(l => l.MaLoaiLenh == "XUATTBDB" && Key(l.Ngay) == k).ToList();
            return new
            {
                thang = k,
                soLenhNhap = nhap.Count,
                soLenhXuat = xuat.Count,
                soLuongNhap = nhap.Sum(l => l.CtdongBoTrongLenhs.Sum(c => c.SoLuongTheoLenh)),
                soLuongXuat = xuat.Sum(l => l.CtdongBoTrongLenhs.Sum(c => c.SoLuongTheoLenh)),
            };
        }).ToList();

        // Số lệnh theo từng loại nghiệp vụ theo tháng — gộp bảng Lenh (Nhập/Xuất/Tồn đầu/Hủy-thanh
        // lý dùng chung bảng này) với 3 bảng lệnh riêng (Chuyển cấp CL, Thay đổi vị trí, Thay đổi HTNC).
        var lenhKhac = await db.Lenhs
            .Where(l => (l.MaLoaiLenh == "TDK" || l.MaLoaiLenh == "HUYTBDB") && l.Ngay >= tuThangDau)
            .Select(l => new { l.Ngay, l.MaLoaiLenh })
            .ToListAsync();
        var lenhCc = await db.LenhChuyenCaps.Where(l => l.NgayLap >= tuThangDau).Select(l => l.NgayLap).ToListAsync();
        var lenhVt = await db.LenhThayDoiViTris.Where(l => l.NgayLap >= tuThangDau).Select(l => l.NgayLap).ToListAsync();
        var lenhHtnc = await db.LenhThayDoiHtncs.Where(l => l.NgayLap >= tuThangDau).Select(l => l.NgayLap).ToListAsync();

        var soLenhTheoNghiepVu = cacThang.Select(k => new
        {
            thang = k,
            nhap = lenhNhapXuat.Count(l => l.MaLoaiLenh == "NHAPTBDB" && Key(l.Ngay) == k),
            xuat = lenhNhapXuat.Count(l => l.MaLoaiLenh == "XUATTBDB" && Key(l.Ngay) == k),
            tonDau = lenhKhac.Count(l => l.MaLoaiLenh == "TDK" && Key(l.Ngay) == k),
            huyThanhLy = lenhKhac.Count(l => l.MaLoaiLenh == "HUYTBDB" && Key(l.Ngay) == k),
            chuyenCap = lenhCc.Count(d => Key(d) == k),
            thayDoiViTri = lenhVt.Count(d => Key(d) == k),
            thayDoiHtnc = lenhHtnc.Count(d => Key(d) == k),
        }).ToList();

        // Hoạt động theo ngày — cố định 30 ngày gần nhất (không phụ thuộc soThang, để đồ thị gọn).
        var tu30Ngay = DateTime.Today.AddDays(-29);
        var nhatKyRaw = await db.NhatKyHoatDongs.Where(n => n.ThoiGian >= tu30Ngay).Select(n => n.ThoiGian).ToListAsync();
        var hoatDongTheoNgay = Enumerable.Range(0, 30)
            .Select(i => tu30Ngay.AddDays(i).Date)
            .Select(ngay => new { ngay = ngay.ToString("yyyy-MM-dd"), soLuong = nhatKyRaw.Count(t => t.Date == ngay) })
            .ToList();

        return Ok(new { nhapXuatTheoThang, soLenhTheoNghiepVu, hoatDongTheoNgay });
    }

    // GET api/thong-ke-tong-quan/phan-bo
    // Phân bố hiện trạng (snapshot hiện tại): TBĐB theo cấp chất lượng, TBĐB theo trạng thái, SPKT
    // theo Nhóm.
    [HttpGet("phan-bo")]
    public async Task<IActionResult> PhanBo()
    {
        var tonKhoRaw = await db.TonKhoTbdbs
            .Where(t => t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH")
            .Select(t => new
            {
                t.SoLuong,
                t.MaTrangThaiTb,
                TenTrangThai = t.MaTrangThaiTbNavigation.TenTttb,
                MaCcl = t.MaLoTbdbNavigation.MaCcl,
                TenCap = t.MaLoTbdbNavigation.MaCclNavigation != null ? t.MaLoTbdbNavigation.MaCclNavigation.TenCap : null,
            })
            .ToListAsync();

        var tbdbTheoCap = tonKhoRaw
            .GroupBy(t => new { t.MaCcl, t.TenCap })
            .Select(g => new { maCap = g.Key.MaCcl, tenCap = g.Key.TenCap ?? "Chưa xác định", soLuong = g.Sum(x => x.SoLuong) })
            .OrderBy(g => g.maCap)
            .ToList();

        var tbdbTheoTrangThai = tonKhoRaw
            .GroupBy(t => new { t.MaTrangThaiTb, t.TenTrangThai })
            .Select(g => new { maTrangThai = g.Key.MaTrangThaiTb, tenTrangThai = g.Key.TenTrangThai, soLuong = g.Sum(x => x.SoLuong) })
            .OrderByDescending(g => g.soLuong)
            .ToList();

        var spktRaw = await db.HoSoSpkts
            .Select(h => new { h.SoLuong, h.MaLoaiSpktNavigation.MaNhom, TenNhom = h.MaLoaiSpktNavigation.MaNhomNavigation.TenNhom })
            .ToListAsync();
        var spktTheoNhom = spktRaw
            .GroupBy(h => new { h.MaNhom, h.TenNhom })
            .Select(g => new { maNhom = g.Key.MaNhom, tenNhom = g.Key.TenNhom, soLuong = g.Sum(x => x.SoLuong) })
            .OrderByDescending(g => g.soLuong)
            .ToList();

        return Ok(new { tbdbTheoCap, tbdbTheoTrangThai, spktTheoNhom });
    }

    // GET api/thong-ke-tong-quan/canh-bao
    // Cảnh báo/điểm nóng: lệnh quá hạn, nhóm SPKT thiếu phụ kiện đồng bộ so với định mức (gộp toàn
    // hệ thống — không tách theo kho), kho có chênh lệch kiểm kê (thừa/thiếu) lớn nhất.
    [HttpGet("canh-bao")]
    public async Task<IActionResult> CanhBao()
    {
        var homNay = DateOnly.FromDateTime(DateTime.Today);

        var lenhQuaHan = await db.Lenhs
            .Include(l => l.MaLoaiLenhNavigation)
            .Include(l => l.MaKhoNhapNavigation)
            .Include(l => l.MaKhoXuatNavigation)
            .Where(l => l.TrangThai != "HOAN_THANH" && l.GiaTriDenNgay != null && l.GiaTriDenNgay < homNay)
            .OrderBy(l => l.GiaTriDenNgay)
            .Take(10)
            .Select(l => new
            {
                maLenh = l.MaLenh,
                tenLoaiLenh = l.MaLoaiLenhNavigation.TenNx,
                veViec = l.VeViec,
                giaTriDenNgay = l.GiaTriDenNgay,
                tenKho = l.MaKhoNhapNavigation != null ? l.MaKhoNhapNavigation.TenKho : (l.MaKhoXuatNavigation != null ? l.MaKhoXuatNavigation.TenKho : null),
            })
            .ToListAsync();

        // SPKT thiếu phụ kiện đồng bộ — định mức (ChiTietDongBo) gắn cấp Kiểu SPKT, số súng hiện có
        // gộp theo Loại SPKT (nhiều Loại có thể cùng 1 Kiểu, cộng dồn nhu cầu về đúng Kiểu); so với
        // tồn kho TBĐB thực tế (chỉ lô HOÀN_THÀNH) của đúng TBĐB đó.
        var soLuongTheoLoai = await db.HoSoSpkts
            .GroupBy(h => h.MaLoaiSpkt)
            .Select(g => new { MaLoai = g.Key, Tong = g.Sum(x => x.SoLuong) })
            .ToDictionaryAsync(x => x.MaLoai, x => x.Tong);

        var loaiSpktList = await db.LoaiSpkts.Where(l => l.MaKieu != null).ToListAsync();
        var dinhMucRaw = await db.ChiTietDongBos
            .Include(c => c.MaTbdbNavigation)
            .Where(c => c.SoLuongSpktcoSo > 0)
            .ToListAsync();

        var canThietTheoTbdb = new Dictionary<(string MaKieu, string MaTbdb), double>();
        foreach (var loai in loaiSpktList)
        {
            var soLuongSung = soLuongTheoLoai.GetValueOrDefault(loai.MaLoai);
            if (soLuongSung <= 0) continue;
            foreach (var dm in dinhMucRaw.Where(d => d.MaKieuSpkt == loai.MaKieu))
            {
                var key = (dm.MaKieuSpkt, dm.MaTbdb);
                var canThiet = (double)dm.SldinhMuc / dm.SoLuongSpktcoSo * soLuongSung;
                canThietTheoTbdb[key] = canThietTheoTbdb.GetValueOrDefault(key) + canThiet;
            }
        }

        var tonKhoTheoTbdb = await db.TonKhoTbdbs
            .Where(t => t.MaLoTbdbNavigation.TrangThaiLo == "HOAN_THANH")
            .GroupBy(t => t.MaLoTbdbNavigation.MaTbdb)
            .Select(g => new { MaTbdb = g.Key, Tong = g.Sum(x => x.SoLuong) })
            .ToDictionaryAsync(x => x.MaTbdb, x => x.Tong);

        var tenKieuMap = await db.KieuSpkts.ToDictionaryAsync(k => k.MaKieu, k => k.TenKieu);

        var spktThieuDongBo = canThietTheoTbdb
            .Select(kv =>
            {
                var (maKieu, maTbdb) = kv.Key;
                var canThiet = (int)Math.Round(kv.Value, MidpointRounding.AwayFromZero);
                var conLai = tonKhoTheoTbdb.GetValueOrDefault(maTbdb);
                var tenTbdb = dinhMucRaw.First(d => d.MaKieuSpkt == maKieu && d.MaTbdb == maTbdb).MaTbdbNavigation.TenTbdb;
                return new
                {
                    maKieuSpkt = maKieu,
                    tenKieu = tenKieuMap.GetValueOrDefault(maKieu, maKieu),
                    maTbdb,
                    tenTbdb,
                    canThiet,
                    conLai,
                    thieu = canThiet - conLai,
                };
            })
            .Where(x => x.thieu > 0)
            .OrderByDescending(x => x.thieu)
            .Take(10)
            .ToList();

        // Top phiếu kiểm kê có chênh lệch (thừa/thiếu) lớn nhất — cộng dồn theo phiếu.
        var kiemKeRaw = await db.ChiTietKiemKes
            .Include(c => c.MaPhieuKiemKeNavigation).ThenInclude(p => p.MaKhoNavigation)
            .Where(c => (c.Thua ?? 0) > 0 || (c.Thieu ?? 0) > 0)
            .ToListAsync();
        var khoChenhLechKiemKe = kiemKeRaw
            .GroupBy(c => new { c.MaPhieuKiemKeNavigation.MaKho, TenKho = c.MaPhieuKiemKeNavigation.MaKhoNavigation.TenKho, c.MaPhieuKiemKe })
            .Select(g => new
            {
                maKho = g.Key.MaKho,
                tenKho = g.Key.TenKho,
                maPhieuKiemKe = g.Key.MaPhieuKiemKe,
                tongThua = g.Sum(x => x.Thua ?? 0),
                tongThieu = g.Sum(x => x.Thieu ?? 0),
            })
            .OrderByDescending(x => x.tongThua + x.tongThieu)
            .Take(10)
            .ToList();

        return Ok(new { lenhQuaHan, spktThieuDongBo, khoChenhLechKiemKe });
    }
}

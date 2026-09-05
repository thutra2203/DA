using backend_dotnet.Models;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services;

// Lệnh Xuất hủy/thanh lý ghi nhận NGAY dòng tồn kho cụ thể (lô + vị trí) đã chọn khi "Thêm trang
// bị" (CtdongBoTrongLenh.MaTonKho) nhưng CHƯA trừ Tồn kho — chỉ thực trừ khi lệnh Kết thúc (xem
// LenhTbDongBoController.KetThucHuyThanhLy). Trong lúc lệnh còn "chờ xử lý", số này coi như đã
// "giữ chỗ" — helper này tính tổng đang giữ chỗ để các nơi khác tính "tồn khả dụng" biết mà trừ
// ra, tránh 2 nơi cùng nhận là còn đủ số lượng của cùng 1 dòng tồn kho / cùng 1 TBĐB+cấp.
public static class HuyThanhLyReservationHelper
{
    public static async Task<Dictionary<long, int>> LayGiuChoAsync(QuanLyKhoQuanKhiContext db, IEnumerable<long> maTonKhoList)
    {
        var ids = maTonKhoList.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<long, int>();

        return await db.CtdongBoTrongLenhs
            .Where(c => c.MaTonKho != null && ids.Contains(c.MaTonKho.Value) && c.MaLenhNavigation.TrangThai != "HOAN_THANH")
            .GroupBy(c => c.MaTonKho!.Value)
            .Select(g => new { MaTonKho = g.Key, SoLuong = g.Sum(c => c.SoLuongTheoLenh) })
            .ToDictionaryAsync(x => x.MaTonKho, x => x.SoLuong);
    }

    public static async Task<Dictionary<(string MaTbdb, int MaCcl), int>> LayGiuChoTheoTbCapAsync(QuanLyKhoQuanKhiContext db, string maKho)
    {
        var raw = await db.CtdongBoTrongLenhs
            .Where(c => c.MaTonKho != null && c.MaCcl != null
                && c.MaLenhNavigation.MaKhoXuat == maKho && c.MaLenhNavigation.TrangThai != "HOAN_THANH")
            .Select(c => new { c.MaTbdb, MaCcl = c.MaCcl!.Value, c.SoLuongTheoLenh })
            .ToListAsync();

        return raw.GroupBy(x => (x.MaTbdb, x.MaCcl)).ToDictionary(g => g.Key, g => g.Sum(x => x.SoLuongTheoLenh));
    }
}

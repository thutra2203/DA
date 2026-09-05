using backend_dotnet.Models;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services;

// Lệnh Xuất (Nhập/Xuất chung, kể cả hủy/thanh lý) ghi nhận NGAY dòng tồn kho cụ thể (lô + vị trí)
// đã chọn khi "Xuất kho" (CTXuatKho) nhưng CHƯA trừ Tồn kho — chỉ thực trừ khi lệnh Kết thúc (xem
// LenhTbDongBoController.HoanThanh). Helper này tính tổng đang "giữ chỗ" bởi các lệnh CHƯA kết
// thúc, để các nơi khác tính "tồn khả dụng" biết mà trừ ra.
public static class XuatKhoReservationHelper
{
    public static async Task<Dictionary<long, int>> LayGiuChoAsync(QuanLyKhoQuanKhiContext db, IEnumerable<long> maTonKhoList)
    {
        var ids = maTonKhoList.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<long, int>();

        return await db.CtXuatKhos
            .Where(x => ids.Contains(x.MaTonKho) && x.MaCtdongBoLenhNavigation.MaLenhNavigation.TrangThai != "HOAN_THANH")
            .GroupBy(x => x.MaTonKho)
            .Select(g => new { MaTonKho = g.Key, SoLuong = g.Sum(x => x.SoLuong) })
            .ToDictionaryAsync(x => x.MaTonKho, x => x.SoLuong);
    }

    // boQuaMaLenh: loại trừ 1 lệnh cụ thể ra khỏi tổng — dùng khi nơi gọi ĐÃ tự tính riêng phần
    // "đang có trong chính lệnh này" bằng cách khác (VD tổng SoLuongTheoLenh của các dòng khác
    // cùng lệnh), để khỏi đếm trùng 2 lần phần lệnh đó tự giữ chỗ cho chính nó.
    public static async Task<Dictionary<(string MaTbdb, int MaCcl), int>> LayGiuChoTheoTbCapAsync(QuanLyKhoQuanKhiContext db, string maKho, string? boQuaMaLenh = null)
    {
        var query = db.CtXuatKhos
            .Where(x => x.MaCtdongBoLenhNavigation.MaLenhNavigation.MaKhoXuat == maKho
                && x.MaCtdongBoLenhNavigation.MaLenhNavigation.TrangThai != "HOAN_THANH"
                && x.MaCtdongBoLenhNavigation.MaCcl != null);
        if (!string.IsNullOrWhiteSpace(boQuaMaLenh))
            query = query.Where(x => x.MaCtdongBoLenhNavigation.MaLenh != boQuaMaLenh);

        var raw = await query
            .Select(x => new { x.MaCtdongBoLenhNavigation.MaTbdb, MaCcl = x.MaCtdongBoLenhNavigation.MaCcl!.Value, x.SoLuong })
            .ToListAsync();

        return raw.GroupBy(x => (x.MaTbdb, x.MaCcl)).ToDictionary(g => g.Key, g => g.Sum(x => x.SoLuong));
    }
}

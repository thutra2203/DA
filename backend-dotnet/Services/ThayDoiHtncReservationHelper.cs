using backend_dotnet.Models;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services;

// Lệnh thay đổi hình thức niêm cất chỉ thực sự trừ Tồn kho khi Kết thúc — trong lúc lệnh còn "chờ
// xử lý" (chưa kết thúc), số lượng ghi trong ChiTietLenhThayDoiHtnc coi như đã "giữ chỗ" nhưng
// TonKhoTbdb.SoLuong vẫn chưa đổi, nên các thao tác khác (Xuất kho, chuyển cấp, hủy/thanh lý, thay
// đổi vị trí, hay 1 lệnh thay đổi HTNC KHÁC) vẫn thấy đủ số lượng và có thể lấy trùng phần đã giữ
// chỗ đó. Helper này tính tổng đang bị giữ chỗ theo từng dòng tồn kho để trừ vào "khả dụng" trước
// khi cho chọn/thao tác.
public static class ThayDoiHtncReservationHelper
{
    public static async Task<Dictionary<long, int>> LayGiuChoAsync(
        QuanLyKhoQuanKhiContext db, IEnumerable<long> maTonKhoList, string? boQuaMaLenh = null)
    {
        var ids = maTonKhoList.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<long, int>();

        var query = db.ChiTietLenhThayDoiHtncs
            .Where(c => ids.Contains(c.MaTonKho) && c.MaLenhNavigation.TrangThai != "HOAN_THANH");
        if (!string.IsNullOrWhiteSpace(boQuaMaLenh))
            query = query.Where(c => c.MaLenh != boQuaMaLenh);

        return await query
            .GroupBy(c => c.MaTonKho)
            .Select(g => new { MaTonKho = g.Key, SoLuong = g.Sum(c => c.SoLuong) })
            .ToDictionaryAsync(x => x.MaTonKho, x => x.SoLuong);
    }

    // Cùng ý nghĩa như trên nhưng gộp theo (Mã TBĐB, Cấp chất lượng của lô) tại 1 kho cụ thể — dùng
    // cho các màn hình chỉ làm việc ở mức tổng hợp TBĐB+cấp (chưa xuống tới từng dòng tồn kho lô+vị
    // trí), như "Tồn kho theo cấp" hay kiểm tra vượt tồn khi Xuất.
    public static async Task<Dictionary<(string MaTbdb, int MaCcl), int>> LayGiuChoTheoTbCapAsync(QuanLyKhoQuanKhiContext db, string maKho)
    {
        var raw = await (
            from c in db.ChiTietLenhThayDoiHtncs
            join l in db.LenhThayDoiHtncs on c.MaLenh equals l.MaLenh
            join lo in db.LoTbdbs on c.MaLoTbdb equals lo.MaLoTbdb
            where l.MaKho == maKho && l.TrangThai != "HOAN_THANH"
            select new { lo.MaTbdb, lo.MaCcl, c.SoLuong }
        ).ToListAsync();

        return raw.GroupBy(x => (x.MaTbdb, x.MaCcl)).ToDictionary(g => g.Key, g => g.Sum(x => x.SoLuong));
    }
}

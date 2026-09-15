using backend_dotnet.Models;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services.Rbac;

// Nạp sẵn 4 quyền (XEM/THEM/SUA/XOA) và danh sách nhóm chức năng vào DB khi khởi động — idempotent,
// chỉ thêm cái còn thiếu, không đụng dữ liệu phân quyền (VaiTroChucNangQuyen) mà admin đã cấu hình.
public static class RbacSeeder
{
    public static async Task SeedAsync(QuanLyKhoQuanKhiContext db, ILogger? logger = null)
    {
        // Truy vấn nhẹ, tránh treo lâu nếu DB tạm chậm.
        db.Database.SetCommandTimeout(TimeSpan.FromSeconds(10));

        var themQuyen = 0;
        var daCoQuyen = await db.Quyens.Select(q => q.TenQuyen).ToListAsync();
        foreach (var (ma, ten) in QuyenCodes.DanhSach)
            if (!daCoQuyen.Contains(ma))
            {
                db.Quyens.Add(new Quyen { TenQuyen = ma, GhiChu = ten });
                themQuyen++;
            }

        var hopLe = Cn.DanhSach.Select(x => x.Ma).ToHashSet();
        var themCn = 0;
        var daCoCn = await db.ChucNangs.Select(c => c.MaCn).ToListAsync();
        foreach (var (ma, ten) in Cn.DanhSach)
            if (!daCoCn.Contains(ma))
            {
                db.ChucNangs.Add(new ChucNang { MaCn = ma, TenCn = ten });
                themCn++;
            }

        // Dọn các nhóm chức năng cũ không còn trong danh sách (kèm mọi bản ghi phân quyền của chúng).
        var loiThoi = daCoCn.Where(m => !hopLe.Contains(m)).ToList();
        if (loiThoi.Count > 0)
        {
            db.VaiTroChucNangQuyens.RemoveRange(db.VaiTroChucNangQuyens.Where(v => loiThoi.Contains(v.MaCn)));
            db.ChucNangs.RemoveRange(db.ChucNangs.Where(c => loiThoi.Contains(c.MaCn)));
        }

        if (themQuyen > 0 || themCn > 0 || loiThoi.Count > 0)
        {
            try
            {
                await db.SaveChangesAsync();
                logger?.LogInformation("RbacSeeder: +{Q} quyền, +{C} chức năng, -{X} chức năng lỗi thời.",
                    themQuyen, themCn, loiThoi.Count);
            }
            catch (DbUpdateException ex)
            {
                logger?.LogWarning(ex, "RbacSeeder: bỏ qua (có thể instance khác đã seed).");
            }
        }
    }
}

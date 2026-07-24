using backend_dotnet.Models;

namespace backend_dotnet.Services;

public interface IActivityLogger
{
    Task LogAsync(
        int? maNguoiDung, string? tenDangNhap, string hanhDong,
        string? doiTuong = null, string? maDoiTuong = null, string moTa = "",
        string ketQua = "THANH_CONG", string? lyDoThatBai = null);
}

// Tương đương backend/src/utils/activityLogger.js — ghi log thất bại không được làm hỏng thao tác chính.
public class ActivityLogger(QuanLyKhoQuanKhiContext db, ILogger<ActivityLogger> logger) : IActivityLogger
{
    public async Task LogAsync(
        int? maNguoiDung, string? tenDangNhap, string hanhDong,
        string? doiTuong = null, string? maDoiTuong = null, string moTa = "",
        string ketQua = "THANH_CONG", string? lyDoThatBai = null)
    {
        try
        {
            db.NhatKyHoatDongs.Add(new NhatKyHoatDong
            {
                MaNguoiDung = maNguoiDung,
                TenDangNhap = tenDangNhap,
                HanhDong = hanhDong,
                DoiTuong = doiTuong,
                MaDoiTuong = maDoiTuong,
                MoTa = moTa,
                ThoiGian = DateTime.Now,
                KetQua = ketQua,
                LyDoThatBai = lyDoThatBai,
            });
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Loi ghi nhat ky hoat dong");
        }
    }
}

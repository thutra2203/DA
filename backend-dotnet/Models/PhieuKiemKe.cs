using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class PhieuKiemKe
{
    public string MaPhieuKiemKe { get; set; } = null!;

    public string MaDotKiemKe { get; set; } = null!;

    public DateOnly NgayLap { get; set; }

    public DateOnly? NgayKiemKe { get; set; }

    public string MaKho { get; set; } = null!;

    public string NhomTb { get; set; } = null!;

    public string? NoiDung { get; set; }

    public string? TrangThai { get; set; }

    public string? NguoiTao { get; set; }

    public string? NguoiKiemKe { get; set; }

    public DateOnly? NgayKetThuc { get; set; }

    public virtual ICollection<ChiTietKiemKe> ChiTietKiemKes { get; set; } = new List<ChiTietKiemKe>();

    public virtual ICollection<ChuyenKy> ChuyenKies { get; set; } = new List<ChuyenKy>();

    public virtual DotKiemKe MaDotKiemKeNavigation { get; set; } = null!;

    public virtual Kho MaKhoNavigation { get; set; } = null!;
}

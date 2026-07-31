using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Tbdb
{
    public string MaTbdb { get; set; } = null!;

    public string MaLoaiTbdb { get; set; } = null!;

    public string? TenTbdb { get; set; }

    public string? MaDvt { get; set; }

    public string? GhiChu { get; set; }

    public DateTime ThoiGianTao { get; set; }

    public DateTime? CapNhatMoiNhat { get; set; }

    public virtual ICollection<ChiTietDongBo> ChiTietDongBos { get; set; } = new List<ChiTietDongBo>();

    public virtual ICollection<ChiTietKiemKe> ChiTietKiemKes { get; set; } = new List<ChiTietKiemKe>();

    public virtual ICollection<CtdongBoTrongLenh> CtdongBoTrongLenhs { get; set; } = new List<CtdongBoTrongLenh>();

    public virtual ICollection<LoTbdb> LoTbdbs { get; set; } = new List<LoTbdb>();

    public virtual Dvt? MaDvtNavigation { get; set; }

    public virtual LoaiTbdb MaLoaiTbdbNavigation { get; set; } = null!;
}

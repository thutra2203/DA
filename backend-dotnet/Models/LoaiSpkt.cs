using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class LoaiSpkt
{
    public string MaLoai { get; set; } = null!;

    public string MaNhom { get; set; } = null!;

    public string TenLoai { get; set; } = null!;

    public string? Co { get; set; }

    public string? KiHieu { get; set; }

    public string? NuocSx { get; set; }

    public string? MaDvt { get; set; }

    public string? GhiChu { get; set; }

    public virtual ICollection<ChiTietKiemKe> ChiTietKiemKes { get; set; } = new List<ChiTietKiemKe>();

    public virtual ICollection<ChiTietLenh> ChiTietLenhs { get; set; } = new List<ChiTietLenh>();

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual NhomSpkt MaNhomNavigation { get; set; } = null!;

    public virtual ICollection<SpkttrongLenh> SpkttrongLenhs { get; set; } = new List<SpkttrongLenh>();

    public virtual ICollection<TonDauKy> TonDauKies { get; set; } = new List<TonDauKy>();

    public virtual ICollection<KieuSpkt> MaKieus { get; set; } = new List<KieuSpkt>();
}

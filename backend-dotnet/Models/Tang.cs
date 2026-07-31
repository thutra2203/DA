using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Tang
{
    public string MaTang { get; set; } = null!;

    public string MaGia { get; set; } = null!;

    public int SoTang { get; set; }

    public string? GhiChu { get; set; }

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual ICollection<Hom> Homs { get; set; } = new List<Hom>();

    public virtual GiaHang MaGiaNavigation { get; set; } = null!;
}

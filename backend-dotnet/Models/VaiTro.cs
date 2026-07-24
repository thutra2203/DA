using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class VaiTro
{
    public string MaVaiTro { get; set; } = null!;

    public string TenVaiTro { get; set; } = null!;

    public string? MoTa { get; set; }

    public virtual ICollection<NguoiDungVaiTro> NguoiDungVaiTros { get; set; } = new List<NguoiDungVaiTro>();

    public virtual ICollection<VaiTroChucNangQuyen> VaiTroChucNangQuyens { get; set; } = new List<VaiTroChucNangQuyen>();
}

using System.Text.Json.Serialization;

namespace backend_dotnet.Dtos;

public class PhanQuyenItem
{
    [JsonPropertyName("VaiTro")] public string VaiTro { get; set; } = "";
    [JsonPropertyName("Module")] public string Module { get; set; } = "";
    [JsonPropertyName("CoTheXem")] public int CoTheXem { get; set; }
    [JsonPropertyName("CoTheThemMoi")] public int CoTheThemMoi { get; set; }
    [JsonPropertyName("CoTheSua")] public int CoTheSua { get; set; }
    [JsonPropertyName("CoTheXoa")] public int CoTheXoa { get; set; }
}

public record UpdatePermissionRequest(string? VaiTro, string? Module, bool CoTheXem, bool CoTheThemMoi, bool CoTheSua, bool CoTheXoa);

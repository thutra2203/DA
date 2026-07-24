using System.Text.Json.Serialization;

namespace backend_dotnet.Dtos;

public class NhatKyItem
{
    [JsonPropertyName("ID")] public long Id { get; set; }
    [JsonPropertyName("MaNguoiDung")] public int? MaNguoiDung { get; set; }
    [JsonPropertyName("TenDangNhap")] public string? TenDangNhap { get; set; }
    [JsonPropertyName("HanhDong")] public string HanhDong { get; set; } = "";
    [JsonPropertyName("DoiTuong")] public string? DoiTuong { get; set; }
    [JsonPropertyName("MaDoiTuong")] public string? MaDoiTuong { get; set; }
    [JsonPropertyName("MoTa")] public string? MoTa { get; set; }
    [JsonPropertyName("ThoiGian")] public DateTime ThoiGian { get; set; }
    [JsonPropertyName("KetQua")] public string KetQua { get; set; } = "";
    [JsonPropertyName("LyDoThatBai")] public string? LyDoThatBai { get; set; }
}

public class NhatKyResponse
{
    [JsonPropertyName("data")] public List<NhatKyItem> Data { get; set; } = [];
    [JsonPropertyName("total")] public int Total { get; set; }
}

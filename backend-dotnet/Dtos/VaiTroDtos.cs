using System.Text.Json.Serialization;

namespace backend_dotnet.Dtos;

public class VaiTroItem
{
    [JsonPropertyName("ID")] public string Id { get; set; } = "";
    [JsonPropertyName("TenVaiTro")] public string TenVaiTro { get; set; } = "";
    [JsonPropertyName("MoTa")] public string? MoTa { get; set; }
}

public record CreateVaiTroRequest(string? TenVaiTro, string? MoTa);
public record UpdateVaiTroRequest(string? TenVaiTro, string? MoTa);

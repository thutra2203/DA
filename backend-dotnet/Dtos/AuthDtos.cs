namespace backend_dotnet.Dtos;

public record LoginRequest(string? Username, string? Password);

public record UserSummary(int Id, string Username, string HoTen, string? Role, string? MaDonVi, string? TenDonVi);

public record LoginResponse(string Message, string Token, UserSummary User);

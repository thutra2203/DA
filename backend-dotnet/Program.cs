using System.Text;
using backend_dotnet.Models;
using backend_dotnet.Services;
using backend_dotnet.Services.Graph;
using backend_dotnet.Services.Rbac;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Neo4j.Driver;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<QuanLyKhoQuanKhiContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<IActivityLogger, ActivityLogger>();
builder.Services.AddScoped<TokenService>();

// ===== Neo4j (đồ thị cho phần Tổng quan) =====
// GraphDatabase.Driver không mở kết nối ngay nên đăng ký vô điều kiện là an toàn; khi
// Neo4j:Enabled=false thì worker không chạy và các truy vấn trả 503 mềm.
var neo4jOptions = builder.Configuration.GetSection("Neo4j").Get<Neo4jOptions>() ?? new Neo4jOptions();
builder.Services.AddSingleton(neo4jOptions);
builder.Services.AddSingleton<IDriver>(_ =>
    GraphDatabase.Driver(neo4jOptions.Uri, AuthTokens.Basic(neo4jOptions.User, neo4jOptions.Password)));
builder.Services.AddScoped<GraphSyncService>();
builder.Services.AddScoped<GraphQueryService>();
builder.Services.AddHostedService<GraphSyncWorker>();

var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Admin", policy => policy.RequireRole("ADMIN"));

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

var app = builder.Build();

// Nạp sẵn quyền + nhóm chức năng cho phân quyền (idempotent). Lỗi ở bước này KHÔNG được làm sập
// ứng dụng — chỉ ghi cảnh báo rồi tiếp tục (vd DB tạm chậm, hoặc chạy 2 instance cùng lúc).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<QuanLyKhoQuanKhiContext>();
    var seedLogger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("RbacSeeder");
    try
    {
        await RbacSeeder.SeedAsync(db, seedLogger);
    }
    catch (Exception ex)
    {
        seedLogger.LogWarning(ex, "Bỏ qua seed phân quyền — sẽ thử lại ở lần khởi động sau.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "OK", message = "Server đang chạy" }));

app.MapControllers();

app.Run();

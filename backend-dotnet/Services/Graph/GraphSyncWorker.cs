namespace backend_dotnet.Services.Graph;

// Chạy nền: dựng lại đồ thị Neo4j lúc khởi động (nếu bật) rồi lặp lại theo chu kỳ cấu hình.
// Lỗi kết nối chỉ ghi log cảnh báo, không làm sập ứng dụng — phần Tổng quan sẽ hiển thị "chưa bật".
public class GraphSyncWorker(
    IServiceScopeFactory scopeFactory,
    Neo4jOptions options,
    ILogger<GraphSyncWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Enabled)
        {
            logger.LogInformation("Neo4j đang tắt (Neo4j:Enabled=false) — bỏ qua đồng bộ đồ thị.");
            return;
        }

        try
        {
            if (options.SyncOnStartup)
            {
                // Chờ một chút cho ứng dụng khởi động xong hẳn.
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                await ChayMotLuotAsync(stoppingToken, ghiLog: true);
            }

            var chuKy = TimeSpan.FromMinutes(Math.Max(1, options.SyncIntervalMinutes));
            using var timer = new PeriodicTimer(chuKy);
            while (await timer.WaitForNextTickAsync(stoppingToken))
                await ChayMotLuotAsync(stoppingToken, ghiLog: false); // đồng bộ định kỳ — không ghi log cho đỡ nhiễu
        }
        catch (OperationCanceledException) { /* dừng ứng dụng — bỏ qua */ }
    }

    private async Task ChayMotLuotAsync(CancellationToken ct, bool ghiLog)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var svc = scope.ServiceProvider.GetRequiredService<GraphSyncService>();
            await svc.DongBoToanBoAsync(ct, ghiLogThongTin: ghiLog);
        }
        catch (OperationCanceledException) { /* dừng ứng dụng — bỏ qua */ }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Đồng bộ Neo4j thất bại — sẽ thử lại ở chu kỳ sau.");
        }
    }
}

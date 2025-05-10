using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure;
using AkashTrends.Infrastructure.ExternalApis;
using AkashTrends.Infrastructure.ExternalApis.Coinbase;
using AkashTrends.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using AkashTrends.API.Hubs;
using AkashTrends.API.Services;
using AkashTrends.API.Extensions;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/akashtrends-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Add JSON file configuration
builder.Configuration.AddJsonFile("credentials.json", optional: true, reloadOnChange: true);

// Add services to the container.
builder.Services.AddInfrastructureServices(builder.Configuration);

builder.Services.Configure<CoinbaseApiOptions>(options =>
{
    var section = builder.Configuration.GetSection("CoinbaseApi");
    section.Bind(options);

    // Map existing credentials format
    var name = builder.Configuration.GetValue<string>("name");
    var privateKey = builder.Configuration.GetValue<string>("privateKey");

    if (!string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(privateKey))
    {
        // Extract the API key from the organization format
        var apiKey = name.Split('/').LastOrDefault() ?? name;
        options.ApiKey = apiKey;
        options.ApiSecret = privateKey;

        Console.WriteLine($"Loaded API credentials. Key ID: {MaskString(apiKey)}");
    }

    // Environment variables take precedence if they exist
    options.ApiKey = Environment.GetEnvironmentVariable("COINBASE_API_KEY") ?? options.ApiKey;
    options.ApiSecret = Environment.GetEnvironmentVariable("COINBASE_API_SECRET") ?? options.ApiSecret;
});

static string MaskString(string input)
{
    if (string.IsNullOrEmpty(input)) return string.Empty;
    if (input.Length <= 8) return "****";
    return $"{input.Substring(0, 4)}...{input.Substring(input.Length - 4)}";
}

// Add CORS support
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddSingleton<ITimeProvider, CryptoTimeProvider>();
builder.Services.AddRealTimeServices();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Add global exception handling middleware
app.UseGlobalExceptionHandler();

app.UseHttpsRedirection();

// Use CORS middleware
app.UseCors("AllowFrontend");

app.UseAuthorization();
app.MapControllers();
app.MapHub<PriceUpdateHub>("/hubs/price");

try
{
    Log.Information("Starting AkashTrends API");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application start-up failed");
}
finally
{
    Log.CloseAndFlush();
}

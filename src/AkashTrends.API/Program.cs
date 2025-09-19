using AkashTrends.Application;
using AkashTrends.Core;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure;
using AkashTrends.Infrastructure.Data;
using AkashTrends.Infrastructure.ExternalApis.Coinbase;
using AkashTrends.Infrastructure.Services;
using AkashTrends.API.Hubs;
using AkashTrends.API.Services;
using AkashTrends.API.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
builder.Services.AddCoreServices();
builder.Services.AddApplicationServices();
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
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddControllers(options =>
{
    options.Filters.Add<AkashTrends.API.Filters.ValidationActionFilter>();
});

// Suppress default model validation responses
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = true;
});
builder.Services.AddSignalR();
builder.Services.AddSingleton<ITimeProvider, CryptoTimeProvider>();
builder.Services.AddRealTimeServices();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "AkashTrends API",
        Version = "v1",
        Description = "A comprehensive cryptocurrency analysis and trading platform API",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "AkashTrends",
            Email = "support@akashtrends.com"
        }
    });

    // Include XML comments if they exist
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});

var app = builder.Build();

// Ensure database is created and migrations are applied
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AlertDbContext>();
    try
    {
        dbContext.Database.EnsureCreated();
        Log.Information("AlertDbContext database ensured to exist");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to ensure AlertDbContext database exists");
        throw;
    }
}

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
app.MapHub<PriceUpdateHub>("/hubs/crypto");

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

// Make the implicit Program class public for testing
public partial class Program { }

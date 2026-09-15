using System.Data.Common;
using System.Text.Json;
using System.Threading.RateLimiting;
using ClassData;
using Raintree.Models.Daily;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Routine") ?? "Data Source=Routine.db";
builder.Services.AddSqlite<ScheduleDbContext>(connectionString);

// Enable swagger environment
builder.Services.AddDatabaseDeveloperPageExceptionFilter();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApiDocument(config =>
{
    config.DocumentName = "Raintree";
    config.Title = "Raintree v1";
    config.Version = "v1";
});

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = 100,
            QueueLimit = 0
        });
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Enable CORS for only production and development environment 
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.AllowAnyMethod()
            .AllowAnyHeader()
            .SetIsOriginAllowed(origin =>
            {
                if (origin == "https://raintree-xnlz.onrender.com") return true;
                if (origin.StartsWith("http://localhost") || origin.StartsWith("http://127.0.0.1")) return true;
                if (origin.StartsWith("http://192.168.") || origin.StartsWith("http://10.0.")) return true;
                return false;
            });
    });
});

// Add output caching services
builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(builder => builder.Expire(TimeSpan.FromHours(12)));
});

// Builds the app
var app = builder.Build();

app.UseCors("FrontendPolicy");
app.UseRateLimiter();
app.UseOutputCache();
app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseOpenApi();
    app.UseSwaggerUi(config =>
    {
        config.DocumentTitle = "Raintree";
        config.Path = "/swagger";
        config.DocumentPath = "/swagger/{documentName}/swagger.json";
        config.DocExpansion = "list";
    });
}

// Create the database for the first time
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ScheduleDbContext>();
    db.Database.EnsureCreated();
    if(!db.Classes.Any())
    {
        // Read the JSON source of truth and put in database 
        var jsonPath = Path.GetFullPath("Routine/BSC in CSE Routine Summer 2026 v1.json");
        var rawJson = File.ReadAllText(jsonPath);
        var parsedJson = JsonSerializer.Deserialize<List<ClassScheduleSlot>>(rawJson) ?? [];
        db.Classes.AddRange(parsedJson);
        db.SaveChanges();
    }
}

// For keeping the service alive in Render
app.MapGet("/uptime", () => { return "Raintree: all system's operational!"; });

// Filter routine by batch and section
app.MapGet("/schedule/{batch}/{section}", (int batch, char section, ScheduleDbContext db) =>
{
    var allSchedule = db.Classes
        .Where(c => c.Batch == batch && c.Section == section)
        .ToList();

    // Group by day and check if each day is an off day
    var finalSchedule = allSchedule
        .GroupBy(c => c.Day)
        .Select(dayGroup => new
        {
            day = dayGroup.Key,
            isOffDay = dayGroup.All(c => c.Subject == null),
            classes = dayGroup.ToList()
        })
        .ToList();

    return finalSchedule;
}).CacheOutput();

// Replace current full routine with a new one
app.MapPost("updateall", (List<ClassScheduleSlot> routine, ScheduleDbContext db) =>
{
    db.Classes.RemoveRange(db.Classes);
    db.Classes.AddRange(routine);
    db.SaveChanges();
    
    return Results.Created();
});

app.MapFallbackToFile("index.html");

// Run the program in both dev and prod environment
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Run($"http://0.0.0.0:{port}");


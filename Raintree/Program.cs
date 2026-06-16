using System.Text.Json;
using System.Threading.RateLimiting;
using ClassData;
using ClassModel;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Routine") ?? "Data Source=Routine.db";
builder.Services.AddSqlite<ClassContext>(connectionString);

// enable swagger environment
builder.Services.AddDatabaseDeveloperPageExceptionFilter();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApiDocument(config =>
{
    config.DocumentName = "Raintree";
    config.Title = "Raintree v1";
    config.Version = "v1";
});

// rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = 30,
            QueueLimit = 0
        });
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// enable cross origin resource sharing for prod and dev only 
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

var app = builder.Build();

app.UseCors("FrontendPolicy");
app.UseRateLimiter();
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

// read the JSON file and make it usable
var jsonPath = Path.GetFullPath("Routine/BSC in CSE Routine Summer 2026 v1.json");
var json = File.ReadAllText(jsonPath);
var classes = JsonSerializer.Deserialize<List<Class>>(json) ?? [];

// create the database 
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ClassContext>();
    db.Database.EnsureDeleted();
    db.Database.EnsureCreated();
    db.Classes.AddRange(classes);
    db.SaveChanges();
}

// app.MapGet("/", () => { return "Welcome to Project Raintree!"; });
// For keeping the program alive via Github Workers
app.MapGet("/uptime", () => { return "Raintree: all system's operational."; });

// Filter routine by batch and section
app.MapGet("/schedule/{batch}/{section}", (int batch, char section, ClassContext db) =>
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
});


app.MapFallbackToFile("index.html");
// run the program in both dev and prod environment
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Run($"http://0.0.0.0:{port}");

using System.Threading.RateLimiting;
using Raintree.ClassData;
using Raintree.Models.Daily;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Routine") ?? "Data Source=Routine.db";
builder.Services.AddSqlite<ScheduleDbContext>(connectionString);

// Swagger
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
    options.GlobalLimiter =
        PartitionedRateLimiter.Create<HttpContext, string>(context =>
        {
            var ip =
                context.Connection.RemoteIpAddress?.ToString()
                ?? "unknown";

            return RateLimitPartition.GetFixedWindowLimiter(
                ip,
                _ => new FixedWindowRateLimiterOptions
                {
                    Window = TimeSpan.FromMinutes(1),
                    PermitLimit = 100,
                    QueueLimit = 0
                });
        });

    options.RejectionStatusCode =
        StatusCodes.Status429TooManyRequests;
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .AllowAnyMethod()
            .AllowAnyHeader()
            .SetIsOriginAllowed(origin =>
            {
                if (origin == "https://raintree-xnlz.onrender.com")
                    return true;

                if (origin.StartsWith("http://localhost"))
                    return true;

                if (origin.StartsWith("http://127.0.0.1"))
                    return true;

                if (origin.StartsWith("http://192.168."))
                    return true;

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

// Make sure database exists
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider
        .GetRequiredService<ScheduleDbContext>();

    db.Database.EnsureCreated();
}

// Keep Render service alive
app.MapGet("/uptime", () =>
{
    return "Raintree: all system's operational!\n";
});

// Get routine
app.MapGet("/schedule/{batch}/{section}",
    (int batch, char section, ScheduleDbContext db) =>
{
    var allSchedule = db.Classes
        .Where(c => c.Batch == batch && c.Section == section)
        .ToList();

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

// Get batches
app.MapGet("/batches", (ScheduleDbContext db) =>
{
    var batches = db.Classes
        .Select(c => c.Batch)
        .Distinct()
        .OrderBy(batch => batch)
        .ToList();

    return Results.Ok(batches);
});

// Get sections
app.MapGet("/sections/{batch}", (int batch, ScheduleDbContext db) =>
{
    var sections = db.Classes
        .Where(c => c.Batch == batch)
        .Select(c => c.Section)
        .Distinct()
        .OrderBy(section => section)
        .ToList();

    return Results.Ok(sections);
});

// Replace entire routine
app.MapPost("/updateall",
    (List<ClassScheduleSlot> routine, ScheduleDbContext db) =>
{
    if (routine.Count == 0)
    {
        return Results.BadRequest("Error: Routine can't be empty!");
    }

    db.Classes.RemoveRange(db.Classes);
    db.Classes.AddRange(routine);
    db.SaveChanges();

    return Results.Created();
});

app.MapGet("/debug-db", (ScheduleDbContext db) =>
{
    var connection = db.Database.GetDbConnection();

    return Results.Ok(new
    {
        connectionString = connection.ConnectionString,
        currentDirectory = Directory.GetCurrentDirectory(),
        appDirectory = AppContext.BaseDirectory,
        databaseExists = File.Exists(
            Path.Combine(Directory.GetCurrentDirectory(), "Routine.db")
        ),
        classCount = db.Classes.Count()
    });
});

app.MapFallbackToFile("index.html");

var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";

app.Run($"http://0.0.0.0:{port}");
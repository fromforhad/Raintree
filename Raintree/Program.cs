using System.Text.Json;
using ClassData;
using ClassModel;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Classes") ?? "Data Source=Classes.db";
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
builder.Services.AddCors();
var app = builder.Build();
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

// enable cross origin resource sharing 
app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// read the JSON file and make it usable
var jsonPath = Path.GetFullPath("ClassSchedules 61C.json");
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

app.MapGet("/", () =>
{
    return "Welcome to Project Raintree!";
});

// filter routine by batch and section
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

// run the program in both dev and prod environment
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Run($"http://0.0.0.0:{port}");

using System.Text.Json;
using ClassData;
using ClassModel;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Classes") ?? "Data Source=Classes.db";
builder.Services.AddSqlite<ClassContext>(connectionString);

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
app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

var jsonPath = Path.GetFullPath("Classes.json");
var json = File.ReadAllText(jsonPath);
var classes = JsonSerializer.Deserialize<List<Class>>(json) ?? [];

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
app.MapGet("/schedule/{batch}/{day}", (string batch, string day, ClassContext db) =>
{
    var schedule = db.Classes
        .Where(c => c.Batch == batch && c.Day == day)
        .ToList();
    bool isOffDay = schedule.All(c => c.Subject == null);
    
    return new { isOffDay, schedule };
});

var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Run($"http://0.0.0.0:{port}");

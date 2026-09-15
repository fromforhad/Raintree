using Microsoft.EntityFrameworkCore;
using Raintree.Models.Daily;

namespace ClassData;

public class ScheduleDbContext : DbContext
{
    public ScheduleDbContext(DbContextOptions<ScheduleDbContext> options)
        : base(options) { }
    public DbSet<ClassScheduleSlot> Classes { get; set; }
}

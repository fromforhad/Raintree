using Microsoft.EntityFrameworkCore;
using ClassModel;

namespace ClassData;

public class ClassContext : DbContext
{
    public ClassContext(DbContextOptions<ClassContext> options)
        : base(options) { }
    public DbSet<Class> Classes { get; set; }
}

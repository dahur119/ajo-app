using Microsoft.EntityFrameworkCore;
using investment_service.Models;

namespace investment_service.Data
{
    public class InvestmentDbContext : DbContext
    {
        public InvestmentDbContext(DbContextOptions<InvestmentDbContext> options) : base(options) {}

        public DbSet<Product> Products { get; set; }
        public DbSet<Subscription> Subscriptions { get; set; }
        public DbSet<InvestmentTransaction> InvestmentTransactions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Product>().HasKey(p => p.Id);
            modelBuilder.Entity<Subscription>().HasKey(s => s.Id);
            modelBuilder.Entity<InvestmentTransaction>().HasKey(t => t.Id);
            modelBuilder.Entity<InvestmentTransaction>().HasIndex(t => t.RequestId).IsUnique();
            modelBuilder.Entity<Subscription>().HasIndex(s => s.UserId);
        }
    }
}
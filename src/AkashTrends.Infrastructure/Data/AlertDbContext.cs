using AkashTrends.Core.Domain;
using Microsoft.EntityFrameworkCore;

namespace AkashTrends.Infrastructure.Data;

public class AlertDbContext : DbContext
{
    public AlertDbContext(DbContextOptions<AlertDbContext> options) : base(options)
    {
    }

    public DbSet<Alert> Alerts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Alert>(entity =>
        {
            // Primary key
            entity.HasKey(e => e.Id);

            // Properties
            entity.Property(e => e.UserId)
                .IsRequired()
                .HasMaxLength(256);

            entity.Property(e => e.Symbol)
                .IsRequired()
                .HasMaxLength(10);

            entity.Property(e => e.Threshold)
                .IsRequired()
                .HasPrecision(18, 8);

            entity.Property(e => e.Condition)
                .IsRequired()
                .HasConversion<string>();

            entity.Property(e => e.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.Message)
                .IsRequired()
                .HasMaxLength(1000);

            entity.Property(e => e.IsActive)
                .IsRequired();

            entity.Property(e => e.IsTriggered)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.Property(e => e.TriggeredAt)
                .IsRequired(false);

            entity.Property(e => e.TriggeredPrice)
                .IsRequired(false)
                .HasPrecision(18, 8);

            entity.Property(e => e.CooldownSeconds)
                .IsRequired(false);

            // Indexes for performance
            entity.HasIndex(e => e.UserId)
                .HasDatabaseName("IX_Alerts_UserId");

            entity.HasIndex(e => e.Symbol)
                .HasDatabaseName("IX_Alerts_Symbol");

            entity.HasIndex(e => new { e.IsActive, e.IsTriggered })
                .HasDatabaseName("IX_Alerts_Active_Triggered");

            entity.HasIndex(e => e.CreatedAt)
                .HasDatabaseName("IX_Alerts_CreatedAt");
        });
    }
}
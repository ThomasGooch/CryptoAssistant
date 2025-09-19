using AkashTrends.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#nullable disable

namespace AkashTrends.Infrastructure.Migrations
{
    [DbContext(typeof(AlertDbContext))]
    partial class AlertDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder.HasAnnotation("ProductVersion", "9.0.4");

            modelBuilder.Entity("AkashTrends.Core.Domain.Alert", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("TEXT");

                    b.Property<string>("Condition")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<int?>("CooldownSeconds")
                        .HasColumnType("INTEGER");

                    b.Property<DateTimeOffset>("CreatedAt")
                        .HasColumnType("TEXT");

                    b.Property<bool>("IsActive")
                        .HasColumnType("INTEGER");

                    b.Property<bool>("IsTriggered")
                        .HasColumnType("INTEGER");

                    b.Property<string>("Message")
                        .IsRequired()
                        .HasMaxLength(1000)
                        .HasColumnType("TEXT");

                    b.Property<string>("Symbol")
                        .IsRequired()
                        .HasMaxLength(10)
                        .HasColumnType("TEXT");

                    b.Property<decimal>("Threshold")
                        .HasPrecision(18, 8)
                        .HasColumnType("TEXT");

                    b.Property<string>("Title")
                        .IsRequired()
                        .HasMaxLength(200)
                        .HasColumnType("TEXT");

                    b.Property<DateTimeOffset?>("TriggeredAt")
                        .HasColumnType("TEXT");

                    b.Property<decimal?>("TriggeredPrice")
                        .HasPrecision(18, 8)
                        .HasColumnType("TEXT");

                    b.Property<string>("UserId")
                        .IsRequired()
                        .HasMaxLength(256)
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.HasIndex("CreatedAt")
                        .HasDatabaseName("IX_Alerts_CreatedAt");

                    b.HasIndex("Symbol")
                        .HasDatabaseName("IX_Alerts_Symbol");

                    b.HasIndex("UserId")
                        .HasDatabaseName("IX_Alerts_UserId");

                    b.HasIndex("IsActive", "IsTriggered")
                        .HasDatabaseName("IX_Alerts_Active_Triggered");

                    b.ToTable("Alerts");
                });
#pragma warning restore 612, 618
        }
    }
}
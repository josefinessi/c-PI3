using GestaoFerias.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GestaoFerias.Infrastructure.Data.Context;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Setor> Setores => Set<Setor>();

    public DbSet<Ferias> Ferias => Set<Ferias>();
    public DbSet<FeriasPeriodo> FeriasPeriodos => Set<FeriasPeriodo>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.HasIndex(u => u.Matricula).IsUnique();
            entity.Property(u => u.Matricula).IsRequired();

            entity.HasOne(u => u.Setor)
                  .WithMany()
                  .HasForeignKey(u => u.SetorId)
                  .IsRequired();
        });

        modelBuilder.Entity<Setor>(entity =>
        {
            entity.Property(s => s.Nome).IsRequired();
            entity.HasIndex(s => s.Nome).IsUnique();

            entity.Property(s => s.LimiteFeriasSimultaneas)
                  .HasDefaultValue(1)
                  .IsRequired();
        });

        modelBuilder.Entity<Ferias>(entity =>
        {
            entity.HasKey(f => f.Id);

            entity.HasOne(f => f.Usuario)
                  .WithMany()
                  .HasForeignKey(f => f.UsuarioId)
                  .IsRequired();

            entity.HasOne(f => f.Setor)
                  .WithMany()
                  .HasForeignKey(f => f.SetorId)
                  .IsRequired();

            entity.HasOne(f => f.AprovadoPor)
                  .WithMany()
                  .HasForeignKey(f => f.AprovadoPorId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.Property(f => f.Status).IsRequired();
            entity.Property(f => f.CreatedAt).IsRequired();

            entity.HasMany(f => f.Periodos)
                  .WithOne(p => p.Ferias)
                  .HasForeignKey(p => p.FeriasId)
                  .IsRequired();
        });

        modelBuilder.Entity<FeriasPeriodo>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Inicio).IsRequired();
            entity.Property(p => p.Fim).IsRequired();

            // índice útil p/ calendário e conflitos
            entity.HasIndex(p => new { p.Inicio, p.Fim });
        });
    }
}
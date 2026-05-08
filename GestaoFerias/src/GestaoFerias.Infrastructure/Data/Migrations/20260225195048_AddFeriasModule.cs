using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestaoFerias.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFeriasModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LimiteFeriasSimultaneas",
                table: "Setores",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "Ferias",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    SetorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AprovadoPorId = table.Column<Guid>(type: "uuid", nullable: true),
                    AprovadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MotivoNegacao = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ferias", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Ferias_Setores_SetorId",
                        column: x => x.SetorId,
                        principalTable: "Setores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Ferias_Usuarios_AprovadoPorId",
                        column: x => x.AprovadoPorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Ferias_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FeriasPeriodos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FeriasId = table.Column<Guid>(type: "uuid", nullable: false),
                    Inicio = table.Column<DateOnly>(type: "date", nullable: false),
                    Fim = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeriasPeriodos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeriasPeriodos_Ferias_FeriasId",
                        column: x => x.FeriasId,
                        principalTable: "Ferias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Ferias_AprovadoPorId",
                table: "Ferias",
                column: "AprovadoPorId");

            migrationBuilder.CreateIndex(
                name: "IX_Ferias_SetorId",
                table: "Ferias",
                column: "SetorId");

            migrationBuilder.CreateIndex(
                name: "IX_Ferias_UsuarioId",
                table: "Ferias",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_FeriasPeriodos_FeriasId",
                table: "FeriasPeriodos",
                column: "FeriasId");

            migrationBuilder.CreateIndex(
                name: "IX_FeriasPeriodos_Inicio_Fim",
                table: "FeriasPeriodos",
                columns: new[] { "Inicio", "Fim" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FeriasPeriodos");

            migrationBuilder.DropTable(
                name: "Ferias");

            migrationBuilder.DropColumn(
                name: "LimiteFeriasSimultaneas",
                table: "Setores");
        }
    }
}

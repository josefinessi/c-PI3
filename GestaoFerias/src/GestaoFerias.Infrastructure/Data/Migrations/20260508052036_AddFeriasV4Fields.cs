using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestaoFerias.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFeriasV4Fields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Adiant13",
                table: "Ferias",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AdiantFerias",
                table: "Ferias",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "AprovadoChefiaEm",
                table: "Ferias",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AprovadoChefiaPorId",
                table: "Ferias",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Ferias_AprovadoChefiaPorId",
                table: "Ferias",
                column: "AprovadoChefiaPorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Ferias_Usuarios_AprovadoChefiaPorId",
                table: "Ferias",
                column: "AprovadoChefiaPorId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Ferias_Usuarios_AprovadoChefiaPorId",
                table: "Ferias");

            migrationBuilder.DropIndex(
                name: "IX_Ferias_AprovadoChefiaPorId",
                table: "Ferias");

            migrationBuilder.DropColumn(
                name: "Adiant13",
                table: "Ferias");

            migrationBuilder.DropColumn(
                name: "AdiantFerias",
                table: "Ferias");

            migrationBuilder.DropColumn(
                name: "AprovadoChefiaEm",
                table: "Ferias");

            migrationBuilder.DropColumn(
                name: "AprovadoChefiaPorId",
                table: "Ferias");
        }
    }
}

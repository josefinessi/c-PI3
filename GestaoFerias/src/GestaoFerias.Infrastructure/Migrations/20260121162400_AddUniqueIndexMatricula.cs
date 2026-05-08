using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestaoFerias.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueIndexMatricula : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_Matricula",
                table: "Usuarios",
                column: "Matricula",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Usuarios_Matricula",
                table: "Usuarios");
        }
    }
}

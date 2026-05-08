using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestaoFerias.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CreateSetores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
{
    // 1) Cria tabela Setores
    migrationBuilder.CreateTable(
        name: "Setores",
        columns: table => new
        {
            Id = table.Column<Guid>(type: "uuid", nullable: false),
            Nome = table.Column<string>(type: "text", nullable: false)
        },
        constraints: table =>
        {
            table.PrimaryKey("PK_Setores", x => x.Id);
        });

    // 2) Insere setor padrão
    var defaultSetorId = new Guid("11111111-1111-1111-1111-111111111111");

    migrationBuilder.InsertData(
        table: "Setores",
        columns: new[] { "Id", "Nome" },
        values: new object[] { defaultSetorId, "Sem Setor" }
    );

    // 3) Corrige usuários existentes com SetorId inválido
    migrationBuilder.Sql(@"
        UPDATE ""Usuarios"" u
        SET ""SetorId"" = '11111111-1111-1111-1111-111111111111'
        WHERE NOT EXISTS (
            SELECT 1 FROM ""Setores"" s WHERE s.""Id"" = u.""SetorId""
        );
    ");

    // 4) Índices
    migrationBuilder.CreateIndex(
        name: "IX_Usuarios_SetorId",
        table: "Usuarios",
        column: "SetorId");

    migrationBuilder.CreateIndex(
        name: "IX_Setores_Nome",
        table: "Setores",
        column: "Nome",
        unique: true);

    // 5) FK
    migrationBuilder.AddForeignKey(
        name: "FK_Usuarios_Setores_SetorId",
        table: "Usuarios",
        column: "SetorId",
        principalTable: "Setores",
        principalColumn: "Id",
        onDelete: ReferentialAction.Cascade);
}

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Usuarios_Setores_SetorId",
                table: "Usuarios");

            migrationBuilder.DropTable(
                name: "Setores");

            migrationBuilder.DropIndex(
                name: "IX_Usuarios_SetorId",
                table: "Usuarios");
        }
    }
}

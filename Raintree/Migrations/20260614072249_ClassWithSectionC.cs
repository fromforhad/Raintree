using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Raintree.Migrations
{
    /// <inheritdoc />
    public partial class ClassWithSectionC : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "Batch",
                table: "Classes",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AddColumn<char>(
                name: "Section",
                table: "Classes",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Section",
                table: "Classes");

            migrationBuilder.AlterColumn<string>(
                name: "Batch",
                table: "Classes",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);
        }
    }
}

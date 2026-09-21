using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Raintree.Migrations
{
    /// <inheritdoc />
    public partial class SlotTracker : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SlotSpan",
                table: "Classes",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SlotStart",
                table: "Classes",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SlotSpan",
                table: "Classes");

            migrationBuilder.DropColumn(
                name: "SlotStart",
                table: "Classes");
        }
    }
}

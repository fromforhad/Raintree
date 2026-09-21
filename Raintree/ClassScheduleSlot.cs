namespace Raintree.Models.Daily;

public record ClassScheduleSlot
{
    public int Id { get; init; }
    public string? Day { get; init; }
    public int? Batch { get; init; }
    public char? Section { get; init; }
    public string? Time { get; init; }
    public string? Subject { get; init; }
    public string? Title { get; init; }
    public string? Room { get; init; }
    public string? Faculty { get; init; }
    public int? SlotStart { get; init; }
    public int? SlotSpan { get; init; }
}

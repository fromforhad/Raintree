namespace ClassModel;

public class Class
{
    public int Id { get; set; }
    public string? Day { get; set; }
    public string? Batch { get; set; }
    public string? Time { get; set; }
    public string? Subject { get; set; }
    public string? Title { get; set; }
    public string? Room { get; set; }
    public string? Faculty { get; set; }

    public Class(string Day, string Batch, string Time, string Subject, string Title, string Room, string Faculty)
    {
        this.Day = Day;
        this.Batch = Batch;
        this.Time = Time;
        this.Subject = Subject;
        this.Title = Title;
        this.Room = Room;
        this.Faculty = Faculty;
    }

    public Class() {}
}

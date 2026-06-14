namespace ClassModel;

public class Class
{
    public int Id { get; set; }
    public string? Day { get; set; }
    public int? Batch { get; set; }
    public char? Section { get; set; }
    public string? Time { get; set; }
    public string? Subject { get; set; }
    public string? Title { get; set; }
    public string? Room { get; set; }
    public string? Faculty { get; set; }

    public Class(string Day, int Batch, char Section, string Time, string Subject, string Title, string Room, string Faculty)
    {
        this.Day = Day;
        this.Batch = Batch;
        this.Section = Section;
        this.Time = Time;
        this.Subject = Subject;
        this.Title = Title;
        this.Room = Room;
        this.Faculty = Faculty;
    }

    public Class() {}
}

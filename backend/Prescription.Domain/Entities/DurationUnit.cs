namespace Prescription.Domain.Entities;

public class DurationUnit
{
    public int DurationUnitId { get; set; }
    public string Code { get; set; }
    public string DisplayText { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
}

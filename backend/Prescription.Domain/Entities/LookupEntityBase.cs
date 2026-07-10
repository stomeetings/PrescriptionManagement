namespace Prescription.Domain.Entities;

public abstract class LookupEntityBase
{
    public string Code { get; set; } = string.Empty;

    public string DisplayText { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedDate { get; set; }

    public string CreatedBy { get; set; } = string.Empty;

    public DateTime? UpdatedDate { get; set; }

    public string? UpdatedBy { get; set; }

    public bool IsDeleted { get; set; }
}

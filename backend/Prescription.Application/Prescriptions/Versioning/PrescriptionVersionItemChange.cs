using Prescription.Application.Repositories;

namespace Prescription.Application.Prescriptions.Versioning;

// One medicine present in both compared versions, but with at least one changed field.
public class PrescriptionVersionItemChange
{
    public PrescriptionVersionItemDetail Before { get; set; }
    public PrescriptionVersionItemDetail After { get; set; }
    public List<string> ChangedFields { get; set; } = new();
}

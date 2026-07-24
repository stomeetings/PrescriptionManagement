namespace Prescription.Shared.DTOs;

// One medicine present in both compared versions, with at least one changed field - the
// Comparison View's "✏" case.
public class PrescriptionVersionItemChangeResponse
{
    public PrescriptionVersionItemResponse Before { get; set; }
    public PrescriptionVersionItemResponse After { get; set; }
    public List<string> ChangedFields { get; set; } = new();
}

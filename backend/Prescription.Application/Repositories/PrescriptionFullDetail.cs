namespace Prescription.Application.Repositories;

// Composes usp_Prescription_GetDetailsById's three result sets - returned by
// IPrescriptionRepository.GetDetailsByIdAsync, mapped to PrescriptionDetailsResponse by
// the Controller.
public class PrescriptionFullDetail
{
    public PrescriptionDetailsView Header { get; set; }
    public IEnumerable<PrescriptionDetailItem> Items { get; set; } = Enumerable.Empty<PrescriptionDetailItem>();
    public IEnumerable<PrescriptionTimelineEvent> Timeline { get; set; } = Enumerable.Empty<PrescriptionTimelineEvent>();
}

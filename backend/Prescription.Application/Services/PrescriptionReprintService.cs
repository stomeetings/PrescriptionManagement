using Prescription.Application.Exceptions;
using Prescription.Application.Prescriptions.Pdf;
using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

// "A reprint must always use the finalized prescription snapshot. The prescription must
// NOT be regenerated." - this service never builds or touches Xhtml/PDF content itself.
// It validates using the already-persisted Prescription row (via the existing
// IPrescriptionRepository.GetByIdAsync, no new read query needed), then ensures a PDF
// snapshot is available via the existing IPrescriptionPdfService.GetPdfAsync - which
// already implements exactly "reuse the cached PDF if available, otherwise generate one
// from the stored Xhtml" (Step 18.6) - and finally records the reprint event. Business
// rules live here, not in usp_Prescription_Reprint (which stays a simple insert,
// mirroring usp_Prescription_LogPdfGenerated's identical shape) - these checks
// (not Draft/not Cancelled/exists/Xhtml present) don't need SQL-level atomicity the way
// CreateDraft/UpdateDraft's multi-table writes did.
public class PrescriptionReprintService : IPrescriptionReprintService
{
    private readonly IPrescriptionRepository _prescriptionRepository;
    private readonly IPrescriptionPdfService _prescriptionPdfService;
    private readonly IPrescriptionPrintHistoryRepository _printHistoryRepository;

    public PrescriptionReprintService(
        IPrescriptionRepository prescriptionRepository,
        IPrescriptionPdfService prescriptionPdfService,
        IPrescriptionPrintHistoryRepository printHistoryRepository)
    {
        _prescriptionRepository = prescriptionRepository;
        _prescriptionPdfService = prescriptionPdfService;
        _printHistoryRepository = printHistoryRepository;
    }

    public async Task<PrescriptionReprintResult> ReprintAsync(int prescriptionId, string reason, int copies, string reprintedBy)
    {
        var prescription = await _prescriptionRepository.GetByIdAsync(prescriptionId);

        if (prescription is null)
        {
            throw new PrescriptionNotFoundException();
        }

        // "Only Finalized prescriptions can be reprinted. Draft prescriptions use the
        // normal Print action." - there is no separate "Finalized" status (see
        // usp_Prescription_Finalize's own comment: Finalize performs DRAFT -> PENDING,
        // CLAUDE.md's fixed lifecycle has no room for an extra state between them) - so
        // "finalized" here means "has left Draft status", and "Cancelled prescriptions
        // cannot be reprinted" is checked separately.
        if (prescription.StatusCode == "DRAFT")
        {
            throw new PrescriptionNotFinalizedException();
        }

        if (prescription.StatusCode == "CANCELLED")
        {
            throw new PrescriptionCancelledException();
        }

        if (string.IsNullOrWhiteSpace(prescription.Xhtml))
        {
            throw new MissingPrescriptionXhtmlException();
        }

        try
        {
            // Ensures a PDF snapshot exists (cache hit, or generated from this same
            // stored Xhtml) - never regenerated from live prescription data, since
            // GetPdfAsync only ever reads prescription.Xhtml, the same immutable
            // snapshot just validated above.
            await _prescriptionPdfService.GetPdfAsync(prescriptionId, reprintedBy);
        }
        catch (Exception ex) when (ex is not PrescriptionNotFoundException)
        {
            throw new PrescriptionPdfUnavailableException();
        }

        return await _printHistoryRepository.ReprintAsync(prescriptionId, reason, copies, reprintedBy);
    }
}

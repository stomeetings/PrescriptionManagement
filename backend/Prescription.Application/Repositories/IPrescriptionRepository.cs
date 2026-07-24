using Prescription.Domain.Entities;
// Aliased: the entity type "Prescription" shares its simple name with this project's
// root namespace ("Prescription.*"), which is a real, documented C# ambiguity
// (CS0104) when referenced unqualified from any Prescription.* namespace. Every file
// that needs this entity type uses this same alias, consistently.
using PrescriptionEntity = Prescription.Domain.Entities.Prescription;

namespace Prescription.Application.Repositories;

public interface IPrescriptionRepository
{
    // items' PrescriptionId/PrescriptionItemId/CreatedDate/CreatedBy are ignored - the
    // stored procedure assigns them. No CancellationToken - matches every other
    // repository in this project.
    Task<PrescriptionCreateResult> CreateDraftAsync(PrescriptionEntity prescription, IEnumerable<PrescriptionItem> items, string createdBy);

    // Step 18.6's own minimal prerequisite - see PrescriptionDetail's own comment for
    // why this has no line items.
    Task<PrescriptionDetail?> GetByIdAsync(int prescriptionId);

    // Prescription Details page - a separate, richer read model from GetByIdAsync above
    // (see PrescriptionDetailsView's own comment for why). Returns null when
    // usp_Prescription_GetDetailsById's header result set is empty (not found or
    // soft-deleted) - the Controller turns that into a 404, matching
    // PatientsController.GetById's identical convention.
    Task<PrescriptionFullDetail?> GetDetailsByIdAsync(int prescriptionId);

    // Step 18.7's real minimal Edit - replaces the item set wholesale (item-replacement
    // strategy, database-spec.md section 3.2's own forward note) and, in the same
    // stored-procedure transaction, snapshots the result as a new PrescriptionVersion.
    // rowVersion drives optimistic concurrency (usp_Prescription_UpdateDraft's own
    // @@ROWCOUNT = 0 check) - a stale value is translated to
    // PrescriptionConcurrencyConflictException, not silently overwritten.
    Task<PrescriptionUpdateResult> UpdateDraftAsync(
        int prescriptionId,
        string clinicalNotes,
        string xhtml,
        IEnumerable<PrescriptionItem> items,
        byte[] rowVersion,
        string updatedBy);

    // Prescription Management List (no search/filter applied) - mirrors
    // IPatientRepository.GetPatientsAsync's identical plain-paged-list role.
    Task<(IEnumerable<PrescriptionListItem> Items, int TotalCount)> GetAllAsync(int page, int pageSize, string sortBy, string sortDirection);

    // Prescription Management List search/filter - mirrors IPatientRepository.
    // SearchPatientsAsync's identical role.
    Task<(IEnumerable<PrescriptionListItem> Items, int TotalCount)> SearchAsync(
        int page,
        int pageSize,
        string? searchTerm,
        string? statusCode,
        DateTime? issueDateFrom,
        DateTime? issueDateTo,
        DateTime? expiryDateFrom,
        DateTime? expiryDateTo,
        int? patientId,
        int? providerUserAccountId,
        string sortBy,
        string sortDirection);

    // Logs a PDF_GENERATED PrescriptionAudit row and returns the derived download count
    // (Step 18.6's Audit requirement - see 045_AlterPrescriptionAudit_
    // AddPdfGeneratedAction.sql for why this is derived, not a stored counter).
    Task<int> LogPdfGeneratedAsync(int prescriptionId, string changedBy);
}

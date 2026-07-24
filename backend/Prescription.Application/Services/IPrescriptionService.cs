using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

public interface IPrescriptionService
{
    // Resolves each selectedPatientMedicationId into a full PrescriptionItem snapshot
    // (Step 18.4's own "Selected Medication IDs" request field) - the caller never
    // builds PrescriptionItem data itself. No CancellationToken - matches every other
    // service in this project.
    Task<PrescriptionCreateResult> CreateDraftAsync(
        Guid draftPrescriptionId,
        int patientId,
        int providerUserAccountId,
        string xhtml,
        IEnumerable<int> selectedPatientMedicationIds,
        string clinicalNotes,
        string createdBy);

    // Step 18.7's real minimal Edit - resolves selectedPatientMedicationIds into
    // PrescriptionItem snapshots exactly like CreateDraftAsync (same strict "must all
    // resolve" rule; this also writes a legal clinical document). No providerUserAccountId
    // parameter - the prescriber never changes on an edit.
    Task<PrescriptionUpdateResult> UpdateDraftAsync(
        int prescriptionId,
        string xhtml,
        IEnumerable<int> selectedPatientMedicationIds,
        string clinicalNotes,
        byte[] rowVersion,
        string updatedBy);

    // Prescription Management List - mirrors IPatientService.GetPatientsAsync's
    // identical page/pageSize normalization (clamp rather than reject, matching that
    // precedent exactly).
    Task<(IEnumerable<PrescriptionListItem> Items, int TotalCount)> GetPrescriptionsAsync(int page, int pageSize, string sortBy, string sortDirection);

    Task<(IEnumerable<PrescriptionListItem> Items, int TotalCount)> SearchPrescriptionsAsync(
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

    // Prescription Details page - thin passthrough, matching how every other plain
    // GetById in this project has no business logic of its own.
    Task<PrescriptionFullDetail?> GetDetailsByIdAsync(int prescriptionId);
}

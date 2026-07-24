using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IPatientMedicationService
{
    Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> GetPagedAsync(
        int page,
        int pageSize,
        string? searchTerm,
        string? statusCode,
        bool? isPrn,
        string sortBy,
        string sortDirection);

    Task<PatientMedicationDetail?> GetByIdAsync(int patientMedicationId);

    Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> GetCurrentByPatientIdAsync(
        int patientId,
        int page,
        int pageSize,
        string sortBy,
        string sortDirection);

    Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> GetHistoryAsync(
        int patientId,
        int page,
        int pageSize);

    Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> SearchAsync(
        int page,
        int pageSize,
        string? searchTerm,
        int? patientId,
        string? statusCode,
        bool? isPrn,
        DateTime? startDateFrom,
        DateTime? startDateTo,
        DateTime? endDateFrom,
        DateTime? endDateTo,
        string sortBy,
        string sortDirection);

    Task<PatientMedicationDetail> CreateAsync(
        int patientId,
        int medicineId,
        decimal dose,
        string doseUnitCode,
        string frequencyCode,
        int duration,
        string durationUnitCode,
        decimal quantity,
        string? instructions,
        bool prn,
        DateTime startDate,
        DateTime? endDate,
        string? clinicalNotes,
        int? prescribedByUserAccountId,
        string createdBy);

    Task<PatientMedicationDetail> UpdateAsync(
        int patientMedicationId,
        decimal dose,
        string doseUnitCode,
        string frequencyCode,
        int duration,
        string durationUnitCode,
        decimal quantity,
        string? instructions,
        bool prn,
        DateTime startDate,
        DateTime? endDate,
        string? clinicalNotes,
        int? prescribedByUserAccountId,
        byte[] rowVersion,
        string updatedBy);

    Task<PatientMedicationDetail> StopAsync(int patientMedicationId, string stoppedBy);

    Task<PatientMedicationDetail> ResumeAsync(
        int patientMedicationId,
        DateTime startDate,
        decimal? dose,
        string? doseUnitCode,
        string? frequencyCode,
        int? duration,
        string? durationUnitCode,
        decimal? quantity,
        string? instructions,
        bool? prn,
        DateTime? endDate,
        string? clinicalNotes,
        int? prescribedByUserAccountId,
        string resumedBy);

    // Return shape is a tuple, not a DTO (this step excludes DTO mapping) - Patient plus
    // the eligible PatientMedicationDetail entries plus any non-fatal validation
    // messages, per api-spec.md section 4.8/5 (GeneratePrescriptionResponse's provisional
    // sketch). DraftPrescriptionId is a fresh, non-persisted Guid - see that section's
    // note that nothing is written to the database by this call.
    Task<(Guid DraftPrescriptionId, Patient Patient, IEnumerable<PatientMedicationDetail> SelectedMedications, IEnumerable<string> ValidationMessages)> GeneratePrescriptionDraftAsync(
        int patientId,
        IEnumerable<int> selectedPatientMedicationIds,
        string? clinicalNotes);
}

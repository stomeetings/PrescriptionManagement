using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

// No CancellationToken parameters - matches IUserRepository/IPatientRepository/
// IMedicineRepository, none of which use one anywhere; that remains the actual project
// standard.
public interface IPatientMedicationRepository
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

    Task<int> CreateAsync(PatientMedication patientMedication, string createdBy);

    Task UpdateAsync(PatientMedication patientMedication, string updatedBy);

    Task StopAsync(int patientMedicationId, int stoppedStatusId, string stoppedBy);

    Task<int> ResumeAsync(
        int patientMedicationId,
        DateTime startDate,
        decimal? dose,
        int? doseUnitId,
        int? frequencyId,
        int? duration,
        int? durationUnitId,
        decimal? quantity,
        string? instructions,
        bool? prn,
        DateTime? endDate,
        string? clinicalNotes,
        int? prescribedByUserAccountId,
        int activeStatusId,
        string resumedBy);

    // Future Integration: no dedicated "prepare a prescription draft" stored procedure
    // exists - Step 6 was never asked to create one, and this step excludes SQL
    // changes. Implemented against the existing usp_PatientMedication_GetById instead
    // (called once per requested Id) - see PatientMedicationRepository's implementation
    // comment for the full reasoning and its limitation.
    Task<IEnumerable<PatientMedicationDetail>> GeneratePrescriptionDraftAsync(IEnumerable<int> patientMedicationIds);
}

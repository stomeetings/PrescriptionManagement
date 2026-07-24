using Prescription.Application.Repositories;
using Prescription.Domain.Entities;
using Prescription.Shared.DTOs;

namespace Prescription.Application.Mapping;

public static class PatientMedicationMappingExtensions
{
    public static DoseUnitResponse ToDoseUnitResponse(this DoseUnit entity)
        => new() { Code = entity.Code, DisplayText = entity.DisplayText };

    public static FrequencyResponse ToFrequencyResponse(this Frequency entity)
        => new() { Code = entity.Code, DisplayText = entity.DisplayText };

    public static DurationUnitResponse ToDurationUnitResponse(this DurationUnit entity)
        => new() { Code = entity.Code, DisplayText = entity.DisplayText };

    public static PatientMedicationStatusResponse ToPatientMedicationStatusResponse(this PatientMedicationStatus entity)
        => new() { Code = entity.Code, DisplayText = entity.DisplayText };

    public static PatientMedicationSourceResponse ToPatientMedicationSourceResponse(this PatientMedicationSource entity)
        => new() { Code = entity.Code, DisplayText = entity.DisplayText };

    public static PrescribedByResponse ToPrescribedByResponse(this UserAccount entity)
        => new() { UserAccountId = entity.UserAccountId, FullName = entity.FullName };

    public static PatientMedicationSummaryResponse ToSummaryResponse(this PatientMedicationRecord record)
        => new()
        {
            PatientMedicationId = record.PatientMedication.PatientMedicationId,
            PatientId = record.Patient.PatientId,
            PatientNumber = record.Patient.PatientNumber,
            PatientFullName = record.PatientFullName,
            MedicineId = record.Medicine.MedicineId,
            MedicineCode = record.Medicine.MedicineCode,
            MedicineName = record.Medicine.MedicineName,
            GenericName = record.Medicine.GenericName,
            Strength = record.Medicine.Strength,
            DosageForm = record.MedicineForm.ToMedicineFormResponse(),
            Route = record.MedicineRoute.ToMedicineRouteResponse(),
            Dose = record.PatientMedication.Dose,
            DoseUnit = record.DoseUnit.ToDoseUnitResponse(),
            Frequency = record.Frequency.ToFrequencyResponse(),
            Duration = record.PatientMedication.Duration,
            DurationUnit = record.DurationUnit.ToDurationUnitResponse(),
            Quantity = record.PatientMedication.Quantity,
            PRN = record.PatientMedication.PRN,
            StartDate = record.PatientMedication.StartDate,
            EndDate = record.PatientMedication.EndDate,
            IsCurrent = record.PatientMedication.IsCurrent,
            IsActive = record.PatientMedication.IsActive,
            Status = record.Status.ToPatientMedicationStatusResponse(),
            PrescriptionLinkStatus = record.PrescriptionLinkStatus
        };

    public static PatientMedicationDetailResponse ToDetailResponse(this PatientMedicationDetail detail)
        => new()
        {
            PatientMedicationId = detail.PatientMedication.PatientMedicationId,
            PatientId = detail.Patient.PatientId,
            PatientNumber = detail.Patient.PatientNumber,
            PatientFullName = detail.PatientFullName,
            MedicineId = detail.Medicine.MedicineId,
            MedicineCode = detail.Medicine.MedicineCode,
            MedicineName = detail.Medicine.MedicineName,
            GenericName = detail.Medicine.GenericName,
            Strength = detail.Medicine.Strength,
            DosageForm = detail.MedicineForm.ToMedicineFormResponse(),
            Route = detail.MedicineRoute.ToMedicineRouteResponse(),
            Dose = detail.PatientMedication.Dose,
            DoseUnit = detail.DoseUnit.ToDoseUnitResponse(),
            Frequency = detail.Frequency.ToFrequencyResponse(),
            Duration = detail.PatientMedication.Duration,
            DurationUnit = detail.DurationUnit.ToDurationUnitResponse(),
            Quantity = detail.PatientMedication.Quantity,
            PRN = detail.PatientMedication.PRN,
            StartDate = detail.PatientMedication.StartDate,
            EndDate = detail.PatientMedication.EndDate,
            IsCurrent = detail.PatientMedication.IsCurrent,
            IsActive = detail.PatientMedication.IsActive,
            Status = detail.Status.ToPatientMedicationStatusResponse(),
            Instructions = detail.PatientMedication.Instructions,
            ClinicalNotes = detail.PatientMedication.ClinicalNotes,
            PrescribedBy = detail.PrescribedBy?.ToPrescribedByResponse(),
            Source = detail.Source.ToPatientMedicationSourceResponse(),
            ResumedFromPatientMedicationId = detail.PatientMedication.ResumedFromPatientMedicationId,
            CreatedBy = detail.PatientMedication.CreatedBy,
            CreatedDate = detail.PatientMedication.CreatedDate,
            UpdatedBy = detail.PatientMedication.UpdatedBy,
            UpdatedDate = detail.PatientMedication.UpdatedDate,
            StoppedBy = detail.PatientMedication.StoppedBy,
            StoppedDate = detail.PatientMedication.StoppedDate,
            RowVersion = detail.PatientMedication.RowVersion
        };

    public static PatientMedicationPagedResponse ToPagedResponse(
        this IEnumerable<PatientMedicationRecord> records, int totalCount, int page, int pageSize)
    {
        var totalPages = pageSize > 0 ? (int)Math.Ceiling(totalCount / (double)pageSize) : 0;

        return new PatientMedicationPagedResponse
        {
            Items = records.Select(record => record.ToSummaryResponse()).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };
    }

    public static PatientMedicationHistoryResponse ToHistoryResponse(
        this IEnumerable<PatientMedicationRecord> entries, int patientId, string patientNumber, string patientFullName)
        => new()
        {
            PatientId = patientId,
            PatientNumber = patientNumber,
            PatientFullName = patientFullName,
            Entries = entries.Select(entry => entry.ToSummaryResponse()).ToList()
        };

    // Overload for GeneratePrescriptionResponse.SelectedMedicines, which is sourced from
    // PatientMedicationDetail (the shape GeneratePrescriptionDraftAsync returns), not
    // PatientMedicationRecord - the two share every field ToSummaryResponse needs.
    public static PatientMedicationSummaryResponse ToSummaryResponse(this PatientMedicationDetail detail)
        => new()
        {
            PatientMedicationId = detail.PatientMedication.PatientMedicationId,
            PatientId = detail.Patient.PatientId,
            PatientNumber = detail.Patient.PatientNumber,
            PatientFullName = detail.PatientFullName,
            MedicineId = detail.Medicine.MedicineId,
            MedicineCode = detail.Medicine.MedicineCode,
            MedicineName = detail.Medicine.MedicineName,
            GenericName = detail.Medicine.GenericName,
            Strength = detail.Medicine.Strength,
            DosageForm = detail.MedicineForm.ToMedicineFormResponse(),
            Route = detail.MedicineRoute.ToMedicineRouteResponse(),
            Dose = detail.PatientMedication.Dose,
            DoseUnit = detail.DoseUnit.ToDoseUnitResponse(),
            Frequency = detail.Frequency.ToFrequencyResponse(),
            Duration = detail.PatientMedication.Duration,
            DurationUnit = detail.DurationUnit.ToDurationUnitResponse(),
            Quantity = detail.PatientMedication.Quantity,
            PRN = detail.PatientMedication.PRN,
            StartDate = detail.PatientMedication.StartDate,
            EndDate = detail.PatientMedication.EndDate,
            IsCurrent = detail.PatientMedication.IsCurrent,
            IsActive = detail.PatientMedication.IsActive,
            Status = detail.Status.ToPatientMedicationStatusResponse()
        };

    // Patient has no FullName property (only FirstName/LastName) - computed here for
    // GeneratePrescriptionResponse.Patient, matching PatientSummaryResponse's existing
    // {PatientId, PatientNumber, FullName} shape (already used elsewhere in the project).
    public static PatientSummaryResponse ToPatientSummaryResponse(this Patient patient)
        => new()
        {
            PatientId = patient.PatientId,
            PatientNumber = patient.PatientNumber,
            FullName = $"{patient.FirstName} {patient.LastName}"
        };
}

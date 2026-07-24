using Microsoft.Extensions.Logging;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

// All business rules for Patient Medication Management live here, not in
// PatientMedicationRepository (which only executes stored procedures and maps rows) or
// in the future Controller (thin HTTP layer only). Where a rule is already enforced
// inside a stored procedure (Step 6) and translated to a typed exception by the
// repository (Step 7), this class still performs the same check up front wherever it can
// be done with data already in hand - a fast-fail convenience for the caller - while the
// stored procedure remains the authoritative, race-safe enforcement (mirrors
// MedicineService's CheckDuplicateMedicineAsync pre-check alongside its CATCH-block
// backstop).
public class PatientMedicationService : IPatientMedicationService
{
    // A patient's current medication list is not expected to ever approach this size;
    // used only to fetch "all current medications for this patient" in one page for the
    // in-memory duplicate-active pre-check below. Not a hard business limit.
    private const int MaxCurrentMedicationsScan = 1000;

    private readonly IPatientMedicationRepository _patientMedicationRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IMedicineRepository _medicineRepository;
    private readonly IDoseUnitRepository _doseUnitRepository;
    private readonly IFrequencyRepository _frequencyRepository;
    private readonly IDurationUnitRepository _durationUnitRepository;
    private readonly IPatientMedicationStatusRepository _patientMedicationStatusRepository;
    private readonly IPatientMedicationSourceRepository _patientMedicationSourceRepository;
    private readonly ILogger<PatientMedicationService> _logger;

    public PatientMedicationService(
        IPatientMedicationRepository patientMedicationRepository,
        IPatientRepository patientRepository,
        IMedicineRepository medicineRepository,
        IDoseUnitRepository doseUnitRepository,
        IFrequencyRepository frequencyRepository,
        IDurationUnitRepository durationUnitRepository,
        IPatientMedicationStatusRepository patientMedicationStatusRepository,
        IPatientMedicationSourceRepository patientMedicationSourceRepository,
        ILogger<PatientMedicationService> logger)
    {
        _patientMedicationRepository = patientMedicationRepository;
        _patientRepository = patientRepository;
        _medicineRepository = medicineRepository;
        _doseUnitRepository = doseUnitRepository;
        _frequencyRepository = frequencyRepository;
        _durationUnitRepository = durationUnitRepository;
        _patientMedicationStatusRepository = patientMedicationStatusRepository;
        _patientMedicationSourceRepository = patientMedicationSourceRepository;
        _logger = logger;
    }

    public Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> GetPagedAsync(
        int page,
        int pageSize,
        string? searchTerm,
        string? statusCode,
        bool? isPrn,
        string sortBy,
        string sortDirection)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        return _patientMedicationRepository.GetPagedAsync(
            normalizedPage, normalizedPageSize, TrimOrNull(searchTerm), TrimOrNull(statusCode), isPrn, sortBy, sortDirection);
    }

    public Task<PatientMedicationDetail?> GetByIdAsync(int patientMedicationId)
        => _patientMedicationRepository.GetByIdAsync(patientMedicationId);

    public Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> GetCurrentByPatientIdAsync(
        int patientId,
        int page,
        int pageSize,
        string sortBy,
        string sortDirection)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        return _patientMedicationRepository.GetCurrentByPatientIdAsync(patientId, normalizedPage, normalizedPageSize, sortBy, sortDirection);
    }

    public Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> GetHistoryAsync(int patientId, int page, int pageSize)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        return _patientMedicationRepository.GetHistoryAsync(patientId, normalizedPage, normalizedPageSize);
    }

    public Task<(IEnumerable<PatientMedicationRecord> Items, int TotalCount)> SearchAsync(
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
        string sortDirection)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        return _patientMedicationRepository.SearchAsync(
            normalizedPage,
            normalizedPageSize,
            TrimOrNull(searchTerm),
            patientId,
            TrimOrNull(statusCode),
            isPrn,
            startDateFrom,
            startDateTo,
            endDateFrom,
            endDateTo,
            sortBy,
            sortDirection);
    }

    public async Task<PatientMedicationDetail> CreateAsync(
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
        string createdBy)
    {
        ValidateQuantityAndDuration(quantity, duration);
        ValidateDateRange(startDate, endDate);

        await GetActivePatientOrThrowAsync(patientId);
        await GetActiveMedicineOrThrowAsync(medicineId);

        var doseUnit = await GetActiveDoseUnitOrThrowAsync(doseUnitCode);
        var frequency = await GetActiveFrequencyOrThrowAsync(frequencyCode);
        var durationUnit = await GetActiveDurationUnitOrThrowAsync(durationUnitCode);

        await EnsureNoDuplicateActiveAsync(patientId, medicineId);

        var activeStatusId = await GetStatusIdOrThrowAsync("ACTIVE");
        var manualEntrySourceId = await GetSourceIdOrThrowAsync("MANUAL_ENTRY");

        var newPatientMedication = new PatientMedication
        {
            PatientId = patientId,
            MedicineId = medicineId,
            Dose = dose,
            DoseUnitId = doseUnit.DoseUnitId,
            FrequencyId = frequency.FrequencyId,
            Duration = duration,
            DurationUnitId = durationUnit.DurationUnitId,
            Quantity = quantity,
            Instructions = TrimOrNull(instructions),
            PRN = prn,
            StartDate = startDate,
            EndDate = endDate,
            ClinicalNotes = TrimOrNull(clinicalNotes),
            PrescribedByUserAccountId = prescribedByUserAccountId,
            PatientMedicationSourceId = manualEntrySourceId,
            PatientMedicationStatusId = activeStatusId
        };

        var patientMedicationId = await _patientMedicationRepository.CreateAsync(newPatientMedication, createdBy);

        _logger.LogInformation(
            "Created patient medication {PatientMedicationId} for patient {PatientId} (medicine {MedicineId}) by {CreatedBy}",
            patientMedicationId, patientId, medicineId, createdBy);

        return await GetByIdOrThrowAsync(patientMedicationId);
    }

    public async Task<PatientMedicationDetail> UpdateAsync(
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
        string updatedBy)
    {
        var existing = await GetByIdOrThrowAsync(patientMedicationId);

        if (!existing.PatientMedication.IsCurrent || existing.Status.Code == "STOPPED")
        {
            throw new PatientMedicationStoppedReadOnlyException();
        }

        ValidateQuantityAndDuration(quantity, duration);
        ValidateDateRange(startDate, endDate);

        var doseUnit = await GetActiveDoseUnitOrThrowAsync(doseUnitCode);
        var frequency = await GetActiveFrequencyOrThrowAsync(frequencyCode);
        var durationUnit = await GetActiveDurationUnitOrThrowAsync(durationUnitCode);

        // No duplicate-active re-check here: PatientId/MedicineId are immutable on
        // Update (not accepted as parameters - they come from the existing record), so
        // the "one active record per Patient+Medicine" invariant this check protects
        // cannot be violated by an Update. Matches usp_PatientMedication_Update.sql's own
        // documented reasoning for omitting this check.

        var patientMedicationToUpdate = new PatientMedication
        {
            PatientMedicationId = patientMedicationId,
            Dose = dose,
            DoseUnitId = doseUnit.DoseUnitId,
            FrequencyId = frequency.FrequencyId,
            Duration = duration,
            DurationUnitId = durationUnit.DurationUnitId,
            Quantity = quantity,
            Instructions = TrimOrNull(instructions),
            PRN = prn,
            StartDate = startDate,
            EndDate = endDate,
            ClinicalNotes = TrimOrNull(clinicalNotes),
            PrescribedByUserAccountId = prescribedByUserAccountId,
            RowVersion = rowVersion
        };

        // usp_PatientMedication_Update is the authoritative check for the RowVersion
        // match - a stale value throws PatientMedicationConcurrencyConflictException from
        // there (translated by the repository), not here.
        await _patientMedicationRepository.UpdateAsync(patientMedicationToUpdate, updatedBy);

        _logger.LogInformation(
            "Updated patient medication {PatientMedicationId} by {UpdatedBy}", patientMedicationId, updatedBy);

        return await GetByIdOrThrowAsync(patientMedicationId);
    }

    public async Task<PatientMedicationDetail> StopAsync(int patientMedicationId, string stoppedBy)
    {
        var existing = await GetByIdOrThrowAsync(patientMedicationId);

        if (!existing.PatientMedication.IsCurrent || existing.Status.Code == "STOPPED")
        {
            throw new PatientMedicationAlreadyStoppedException();
        }

        // usp_PatientMedication_Stop always sets EndDate to today's date - there is no
        // caller-supplied EndDate to validate against StartDate directly, so the
        // equivalent check here is: today cannot be before this course's own StartDate.
        if (DateTime.UtcNow.Date < existing.PatientMedication.StartDate.Date)
        {
            throw new InvalidMedicationDateRangeException();
        }

        var stoppedStatusId = await GetStatusIdOrThrowAsync("STOPPED");

        await _patientMedicationRepository.StopAsync(patientMedicationId, stoppedStatusId, stoppedBy);

        _logger.LogInformation(
            "Stopped patient medication {PatientMedicationId} by {StoppedBy}", patientMedicationId, stoppedBy);

        return await GetByIdOrThrowAsync(patientMedicationId);
    }

    public async Task<PatientMedicationDetail> ResumeAsync(
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
        string resumedBy)
    {
        var existing = await GetByIdOrThrowAsync(patientMedicationId);

        if (existing.Status.Code != "STOPPED")
        {
            throw new PatientMedicationNotStoppedException();
        }

        if (duration.HasValue && duration.Value < 0)
        {
            throw new InvalidMedicationDataException();
        }

        if (quantity.HasValue && quantity.Value < 0)
        {
            throw new InvalidMedicationDataException();
        }

        ValidateDateRange(startDate, endDate);

        // Only overridden lookup values are resolved/validated - an omitted field means
        // "copy from the stopped source record" (api-spec.md section 4.10), which the
        // stored procedure's own COALESCE(@Override, SourceValue) handles; passing null
        // through here preserves that behavior.
        var doseUnitId = doseUnitCode is null ? (int?)null : (await GetActiveDoseUnitOrThrowAsync(doseUnitCode)).DoseUnitId;
        var frequencyId = frequencyCode is null ? (int?)null : (await GetActiveFrequencyOrThrowAsync(frequencyCode)).FrequencyId;
        var durationUnitId = durationUnitCode is null ? (int?)null : (await GetActiveDurationUnitOrThrowAsync(durationUnitCode)).DurationUnitId;

        // Defensive duplicate-active re-check: normally satisfied trivially, since the
        // stopped source record vacated the IsCurrent slot when it was stopped - but
        // another active record for the same medicine could exist by now. The stored
        // procedure performs its own authoritative re-check regardless (see
        // usp_PatientMedication_Resume.sql).
        await EnsureNoDuplicateActiveAsync(existing.PatientMedication.PatientId, existing.PatientMedication.MedicineId);

        var activeStatusId = await GetStatusIdOrThrowAsync("ACTIVE");

        var newPatientMedicationId = await _patientMedicationRepository.ResumeAsync(
            patientMedicationId,
            startDate,
            dose,
            doseUnitId,
            frequencyId,
            duration,
            durationUnitId,
            quantity,
            TrimOrNull(instructions),
            prn,
            endDate,
            TrimOrNull(clinicalNotes),
            prescribedByUserAccountId,
            activeStatusId,
            resumedBy);

        _logger.LogInformation(
            "Resumed patient medication {PatientMedicationId} as new record {NewPatientMedicationId} by {ResumedBy}",
            patientMedicationId, newPatientMedicationId, resumedBy);

        return await GetByIdOrThrowAsync(newPatientMedicationId);
    }

    public async Task<(Guid DraftPrescriptionId, Patient Patient, IEnumerable<PatientMedicationDetail> SelectedMedications, IEnumerable<string> ValidationMessages)> GeneratePrescriptionDraftAsync(
        int patientId,
        IEnumerable<int> selectedPatientMedicationIds,
        string? clinicalNotes)
    {
        var patient = await GetActivePatientOrThrowAsync(patientId);

        var requestedIds = selectedPatientMedicationIds.Distinct().ToList();
        var resolved = (await _patientMedicationRepository.GeneratePrescriptionDraftAsync(requestedIds))
            .ToDictionary(detail => detail.PatientMedication.PatientMedicationId);

        var eligible = new List<PatientMedicationDetail>();
        var validationMessages = new List<string>();

        foreach (var id in requestedIds)
        {
            if (!resolved.TryGetValue(id, out var detail))
            {
                validationMessages.Add($"Patient medication {id} could not be found and was not included.");
                continue;
            }

            if (detail.PatientMedication.PatientId != patientId)
            {
                validationMessages.Add($"Patient medication {id} does not belong to this patient and was not included.");
                continue;
            }

            if (!detail.PatientMedication.IsCurrent || detail.Status.Code == "STOPPED")
            {
                validationMessages.Add($"{detail.Medicine.MedicineName} was stopped and could not be included.");
                continue;
            }

            eligible.Add(detail);
        }

        // api-spec.md section 4.8 rule 3: nothing eligible means 422, not a 200 with an
        // empty selection.
        if (eligible.Count == 0)
        {
            throw new NoEligiblePatientMedicationsException();
        }

        _logger.LogInformation(
            "Generated prescription draft for patient {PatientId}: {EligibleCount} of {RequestedCount} selected medications included",
            patientId, eligible.Count, requestedIds.Count);

        return (Guid.NewGuid(), patient, eligible, validationMessages);
    }

    private async Task<PatientMedicationDetail> GetByIdOrThrowAsync(int patientMedicationId)
    {
        var detail = await _patientMedicationRepository.GetByIdAsync(patientMedicationId);
        return detail ?? throw new PatientMedicationNotFoundException();
    }

    private async Task<Patient> GetActivePatientOrThrowAsync(int patientId)
    {
        var (patient, _) = await _patientRepository.GetPatientByIdAsync(patientId);

        if (patient is null || !patient.IsActive)
        {
            throw new InvalidPatientReferenceException();
        }

        return patient;
    }

    private async Task GetActiveMedicineOrThrowAsync(int medicineId)
    {
        var (medicine, _, _) = await _medicineRepository.GetMedicineByIdAsync(medicineId);

        if (medicine is null || !medicine.IsActive)
        {
            throw new InvalidMedicineReferenceException();
        }
    }

    private async Task<DoseUnit> GetActiveDoseUnitOrThrowAsync(string doseUnitCode)
    {
        var doseUnits = await _doseUnitRepository.GetAllAsync();
        var matched = doseUnits.FirstOrDefault(unit =>
            unit.IsActive && string.Equals(unit.Code, doseUnitCode, StringComparison.OrdinalIgnoreCase));

        return matched ?? throw new InvalidDoseUnitException();
    }

    private async Task<Frequency> GetActiveFrequencyOrThrowAsync(string frequencyCode)
    {
        var frequencies = await _frequencyRepository.GetAllAsync();
        var matched = frequencies.FirstOrDefault(frequency =>
            frequency.IsActive && string.Equals(frequency.Code, frequencyCode, StringComparison.OrdinalIgnoreCase));

        return matched ?? throw new InvalidFrequencyException();
    }

    private async Task<DurationUnit> GetActiveDurationUnitOrThrowAsync(string durationUnitCode)
    {
        var durationUnits = await _durationUnitRepository.GetAllAsync();
        var matched = durationUnits.FirstOrDefault(unit =>
            unit.IsActive && string.Equals(unit.Code, durationUnitCode, StringComparison.OrdinalIgnoreCase));

        return matched ?? throw new InvalidDurationUnitException();
    }

    // Status/Source are system-controlled values (ACTIVE/STOPPED,
    // MANUAL_ENTRY/PRESCRIPTION/IMPORTED), never user input - a missing code here means
    // the seed data (PatientMedicationLookupSeedData.sql) has not been run, a
    // configuration problem rather than a business-rule violation, so this throws a
    // plain InvalidOperationException rather than one of the user-facing 422 exceptions.
    private async Task<int> GetStatusIdOrThrowAsync(string code)
    {
        var statuses = await _patientMedicationStatusRepository.GetAllAsync();
        var matched = statuses.FirstOrDefault(status => status.IsActive && status.Code == code);

        return matched?.PatientMedicationStatusId
            ?? throw new InvalidOperationException($"PatientMedicationStatus '{code}' is not seeded. Run PatientMedicationLookupSeedData.sql.");
    }

    private async Task<int> GetSourceIdOrThrowAsync(string code)
    {
        var sources = await _patientMedicationSourceRepository.GetAllAsync();
        var matched = sources.FirstOrDefault(source => source.IsActive && source.Code == code);

        return matched?.PatientMedicationSourceId
            ?? throw new InvalidOperationException($"PatientMedicationSource '{code}' is not seeded. Run PatientMedicationLookupSeedData.sql.");
    }

    private async Task EnsureNoDuplicateActiveAsync(int patientId, int medicineId)
    {
        var (currentMedications, _) = await _patientMedicationRepository.GetCurrentByPatientIdAsync(
            patientId, page: 1, pageSize: MaxCurrentMedicationsScan, sortBy: "startDate", sortDirection: "asc");

        if (currentMedications.Any(record => record.Medicine.MedicineId == medicineId))
        {
            throw new DuplicateActiveMedicationException();
        }
    }

    private static void ValidateQuantityAndDuration(decimal quantity, int duration)
    {
        if (quantity < 0 || duration < 0)
        {
            throw new InvalidMedicationDataException();
        }
    }

    private static void ValidateDateRange(DateTime startDate, DateTime? endDate)
    {
        if (endDate.HasValue && endDate.Value.Date < startDate.Date)
        {
            throw new InvalidMedicationDateRangeException();
        }
    }

    private static string? TrimOrNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }
}

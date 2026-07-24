using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;
// See IPrescriptionRepository.cs for why this alias exists on every file that
// references the Prescription entity type.
using PrescriptionEntity = Prescription.Domain.Entities.Prescription;

namespace Prescription.Application.Services;

// All business rules for Save Draft live here, not in PrescriptionRepository (stored
// procedures only) or the Controller (thin HTTP layer only) - matches every other
// module's layering in this project.
public class PrescriptionService : IPrescriptionService
{
    private readonly IPrescriptionRepository _prescriptionRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IUserService _userService;
    private readonly IPatientMedicationService _patientMedicationService;

    public PrescriptionService(
        IPrescriptionRepository prescriptionRepository,
        IPatientRepository patientRepository,
        IUserService userService,
        IPatientMedicationService patientMedicationService)
    {
        _prescriptionRepository = prescriptionRepository;
        _patientRepository = patientRepository;
        _userService = userService;
        _patientMedicationService = patientMedicationService;
    }

    public async Task<PrescriptionCreateResult> CreateDraftAsync(
        Guid draftPrescriptionId,
        int patientId,
        int providerUserAccountId,
        string xhtml,
        IEnumerable<int> selectedPatientMedicationIds,
        string clinicalNotes,
        string createdBy)
    {
        var selectedIds = selectedPatientMedicationIds.ToList();

        if (selectedIds.Count == 0)
        {
            throw new NoPrescriptionMedicationsException();
        }

        if (string.IsNullOrWhiteSpace(xhtml))
        {
            throw new MissingPrescriptionXhtmlException();
        }

        var (patient, _) = await _patientRepository.GetPatientByIdAsync(patientId);
        if (patient is null || !patient.IsActive)
        {
            throw new InvalidPatientReferenceException();
        }

        var (provider, _) = await _userService.GetUserByIdAsync(providerUserAccountId);
        if (provider is null || !provider.IsActive)
        {
            throw new InvalidProviderReferenceException();
        }

        // Each selected Patient Medication is resolved into a full snapshot here, not
        // passed through as-is - the Controller/caller only ever supplies IDs (Step
        // 18.4's own request shape). Strict, not "exclude and report": unlike the
        // read-only Generate Draft/Preview step (which excludes an ineligible selection
        // and reports it via validationMessages, since nothing is persisted), this
        // action writes a legal clinical document - silently dropping a requested
        // medicine from what's about to be saved would be a real data-integrity bug,
        // not a convenience.
        var items = new List<PrescriptionItem>();
        foreach (var patientMedicationId in selectedIds)
        {
            var detail = await _patientMedicationService.GetByIdAsync(patientMedicationId);
            if (detail is null)
            {
                throw new PatientMedicationNotFoundException();
            }

            items.Add(new PrescriptionItem
            {
                PatientMedicationId = detail.PatientMedication.PatientMedicationId,
                MedicineId = detail.Medicine.MedicineId,
                MedicineNameSnapshot = detail.Medicine.MedicineName,
                GenericNameSnapshot = detail.Medicine.GenericName,
                StrengthSnapshot = detail.Medicine.Strength,
                DosageFormSnapshot = detail.MedicineForm.DisplayText,
                RouteSnapshot = detail.MedicineRoute.DisplayText,
                Dose = detail.PatientMedication.Dose,
                DoseUnitId = detail.DoseUnit.DoseUnitId,
                DoseUnitSnapshot = detail.DoseUnit.DisplayText,
                FrequencyId = detail.Frequency.FrequencyId,
                FrequencySnapshot = detail.Frequency.DisplayText,
                Duration = detail.PatientMedication.Duration,
                DurationUnitId = detail.DurationUnit.DurationUnitId,
                DurationUnitSnapshot = detail.DurationUnit.DisplayText,
                Quantity = detail.PatientMedication.Quantity,
                Instructions = detail.PatientMedication.Instructions,
                PRN = detail.PatientMedication.PRN
            });
        }

        var newPrescription = new PrescriptionEntity
        {
            DraftPrescriptionId = draftPrescriptionId,
            PatientId = patientId,
            ProviderUserAccountId = providerUserAccountId,
            ClinicalNotes = string.IsNullOrWhiteSpace(clinicalNotes) ? null : clinicalNotes.Trim(),
            Xhtml = xhtml,
            IssueDate = DateTime.UtcNow.Date
        };

        // The repository/stored procedure is the authoritative check for the
        // DraftPrescriptionId uniqueness match - a duplicate submission throws
        // DuplicatePrescriptionDraftException from there (translated by the
        // repository), not here.
        return await _prescriptionRepository.CreateDraftAsync(newPrescription, items, createdBy);
    }

    public async Task<PrescriptionUpdateResult> UpdateDraftAsync(
        int prescriptionId,
        string xhtml,
        IEnumerable<int> selectedPatientMedicationIds,
        string clinicalNotes,
        byte[] rowVersion,
        string updatedBy)
    {
        var selectedIds = selectedPatientMedicationIds.ToList();

        if (selectedIds.Count == 0)
        {
            throw new NoPrescriptionMedicationsException();
        }

        if (string.IsNullOrWhiteSpace(xhtml))
        {
            throw new MissingPrescriptionXhtmlException();
        }

        // Same strict "must all resolve into a real snapshot" rule as CreateDraftAsync -
        // an edit is still writing a legal clinical document.
        var items = new List<PrescriptionItem>();
        foreach (var patientMedicationId in selectedIds)
        {
            var detail = await _patientMedicationService.GetByIdAsync(patientMedicationId);
            if (detail is null)
            {
                throw new PatientMedicationNotFoundException();
            }

            items.Add(new PrescriptionItem
            {
                PatientMedicationId = detail.PatientMedication.PatientMedicationId,
                MedicineId = detail.Medicine.MedicineId,
                MedicineNameSnapshot = detail.Medicine.MedicineName,
                GenericNameSnapshot = detail.Medicine.GenericName,
                StrengthSnapshot = detail.Medicine.Strength,
                DosageFormSnapshot = detail.MedicineForm.DisplayText,
                RouteSnapshot = detail.MedicineRoute.DisplayText,
                Dose = detail.PatientMedication.Dose,
                DoseUnitId = detail.DoseUnit.DoseUnitId,
                DoseUnitSnapshot = detail.DoseUnit.DisplayText,
                FrequencyId = detail.Frequency.FrequencyId,
                FrequencySnapshot = detail.Frequency.DisplayText,
                Duration = detail.PatientMedication.Duration,
                DurationUnitId = detail.DurationUnit.DurationUnitId,
                DurationUnitSnapshot = detail.DurationUnit.DisplayText,
                Quantity = detail.PatientMedication.Quantity,
                Instructions = detail.PatientMedication.Instructions,
                PRN = detail.PatientMedication.PRN
            });
        }

        var notes = string.IsNullOrWhiteSpace(clinicalNotes) ? null : clinicalNotes.Trim();

        // Existence/editable-state/concurrency are all authoritative in the stored
        // procedure (usp_Prescription_UpdateDraft) - translated to typed exceptions by
        // the repository, not re-checked here.
        return await _prescriptionRepository.UpdateDraftAsync(prescriptionId, notes, xhtml, items, rowVersion, updatedBy);
    }

    public async Task<(IEnumerable<PrescriptionListItem> Items, int TotalCount)> GetPrescriptionsAsync(int page, int pageSize, string sortBy, string sortDirection)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        return await _prescriptionRepository.GetAllAsync(normalizedPage, normalizedPageSize, sortBy, sortDirection);
    }

    public async Task<(IEnumerable<PrescriptionListItem> Items, int TotalCount)> SearchPrescriptionsAsync(
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
        string sortDirection)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        return await _prescriptionRepository.SearchAsync(
            normalizedPage,
            normalizedPageSize,
            searchTerm,
            statusCode,
            issueDateFrom,
            issueDateTo,
            expiryDateFrom,
            expiryDateTo,
            patientId,
            providerUserAccountId,
            sortBy,
            sortDirection);
    }

    public Task<PrescriptionFullDetail?> GetDetailsByIdAsync(int prescriptionId)
        => _prescriptionRepository.GetDetailsByIdAsync(prescriptionId);
}

using Microsoft.Extensions.Options;
using System.Linq;
using Prescription.Application.Exceptions;
using Prescription.Application.Mapping;
using Prescription.Application.Prescriptions;
using Prescription.Application.Prescriptions.Templating;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

// Orchestrates "Patient Medication Updated -> Find every ACTIVE Prescription Item for it
// -> [amend all of them if found]" - this feature's own workflow. All business-rule
// validation lives here (Prescription Finalized/Active/not Cancelled, Medicine/Patient/
// Provider active, a clinically-significant change actually occurred), using existing
// services/repositories wherever one already exists (IPatientMedicationService for the
// current medication values, IPatientRepository/IUserService for patient/provider,
// IPrescriptionHtmlGenerator for rendering the replacement's Xhtml) -
// usp_PrescriptionItem_Amend itself only re-validates the one condition that can
// genuinely race (the item(s) still being ACTIVE).
// A single Patient Medication can be ACTIVE on more than one Prescription at once (e.g.
// selected independently into two separate Generate Prescription actions) - amending it
// supersedes EVERY one of those items and creates only the ONE new replacement, per this
// feature's own redesign (2026-07-23). Validation below runs once per active item found;
// the clinically-significant-change comparison and the Xhtml template's clinical notes
// both use the most recent one (activeItems[0], since FindAllActiveItemsAsync orders by
// PrescriptionItemId DESC) as representative context - every old item was itself a
// snapshot of the same Patient Medication before this edit, so they should already agree
// with each other on every compared field.
public class PrescriptionItemAmendmentService : IPrescriptionItemAmendmentService
{
    private readonly IPrescriptionItemAmendmentRepository _amendmentRepository;
    private readonly IPatientMedicationService _patientMedicationService;
    private readonly IPatientRepository _patientRepository;
    private readonly IUserService _userService;
    private readonly IPrescriptionHtmlGenerator _htmlGenerator;
    private readonly ClinicOptions _clinicOptions;

    public PrescriptionItemAmendmentService(
        IPrescriptionItemAmendmentRepository amendmentRepository,
        IPatientMedicationService patientMedicationService,
        IPatientRepository patientRepository,
        IUserService userService,
        IPrescriptionHtmlGenerator htmlGenerator,
        IOptions<ClinicOptions> clinicOptions)
    {
        _amendmentRepository = amendmentRepository;
        _patientMedicationService = patientMedicationService;
        _patientRepository = patientRepository;
        _userService = userService;
        _htmlGenerator = htmlGenerator;
        _clinicOptions = clinicOptions.Value;
    }

    public Task<PrescriptionItemActiveLookup?> FindActiveItemAsync(int patientMedicationId)
        => _amendmentRepository.FindActiveItemAsync(patientMedicationId);

    public async Task<PrescriptionItemAmendmentResult> AmendAsync(int patientMedicationId, string reason, string amendedBy)
    {
        var activeItems = (await _amendmentRepository.FindAllActiveItemsAsync(patientMedicationId)).ToList();
        if (activeItems.Count == 0)
        {
            // "Medication exists? No -> Update Patient Medication only, no Prescription
            // changes" - the frontend should never reach this endpoint in that case
            // (it checks FindActiveItemAsync first), but this stays a hard validation,
            // not an assumption.
            throw new NoActivePrescriptionItemException();
        }

        // "Only Finalized prescriptions can be reprinted[/amended]... Cancelled
        // prescriptions cannot" - the same DRAFT/CANCELLED reconciliation already applied
        // to Reprint (no separate "Finalized"/"Active" status exists; PENDING is both).
        // Checked against every active item found, not just one - if this Patient
        // Medication is active on more than one prescription, all of them must be
        // eligible before any of them gets superseded.
        if (activeItems.Any(item => item.PrescriptionStatusCode == "DRAFT"))
        {
            throw new PrescriptionNotFinalizedException();
        }

        if (activeItems.Any(item => item.PrescriptionStatusCode == "CANCELLED"))
        {
            throw new PrescriptionCancelledException();
        }

        // "No existing pending replacement" check is now redundant here - FindAllActiveItemsAsync's
        // own SQL already filters ItemStatus = 'ACTIVE', so nothing not-ACTIVE is ever
        // returned; a race with a concurrent amendment is instead caught by
        // usp_PrescriptionItem_Amend's own status-guarded UPDATE, the authoritative
        // re-check.
        var activeItem = activeItems[0];

        var medicationDetail = await _patientMedicationService.GetByIdAsync(patientMedicationId);
        if (medicationDetail is null)
        {
            throw new PatientMedicationNotFoundException();
        }

        if (!medicationDetail.Medicine.IsActive)
        {
            throw new PrescriptionMedicineInactiveException();
        }

        var (patient, gender) = await _patientRepository.GetPatientByIdAsync(activeItem.PatientId);
        if (patient is null || !patient.IsActive)
        {
            throw new InvalidPatientReferenceException();
        }

        var (provider, _) = await _userService.GetUserByIdAsync(activeItem.ProviderUserAccountId);
        if (provider is null || !provider.IsActive)
        {
            throw new InvalidProviderReferenceException();
        }

        // "Medication Changes That Trigger Replacement": Dose/Dose Unit/Frequency/
        // Quantity/Duration/Directions(Instructions)/PRN/Medicine Replacement - compared
        // against the EXISTING active item's own snapshot, not the PatientMedication's
        // previous in-memory state (the snapshot is the authoritative "what this
        // prescription currently says"). Route isn't compared separately - it's a
        // property of the Medicine catalog entry (MedicineRoute), so a route change is
        // already implied by a Medicine change. "Do NOT Trigger": administrative/
        // demographic/provider/internal-notes changes - none of those fields are read
        // here at all.
        var med = medicationDetail.PatientMedication;
        var hasClinicallySignificantChange =
            med.MedicineId != activeItem.MedicineId ||
            med.Dose != activeItem.Dose ||
            med.DoseUnitId != activeItem.DoseUnitId ||
            med.FrequencyId != activeItem.FrequencyId ||
            med.Quantity != activeItem.Quantity ||
            med.Duration != activeItem.Duration ||
            med.DurationUnitId != activeItem.DurationUnitId ||
            !string.Equals(med.Instructions ?? string.Empty, activeItem.Instructions ?? string.Empty, StringComparison.Ordinal) ||
            med.PRN != activeItem.PRN;

        if (!hasClinicallySignificantChange)
        {
            throw new NoClinicallySignificantChangeException();
        }

        var newItem = new PrescriptionItem
        {
            PatientMedicationId = medicationDetail.PatientMedication.PatientMedicationId,
            MedicineId = medicationDetail.Medicine.MedicineId,
            MedicineNameSnapshot = medicationDetail.Medicine.MedicineName,
            GenericNameSnapshot = medicationDetail.Medicine.GenericName,
            StrengthSnapshot = medicationDetail.Medicine.Strength,
            DosageFormSnapshot = medicationDetail.MedicineForm.DisplayText,
            RouteSnapshot = medicationDetail.MedicineRoute.DisplayText,
            Dose = medicationDetail.PatientMedication.Dose,
            DoseUnitId = medicationDetail.DoseUnit.DoseUnitId,
            DoseUnitSnapshot = medicationDetail.DoseUnit.DisplayText,
            FrequencyId = medicationDetail.Frequency.FrequencyId,
            FrequencySnapshot = medicationDetail.Frequency.DisplayText,
            Duration = medicationDetail.PatientMedication.Duration,
            DurationUnitId = medicationDetail.DurationUnit.DurationUnitId,
            DurationUnitSnapshot = medicationDetail.DurationUnit.DisplayText,
            Quantity = medicationDetail.PatientMedication.Quantity,
            Instructions = medicationDetail.PatientMedication.Instructions,
            PRN = medicationDetail.PatientMedication.PRN
        };

        var issueDate = DateTime.UtcNow.Date;

        // Same placeholder-PrescriptionNumber-in-markup characteristic Generate Draft's
        // own BuildPrescriptionTemplateModel has always had (Step 18.2) - the real
        // PrescriptionNumber is only assigned inside usp_PrescriptionItem_Amend itself,
        // same as CreateDraft's own Xhtml-before-real-number ordering.
        var templateModel = PrescriptionTemplateMappingExtensions.BuildPrescriptionTemplateModel(
            Guid.NewGuid(),
            patient,
            gender,
            provider,
            new[] { medicationDetail },
            activeItem.ClinicalNotes,
            _clinicOptions);

        var xhtml = _htmlGenerator.GenerateHtml(templateModel);

        return await _amendmentRepository.AmendAsync(
            patientMedicationId,
            reason,
            newItem,
            xhtml,
            issueDate,
            amendedBy);
    }
}

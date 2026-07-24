using Microsoft.Extensions.Options;
using Prescription.Application.Exceptions;
using Prescription.Application.Prescriptions;
using Prescription.Application.Prescriptions.Templating;
using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

// "A renewal creates a NEW prescription based on an existing prescription. The original
// prescription remains unchanged." - this service never writes to the original
// Prescription/PrescriptionItem rows at all, only reads them (via the existing
// IPrescriptionRepository.GetDetailsByIdAsync) to snapshot into a brand-new Prescription.
// Medicine/Strength/Dose/Frequency/Route are always copied from the original item's own
// snapshot (never re-fetched from the patient's current PatientMedication, which may have
// changed since) - "Do not allow modification of: Medicine, Strength" is enforced by
// never accepting those fields from the caller at all, not by validating a caller-supplied
// value.
public class PrescriptionRenewalService : IPrescriptionRenewalService
{
    private readonly IPrescriptionRepository _prescriptionRepository;
    private readonly IPrescriptionRenewalRepository _renewalRepository;
    private readonly IPatientRepository _patientRepository;
    private readonly IUserService _userService;
    private readonly IMedicineService _medicineService;
    private readonly IPrescriptionHtmlGenerator _htmlGenerator;
    private readonly ClinicOptions _clinicOptions;
    private readonly PrescriptionRenewalOptions _renewalOptions;

    public PrescriptionRenewalService(
        IPrescriptionRepository prescriptionRepository,
        IPrescriptionRenewalRepository renewalRepository,
        IPatientRepository patientRepository,
        IUserService userService,
        IMedicineService medicineService,
        IPrescriptionHtmlGenerator htmlGenerator,
        IOptions<ClinicOptions> clinicOptions,
        IOptions<PrescriptionRenewalOptions> renewalOptions)
    {
        _prescriptionRepository = prescriptionRepository;
        _renewalRepository = renewalRepository;
        _patientRepository = patientRepository;
        _userService = userService;
        _medicineService = medicineService;
        _htmlGenerator = htmlGenerator;
        _clinicOptions = clinicOptions.Value;
        _renewalOptions = renewalOptions.Value;
    }

    public async Task<PrescriptionRenewalResult> RenewAsync(
        int originalPrescriptionId,
        IEnumerable<PrescriptionRenewalItemSelection> selectedItems,
        string renewedBy)
    {
        var selections = selectedItems.ToList();

        if (selections.Count == 0)
        {
            throw new NoPrescriptionMedicationsException();
        }

        var original = await _prescriptionRepository.GetDetailsByIdAsync(originalPrescriptionId);
        if (original is null)
        {
            throw new PrescriptionNotFoundException();
        }

        var header = original.Header;

        // "Eligible Prescriptions: Finalized, Active, Not Cancelled" / "Cannot Renew:
        // Draft, Cancelled, Expired (unless permitted by configuration)" - the same
        // DRAFT/CANCELLED reconciliation already applied to Reprint/Amendment (no
        // separate "Finalized"/"Active" status exists; PENDING is both).
        if (header.StatusCode == "DRAFT")
        {
            throw new PrescriptionNotFinalizedException();
        }

        if (header.StatusCode == "CANCELLED")
        {
            throw new PrescriptionCancelledException();
        }

        if (header.StatusCode == "EXPIRED" && !_renewalOptions.AllowExpiredRenewal)
        {
            throw new PrescriptionExpiredException();
        }

        var (patient, _) = await _patientRepository.GetPatientByIdAsync(header.PatientId);
        if (patient is null || !patient.IsActive)
        {
            throw new InvalidPatientReferenceException();
        }

        var (provider, _) = await _userService.GetUserByIdAsync(header.ProviderUserAccountId);
        if (provider is null || !provider.IsActive)
        {
            throw new InvalidProviderReferenceException();
        }

        var originalItemsById = original.Items.ToDictionary(item => item.PrescriptionItemId);

        var medicationLines = new List<PrescriptionMedicationLine>();

        foreach (var selection in selections)
        {
            if (!originalItemsById.TryGetValue(selection.PrescriptionItemId, out var originalItem))
            {
                // Same "prevent orphan relationships" rule usp_Prescription_Renew's own
                // THROW enforces - checked here too so a bad id fails fast with a clear
                // message before any SQL round trip.
                throw new PrescriptionNotFoundException();
            }

            var (medicine, _, _) = await _medicineService.GetMedicineByIdAsync(originalItem.MedicineId);
            if (medicine is null || !medicine.IsActive)
            {
                throw new PrescriptionMedicineInactiveException();
            }

            medicationLines.Add(new PrescriptionMedicationLine
            {
                MedicineName = originalItem.MedicineNameSnapshot,
                Strength = originalItem.StrengthSnapshot,
                Dose = $"{originalItem.Dose} {originalItem.DoseUnitSnapshot}".Trim(),
                Frequency = originalItem.FrequencySnapshot,
                Route = originalItem.RouteSnapshot,
                Quantity = selection.Quantity.ToString("0.##"),
                Directions = selection.Instructions
            });
        }

        var issueDate = DateTime.UtcNow.Date;

        // Mirrors usp_Prescription_Renew's own formula (WEEKS x7, MONTHS x30) purely so
        // the rendered preview shows a realistic ExpiryDate - the real, authoritative
        // value is computed independently in SQL when the row is actually inserted, same
        // "Xhtml built with a close-but-not-guaranteed-byte-perfect preview" precedent
        // already accepted for CreateDraft/Amendment's own placeholder PrescriptionNumber.
        var maxDurationDays = selections.Max(selection => ConvertToDays(selection.Duration, originalItemsById[selection.PrescriptionItemId].DurationUnitSnapshot));
        var expiryDate = issueDate.AddDays(maxDurationDays);

        var templateModel = new PrescriptionTemplateModel
        {
            Clinic = new PrescriptionClinicDetails
            {
                Name = _clinicOptions.Name,
                Address = _clinicOptions.Address,
                Phone = _clinicOptions.Phone,
                Email = _clinicOptions.Email
            },
            Provider = new PrescriptionProviderDetails
            {
                Name = header.ProviderName,
                NzmcNumber = null,
                Address = null,
                Phone = header.ProviderPhoneNumber,
                Email = header.ProviderEmail
            },
            Patient = new PrescriptionPatientDetails
            {
                Name = $"{header.PatientFirstName} {header.PatientLastName}",
                NhiNumber = header.NHINumber,
                DateOfBirth = header.PatientDateOfBirth,
                Gender = header.GenderDisplayText,
                Address = string.Join(
                    ", ",
                    new[]
                    {
                        header.PatientAddressLine1, header.PatientAddressLine2, header.PatientCity,
                        header.PatientRegion, header.PatientPostalCode
                    }.Where(part => !string.IsNullOrWhiteSpace(part))),
                Phone = header.PatientMobileNumber
            },
            Prescription = new PrescriptionHeaderDetails
            {
                PrescriptionNumber = $"RENEWAL-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
                IssueDate = issueDate,
                ExpiryDate = expiryDate,
                Status = "Draft"
            },
            Medications = medicationLines,
            ClinicalNotes = header.ClinicalNotes
        };

        var xhtml = _htmlGenerator.GenerateHtml(templateModel);

        return await _renewalRepository.RenewAsync(originalPrescriptionId, selections, xhtml, renewedBy);
    }

    private static int ConvertToDays(int duration, string durationUnitDisplayText)
        => durationUnitDisplayText switch
        {
            "Weeks" => duration * 7,
            "Months" => duration * 30,
            _ => duration
        };
}

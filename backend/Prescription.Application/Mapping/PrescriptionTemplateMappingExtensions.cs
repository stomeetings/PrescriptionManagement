using Prescription.Application.Prescriptions;
using Prescription.Application.Prescriptions.Templating;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;
using Prescription.Shared.DTOs;

namespace Prescription.Application.Mapping;

public static class PrescriptionTemplateMappingExtensions
{
    public static PrescriptionProviderResponse ToPrescriptionProviderResponse(this UserAccount provider)
        => new()
        {
            UserAccountId = provider.UserAccountId,
            FullName = provider.FullName,
            Email = provider.Email,
            PhoneNumber = provider.PhoneNumber
        };

    // Builds the sole input IPrescriptionHtmlGenerator needs (Step 18.1) from data this
    // controller action already has in hand (Step 18.2's "small backend wiring" - see
    // PatientMedicationsController.GeneratePrescriptionDraft). Not an extension method
    // on any single one of its inputs - there is no natural "this" receiver among
    // Patient/Provider/Medications, so this is a plain static factory kept in the
    // Mapping namespace/folder for discoverability alongside every other mapping
    // extension in this project.
    //
    // Prescription Number/Issue Date/Status are placeholders, not real persisted values
    // - nothing is saved yet (docs/prescriptions/prescription-management.md section
    // 5.1: "Nothing is persisted by this step"). A real Prescription Number is assigned
    // only once a future "Save Draft" step actually creates a Prescription row.
    public static PrescriptionTemplateModel BuildPrescriptionTemplateModel(
        Guid draftPrescriptionId,
        Patient patient,
        Gender gender,
        UserAccount provider,
        IEnumerable<PatientMedicationDetail> medications,
        string clinicalNotes,
        ClinicOptions clinic)
        => new()
        {
            Clinic = new PrescriptionClinicDetails
            {
                Name = clinic.Name,
                Address = clinic.Address,
                Phone = clinic.Phone,
                Email = clinic.Email
            },
            Provider = new PrescriptionProviderDetails
            {
                Name = provider.FullName,
                // NzmcNumber/Address: no such fields exist on UserAccount - left null so
                // the template's own "-" fallback renders, rather than fabricating data.
                NzmcNumber = null,
                Address = null,
                Phone = provider.PhoneNumber,
                Email = provider.Email
            },
            Patient = new PrescriptionPatientDetails
            {
                Name = $"{patient.FirstName} {patient.LastName}",
                NhiNumber = patient.NHINumber,
                DateOfBirth = patient.DateOfBirth,
                Gender = gender?.DisplayText,
                Address = string.Join(", ", new[] { patient.AddressLine1, patient.AddressLine2, patient.City, patient.Region, patient.PostalCode }
                    .Where(part => !string.IsNullOrWhiteSpace(part))),
                Phone = patient.MobileNumber
            },
            Prescription = new PrescriptionHeaderDetails
            {
                PrescriptionNumber = $"DRAFT-{draftPrescriptionId.ToString("N")[..8].ToUpperInvariant()}",
                IssueDate = DateTime.UtcNow.Date,
                ExpiryDate = null,
                Status = "Draft"
            },
            Medications = medications.Select(medication => new PrescriptionMedicationLine
            {
                MedicineName = medication.Medicine.MedicineName,
                Strength = $"{medication.Medicine.Strength} {medication.MedicineForm.DisplayText}".Trim(),
                Dose = $"{medication.PatientMedication.Dose} {medication.DoseUnit.DisplayText}".Trim(),
                Frequency = medication.Frequency.DisplayText,
                Route = medication.MedicineRoute.DisplayText,
                Quantity = medication.PatientMedication.Quantity.ToString("0.##"),
                Directions = medication.PatientMedication.Instructions
            }).ToList(),
            ClinicalNotes = clinicalNotes
        };
}

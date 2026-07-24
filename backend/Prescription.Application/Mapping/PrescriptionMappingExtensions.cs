using Prescription.Application.Repositories;
using Prescription.Shared.DTOs;

namespace Prescription.Application.Mapping;

// Prescription Management List mapping - mirrors PatientMappingExtensions.
// ToPatientPagedResponse's identical role.
public static class PrescriptionMappingExtensions
{
    public static PrescriptionListResponse ToPrescriptionListResponse(this PrescriptionListItem item) => new()
    {
        PrescriptionId = item.PrescriptionId,
        PrescriptionNumber = item.PrescriptionNumber,
        PatientId = item.PatientId,
        PatientName = item.PatientName,
        NHINumber = item.NHINumber,
        ProviderUserAccountId = item.ProviderUserAccountId,
        ProviderName = item.ProviderName,
        IssueDate = item.IssueDate,
        ExpiryDate = item.ExpiryDate,
        MedicationCount = item.MedicationCount,
        Status = new PrescriptionStatusResponse { Code = item.StatusCode, DisplayText = item.StatusDisplayText },
        VersionNumber = item.VersionNumber,
        CreatedBy = item.CreatedBy,
        CreatedDate = item.CreatedDate
    };

    public static PrescriptionDetailsResponse ToPrescriptionDetailsResponse(this PrescriptionFullDetail detail)
    {
        var header = detail.Header;

        return new PrescriptionDetailsResponse
        {
            PrescriptionId = header.PrescriptionId,
            PrescriptionNumber = header.PrescriptionNumber,
            Status = new PrescriptionStatusResponse { Code = header.StatusCode, DisplayText = header.StatusDisplayText },
            VersionNumber = header.VersionNumber,
            IssueDate = header.IssueDate,
            ExpiryDate = header.ExpiryDate,
            MedicationCount = header.MedicationCount,
            PrintCount = header.PrintCount,
            ClinicalNotes = header.ClinicalNotes,
            CreatedBy = header.CreatedBy,
            CreatedDate = header.CreatedDate,
            UpdatedBy = header.UpdatedBy,
            UpdatedDate = header.UpdatedDate,
            FinalizedDate = header.FinalizedDate,
            FinalizedBy = header.FinalizedBy,
            RowVersion = header.RowVersion,
            Xhtml = header.Xhtml,
            Patient = new PrescriptionPatientSummaryResponse
            {
                PatientId = header.PatientId,
                FullName = $"{header.PatientFirstName} {header.PatientLastName}",
                NHINumber = header.NHINumber,
                DateOfBirth = header.PatientDateOfBirth,
                Gender = new GenderResponse { Code = header.GenderCode, DisplayText = header.GenderDisplayText },
                MobileNumber = header.PatientMobileNumber,
                AddressLine1 = header.PatientAddressLine1,
                AddressLine2 = header.PatientAddressLine2,
                City = header.PatientCity,
                Region = header.PatientRegion,
                PostalCode = header.PatientPostalCode,
                Country = header.PatientCountry
            },
            Provider = new PrescriptionProviderResponse
            {
                UserAccountId = header.ProviderUserAccountId,
                FullName = header.ProviderName,
                Email = header.ProviderEmail,
                PhoneNumber = header.ProviderPhoneNumber
            },
            Medications = detail.Items.Select(item => new PrescriptionDetailMedicationResponse
            {
                PrescriptionItemId = item.PrescriptionItemId,
                MedicineId = item.MedicineId,
                MedicineName = item.MedicineNameSnapshot,
                GenericName = item.GenericNameSnapshot,
                Strength = item.StrengthSnapshot,
                DosageForm = item.DosageFormSnapshot,
                Route = item.RouteSnapshot,
                Dose = item.Dose,
                DoseUnit = item.DoseUnitSnapshot,
                Frequency = item.FrequencySnapshot,
                Duration = item.Duration,
                DurationUnit = item.DurationUnitSnapshot,
                Quantity = item.Quantity,
                Instructions = item.Instructions,
                PRN = item.PRN,
                ItemStatus = item.ItemStatus,
                Scid = item.Scid,
                ReplacementPrescriptionNumber = item.ReplacementPrescriptionNumber,
                ReplacementScid = item.ReplacementScid,
                ReplacementDate = item.ReplacementDate
            }).ToList(),
            Timeline = detail.Timeline.Select(timelineEvent => new PrescriptionTimelineEventResponse
            {
                Action = timelineEvent.Action,
                ChangedBy = timelineEvent.ChangedBy,
                ChangedDate = timelineEvent.ChangedDate,
                VersionNumber = timelineEvent.VersionNumber,
                ChangedFields = timelineEvent.ChangedFields
            }).ToList()
        };
    }

    public static PrescriptionPagedResponse ToPrescriptionPagedResponse(
        this IEnumerable<PrescriptionListItem> items,
        int totalCount,
        int page,
        int pageSize)
    {
        var totalPages = pageSize > 0 ? (int)Math.Ceiling(totalCount / (double)pageSize) : 0;

        return new PrescriptionPagedResponse
        {
            Items = items.Select(item => item.ToPrescriptionListResponse()).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };
    }
}

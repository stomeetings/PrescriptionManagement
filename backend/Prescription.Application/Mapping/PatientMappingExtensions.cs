using Prescription.Domain.Entities;
using Prescription.Shared.DTOs;

namespace Prescription.Application.Mapping;

public static class PatientMappingExtensions
{
    public static GenderResponse ToGenderResponse(this Gender entity)
        => new GenderResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText
        };

    public static PatientListResponse ToPatientListResponse(this Patient patient, Gender gender)
        => new PatientListResponse
        {
            PatientId = patient.PatientId,
            PatientNumber = patient.PatientNumber,
            FullName = $"{patient.FirstName} {patient.LastName}",
            DateOfBirth = patient.DateOfBirth,
            Gender = gender.ToGenderResponse(),
            MobileNumber = patient.MobileNumber,
            Email = patient.Email,
            NHINumber = patient.NHINumber,
            IsActive = patient.IsActive,
            UpdatedDate = patient.UpdatedDate
        };

    public static PatientDetailResponse ToPatientDetailResponse(this Patient patient, Gender gender)
        => new PatientDetailResponse
        {
            PatientId = patient.PatientId,
            PatientNumber = patient.PatientNumber,
            FirstName = patient.FirstName,
            LastName = patient.LastName,
            PreferredName = patient.PreferredName,
            DateOfBirth = patient.DateOfBirth,
            Gender = gender.ToGenderResponse(),
            MobileNumber = patient.MobileNumber,
            Email = patient.Email,
            AddressLine1 = patient.AddressLine1,
            AddressLine2 = patient.AddressLine2,
            City = patient.City,
            Region = patient.Region,
            PostalCode = patient.PostalCode,
            Country = patient.Country,
            NHINumber = patient.NHINumber,
            NZMCNumber = patient.NZMCNumber,
            Notes = patient.Notes,
            IsActive = patient.IsActive,
            CreatedDate = patient.CreatedDate,
            CreatedBy = patient.CreatedBy,
            UpdatedDate = patient.UpdatedDate,
            UpdatedBy = patient.UpdatedBy,
            RowVersion = patient.RowVersion
        };

    public static PatientPagedResponse ToPatientPagedResponse(
        this IEnumerable<(Patient Patient, Gender Gender)> patients,
        int totalCount,
        int page,
        int pageSize)
    {
        var totalPages = pageSize > 0 ? (int)Math.Ceiling(totalCount / (double)pageSize) : 0;

        return new PatientPagedResponse
        {
            Items = patients.Select(p => p.Patient.ToPatientListResponse(p.Gender)).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };
    }
}

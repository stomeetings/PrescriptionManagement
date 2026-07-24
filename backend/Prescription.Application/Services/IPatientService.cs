using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IPatientService
{
    Task<(IEnumerable<(Patient Patient, Gender Gender)> Patients, int TotalCount)> GetPatientsAsync(
        int page,
        int pageSize,
        string sortBy,
        string sortDirection);

    Task<(IEnumerable<(Patient Patient, Gender Gender)> Patients, int TotalCount)> SearchPatientsAsync(
        int page,
        int pageSize,
        string? searchTerm,
        string? status,
        string? genderCode,
        string? nhi,
        string? firstName,
        string? lastName,
        DateTime? dateOfBirth,
        string sortBy,
        string sortDirection);

    Task<(Patient? Patient, Gender? Gender)> GetPatientByIdAsync(int patientId);

    Task<(Patient Patient, Gender Gender)> CreatePatientAsync(
        string firstName,
        string lastName,
        string? preferredName,
        DateTime dateOfBirth,
        string genderCode,
        string? mobileNumber,
        string? email,
        string? addressLine1,
        string? addressLine2,
        string? city,
        string? region,
        string? postalCode,
        string? country,
        string? nhiNumber,
        string? nzmcNumber,
        bool isActive,
        string? notes,
        string createdBy);

    Task<(Patient Patient, Gender Gender)> UpdatePatientAsync(
        int patientId,
        string firstName,
        string lastName,
        string? preferredName,
        DateTime dateOfBirth,
        string genderCode,
        string? mobileNumber,
        string? email,
        string? addressLine1,
        string? addressLine2,
        string? city,
        string? region,
        string? postalCode,
        string? country,
        string? nhiNumber,
        string? nzmcNumber,
        string? notes,
        byte[] rowVersion,
        string updatedBy);

    Task<(Patient Patient, Gender Gender)> ActivatePatientAsync(int patientId, string updatedBy);

    Task<(Patient Patient, Gender Gender)> DeactivatePatientAsync(int patientId, string updatedBy);
}

using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IPatientRepository
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

    Task<(int PatientId, string PatientNumber)> CreatePatientAsync(Patient patient, string createdBy);

    Task UpdatePatientAsync(Patient patient, string updatedBy);

    Task ActivatePatientAsync(int patientId, string updatedBy);

    Task DeactivatePatientAsync(int patientId, string updatedBy);

    Task<bool> CheckPatientNumberExistsAsync(string patientNumber, int? excludePatientId);

    Task<bool> CheckNHINumberExistsAsync(string nhiNumber, int? excludePatientId);
}

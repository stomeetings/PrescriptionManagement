using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

// No CancellationToken parameters - matches IUserRepository/IPatientRepository, neither
// of which uses one anywhere; that remains the actual project standard despite this
// step's conditional instruction to add one "if the project standard supports it."
public interface IMedicineRepository
{
    Task<(IEnumerable<(Medicine Medicine, MedicineForm MedicineForm, MedicineRoute MedicineRoute)> Medicines, int TotalCount)> GetMedicinesAsync(
        int page,
        int pageSize,
        string sortBy,
        string sortDirection);

    Task<(IEnumerable<(Medicine Medicine, MedicineForm MedicineForm, MedicineRoute MedicineRoute)> Medicines, int TotalCount)> SearchMedicinesAsync(
        int page,
        int pageSize,
        string? searchTerm,
        string? medicineFormCode,
        string? medicineRouteCode,
        string? status,
        bool? isControlledDrug,
        string sortBy,
        string sortDirection);

    Task<(Medicine? Medicine, MedicineForm? MedicineForm, MedicineRoute? MedicineRoute)> GetMedicineByIdAsync(int medicineId);

    Task<int> CreateMedicineAsync(Medicine medicine, string createdBy);

    Task UpdateMedicineAsync(Medicine medicine, string updatedBy);

    Task ActivateMedicineAsync(int medicineId, string updatedBy);

    Task DeactivateMedicineAsync(int medicineId, string updatedBy);

    Task<bool> CheckMedicineCodeExistsAsync(string medicineCode, int? excludeMedicineId);

    Task<bool> CheckDuplicateMedicineAsync(string medicineName, string strength, int medicineFormId, int? excludeMedicineId);
}

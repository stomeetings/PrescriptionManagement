using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IMedicineService
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

    Task<(Medicine Medicine, MedicineForm MedicineForm, MedicineRoute MedicineRoute)> CreateMedicineAsync(
        string medicineCode,
        string medicineName,
        string genericName,
        string? brandName,
        string strength,
        string medicineFormCode,
        string medicineRouteCode,
        string? manufacturer,
        string? atcCode,
        bool isControlledDrug,
        string? notes,
        string createdBy);

    Task<(Medicine Medicine, MedicineForm MedicineForm, MedicineRoute MedicineRoute)> UpdateMedicineAsync(
        int medicineId,
        string medicineName,
        string genericName,
        string? brandName,
        string strength,
        string medicineFormCode,
        string medicineRouteCode,
        string? manufacturer,
        string? atcCode,
        bool isControlledDrug,
        string? notes,
        byte[] rowVersion,
        string updatedBy);

    Task<(Medicine Medicine, MedicineForm MedicineForm, MedicineRoute MedicineRoute)> ActivateMedicineAsync(int medicineId, string updatedBy);

    Task<(Medicine Medicine, MedicineForm MedicineForm, MedicineRoute MedicineRoute)> DeactivateMedicineAsync(int medicineId, string updatedBy);
}

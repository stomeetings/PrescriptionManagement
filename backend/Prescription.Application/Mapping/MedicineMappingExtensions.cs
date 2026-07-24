using Prescription.Domain.Entities;
using Prescription.Shared.DTOs;

namespace Prescription.Application.Mapping;

public static class MedicineMappingExtensions
{
    public static MedicineFormResponse ToMedicineFormResponse(this MedicineForm entity)
        => new MedicineFormResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText
        };

    public static MedicineRouteResponse ToMedicineRouteResponse(this MedicineRoute entity)
        => new MedicineRouteResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText
        };

    public static MedicineListResponse ToMedicineListResponse(this Medicine medicine, MedicineForm medicineForm, MedicineRoute medicineRoute)
        => new MedicineListResponse
        {
            MedicineId = medicine.MedicineId,
            MedicineCode = medicine.MedicineCode,
            MedicineName = medicine.MedicineName,
            GenericName = medicine.GenericName,
            BrandName = medicine.BrandName,
            Strength = medicine.Strength,
            MedicineForm = medicineForm.ToMedicineFormResponse(),
            MedicineRoute = medicineRoute.ToMedicineRouteResponse(),
            Manufacturer = medicine.Manufacturer,
            IsControlledDrug = medicine.IsControlledDrug,
            IsActive = medicine.IsActive,
            UpdatedDate = medicine.UpdatedDate
        };

    public static MedicineDetailResponse ToMedicineDetailResponse(this Medicine medicine, MedicineForm medicineForm, MedicineRoute medicineRoute)
        => new MedicineDetailResponse
        {
            MedicineId = medicine.MedicineId,
            MedicineCode = medicine.MedicineCode,
            MedicineName = medicine.MedicineName,
            GenericName = medicine.GenericName,
            BrandName = medicine.BrandName,
            Strength = medicine.Strength,
            MedicineForm = medicineForm.ToMedicineFormResponse(),
            MedicineRoute = medicineRoute.ToMedicineRouteResponse(),
            Manufacturer = medicine.Manufacturer,
            ATCCode = medicine.ATCCode,
            IsControlledDrug = medicine.IsControlledDrug,
            IsActive = medicine.IsActive,
            Notes = medicine.Notes,
            CreatedDate = medicine.CreatedDate,
            CreatedBy = medicine.CreatedBy,
            UpdatedDate = medicine.UpdatedDate,
            UpdatedBy = medicine.UpdatedBy,
            RowVersion = medicine.RowVersion
        };

    public static MedicinePagedResponse ToMedicinePagedResponse(
        this IEnumerable<(Medicine Medicine, MedicineForm MedicineForm, MedicineRoute MedicineRoute)> medicines,
        int totalCount,
        int page,
        int pageSize)
    {
        var totalPages = pageSize > 0 ? (int)Math.Ceiling(totalCount / (double)pageSize) : 0;

        return new MedicinePagedResponse
        {
            Items = medicines.Select(m => m.Medicine.ToMedicineListResponse(m.MedicineForm, m.MedicineRoute)).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };
    }
}

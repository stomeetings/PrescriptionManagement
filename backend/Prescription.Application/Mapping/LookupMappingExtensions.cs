using Prescription.Domain.Entities;
using Prescription.Shared.DTOs;

namespace Prescription.Application.Mapping;

public static class LookupMappingExtensions
{
    public static LookupValueResponse ToLookupValueResponse(this Gender entity)
        => new LookupValueResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText,
            DisplayOrder = entity.DisplayOrder
        };

    public static LookupValueResponse ToLookupValueResponse(this PrescriptionStatus entity)
        => new LookupValueResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText,
            DisplayOrder = entity.DisplayOrder
        };

    public static LookupValueResponse ToLookupValueResponse(this MedicineForm entity)
        => new LookupValueResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText,
            DisplayOrder = entity.DisplayOrder
        };

    public static LookupValueResponse ToLookupValueResponse(this MedicineRoute entity)
        => new LookupValueResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText,
            DisplayOrder = entity.DisplayOrder
        };

    public static LookupValueResponse ToLookupValueResponse(this DoseUnit entity)
        => new LookupValueResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText,
            DisplayOrder = entity.DisplayOrder
        };

    public static LookupValueResponse ToLookupValueResponse(this Frequency entity)
        => new LookupValueResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText,
            DisplayOrder = entity.DisplayOrder
        };

    public static LookupValueResponse ToLookupValueResponse(this DurationUnit entity)
        => new LookupValueResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText,
            DisplayOrder = entity.DisplayOrder
        };

    public static LookupValueResponse ToLookupValueResponse(this ProfileType entity)
        => new LookupValueResponse
        {
            Code = entity.Code,
            DisplayText = entity.DisplayText,
            DisplayOrder = entity.DisplayOrder
        };

    public static LookupCategoryResponse ToLookupCategoryResponse(this IEnumerable<Gender> entities)
        => new LookupCategoryResponse
        {
            Code = "Gender",
            Name = "Gender",
            Values = entities.Select(entity => entity.ToLookupValueResponse())
        };

    public static LookupCategoryResponse ToLookupCategoryResponse(this IEnumerable<PrescriptionStatus> entities)
        => new LookupCategoryResponse
        {
            Code = "PrescriptionStatus",
            Name = "Prescription Status",
            Values = entities.Select(entity => entity.ToLookupValueResponse())
        };

    public static LookupCategoryResponse ToLookupCategoryResponse(this IEnumerable<MedicineForm> entities)
        => new LookupCategoryResponse
        {
            Code = "MedicineForm",
            Name = "Medicine Form",
            Values = entities.Select(entity => entity.ToLookupValueResponse())
        };

    public static LookupCategoryResponse ToLookupCategoryResponse(this IEnumerable<MedicineRoute> entities)
        => new LookupCategoryResponse
        {
            Code = "MedicineRoute",
            Name = "Medicine Route",
            Values = entities.Select(entity => entity.ToLookupValueResponse())
        };

    public static LookupCategoryResponse ToLookupCategoryResponse(this IEnumerable<DoseUnit> entities)
        => new LookupCategoryResponse
        {
            Code = "DoseUnit",
            Name = "Dose Unit",
            Values = entities.Select(entity => entity.ToLookupValueResponse())
        };

    public static LookupCategoryResponse ToLookupCategoryResponse(this IEnumerable<Frequency> entities)
        => new LookupCategoryResponse
        {
            Code = "Frequency",
            Name = "Frequency",
            Values = entities.Select(entity => entity.ToLookupValueResponse())
        };

    public static LookupCategoryResponse ToLookupCategoryResponse(this IEnumerable<DurationUnit> entities)
        => new LookupCategoryResponse
        {
            Code = "DurationUnit",
            Name = "Duration Unit",
            Values = entities.Select(entity => entity.ToLookupValueResponse())
        };

    public static LookupCategoryResponse ToLookupCategoryResponse(this IEnumerable<ProfileType> entities)
        => new LookupCategoryResponse
        {
            Code = "ProfileType",
            Name = "Profile Type",
            Values = entities.Select(entity => entity.ToLookupValueResponse())
        };
}

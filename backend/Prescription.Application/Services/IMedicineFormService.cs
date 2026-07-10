using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IMedicineFormService
{
    Task<IEnumerable<MedicineForm>> GetAllAsync();
}

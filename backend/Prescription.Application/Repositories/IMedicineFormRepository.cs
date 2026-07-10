using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IMedicineFormRepository
{
    Task<IEnumerable<MedicineForm>> GetAllAsync();
}

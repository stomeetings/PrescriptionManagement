using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IMedicineRouteRepository
{
    Task<IEnumerable<MedicineRoute>> GetAllAsync();
}

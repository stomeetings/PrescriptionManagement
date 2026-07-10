using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IMedicineRouteService
{
    Task<IEnumerable<MedicineRoute>> GetAllAsync();
}

using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IDoseUnitRepository
{
    Task<IEnumerable<DoseUnit>> GetAllAsync();
}

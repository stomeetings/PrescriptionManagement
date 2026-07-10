using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IDurationUnitRepository
{
    Task<IEnumerable<DurationUnit>> GetAllAsync();
}

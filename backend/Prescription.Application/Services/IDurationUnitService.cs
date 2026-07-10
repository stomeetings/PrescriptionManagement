using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IDurationUnitService
{
    Task<IEnumerable<DurationUnit>> GetAllAsync();
}

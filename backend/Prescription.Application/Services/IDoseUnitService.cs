using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IDoseUnitService
{
    Task<IEnumerable<DoseUnit>> GetAllAsync();
}

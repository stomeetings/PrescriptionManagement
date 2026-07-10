using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IFrequencyRepository
{
    Task<IEnumerable<Frequency>> GetAllAsync();
}

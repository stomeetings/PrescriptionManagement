using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IFrequencyService
{
    Task<IEnumerable<Frequency>> GetAllAsync();
}

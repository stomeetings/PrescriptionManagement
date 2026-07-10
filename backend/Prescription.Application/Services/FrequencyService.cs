using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class FrequencyService : IFrequencyService
{
    private readonly IFrequencyRepository _repository;

    public FrequencyService(IFrequencyRepository repository)
    {
        _repository = repository;
    }

    public Task<IEnumerable<Frequency>> GetAllAsync()
        => _repository.GetAllAsync();
}

using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class DurationUnitService : IDurationUnitService
{
    private readonly IDurationUnitRepository _repository;

    public DurationUnitService(IDurationUnitRepository repository)
    {
        _repository = repository;
    }

    public Task<IEnumerable<DurationUnit>> GetAllAsync()
        => _repository.GetAllAsync();
}

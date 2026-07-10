using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class DoseUnitService : IDoseUnitService
{
    private readonly IDoseUnitRepository _repository;

    public DoseUnitService(IDoseUnitRepository repository)
    {
        _repository = repository;
    }

    public Task<IEnumerable<DoseUnit>> GetAllAsync()
        => _repository.GetAllAsync();
}

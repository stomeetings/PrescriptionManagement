using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class MedicineRouteService : IMedicineRouteService
{
    private readonly IMedicineRouteRepository _repository;

    public MedicineRouteService(IMedicineRouteRepository repository)
    {
        _repository = repository;
    }

    public Task<IEnumerable<MedicineRoute>> GetAllAsync()
        => _repository.GetAllAsync();
}

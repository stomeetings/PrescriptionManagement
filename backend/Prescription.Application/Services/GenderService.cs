using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class GenderService : IGenderService
{
    private readonly IGenderRepository _repository;

    public GenderService(IGenderRepository repository)
    {
        _repository = repository;
    }

    public Task<IEnumerable<Gender>> GetAllAsync()
        => _repository.GetAllAsync();
}

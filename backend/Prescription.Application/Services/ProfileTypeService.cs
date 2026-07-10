using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class ProfileTypeService : IProfileTypeService
{
    private readonly IProfileTypeRepository _repository;

    public ProfileTypeService(IProfileTypeRepository repository)
    {
        _repository = repository;
    }

    public Task<IEnumerable<ProfileType>> GetAllAsync()
        => _repository.GetAllAsync();
}

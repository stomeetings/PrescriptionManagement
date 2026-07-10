using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class MedicineFormService : IMedicineFormService
{
    private readonly IMedicineFormRepository _repository;

    public MedicineFormService(IMedicineFormRepository repository)
    {
        _repository = repository;
    }

    public Task<IEnumerable<MedicineForm>> GetAllAsync()
        => _repository.GetAllAsync();
}

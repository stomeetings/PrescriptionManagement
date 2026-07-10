using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public class PrescriptionStatusService : IPrescriptionStatusService
{
    private readonly IPrescriptionStatusRepository _repository;

    public PrescriptionStatusService(IPrescriptionStatusRepository repository)
    {
        _repository = repository;
    }

    public Task<IEnumerable<PrescriptionStatus>> GetAllAsync()
        => _repository.GetAllAsync();
}

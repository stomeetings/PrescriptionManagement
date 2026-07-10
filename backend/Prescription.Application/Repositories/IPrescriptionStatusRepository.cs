using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IPrescriptionStatusRepository
{
    Task<IEnumerable<PrescriptionStatus>> GetAllAsync();
}

using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IGenderRepository
{
    Task<IEnumerable<Gender>> GetAllAsync();
}

using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IProfileTypeRepository
{
    Task<IEnumerable<ProfileType>> GetAllAsync();
}

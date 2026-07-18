using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

public interface IRoleRepository
{
    Task<IEnumerable<Role>> GetAllActiveRolesAsync();
}

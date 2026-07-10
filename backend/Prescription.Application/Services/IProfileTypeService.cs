using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IProfileTypeService
{
    Task<IEnumerable<ProfileType>> GetAllAsync();
}

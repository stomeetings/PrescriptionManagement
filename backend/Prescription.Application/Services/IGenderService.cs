using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IGenderService
{
    Task<IEnumerable<Gender>> GetAllAsync();
}

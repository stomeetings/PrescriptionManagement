using Prescription.Domain.Entities;

namespace Prescription.Application.Services;

public interface IPrescriptionStatusService
{
    Task<IEnumerable<PrescriptionStatus>> GetAllAsync();
}

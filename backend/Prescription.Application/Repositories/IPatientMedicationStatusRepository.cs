using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

// Gap-fill added during Step 8 (Service Layer) - see usp_PatientMedicationStatus_GetAll.sql.
// Mirrors IDoseUnitRepository exactly.
public interface IPatientMedicationStatusRepository
{
    Task<IEnumerable<PatientMedicationStatus>> GetAllAsync();
}

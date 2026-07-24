using Prescription.Domain.Entities;

namespace Prescription.Application.Repositories;

// Gap-fill added during Step 8 (Service Layer) - see usp_PatientMedicationSource_GetAll.sql.
// Mirrors IDoseUnitRepository exactly.
public interface IPatientMedicationSourceRepository
{
    Task<IEnumerable<PatientMedicationSource>> GetAllAsync();
}

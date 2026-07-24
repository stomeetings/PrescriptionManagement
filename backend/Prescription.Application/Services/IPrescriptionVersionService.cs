using Prescription.Application.Prescriptions.Versioning;
using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

public interface IPrescriptionVersionService
{
    Task<IEnumerable<PrescriptionVersionSummary>> GetAllAsync(int prescriptionId);

    Task<PrescriptionVersionDetail> GetByVersionAsync(int prescriptionId, int versionNumber);

    // Comparison logic lives here, not in SQL - fetches both snapshots and diffs them in
    // C# (see PrescriptionVersionComparisonResult's own comment).
    Task<PrescriptionVersionComparisonResult> CompareAsync(int prescriptionId, int fromVersionNumber, int toVersionNumber);

    Task<PrescriptionRestoreResult> RestoreAsync(int prescriptionId, int versionNumber, string restoredBy);
}

using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Prescription.Application.Prescriptions.Pdf;
using Prescription.Application.Services;
using Prescription.Domain.Entities;

namespace Prescription.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Backs PrescriptionPdfService's "cache generated PDF until the draft changes"
        // requirement (Step 18.6).
        services.AddMemoryCache();

        services.AddScoped<IGenderService, GenderService>();
        services.AddScoped<IPrescriptionStatusService, PrescriptionStatusService>();
        services.AddScoped<IMedicineFormService, MedicineFormService>();
        services.AddScoped<IMedicineRouteService, MedicineRouteService>();
        services.AddScoped<IDoseUnitService, DoseUnitService>();
        services.AddScoped<IFrequencyService, FrequencyService>();
        services.AddScoped<IDurationUnitService, DurationUnitService>();
        services.AddScoped<IProfileTypeService, ProfileTypeService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPasswordHasher<UserAccount>, PasswordHasher<UserAccount>>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IPatientService, PatientService>();
        services.AddScoped<IMedicineService, MedicineService>();
        services.AddScoped<IPatientMedicationService, PatientMedicationService>();
        services.AddScoped<IPrescriptionService, PrescriptionService>();
        services.AddScoped<IPrescriptionPdfService, PrescriptionPdfService>();
        services.AddScoped<IPrescriptionVersionService, PrescriptionVersionService>();
        services.AddScoped<IPrescriptionFinalizeService, PrescriptionFinalizeService>();
        services.AddScoped<IPrescriptionReprintService, PrescriptionReprintService>();
        services.AddScoped<IPrescriptionItemAmendmentService, PrescriptionItemAmendmentService>();
        services.AddScoped<IPatientMedicationPrescriptionService, PatientMedicationPrescriptionService>();
        services.AddScoped<IPrescriptionRenewalService, PrescriptionRenewalService>();
        services.AddScoped<IPrescriptionCancellationService, PrescriptionCancellationService>();

        return services;
    }
}

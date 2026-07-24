using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Prescription.Application.Prescriptions;
using Prescription.Application.Prescriptions.Pdf;
using Prescription.Application.Prescriptions.Templating;
using Prescription.Application.Repositories;
using Prescription.Application.Security;
using Prescription.Infrastructure.Prescriptions.Pdf;
using Prescription.Infrastructure.Prescriptions.Templating;
using Prescription.Infrastructure.Repositories;
using Prescription.Infrastructure.Security;

namespace Prescription.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IDbConnection>(_ =>
            new SqlConnection(configuration.GetConnectionString("PrescriptionManagement")));

        services.AddScoped<IGenderRepository, GenderRepository>();
        services.AddScoped<IPrescriptionStatusRepository, PrescriptionStatusRepository>();
        services.AddScoped<IMedicineFormRepository, MedicineFormRepository>();
        services.AddScoped<IMedicineRouteRepository, MedicineRouteRepository>();
        services.AddScoped<IDoseUnitRepository, DoseUnitRepository>();
        services.AddScoped<IFrequencyRepository, FrequencyRepository>();
        services.AddScoped<IDurationUnitRepository, DurationUnitRepository>();
        services.AddScoped<IProfileTypeRepository, ProfileTypeRepository>();
        services.AddScoped<IUserAccountRepository, UserAccountRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IPatientRepository, PatientRepository>();
        services.AddScoped<IMedicineRepository, MedicineRepository>();
        services.AddScoped<IPatientMedicationRepository, PatientMedicationRepository>();
        services.AddScoped<IPatientMedicationStatusRepository, PatientMedicationStatusRepository>();
        services.AddScoped<IPatientMedicationSourceRepository, PatientMedicationSourceRepository>();
        services.AddScoped<IPrescriptionRepository, PrescriptionRepository>();
        services.AddScoped<IPrescriptionVersionRepository, PrescriptionVersionRepository>();
        services.AddScoped<IPrescriptionFinalizeRepository, PrescriptionFinalizeRepository>();
        services.AddScoped<IPrescriptionPrintHistoryRepository, PrescriptionPrintHistoryRepository>();
        services.AddScoped<IPrescriptionItemAmendmentRepository, PrescriptionItemAmendmentRepository>();
        services.AddScoped<IPatientMedicationPrescriptionRepository, PatientMedicationPrescriptionRepository>();
        services.AddScoped<IPrescriptionRenewalRepository, PrescriptionRenewalRepository>();
        services.Configure<PrescriptionRenewalOptions>(configuration.GetSection(PrescriptionRenewalOptions.SectionName));
        services.AddScoped<IPrescriptionCancellationRepository, PrescriptionCancellationRepository>();

        // Singleton, not Scoped - stateless (reads two fixed embedded resources, does
        // string substitution) and holds no per-request/database dependency, unlike
        // every repository above.
        services.AddSingleton<IPrescriptionHtmlGenerator, PrescriptionHtmlGenerator>();
        services.Configure<ClinicOptions>(configuration.GetSection(ClinicOptions.SectionName));

        // Singleton for the same reason as IPrescriptionHtmlGenerator, plus: launching a
        // headless Chromium process per request would be prohibitively expensive - the
        // browser instance is started once, lazily, on first use (see
        // PrescriptionPdfGenerator's own comments).
        services.AddSingleton<IPrescriptionPdfGenerator, PrescriptionPdfGenerator>();

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        return services;
    }
}

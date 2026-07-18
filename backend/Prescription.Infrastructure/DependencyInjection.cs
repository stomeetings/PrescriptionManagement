using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Prescription.Application.Repositories;
using Prescription.Application.Security;
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

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        return services;
    }
}

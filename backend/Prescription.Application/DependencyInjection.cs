using Microsoft.Extensions.DependencyInjection;
using Prescription.Application.Services;

namespace Prescription.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IGenderService, GenderService>();
        services.AddScoped<IPrescriptionStatusService, PrescriptionStatusService>();
        services.AddScoped<IMedicineFormService, MedicineFormService>();
        services.AddScoped<IMedicineRouteService, MedicineRouteService>();
        services.AddScoped<IDoseUnitService, DoseUnitService>();
        services.AddScoped<IFrequencyService, FrequencyService>();
        services.AddScoped<IDurationUnitService, DurationUnitService>();
        services.AddScoped<IProfileTypeService, ProfileTypeService>();

        return services;
    }
}

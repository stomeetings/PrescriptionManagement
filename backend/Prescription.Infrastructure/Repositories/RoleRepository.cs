using System.Data;
using Dapper;
using Prescription.Application.Repositories;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure.Repositories;

public class RoleRepository : IRoleRepository
{
    private readonly IDbConnection _connection;

    public RoleRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<IEnumerable<Role>> GetAllActiveRolesAsync()
    {
        return await _connection.QueryAsync<Role>(
            "usp_Role_GetAll",
            commandType: CommandType.StoredProcedure);
    }
}

using System.Linq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using investment_service.Data;
using System.Security.Claims;

namespace investment_service.Tests
{
    public class CustomWebApplicationFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");

            // Disable external transaction-service calls during tests
            builder.UseSetting("TRANSACTION_BASE_URL", string.Empty);

            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<InvestmentDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<InvestmentDbContext>(options =>
                    options.UseInMemoryDatabase(databaseName: "IntegrationTests"));

                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = "Test";
                    options.DefaultChallengeScheme = "Test";
                    options.DefaultScheme = "Test";
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
            });
        }
    }
}
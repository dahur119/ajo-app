using investment_service.Data;
using investment_service.Models;
using investment_service.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
var logger = builder.Services.BuildServiceProvider().GetRequiredService<ILogger<Program>>();

// Add services to the container.
logger.LogInformation("Adding services to the container.");

logger.LogInformation("Adding DbContext.");
builder.Services.AddDbContext<InvestmentDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("InvestmentDb")));
logger.LogInformation("DbContext added.");

logger.LogInformation("Adding HttpClient.");
builder.Services.AddHttpClient();
logger.LogInformation("HttpClient added.");

builder.Services.AddMemoryCache();

logger.LogInformation("Adding Authentication.");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]))
    };
})
.AddScheme<AuthenticationSchemeOptions, GatewaySignatureAuthenticationHandler>("GatewaySignature", null);
logger.LogInformation("Authentication added.");

logger.LogInformation("Adding Gateway Signature Verification.");
builder.Services.AddScoped<IGatewaySignatureVerifier, GatewaySignatureVerifier>();
logger.LogInformation("Gateway Signature Verification added.");

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "investment-service", Version = "v1" });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
logger.LogInformation("Configuring the HTTP request pipeline.");

if (app.Environment.IsDevelopment())
{
    logger.LogInformation("Adding Swagger.");
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "investment-service v1"));
    logger.LogInformation("Swagger added.");
}

app.UseHttpsRedirection();

logger.LogInformation("Adding Authorization.");
app.UseAuthorization();
logger.LogInformation("Authorization added.");

app.MapControllers();

// Seed the database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        logger.LogInformation("Attempting to migrate database.");
        var context = services.GetRequiredService<InvestmentDbContext>();
        context.Database.Migrate();
        logger.LogInformation("Database migration successful.");
        logger.LogInformation("Checking for existing products...");
        if (!context.Products.Any())
        {
            logger.LogInformation("Seeding products...");
            context.Products.AddRange(
                new Product { Name = "Ajo Classic", RateApr = 0.05m, Compounding = "none", MinContribution = 1000, Currency = "NGN", Active = true },
                new Product { Name = "Ajo Flex", RateApr = 0.03m, Compounding = "none", MinContribution = 500, Currency = "NGN", Active = true },
                new Product { Name = "Ajo Gold", RateApr = 0.08m, Compounding = "daily", MinContribution = 5000, Currency = "NGN", Active = true }
            );
            context.SaveChanges();
            logger.LogInformation("Products seeded.");
        }
        else
        { 
            logger.LogInformation("Products already exist. Skipping seed.");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

app.Run();
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace investment_service.Tests
{
    public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public static readonly string TestUserId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            ISystemClock clock) : base(options, logger, encoder, clock)
        { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var claims = new[]
            {
                new Claim("sub", TestUserId),
                new Claim(ClaimTypes.NameIdentifier, TestUserId),
            };
            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}
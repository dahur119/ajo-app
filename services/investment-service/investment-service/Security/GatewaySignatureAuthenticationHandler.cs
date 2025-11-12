using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.Extensions.Logging;

namespace investment_service.Security
{
    public class GatewaySignatureAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        private readonly IGatewaySignatureVerifier _verifier;
        private readonly ILogger<GatewaySignatureAuthenticationHandler> _logger;

        public GatewaySignatureAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory loggerFactory,
            UrlEncoder encoder,
            IGatewaySignatureVerifier verifier) : base(options, loggerFactory, encoder)
        {
            _verifier = verifier;
            _logger = loggerFactory.CreateLogger<GatewaySignatureAuthenticationHandler>();
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            _logger.LogInformation("Handling authentication request.");
            // Verify signed headers; if invalid or missing, fail so the scheme is not authenticated
            if (!_verifier.TryGetUserIdFromSignedHeaders(Request, out var userId))
            {
                _logger.LogWarning("Invalid or missing gateway signature.");
                return Task.FromResult(AuthenticateResult.Fail("invalid_or_missing_gateway_signature"));
            }

            _logger.LogInformation("Successfully authenticated user {UserId}.", userId);

            var claims = new List<Claim>
            {
                new Claim("sub", userId.ToString()),
                new Claim(ClaimTypes.NameIdentifier, userId.ToString())
            };
            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}
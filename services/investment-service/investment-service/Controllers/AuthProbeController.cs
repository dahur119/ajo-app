using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace investment_service.Controllers
{
    [ApiController]
    [Route("auth")]
    [Authorize]
    public class AuthProbeController : ControllerBase
    {
        [HttpGet("probe")]
        public IActionResult Probe()
        {
            var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var scheme = HttpContext.User.Identity?.AuthenticationType ?? "unknown";
            return Ok(new { userId, authScheme = scheme });
        }
    }
}
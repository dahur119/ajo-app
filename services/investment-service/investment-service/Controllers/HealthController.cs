using Microsoft.AspNetCore.Mvc;

namespace investment_service.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class HealthController : ControllerBase
    {
        [HttpGet("/health")]
        public IActionResult Health()
        {
            var requestId = Request.Headers.ContainsKey("x-request-id") && !string.IsNullOrWhiteSpace(Request.Headers["x-request-id"]) ? Request.Headers["x-request-id"].ToString() : Guid.NewGuid().ToString();
            Response.Headers["x-request-id"] = requestId;
            return Ok(new { status = "ok", timestamp = DateTime.UtcNow.ToString("o"), requestId });
        }

        [HttpGet("/ready")]
        public IActionResult Ready()
        {
            var requestId = Request.Headers.ContainsKey("x-request-id") && !string.IsNullOrWhiteSpace(Request.Headers["x-request-id"]) ? Request.Headers["x-request-id"].ToString() : Guid.NewGuid().ToString();
            Response.Headers["x-request-id"] = requestId;
            return Ok(new { ready = true, timestamp = DateTime.UtcNow.ToString("o"), requestId });
        }
    }
}
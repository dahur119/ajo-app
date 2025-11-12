using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using investment_service.Data;
using investment_service.Models;
using investment_service.Dtos;
 

namespace investment_service.Controllers
{
    [ApiController]
    [Route("subscriptions")]
    [Authorize]
    public class SubscriptionsController : ControllerBase
    {
        private readonly InvestmentDbContext _db;
        public SubscriptionsController(InvestmentDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public IActionResult List()
        {
            if (!TryResolveUserId(out var userId)) return Unauthorized();
            return Ok(_db.Subscriptions.Where(s => s.UserId == userId).ToList());
        }

        [HttpGet("{id}")]
        public IActionResult Get(Guid id)
        {
            if (!TryResolveUserId(out var userId)) return Unauthorized();
            var s = _db.Subscriptions.Find(id);
            if (s is null) return NotFound();
            if (s.UserId != userId) return Forbid();
            return Ok(s);
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreateSubscriptionDto dto)
        {
            if (!TryResolveUserId(out var userId)) return Unauthorized();
            var product = _db.Products.Find(dto.ProductId);
            if (product is null || !product.Active) return BadRequest(new { error = "invalid_product" });
            var sub = new Subscription
            {
                UserId = userId,
                ProductId = product.Id,
                Currency = dto.Currency,
                Status = "active"
            };
            _db.Subscriptions.Add(sub);
            _db.SaveChanges();
            return Created($"/subscriptions/{sub.Id}", sub);
        }

        private bool TryResolveUserId(out Guid userId)
        {
            userId = Guid.Empty;
            var uid = User.FindFirst("sub")?.Value
                      ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(uid) && Guid.TryParse(uid, out var fromJwt))
            {
                userId = fromJwt;
                return true;
            }

            return false;
        }
    }
}